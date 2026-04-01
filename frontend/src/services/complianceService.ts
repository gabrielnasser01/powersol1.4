const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compliance`;

const headers: Record<string, string> = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function complianceFetch(params: Record<string, string>, method = 'GET', body?: unknown) {
  const query = new URLSearchParams(params);
  const url = `${BASE_URL}?${query.toString()}`;

  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Compliance request failed');
  }

  return res.json();
}

export interface ComplianceStatus {
  age_verified: boolean;
  age_verified_at: string | null;
  risk_level: string;
  is_sanctioned: boolean;
  risk_checked_at: string | null;
  risk_expires_at: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  block_source: string | null;
}

export interface WalletRiskResult {
  allowed: boolean;
  risk_level: string;
  cached?: boolean;
  checked_at?: string;
  reason?: string;
  source?: string;
}

export interface AdminComplianceOverview {
  total_age_verified: number;
  total_wallet_checks: number;
  total_blocked: number;
  risk_breakdown: Record<string, number>;
  recent_audit: AuditLogEntry[];
  blocked_wallets: BlockedWallet[];
}

export interface AuditLogEntry {
  id: string;
  wallet_address: string;
  action: string;
  performed_by: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BlockedWallet {
  id: string;
  wallet_address: string;
  reason: string;
  blocked_by: string;
  source: string;
  blocked_at: string;
  is_active: boolean;
}

export interface AgeVerification {
  id: string;
  wallet_address: string;
  signature: string;
  message_signed: string;
  verified_at: string;
  is_valid: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export interface WalletCheck {
  id: string;
  wallet_address: string;
  check_type: string;
  risk_level: string;
  is_sanctioned: boolean;
  details: Record<string, unknown>;
  checked_at: string;
  expires_at: string;
}

const AGE_VERIFICATION_MESSAGE = (wallet: string, timestamp: string) =>
  `I confirm that I am at least 18 years old and agree to the terms of service of PowerSOL.\n\nWallet: ${wallet}\nTimestamp: ${timestamp}`;

const statusCache = new Map<string, { data: ComplianceStatus; ts: number }>();
const STATUS_CACHE_TTL = 60_000;

class ComplianceService {
  getAgeVerificationMessage(wallet: string): string {
    return AGE_VERIFICATION_MESSAGE(wallet, new Date().toISOString());
  }

  async checkAgeVerification(wallet: string): Promise<boolean> {
    const result = await complianceFetch({ action: 'check-age-verification', wallet });
    return result.verified === true;
  }

  async submitAgeVerification(wallet: string, signature: string, message: string): Promise<boolean> {
    const result = await complianceFetch(
      { action: 'submit-age-verification' },
      'POST',
      { wallet_address: wallet, signature, message_signed: message }
    );
    return result.success === true;
  }

  async checkWalletRisk(wallet: string): Promise<WalletRiskResult> {
    return complianceFetch({ action: 'check-wallet-risk', wallet });
  }

  async getComplianceStatus(wallet: string): Promise<ComplianceStatus> {
    const cached = statusCache.get(wallet);
    if (cached && Date.now() - cached.ts < STATUS_CACHE_TTL) {
      return cached.data;
    }

    const data = await complianceFetch({ action: 'compliance-status', wallet });
    statusCache.set(wallet, { data, ts: Date.now() });
    return data;
  }

  clearCache(wallet?: string) {
    if (wallet) {
      statusCache.delete(wallet);
    } else {
      statusCache.clear();
    }
  }

  async canInteract(wallet: string): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getComplianceStatus(wallet);

    if (status.is_blocked) {
      return { allowed: false, reason: status.block_reason || 'Wallet blocked' };
    }

    if (!status.age_verified) {
      return { allowed: false, reason: 'Age verification required' };
    }

    if (status.risk_level === 'sanctioned') {
      return { allowed: false, reason: 'Wallet flagged by sanctions screening' };
    }

    if (status.risk_level === 'unchecked') {
      const riskResult = await this.checkWalletRisk(wallet);
      if (!riskResult.allowed) {
        return { allowed: false, reason: 'Wallet failed risk assessment' };
      }
    }

    return { allowed: true };
  }

  async getAdminOverview(adminWallet: string): Promise<AdminComplianceOverview> {
    return complianceFetch({ action: 'admin-overview', wallet: adminWallet });
  }

  async getAdminVerifications(adminWallet: string, page = 1): Promise<{ data: AgeVerification[]; total: number }> {
    return complianceFetch({ action: 'admin-verifications', wallet: adminWallet, page: String(page) });
  }

  async getAdminWalletChecks(adminWallet: string, page = 1): Promise<{ data: WalletCheck[]; total: number }> {
    return complianceFetch({ action: 'admin-wallet-checks', wallet: adminWallet, page: String(page) });
  }

  async adminBlockWallet(adminWallet: string, targetWallet: string, reason: string): Promise<void> {
    await complianceFetch(
      { action: 'admin-block-wallet', wallet: adminWallet },
      'POST',
      { target_wallet: targetWallet, reason }
    );
  }

  async adminUnblockWallet(adminWallet: string, targetWallet: string): Promise<void> {
    await complianceFetch(
      { action: 'admin-unblock-wallet', wallet: adminWallet },
      'POST',
      { target_wallet: targetWallet }
    );
  }

  async adminRevokeAge(adminWallet: string, targetWallet: string, reason: string): Promise<void> {
    await complianceFetch(
      { action: 'admin-revoke-age', wallet: adminWallet },
      'POST',
      { target_wallet: targetWallet, reason }
    );
  }

  async getAdminAuditLog(adminWallet: string, page = 1, targetWallet?: string): Promise<{ data: AuditLogEntry[]; total: number }> {
    const params: Record<string, string> = { action: 'admin-audit-log', wallet: adminWallet, page: String(page) };
    if (targetWallet) params.target_wallet = targetWallet;
    return complianceFetch(params);
  }
}

export const complianceService = new ComplianceService();
