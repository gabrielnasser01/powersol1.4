import { supabase } from '../lib/supabase';

export interface DashboardStats {
  tier: number;
  tierLabel: string;
  commissionRate: number;
  totalReferrals: number;
  weeklyReferrals: number;
  totalTickets: number;
  weeklyTickets: number;
  totalEarnedLamports: number;
  weeklyEarnedLamports: number;
  pendingClaimableLamports: number;
  nextReleaseTimestamp: string;
  timeUntilRelease: string;
  referralsToNextTier: number;
  nextTierThreshold: number | null;
}

export interface TopAffiliate {
  rank: number;
  walletAddress: string;
  tier: number;
  tierLabel: string;
  totalReferrals: number;
  totalEarnedLamports: number;
  weeklyReferrals: number;
}

export interface TopReferral {
  rank: number;
  walletAddress: string;
  joinedAt: string;
  totalTickets: number;
  totalSpentLamports: number;
  commissionGeneratedLamports: number;
  isValidated: boolean;
}

export interface WeeklyHistory {
  weekNumber: number;
  weekStartDate: string;
  referralCount: number;
  earnedLamports: number;
  tier: number;
  isReleased: boolean;
  isClaimable: boolean;
}

export interface ApplicationStatus {
  hasApplied: boolean;
  status: 'pending' | 'approved' | 'rejected' | null;
  appliedAt: string | null;
}

class AffiliateDashboardService {
  async checkApplicationStatus(walletAddress: string): Promise<ApplicationStatus> {
    try {
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select('status, created_at')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (error) throw error;

      return {
        hasApplied: !!data,
        status: data?.status || null,
        appliedAt: data?.created_at || null,
      };
    } catch (error) {
      console.error('Error checking application status:', error);
      return { hasApplied: false, status: null, appliedAt: null };
    }
  }

  async getDashboardStats(walletAddress: string): Promise<DashboardStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_affiliate_dashboard_stats', {
        p_wallet: walletAddress,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const row = data[0];
      return {
        tier: row.tier || 1,
        tierLabel: row.tier_label || 'Starter',
        commissionRate: row.commission_rate || 0.05,
        totalReferrals: Number(row.total_referrals) || 0,
        weeklyReferrals: Number(row.weekly_referrals) || 0,
        totalTickets: Number(row.total_tickets) || 0,
        weeklyTickets: Number(row.weekly_tickets) || 0,
        totalEarnedLamports: Number(row.total_earned_lamports) || 0,
        weeklyEarnedLamports: Number(row.weekly_earned_lamports) || 0,
        pendingClaimableLamports: Number(row.pending_claimable_lamports) || 0,
        nextReleaseTimestamp: row.next_release_timestamp,
        timeUntilRelease: row.time_until_release,
        referralsToNextTier: row.referrals_to_next_tier || 0,
        nextTierThreshold: row.next_tier_threshold,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  }

  async getTopAffiliates(limit: number = 10): Promise<TopAffiliate[]> {
    try {
      const { data, error } = await supabase.rpc('get_top_affiliates_ranking', {
        p_limit: limit,
      });

      if (error) throw error;
      if (!data) return [];

      return data.map((row: Record<string, unknown>) => ({
        rank: Number(row.rank),
        walletAddress: String(row.wallet_address),
        tier: Number(row.tier),
        tierLabel: String(row.tier_label),
        totalReferrals: Number(row.total_referrals),
        totalEarnedLamports: Number(row.total_earned_lamports),
        weeklyReferrals: Number(row.weekly_referrals),
      }));
    } catch (error) {
      console.error('Error fetching top affiliates:', error);
      return [];
    }
  }

  async getTopReferrals(walletAddress: string, limit: number = 10): Promise<TopReferral[]> {
    try {
      const { data, error } = await supabase.rpc('get_affiliate_top_referrals', {
        p_wallet: walletAddress,
        p_limit: limit,
      });

      if (error) throw error;
      if (!data) return [];

      return data.map((row: Record<string, unknown>) => ({
        rank: Number(row.rank),
        walletAddress: String(row.wallet_address),
        joinedAt: String(row.joined_at),
        totalTickets: Number(row.total_tickets),
        totalSpentLamports: Number(row.total_spent_lamports),
        commissionGeneratedLamports: Number(row.commission_generated_lamports),
        isValidated: Boolean(row.is_validated),
      }));
    } catch (error) {
      console.error('Error fetching top referrals:', error);
      return [];
    }
  }

  async getWeeklyHistory(walletAddress: string, weeks: number = 8): Promise<WeeklyHistory[]> {
    try {
      const { data, error } = await supabase.rpc('get_affiliate_weekly_history', {
        p_wallet: walletAddress,
        p_weeks: weeks,
      });

      if (error) throw error;
      if (!data) return [];

      return data.map((row: Record<string, unknown>) => ({
        weekNumber: Number(row.week_number),
        weekStartDate: String(row.week_start_date),
        referralCount: Number(row.referral_count),
        earnedLamports: Number(row.earned_lamports),
        tier: Number(row.tier),
        isReleased: Boolean(row.is_released),
        isClaimable: Boolean(row.is_claimable),
      }));
    } catch (error) {
      console.error('Error fetching weekly history:', error);
      return [];
    }
  }

  formatLamportsToSOL(lamports: number): string {
    const sol = lamports / 1_000_000_000;
    return sol.toFixed(4);
  }

  formatSOLValue(lamports: number): string {
    const sol = lamports / 1_000_000_000;
    if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K`;
    if (sol >= 1) return sol.toFixed(2);
    return sol.toFixed(4);
  }

  shortenWallet(wallet: string): string {
    if (!wallet || wallet.length < 8) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  }

  getTierColor(tier: number): string {
    switch (tier) {
      case 1: return '#3b82f6';
      case 2: return '#f59e0b';
      case 3: return '#8b5cf6';
      case 4: return '#eab308';
      default: return '#3b82f6';
    }
  }

  getTierProgress(totalReferrals: number, currentTier: number): number {
    const thresholds = [0, 100, 1000, 5000];
    if (currentTier >= 4) return 100;

    const currentThreshold = thresholds[currentTier - 1];
    const nextThreshold = thresholds[currentTier];
    const progress = ((totalReferrals - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    return Math.min(100, Math.max(0, progress));
  }
}

export const affiliateDashboardService = new AffiliateDashboardService();
