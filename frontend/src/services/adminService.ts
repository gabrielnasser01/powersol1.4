const ADMIN_WALLETS = [
  'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7',
  '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ',
];

export function isAdminWallet(wallet: string | null): boolean {
  if (!wallet) return false;
  return ADMIN_WALLETS.includes(wallet);
}

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`;

async function adminFetch(params: Record<string, string>, wallet: string, method = 'GET', body?: any) {
  const query = new URLSearchParams(params);
  query.set('wallet', wallet);
  const url = `${BASE_URL}?${query.toString()}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

let _adminWallet: string | null = null;

export function setAdminWallet(wallet: string | null) {
  _adminWallet = wallet;
}

function getWallet(): string {
  if (!_adminWallet) throw new Error('Admin wallet not set');
  return _adminWallet;
}

export interface UserRanking {
  id: string;
  wallet_address: string;
  display_name: string | null;
  power_points: number;
  login_streak: number;
  last_login_date: string | null;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  total_tickets: number;
  total_spent_sol: number;
  total_won_lamports: number;
  missions_completed: number;
}

export interface AffiliateRanking {
  affiliate_id: string;
  user_id: string;
  wallet_address: string;
  referral_code: string;
  total_earned: number;
  pending_earnings: number;
  total_claimed_sol: number;
  manual_tier: number | null;
  referral_count: number;
  total_referral_value_sol: number;
  total_commission_earned: number;
  created_at: string;
}

export interface RevenueData {
  date: string;
  ticket_revenue_lamports: number;
  dev_treasury_lamports: number;
  delta_lamports: number;
  ticket_count: number;
}

export interface WalletActivity {
  wallet_address: string;
  label?: string;
  date: string;
  lamports: number;
}

export interface SybilAlert {
  affiliate_id: string;
  wallet_address: string;
  referral_code: string;
  manual_tier: number | null;
  total_earned: number;
  total_referrals: number;
  validated_referrals: number;
  single_ticket_referrals: number;
  zero_ticket_referrals: number;
  single_ticket_rate: number;
  rapid_signups: { wallet: string; gap_minutes: number; created: string }[];
  single_ticket_wallets: { wallet: string; tickets: number; sol: number; created: string }[];
  zero_ticket_wallets: { wallet: string; tickets: number; sol: number; created: string }[];
  low_value_refs: { wallet: string; tickets: number; sol: number; created: string }[];
  risk_score: number;
}

export interface MissionAlert {
  wallet_address: string;
  mission_key: string;
  mission_name: string;
  issue: string;
}

class AdminService {
  async getPlatformStats() {
    return adminFetch({ action: 'stats' }, getWallet());
  }

  async getAllUsers(): Promise<UserRanking[]> {
    return adminFetch({ action: 'users' }, getWallet());
  }

  async getUserMissionDetails(walletAddress: string) {
    return adminFetch({ action: 'user-missions', target_wallet: walletAddress }, getWallet());
  }

  async getAffiliateRankings(): Promise<AffiliateRanking[]> {
    return adminFetch({ action: 'affiliates' }, getWallet());
  }

  async getAffiliateNetwork(affiliateId: string) {
    return adminFetch({ action: 'affiliate-network', affiliate_id: affiliateId }, getWallet());
  }

  async getRevenueData(period: 'daily' | 'weekly' | 'monthly'): Promise<RevenueData[]> {
    return adminFetch({ action: 'revenue', period }, getWallet());
  }

  async getWalletHeatmap(): Promise<WalletActivity[]> {
    return adminFetch({ action: 'heatmap' }, getWallet());
  }

  async getMissionAlerts(): Promise<MissionAlert[]> {
    return adminFetch({ action: 'mission-alerts' }, getWallet());
  }

  async getExpiredUnclaimedPrizes() {
    return adminFetch({ action: 'expired-prizes' }, getWallet());
  }

  async getUnclaimedAffiliateRewards() {
    return adminFetch({ action: 'unclaimed-affiliate-rewards' }, getWallet());
  }

  async getSybilAnalysis(): Promise<SybilAlert[]> {
    return adminFetch({ action: 'sybil-analysis' }, getWallet());
  }

  async banUser(targetWallet: string, adminWallet: string, reason: string) {
    return adminFetch({ action: 'ban-user' }, adminWallet, 'POST', { target_wallet: targetWallet, reason });
  }

  async unbanUser(targetWallet: string, adminWallet: string) {
    return adminFetch({ action: 'unban-user' }, adminWallet, 'POST', { target_wallet: targetWallet });
  }
}

export const adminService = new AdminService();
