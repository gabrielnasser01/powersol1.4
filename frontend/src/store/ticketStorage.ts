import { supabase } from '../lib/supabase';

export interface MockTicket {
  id: string;
  number: string;
  purchaseDate: string;
  drawDate: string;
  lotteryType: 'tri-daily' | 'special-event' | 'jackpot' | 'grand-prize';
  status: 'active' | 'claimed' | 'expired';
}

const STORAGE_KEY_PREFIX = 'powersol_tickets_';

let drawDateCache: Record<string, string> = {};

function getCurrentWallet(): string | null {
  try {
    const userDataStr = localStorage.getItem('powerSOL.user');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return userData.publicKey || null;
    }
  } catch {
    return null;
  }
  return null;
}

function getStorageKey(): string {
  const wallet = getCurrentWallet();
  return wallet ? `${STORAGE_KEY_PREFIX}${wallet}` : `${STORAGE_KEY_PREFIX}anonymous`;
}

function generateTicketNumber(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function fetchNextDrawDate(lotteryType: string): Promise<string> {
  const cached = drawDateCache[lotteryType];
  if (cached) return cached;

  const nowTimestamp = Math.floor(Date.now() / 1000);
  const { data } = await supabase
    .from('blockchain_lotteries')
    .select('draw_timestamp')
    .eq('lottery_type', lotteryType)
    .eq('is_drawn', false)
    .gt('draw_timestamp', nowTimestamp)
    .order('draw_timestamp', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.draw_timestamp) {
    const date = new Date(data.draw_timestamp * 1000);
    const formatted = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    drawDateCache[lotteryType] = formatted;
    return formatted;
  }

  return 'A definir';
}

function getTicketStatus(drawDateStr: string): 'active' | 'expired' {
  if (drawDateStr === 'A definir') return 'active';
  const parts = drawDateStr.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
  if (!parts) return 'active';
  const drawTime = new Date(
    parseInt(parts[3]),
    parseInt(parts[2]) - 1,
    parseInt(parts[1]),
    parseInt(parts[4]),
    parseInt(parts[5])
  ).getTime();
  return Date.now() > drawTime ? 'expired' : 'active';
}

export const ticketStorage = {
  getAll(): MockTicket[] {
    try {
      const stored = localStorage.getItem(getStorageKey());
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async add(quantity: number, lotteryType: 'tri-daily' | 'special-event' | 'jackpot' | 'grand-prize' = 'tri-daily'): Promise<MockTicket[]> {
    const tickets = this.getAll();
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const drawDate = await fetchNextDrawDate(lotteryType);

    const newTickets: MockTicket[] = [];
    for (let i = 0; i < quantity; i++) {
      newTickets.push({
        id: `${Date.now()}-${i}`,
        number: generateTicketNumber(),
        purchaseDate: now,
        drawDate,
        lotteryType,
        status: 'active'
      });
    }

    const updated = [...tickets, ...newTickets];
    localStorage.setItem(getStorageKey(), JSON.stringify(updated));

    return newTickets;
  },

  getByLotteryType(lotteryType: string): MockTicket[] {
    return this.getAll().filter(ticket => ticket.lotteryType === lotteryType);
  },

  getTotalCount(): number {
    return this.getAll().length;
  },

  clear(): void {
    localStorage.removeItem(getStorageKey());
  },

  async syncFromDatabase(walletAddress: string): Promise<void> {
    try {
      drawDateCache = {};
      const storageKey = `${STORAGE_KEY_PREFIX}${walletAddress}`;

      const { data: purchases, error } = await supabase
        .from('ticket_purchases')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to sync tickets from database:', error);
        return;
      }

      if (!purchases || purchases.length === 0) {
        localStorage.setItem(storageKey, JSON.stringify([]));
        return;
      }

      const drawDates: Record<string, string> = {};
      const lotteryTypes = [...new Set(purchases.map(p => {
        let t = p.lottery_type.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
        if (t === 'halloween') t = 'special-event';
        if (!['tri-daily', 'special-event', 'jackpot', 'grand-prize'].includes(t)) t = 'tri-daily';
        return t;
      }))];

      await Promise.all(lotteryTypes.map(async (lt) => {
        drawDates[lt] = await fetchNextDrawDate(lt);
      }));

      const dbTickets: MockTicket[] = [];

      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });

        let normalizedLotteryType = purchase.lottery_type
          .toLowerCase()
          .replace(/_/g, '-')
          .replace(/\s+/g, '-');

        if (normalizedLotteryType === 'halloween') {
          normalizedLotteryType = 'special-event';
        }

        if (!['tri-daily', 'special-event', 'jackpot', 'grand-prize'].includes(normalizedLotteryType)) {
          normalizedLotteryType = 'tri-daily';
        }

        const drawDate = drawDates[normalizedLotteryType] || 'A definir';
        const status = getTicketStatus(drawDate);

        for (let i = 0; i < purchase.quantity; i++) {
          dbTickets.push({
            id: `${purchase.id}-${i}`,
            number: generateTicketNumber(),
            purchaseDate,
            drawDate,
            lotteryType: normalizedLotteryType as 'tri-daily' | 'special-event' | 'jackpot' | 'grand-prize',
            status
          });
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(dbTickets));
    } catch (error) {
      console.error('Error syncing tickets:', error);
    }
  }
};

// Export with plural name for consistency
export const ticketsStorage = ticketStorage;
