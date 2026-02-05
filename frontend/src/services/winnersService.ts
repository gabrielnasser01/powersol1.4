import { supabase } from '../lib/supabase';

export interface Winner {
  id: string;
  user_wallet: string;
  maskedWallet: string;
  ticket_number: number;
  prize_amount_lamports: number;
  prizeSol: number;
  prize_position: string;
  lottery_type: string;
  round: number;
  draw_date: string;
  timestamp: number;
  claimed: boolean;
}

class WinnersService {
  private formatWallet(wallet: string): string {
    if (!wallet || wallet.length < 8) return wallet;
    return `${wallet.slice(0, 3)}...${wallet.slice(-3)}`;
  }

  private lamportsToSol(lamports: number): number {
    return lamports / 1_000_000_000;
  }

  async getRecentWinners(
    lotteryType?: string,
    limit: number = 100
  ): Promise<Winner[]> {
    try {
      let query = supabase
        .from('prizes')
        .select('*')
        .order('draw_date', { ascending: false })
        .limit(limit);

      if (lotteryType) {
        query = query.eq('lottery_type', lotteryType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching winners:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((prize) => ({
        id: prize.id,
        user_wallet: prize.user_wallet,
        maskedWallet: this.formatWallet(prize.user_wallet),
        ticket_number: Number(prize.ticket_number),
        prize_amount_lamports: Number(prize.prize_amount_lamports),
        prizeSol: this.lamportsToSol(Number(prize.prize_amount_lamports)),
        prize_position: prize.prize_position,
        lottery_type: prize.lottery_type,
        round: Number(prize.round),
        draw_date: prize.draw_date,
        timestamp: new Date(prize.draw_date).getTime(),
        claimed: prize.claimed,
      }));
    } catch (error) {
      console.error('Error in getRecentWinners:', error);
      return [];
    }
  }

  async getWinnersByRound(
    lotteryType: string,
    round: number
  ): Promise<Winner[]> {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('lottery_type', lotteryType)
        .eq('round', round)
        .order('prize_amount_lamports', { ascending: false });

      if (error) {
        console.error('Error fetching winners by round:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((prize) => ({
        id: prize.id,
        user_wallet: prize.user_wallet,
        maskedWallet: this.formatWallet(prize.user_wallet),
        ticket_number: Number(prize.ticket_number),
        prize_amount_lamports: Number(prize.prize_amount_lamports),
        prizeSol: this.lamportsToSol(Number(prize.prize_amount_lamports)),
        prize_position: prize.prize_position,
        lottery_type: prize.lottery_type,
        round: Number(prize.round),
        draw_date: prize.draw_date,
        timestamp: new Date(prize.draw_date).getTime(),
        claimed: prize.claimed,
      }));
    } catch (error) {
      console.error('Error in getWinnersByRound:', error);
      return [];
    }
  }

  async getLatestRoundWinners(lotteryType: string): Promise<Winner[]> {
    try {
      const { data: roundData, error: roundError } = await supabase
        .from('prizes')
        .select('round')
        .eq('lottery_type', lotteryType)
        .order('round', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roundError || !roundData) {
        return [];
      }

      const latestRound = roundData.round;

      return this.getWinnersByRound(lotteryType, latestRound);
    } catch (error) {
      console.error('Error in getLatestRoundWinners:', error);
      return [];
    }
  }

  async getTotalWinnersCount(lotteryType?: string): Promise<number> {
    try {
      let query = supabase
        .from('prizes')
        .select('id', { count: 'exact', head: true });

      if (lotteryType) {
        query = query.eq('lottery_type', lotteryType);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error counting winners:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalWinnersCount:', error);
      return 0;
    }
  }

  async getTotalPrizesDistributed(lotteryType?: string): Promise<number> {
    try {
      let query = supabase
        .from('prizes')
        .select('prize_amount_lamports');

      if (lotteryType) {
        query = query.eq('lottery_type', lotteryType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching total prizes:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const total = data.reduce(
        (sum, prize) => sum + Number(prize.prize_amount_lamports),
        0
      );

      return this.lamportsToSol(total);
    } catch (error) {
      console.error('Error in getTotalPrizesDistributed:', error);
      return 0;
    }
  }
}

export const winnersService = new WinnersService();
