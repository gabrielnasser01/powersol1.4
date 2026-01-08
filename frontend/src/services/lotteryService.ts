import { supabase } from '../lib/supabase';

export interface Lottery {
  id: number;
  lottery_id: number;
  lottery_type: 'tri-daily' | 'jackpot' | 'grand-prize' | 'xmas' | string;
  ticket_price: number;
  max_tickets: number;
  draw_timestamp: number;
  is_drawn: boolean;
  winning_ticket: number | null;
  prize_pool: number;
  transaction_signature: string | null;
  on_chain_address: string | null;
  created_at: string;
}

export interface NextDraw {
  id: string;
  kind: string;
  scheduledAt: number;
  lotteryId: number;
  ticketPrice: number;
  maxTickets: number;
  prizePool: number;
}

const LOTTERY_DISPLAY_NAMES: Record<string, string> = {
  'tri-daily': 'Tri-Daily',
  'jackpot': 'Monthly Jackpot',
  'grand-prize': 'Grand Prize',
  'xmas': 'Christmas Special',
};

function mapLotteryToNextDraw(lottery: Lottery): NextDraw {
  return {
    id: `${lottery.lottery_type}-${lottery.lottery_id}`,
    kind: LOTTERY_DISPLAY_NAMES[lottery.lottery_type] || lottery.lottery_type,
    scheduledAt: lottery.draw_timestamp * 1000,
    lotteryId: lottery.lottery_id,
    ticketPrice: lottery.ticket_price,
    maxTickets: lottery.max_tickets,
    prizePool: lottery.prize_pool || 0,
  };
}

export const lotteryService = {
  async getNextDraw(): Promise<NextDraw | null> {
    const nowTimestamp = Math.floor(Date.now() / 1000);

    const { data, error } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('is_drawn', false)
      .gt('draw_timestamp', nowTimestamp)
      .order('draw_timestamp', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching next draw:', error);
      return null;
    }

    if (!data) return null;

    return mapLotteryToNextDraw(data as Lottery);
  },

  async getAllPendingDraws(): Promise<NextDraw[]> {
    const nowTimestamp = Math.floor(Date.now() / 1000);

    const { data, error } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('is_drawn', false)
      .gt('draw_timestamp', nowTimestamp)
      .order('draw_timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching pending draws:', error);
      return [];
    }

    return (data || []).map((lottery) => mapLotteryToNextDraw(lottery as Lottery));
  },

  async getDrawsByType(lotteryType: string): Promise<NextDraw[]> {
    const { data, error } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('lottery_type', lotteryType)
      .eq('is_drawn', false)
      .order('draw_timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching draws by type:', error);
      return [];
    }

    return (data || []).map((lottery) => mapLotteryToNextDraw(lottery as Lottery));
  },

  async getNextDrawByType(lotteryType: string): Promise<NextDraw | null> {
    const nowTimestamp = Math.floor(Date.now() / 1000);

    const { data, error } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('lottery_type', lotteryType)
      .eq('is_drawn', false)
      .gt('draw_timestamp', nowTimestamp)
      .order('draw_timestamp', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching next draw by type:', error);
      return null;
    }

    if (!data) return null;

    return mapLotteryToNextDraw(data as Lottery);
  },

  async getRecentDraws(limit: number = 10): Promise<Lottery[]> {
    const { data, error } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('is_drawn', true)
      .order('draw_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent draws:', error);
      return [];
    }

    return (data || []) as Lottery[];
  },
};
