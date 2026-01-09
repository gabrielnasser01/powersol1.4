export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  total_earned: string;
  pending_earnings: string;
  manual_tier: number | null;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  affiliate_id?: string;
  referred_user_id?: string;
  referred_user?: {
    wallet_address: string;
    username: string | null;
  };
  is_validated?: boolean;
  tickets_purchased?: number;
  tickets_bought?: number;
  total_spent?: string;
  commission_earned?: bigint | string;
  created_at: string | Date;
}

export interface AffiliateStats {
  totalReferrals: number;
  activeReferrals?: number;
  validatedReferrals?: number;
  totalEarned: string | bigint;
  pendingEarnings: string | bigint;
  tier?: number;
  currentTier?: number;
  commissionRate?: number;
  referralCode?: string;
  conversionRate?: number;
}

export interface AffiliateDashboard {
  affiliate: Affiliate;
  stats: AffiliateStats;
  recentReferrals: Referral[];
  pendingWithdrawals?: unknown[];
}
