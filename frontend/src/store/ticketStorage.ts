import { supabase } from '../lib/supabase';

export interface MockTicket {
  id: string;
  number: string;
  purchaseDate: string;
  drawDate: string;
  lotteryType: 'tri-daily' | 'halloween' | 'jackpot' | 'grand-prize';
  status: 'active' | 'claimed' | 'expired';
}

const STORAGE_KEY_PREFIX = 'powersol_tickets_';

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

function calculateDrawDate(lotteryType: string): string {
  const now = new Date();

  switch (lotteryType) {
    case 'tri-daily':
      now.setDate(now.getDate() + 3);
      break;
    case 'halloween':
      now.setMonth(9);
      now.setDate(31);
      break;
    case 'jackpot':
      now.setDate(now.getDate() + 15);
      break;
    case 'grand-prize':
      now.setMonth(11);
      now.setDate(31);
      break;
    default:
      now.setDate(now.getDate() + 7);
  }

  return now.toISOString().split('T')[0];
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

  add(quantity: number, lotteryType: 'tri-daily' | 'halloween' | 'jackpot' | 'grand-prize' = 'tri-daily'): MockTicket[] {
    const tickets = this.getAll();
    const now = new Date().toISOString().split('T')[0];
    const drawDate = calculateDrawDate(lotteryType);

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

      const dbTickets: MockTicket[] = [];

      purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.created_at).toISOString().split('T')[0];

        let normalizedLotteryType = purchase.lottery_type
          .toLowerCase()
          .replace(/_/g, '-')
          .replace(/\s+/g, '-');

        if (!['tri-daily', 'halloween', 'jackpot', 'grand-prize'].includes(normalizedLotteryType)) {
          normalizedLotteryType = 'tri-daily';
        }

        const drawDate = calculateDrawDate(normalizedLotteryType);

        for (let i = 0; i < purchase.quantity; i++) {
          dbTickets.push({
            id: `${purchase.id}-${i}`,
            number: generateTicketNumber(),
            purchaseDate,
            drawDate,
            lotteryType: normalizedLotteryType as 'tri-daily' | 'halloween' | 'jackpot' | 'grand-prize',
            status: 'active'
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
