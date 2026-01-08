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
  affiliate_id: string;
  referred_user_id: string;
  is_validated: boolean;
  tickets_purchased: number;
  total_spent: string;
  created_at: string;
}

export interface AffiliateStats {
  totalReferrals: number;
  validatedReferrals: number;
  totalEarned: string;
  pendingEarnings: string;
  currentTier: number;
  commissionRate: number;
}

export interface AffiliateDashboard {
  affiliate: Affiliate;
  stats: AffiliateStats;
  recentReferrals: Referral[];
}
