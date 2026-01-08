export interface AffiliateTierAudit {
  id: string;
  affiliate_id: string;
  admin_id: string;
  action: 'SET_MANUAL_TIER' | 'REMOVE_MANUAL_TIER';
  old_tier: number | null;
  new_tier: number | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CreateAuditLogParams {
  affiliateId: string;
  adminId: string;
  action: 'SET_MANUAL_TIER' | 'REMOVE_MANUAL_TIER';
  oldTier: number | null;
  newTier: number | null;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}
