import { supabase } from '../lib/supabase';

const LAMPORTS_PER_SOL = 1_000_000_000;

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

function generateClaimRef(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `claim_${ts}_${rand}`;
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

  async claimAffiliateRewards(
    walletAddress: string,
    weekNumber: number
  ): Promise<{ success: boolean; claimRef?: string; error?: string; amount?: number }> {
    try {
      const claimRef = generateClaimRef();

      const { data, error } = await supabase.rpc('process_affiliate_claim_v2', {
        p_wallet: walletAddress,
        p_week_number: weekNumber,
        p_tx_signature: claimRef
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (result && !result.success) {
        return { success: false, error: result.error_message || 'Claim failed' };
      }

      return {
        success: true,
        claimRef,
        amount: result?.amount_claimed || 0
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAllAvailableAffiliateRewards(
    walletAddress: string
  ): Promise<{ success: boolean; claimed: number; totalAmount: number; claimRefs: string[]; errors: string[] }> {
    const weeks = await this.getClaimableAffiliateRewards(walletAddress);
    const availableWeeks = weeks.filter(w => w.is_available && w.pending_lamports > 0);

    const claimRefs: string[] = [];
    const errors: string[] = [];
    let totalAmount = 0;

    for (const week of availableWeeks) {
      const result = await this.claimAffiliateRewards(
        walletAddress,
        week.week_number
      );

      if (result.success && result.claimRef) {
        claimRefs.push(result.claimRef);
        totalAmount += result.amount || 0;
      } else if (result.error) {
        errors.push(`Week ${week.week_number}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: claimRefs.length,
      totalAmount,
      claimRefs,
      errors
    };
  },

  async claimPrize(
    walletAddress: string,
    prizeId: string
  ): Promise<{ success: boolean; claimRef?: string; error?: string }> {
    try {
      const prizes = await this.getUnclaimedPrizes(walletAddress);
      const prize = prizes.find(p => p.prize_id === prizeId);

      if (!prize) {
        return { success: false, error: 'Prize not found or already claimed' };
      }

      const claimRef = generateClaimRef();

      const { error } = await supabase.rpc('mark_prize_claimed', {
        p_winner_id: prizeId,
        p_tx_signature: claimRef
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, claimRef };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAllPrizes(
    walletAddress: string
  ): Promise<{ success: boolean; claimed: number; claimRefs: string[]; errors: string[] }> {
    const prizes = await this.getUnclaimedPrizes(walletAddress);
    const claimRefs: string[] = [];
    const errors: string[] = [];

    for (const prize of prizes) {
      const result = await this.claimPrize(walletAddress, prize.prize_id);
      if (result.success && result.claimRef) {
        claimRefs.push(result.claimRef);
      } else if (result.error) {
        errors.push(`${prize.lottery_type}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: claimRefs.length,
      claimRefs,
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
