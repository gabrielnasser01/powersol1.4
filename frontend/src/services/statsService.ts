import { supabase } from '../lib/supabase';

export interface LotteryStats {
  activePlayers: number;
  totalPrizesUSD: number;
  totalPrizesSOL: number;
  averageWinTime: string;
  successRate: number;
}

class StatsService {
  async getLotteryStats(): Promise<LotteryStats> {
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('ticket_purchases')
        .select('wallet_address, total_sol', { count: 'exact' })
        .eq('lottery_type', 'tri-daily');

      if (ticketError) throw ticketError;

      const uniquePlayers = new Set(ticketData?.map(t => t.wallet_address) || []).size;

      const { data: prizeData, error: prizeError } = await supabase
        .from('lottery_winners')
        .select('prize_amount_lamports')
        .eq('lottery_type', 'tri-daily');

      if (prizeError) throw prizeError;

      const totalPrizesLamports = prizeData?.reduce((sum, p) => sum + p.prize_amount_lamports, 0) || 0;
      const totalPrizesSOL = totalPrizesLamports / 1_000_000_000;
      const totalPrizesUSD = totalPrizesSOL * 150;

      return {
        activePlayers: uniquePlayers,
        totalPrizesUSD,
        totalPrizesSOL,
        averageWinTime: '2.3s',
        successRate: 99.9,
      };
    } catch (error) {
      console.error('Error fetching lottery stats:', error);
      return {
        activePlayers: 0,
        totalPrizesUSD: 0,
        totalPrizesSOL: 0,
        averageWinTime: '0s',
        successRate: 0,
      };
    }
  }

  formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  }

  formatUSD(amount: number): string {
    return `$${this.formatNumber(amount)}`;
  }
}

export const statsService = new StatsService();
