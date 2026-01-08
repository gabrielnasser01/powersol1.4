import { supabaseAdmin } from '@config/supabase.js';
import { loggers } from '@utils/logger.js';
import type { CreateAuditLogParams, AffiliateTierAudit } from '../types/audit.types.js';

const logger = loggers.audit || loggers.default;

export class AuditService {
  async logTierChange(params: CreateAuditLogParams): Promise<void> {
    const {
      affiliateId,
      adminId,
      action,
      oldTier,
      newTier,
      reason,
      ipAddress,
      userAgent,
    } = params;

    try {
      const { error } = await supabaseAdmin
        .from('affiliate_tier_audit')
        .insert({
          affiliate_id: affiliateId,
          admin_id: adminId,
          action,
          old_tier: oldTier,
          new_tier: newTier,
          reason: reason || null,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
        });

      if (error) {
        logger.error({ error, params }, 'Failed to create audit log');
        throw new Error('Failed to create audit log');
      }

      logger.info(
        {
          affiliateId,
          adminId,
          action,
          oldTier,
          newTier,
        },
        'Tier change logged to audit'
      );
    } catch (error) {
      logger.error({ error, params }, 'Error logging tier change');
      throw error;
    }
  }

  async getAffiliateHistory(
    affiliateId: string,
    limit: number = 50
  ): Promise<AffiliateTierAudit[]> {
    const { data, error } = await supabaseAdmin.rpc('get_affiliate_tier_audit_history', {
      p_affiliate_id: affiliateId,
      p_limit: limit,
    });

    if (error) {
      logger.error({ error, affiliateId }, 'Failed to get affiliate audit history');
      throw new Error('Failed to get audit history');
    }

    return data || [];
  }

  async getRecentAdminActions(
    adminId?: string,
    limit: number = 100
  ): Promise<AffiliateTierAudit[]> {
    const { data, error } = await supabaseAdmin.rpc('get_recent_admin_actions', {
      p_admin_id: adminId || null,
      p_limit: limit,
    });

    if (error) {
      logger.error({ error, adminId }, 'Failed to get admin actions');
      throw new Error('Failed to get admin actions');
    }

    return data || [];
  }

  async getAuditStats(): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('affiliate_tier_audit_stats')
      .select('*')
      .single();

    if (error) {
      logger.error({ error }, 'Failed to get audit stats');
      throw new Error('Failed to get audit stats');
    }

    return data;
  }

  async getAdminActivitySummary(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('admin_activity_summary')
      .select('*');

    if (error) {
      logger.error({ error }, 'Failed to get admin activity summary');
      throw new Error('Failed to get admin activity summary');
    }

    return data || [];
  }
}

export const auditService = new AuditService();
