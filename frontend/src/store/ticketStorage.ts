import { supabase } from '../lib/supabase';

export interface MockTicket {
  id: string;
  number: string;
  purchaseDate: string;
  drawDate: string;
  lotteryType: 'tri-daily' | 'special-event' | 'jackpot' | 'grand-prize';
  status: 'active' | 'claimed' | 'expired';
  lotteryRoundId?: number;
  transactionSignature?: string;
}

const STORAGE_KEY_PREFIX = 'powersol_tickets_';
const DISMISSED_KEY_PREFIX = 'powersol_dismissed_';
const TICKET_NUMBERS_KEY_PREFIX = 'powersol_ticket_nums_';

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

function getDismissedKey(): string {
  const wallet = getCurrentWallet();
  return wallet ? `${DISMISSED_KEY_PREFIX}${wallet}` : `${DISMISSED_KEY_PREFIX}anonymous`;
}

function getTicketNumbersKey(): string {
  const wallet = getCurrentWallet();
  return wallet ? `${TICKET_NUMBERS_KEY_PREFIX}${wallet}` : `${TICKET_NUMBERS_KEY_PREFIX}anonymous`;
}

function getDismissedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(getDismissedKey());
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>): void {
  localStorage.setItem(getDismissedKey(), JSON.stringify([...ids]));
}

function getStableTicketNumbers(): Record<string, string> {
  try {
    const stored = localStorage.getItem(getTicketNumbersKey());
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStableTicketNumbers(map: Record<string, string>): void {
  localStorage.setItem(getTicketNumbersKey(), JSON.stringify(map));
}

function generateTicketNumber(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getOrCreateTicketNumber(ticketId: string): string {
  const numbersMap = getStableTicketNumbers();
  if (numbersMap[ticketId]) {
    return numbersMap[ticketId];
  }
  const newNumber = generateTicketNumber();
  numbersMap[ticketId] = newNumber;
  saveStableTicketNumbers(numbersMap);
  return newNumber;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const VALID_TYPES = ['tri-daily', 'special-event', 'jackpot', 'grand-prize'] as const;
type LotteryType = typeof VALID_TYPES[number];

function normalizeLotteryType(raw: string): LotteryType {
  let t = raw.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (t === 'halloween') t = 'special-event';
  if (!VALID_TYPES.includes(t as LotteryType)) t = 'tri-daily';
  return t as LotteryType;
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

  async add(quantity: number, lotteryType: LotteryType = 'tri-daily', lotteryRoundId?: number): Promise<MockTicket[]> {
    const tickets = this.getAll();
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let drawDate = 'A definir';
    if (lotteryRoundId) {
      const { data } = await supabase
        .from('blockchain_lotteries')
        .select('draw_timestamp')
        .eq('lottery_id', lotteryRoundId)
        .eq('lottery_type', lotteryType)
        .maybeSingle();

      if (data?.draw_timestamp) {
        drawDate = formatTimestamp(data.draw_timestamp);
      }
    }

    const newTickets: MockTicket[] = [];
    for (let i = 0; i < quantity; i++) {
      const ticketId = `${Date.now()}-${i}`;
      newTickets.push({
        id: ticketId,
        number: getOrCreateTicketNumber(ticketId),
        purchaseDate: now,
        drawDate,
        lotteryType,
        status: 'active',
        lotteryRoundId,
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

  removeExpired(): number {
    const all = this.getAll();
    const expired = all.filter(t => t.status === 'expired');
    const remaining = all.filter(t => t.status !== 'expired');

    const dismissed = getDismissedIds();
    expired.forEach(t => dismissed.add(t.id));
    saveDismissedIds(dismissed);

    localStorage.setItem(getStorageKey(), JSON.stringify(remaining));
    return expired.length;
  },

  async syncFromDatabase(walletAddress: string): Promise<void> {
    try {
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

      const roundIds = [...new Set(purchases.map(p => p.lottery_round_id).filter(Boolean))];
      let lotteryMap: Record<number, { draw_timestamp: number; is_drawn: boolean }> = {};

      if (roundIds.length > 0) {
        const { data: lotteries } = await supabase
          .from('blockchain_lotteries')
          .select('lottery_id, draw_timestamp, is_drawn, lottery_type')
          .in('lottery_id', roundIds);

        if (lotteries) {
          lotteries.forEach(l => {
            lotteryMap[l.lottery_id] = {
              draw_timestamp: l.draw_timestamp,
              is_drawn: l.is_drawn,
            };
          });
        }
      }

      const dismissed = getDismissedIds();
      const dbTickets: MockTicket[] = [];

      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });

        const normalizedType = normalizeLotteryType(purchase.lottery_type);
        const roundId = purchase.lottery_round_id;
        const lotteryInfo = roundId ? lotteryMap[roundId] : null;

        let drawDate = 'A definir';
        let status: 'active' | 'expired' = 'active';

        if (purchase.is_drawn) {
          status = 'expired';
          if (lotteryInfo) {
            drawDate = formatTimestamp(lotteryInfo.draw_timestamp);
          }
        } else if (lotteryInfo) {
          drawDate = formatTimestamp(lotteryInfo.draw_timestamp);
          if (lotteryInfo.is_drawn) {
            status = 'expired';
          } else {
            const drawTimeMs = lotteryInfo.draw_timestamp * 1000;
            status = Date.now() > drawTimeMs ? 'expired' : 'active';
          }
        }

        for (let i = 0; i < purchase.quantity; i++) {
          const ticketId = `${purchase.id}-${i}`;

          if (dismissed.has(ticketId)) {
            continue;
          }

          dbTickets.push({
            id: ticketId,
            number: getOrCreateTicketNumber(ticketId),
            purchaseDate,
            drawDate,
            lotteryType: normalizedType,
            status,
            lotteryRoundId: roundId || undefined,
            transactionSignature: purchase.transaction_signature || undefined,
          });
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(dbTickets));
    } catch (error) {
      console.error('Error syncing tickets:', error);
    }
  }
};

export const ticketsStorage = ticketStorage;
