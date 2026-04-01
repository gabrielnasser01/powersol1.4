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
  expired_rewards_sol: number;
  expired_weeks: number;
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

export interface AffiliateApplication {
  id: string;
  wallet_address: string;
  full_name: string;
  email: string;
  country: string | null;
  social_media: string | null;
  marketing_experience: string | null;
  marketing_strategy: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionAlert {
  wallet_address: string;
  mission_key: string;
  mission_name: string;
  issue: string;
}

export interface WhaleConcentration {
  user: number;
  total: number;
  pct: number;
}

export interface WhaleUser {
  wallet_address: string;
  concentration: Record<string, WhaleConcentration>;
  overall_concentration: number;
  total_current_tickets: number;
  total_all_time_tickets: number;
  global_ticket_share: number;
  prizes_won: number;
  prizes_won_lamports: number;
  win_rate: number;
  whale_score: number;
}

export interface WhaleAnalysis {
  users: WhaleUser[];
  round_totals: Record<string, number>;
  lottery_types: string[];
}

export interface WhaleHistoryEntry {
  wallet_address: string;
  peak_score: number;
  peak_date: string;
  latest_score: number;
  latest_date: string;
  snapshots: number;
  peak_concentration: number;
  peak_global_share: number;
  peak_win_rate: number;
  all_time_tickets: number;
  prizes_won: number;
  prizes_won_lamports: number;
}

export interface WhaleHistoryTimeline {
  date: string;
  score: number;
  concentration: number;
  global_share: number;
}

export interface WhaleHistoryData {
  ranking: WhaleHistoryEntry[];
  timeline: Record<string, WhaleHistoryTimeline[]>;
  total_snapshots: number;
}

export interface ComplianceStats {
  totalWarnings: number;
  activeWarnings: number;
  totalReports: number;
  openReports: number;
  totalOfacChecks: number;
  ofacFlagged: number;
  ageVerified: number;
  totalUsers: number;
  recentWarnings: ComplianceWarning[];
  recentReports: ComplianceReport[];
  flaggedUsers: FlaggedUser[];
}

export interface FlaggedUser {
  wallet_address: string;
  display_name: string | null;
  compliance_status: string;
  is_banned: boolean;
  ofac_flagged: boolean;
  age_verified: boolean;
  created_at: string;
}

export interface ComplianceWarning {
  id: string;
  wallet_address: string;
  warning_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  issued_by: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  wallet_address: string;
  report_type: string;
  title: string;
  details: string;
  evidence: any;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_by: string;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfacCheck {
  id: string;
  wallet_address: string;
  check_type: string;
  is_flagged: boolean;
  match_details: any;
  checked_by: string | null;
  data_source: string;
  created_at: string;
}

export interface AgeVerification {
  id: string;
  wallet_address: string;
  signature: string;
  message_signed: string;
  verified_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface WalletComplianceSummary {
  user: FlaggedUser | null;
  warnings: ComplianceWarning[];
  reports: ComplianceReport[];
  ofac_checks: OfacCheck[];
  age_verification: AgeVerification | null;
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

  async getWhaleAnalysis(): Promise<WhaleAnalysis> {
    return adminFetch({ action: 'whale-analysis' }, getWallet());
  }

  async saveWhaleSnapshot(users: WhaleUser[]): Promise<{ success: boolean; saved: number; date: string }> {
    return adminFetch({ action: 'save-whale-snapshot' }, getWallet(), 'POST', { users });
  }

  async getWhaleHistory(days = 30): Promise<WhaleHistoryData> {
    return adminFetch({ action: 'whale-history', days: String(days) }, getWallet());
  }

  async banUser(targetWallet: string, adminWallet: string, reason: string) {
    return adminFetch({ action: 'ban-user' }, adminWallet, 'POST', { target_wallet: targetWallet, reason });
  }

  async unbanUser(targetWallet: string, adminWallet: string) {
    return adminFetch({ action: 'unban-user' }, adminWallet, 'POST', { target_wallet: targetWallet });
  }

  async updateAffiliateTier(affiliateId: string, newTier: number): Promise<{ success: boolean }> {
    return adminFetch({ action: 'update-tier' }, getWallet(), 'POST', { affiliate_id: affiliateId, new_tier: newTier });
  }

  async getApplications(status: 'all' | 'pending' | 'approved' | 'rejected' = 'all'): Promise<AffiliateApplication[]> {
    return adminFetch({ action: 'applications', status }, getWallet());
  }

  async updateReferralCode(affiliateId: string, newCode: string): Promise<{ success: boolean; new_code: string }> {
    return adminFetch({ action: 'update-referral-code' }, getWallet(), 'POST', { affiliate_id: affiliateId, new_code: newCode });
  }

  async reviewApplication(applicationId: string, decision: 'approved' | 'rejected', adminNotes?: string): Promise<{ success: boolean }> {
    return adminFetch({ action: 'review-application' }, getWallet(), 'POST', {
      application_id: applicationId,
      decision,
      admin_notes: adminNotes,
    });
  }

  async getComplianceStats(): Promise<ComplianceStats> {
    return adminFetch({ action: 'compliance-stats' }, getWallet());
  }

  async runOfacCheck(walletAddress: string): Promise<{ wallet_address: string; is_flagged: boolean; match_details: any; checked_at: string }> {
    return adminFetch({ action: 'ofac-check' }, getWallet(), 'POST', { wallet_address: walletAddress });
  }

  async getOfacCheckHistory(walletAddress?: string): Promise<OfacCheck[]> {
    const params: Record<string, string> = { action: 'ofac-check-history' };
    if (walletAddress) params.target_wallet = walletAddress;
    return adminFetch(params, getWallet());
  }

  async issueWarning(walletAddress: string, warningType: string, severity: string, description: string): Promise<{ success: boolean }> {
    return adminFetch({ action: 'issue-warning' }, getWallet(), 'POST', {
      wallet_address: walletAddress,
      warning_type: warningType,
      severity,
      description,
    });
  }

  async resolveWarning(warningId: string): Promise<{ success: boolean }> {
    return adminFetch({ action: 'resolve-warning' }, getWallet(), 'POST', { warning_id: warningId });
  }

  async getComplianceWarnings(walletAddress?: string, showResolved = false): Promise<ComplianceWarning[]> {
    const params: Record<string, string> = { action: 'compliance-warnings', show_resolved: String(showResolved) };
    if (walletAddress) params.target_wallet = walletAddress;
    return adminFetch(params, getWallet());
  }

  async createReport(data: { wallet_address: string; report_type: string; title: string; details: string; priority?: string; evidence?: any }): Promise<{ success: boolean }> {
    return adminFetch({ action: 'create-report' }, getWallet(), 'POST', data);
  }

  async updateReport(reportId: string, updates: { status?: string; resolution_notes?: string; assigned_to?: string }): Promise<{ success: boolean }> {
    return adminFetch({ action: 'update-report' }, getWallet(), 'POST', { report_id: reportId, ...updates });
  }

  async getComplianceReports(walletAddress?: string, status = 'all'): Promise<ComplianceReport[]> {
    const params: Record<string, string> = { action: 'compliance-reports', status };
    if (walletAddress) params.target_wallet = walletAddress;
    return adminFetch(params, getWallet());
  }

  async getAgeVerifications(walletAddress?: string): Promise<AgeVerification[]> {
    const params: Record<string, string> = { action: 'age-verifications' };
    if (walletAddress) params.target_wallet = walletAddress;
    return adminFetch(params, getWallet());
  }

  async recordAgeVerification(walletAddress: string, signature: string, messageSigned: string): Promise<{ success: boolean }> {
    return adminFetch({ action: 'record-age-verification' }, getWallet(), 'POST', {
      wallet_address: walletAddress,
      signature,
      message_signed: messageSigned,
    });
  }

  async updateComplianceStatus(walletAddress: string, status: string): Promise<{ success: boolean }> {
    return adminFetch({ action: 'update-compliance-status' }, getWallet(), 'POST', {
      wallet_address: walletAddress,
      compliance_status: status,
    });
  }

  async getWalletComplianceSummary(walletAddress: string): Promise<WalletComplianceSummary> {
    return adminFetch({ action: 'wallet-compliance-summary', target_wallet: walletAddress }, getWallet());
  }
}

export const adminService = new AdminService();
