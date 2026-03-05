import { supabase } from '../lib/supabase';

const LAMPORTS_PER_SOL = 1_000_000_000;

const PRIZE_CLAIM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prize-claim`;

const edgeFunctionHeaders = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

interface ClaimableAffiliateWeek {
  week_number: number;
  pending_lamports: number;
  tier: number;
  referral_count: number;
  release_timestamp: string;
  is_available: boolean;
}

interface ClaimablePrize {
  prize_id: string;
  lottery_type: string;
  lottery_round: number;
  tier: number;
  amount_lamports: number;
  won_at: string;
}

interface NextRelease {
  next_release_timestamp: string;
  current_week: number;
  time_until_release: string;
}

interface ClaimResponse {
  success: boolean;
  error?: string;
  signature?: string;
  amount_lamports?: number;
  amount_sol?: number;
  fee_lamports?: number;
  explorer_url?: string;
  week_number?: number;
  warning?: string;
}

export const claimService = {
  async getClaimableAffiliateRewards(walletAddress: string): Promise<ClaimableAffiliateWeek[]> {
    const { data, error } = await supabase.rpc('get_claimable_affiliate_balance_v2', {
      p_wallet: walletAddress
    });

    if (error || !data) {
      return [];
    }

    return data;
  },

  async getNextAffiliateRelease(): Promise<NextRelease | null> {
    const { data, error } = await supabase.rpc('get_next_affiliate_release');

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  },

  async getTotalPendingAffiliateRewards(walletAddress: string): Promise<number> {
    const weeks = await this.getClaimableAffiliateRewards(walletAddress);
    return weeks
      .filter(w => w.is_available)
      .reduce((sum, w) => sum + w.pending_lamports, 0);
  },

  async getUnclaimedPrizes(walletAddress: string): Promise<ClaimablePrize[]> {
    const { data, error } = await supabase.rpc('get_unclaimed_prizes', {
      p_wallet: walletAddress
    });

    if (error || !data) {
      return [];
    }

    return data;
  },

  async claimPrize(
    walletAddress: string,
    prizeId: string
  ): Promise<{ success: boolean; signature?: string; error?: string; explorerUrl?: string }> {
    try {
      const response = await fetch(`${PRIZE_CLAIM_URL}/claim`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ prize_id: prizeId, wallet_address: walletAddress }),
      });

      const result: ClaimResponse = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to claim prize' };
      }

      return {
        success: true,
        signature: result.signature,
        explorerUrl: result.explorer_url,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAffiliateRewards(
    walletAddress: string,
    weekNumber: number
  ): Promise<{ success: boolean; signature?: string; error?: string; amount?: number }> {
    try {
      const response = await fetch(`${PRIZE_CLAIM_URL}/affiliate/claim`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ wallet_address: walletAddress, week_number: weekNumber }),
      });

      const result: ClaimResponse = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to claim rewards' };
      }

      return {
        success: true,
        signature: result.signature,
        amount: result.amount_lamports || 0,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAllAvailableAffiliateRewards(
    walletAddress: string
  ): Promise<{ success: boolean; claimed: number; totalAmount: number; signatures: string[]; errors: string[] }> {
    const weeks = await this.getClaimableAffiliateRewards(walletAddress);
    const availableWeeks = weeks.filter(w => w.is_available && w.pending_lamports > 0);

    const signatures: string[] = [];
    const errors: string[] = [];
    let totalAmount = 0;

    for (const week of availableWeeks) {
      const result = await this.claimAffiliateRewards(
        walletAddress,
        week.week_number
      );

      if (result.success && result.signature) {
        signatures.push(result.signature);
        totalAmount += result.amount || 0;
      } else if (result.error) {
        errors.push(`Week ${week.week_number}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: signatures.length,
      totalAmount,
      signatures,
      errors
    };
  },

  async claimAllPrizes(
    walletAddress: string
  ): Promise<{ success: boolean; claimed: number; signatures: string[]; errors: string[] }> {
    const prizes = await this.getUnclaimedPrizes(walletAddress);
    const signatures: string[] = [];
    const errors: string[] = [];

    for (const prize of prizes) {
      const result = await this.claimPrize(walletAddress, prize.prize_id);
      if (result.success && result.signature) {
        signatures.push(result.signature);
      } else if (result.error) {
        errors.push(`${prize.lottery_type}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: signatures.length,
      signatures,
      errors
    };
  },

  formatLamports(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  },

  lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
  },

  formatTimeUntilRelease(timeString: string): string {
    const match = timeString.match(/(\d+):(\d+):(\d+)/);
    if (!match) return timeString;

    const [, hours, minutes] = match;
    const totalHours = parseInt(hours);
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h ${minutes}m`;
    }
    return `${remainingHours}h ${minutes}m`;
  }
};
