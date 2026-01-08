import { supabase, supabaseAdmin } from '@config/supabase.js';
import { NotFoundError, ConflictError } from '@utils/errors.js';
import { generateReferralCode } from '@utils/crypto.js';
import { loggers } from '@utils/logger.js';
import { auditService } from './audit.service.js';
import type {
  Affiliate,
  Referral,
  AffiliateStats,
  AffiliateDashboard,
} from '../types/affiliate.types.js';

const logger = loggers.affiliate;

export enum AffiliateTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
  TIER_4 = 4,
}

export interface AffiliateTierConfig {
  tier: AffiliateTier;
  minReferrals: number;
  maxReferrals: number | null;
  commissionRate: number;
  label: string;
}

export const AFFILIATE_TIER_CONFIGS: AffiliateTierConfig[] = [
  {
    tier: AffiliateTier.TIER_1,
    minReferrals: 0,
    maxReferrals: 99,
    commissionRate: 0.05,
    label: 'Tier 1 - Starter',
  },
  {
    tier: AffiliateTier.TIER_2,
    minReferrals: 100,
    maxReferrals: 999,
    commissionRate: 0.10,
    label: 'Tier 2 - Bronze',
  },
  {
    tier: AffiliateTier.TIER_3,
    minReferrals: 1000,
    maxReferrals: 4999,
    commissionRate: 0.20,
    label: 'Tier 3 - Silver',
  },
  {
    tier: AffiliateTier.TIER_4,
    minReferrals: 5000,
    maxReferrals: null,
    commissionRate: 0.30,
    label: 'Tier 4 - Gold',
  },
];

export function calculateAffiliateTier(validatedReferrals: number): AffiliateTier {
  for (const config of AFFILIATE_TIER_CONFIGS) {
    if (
      validatedReferrals >= config.minReferrals &&
      (config.maxReferrals === null || validatedReferrals <= config.maxReferrals)
    ) {
      return config.tier;
    }
  }
  return AffiliateTier.TIER_1;
}

export function getCommissionRate(tier: AffiliateTier): number {
  const config = AFFILIATE_TIER_CONFIGS.find(c => c.tier === tier);
  return config?.commissionRate || 0.05;
}

export function calculateAffiliateCommission(
  ticketPrice: bigint,
  tier: AffiliateTier
): bigint {
  const commissionRate = getCommissionRate(tier);
  const commission = (ticketPrice * BigInt(Math.floor(commissionRate * 10000))) / BigInt(10000);

  return commission;
}

export interface AffiliatePaymentBreakdown {
  reserved: bigint;
  commission: bigint;
  delta: bigint;
  tier: AffiliateTier;
  commissionRate: number;
}

export function calculateAffiliatePaymentBreakdown(
  ticketPrice: bigint,
  tier: AffiliateTier
): AffiliatePaymentBreakdown {
  const commissionRate = getCommissionRate(tier);

  const reserved = (ticketPrice * BigInt(30)) / BigInt(100);

  const commission = (ticketPrice * BigInt(Math.floor(commissionRate * 10000))) / BigInt(10000);

  const delta = reserved - commission;

  return {
    reserved,
    commission,
    delta,
    tier,
    commissionRate,
  };
}

export class AffiliateService {
  async getOrCreateAffiliate(userId: string): Promise<Affiliate> {
    const { data: existing } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    const referralCode = generateReferralCode();

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: userId,
        referral_code: referralCode,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, userId }, 'Failed to create affiliate');
      throw error;
    }

    logger.info({ affiliateId: data.id, userId }, 'Affiliate created');

    return data;
  }

  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return data;
  }

  async getAffiliateByCode(referralCode: string): Promise<Affiliate | null> {
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .eq('referral_code', referralCode)
      .maybeSingle();

    return data;
  }

  async getDashboard(userId: string): Promise<AffiliateDashboard> {
    const affiliate = await this.getOrCreateAffiliate(userId);

    const { data: statsData } = await supabase.rpc('get_affiliate_stats', {
      p_user_id: userId,
    });

    const stats: AffiliateStats = statsData?.[0] || {
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarned: BigInt(0),
      pendingEarnings: BigInt(0),
      tier: 1,
      referralCode: affiliate.referral_code,
      conversionRate: 0,
    };

    const { data: referrals } = await supabase
      .from('referrals')
      .select('*, referred_user:users(*)')
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: withdrawals } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .eq('status', 'PENDING')
      .order('requested_at', { ascending: false });

    return {
      affiliate,
      stats,
      recentReferrals:
        referrals?.map((r: any) => ({
          id: r.id,
          referred_user: {
            wallet_address: r.referred_user.wallet_address,
            username: r.referred_user.username,
          },
          tickets_bought: r.tickets_bought,
          commission_earned: BigInt(r.commission_earned),
          created_at: new Date(r.created_at),
        })) || [],
      pendingWithdrawals: withdrawals || [],
    };
  }

  async createReferral(
    affiliateId: string,
    referredUserId: string
  ): Promise<Referral> {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .insert({
        affiliate_id: affiliateId,
        referred_user_id: referredUserId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError('User already referred');
      }
      logger.error({ error, affiliateId, referredUserId }, 'Failed to create referral');
      throw error;
    }

    logger.info({ referralId: data.id, affiliateId }, 'Referral created');

    return data;
  }

  async addEarnings(affiliateId: string, amount: bigint): Promise<void> {
    const { error } = await supabaseAdmin.rpc('add_affiliate_earnings', {
      p_affiliate_id: affiliateId,
      p_amount: amount.toString(),
    });

    if (error) {
      logger.error({ error, affiliateId, amount }, 'Failed to add earnings');
      throw error;
    }

    logger.info({ affiliateId, amount }, 'Earnings added');
  }

  async requestWithdrawal(affiliateId: string, amount: bigint): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('affiliate_withdrawals')
      .insert({
        affiliate_id: affiliateId,
        amount: amount.toString(),
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, affiliateId, amount }, 'Failed to request withdrawal');
      throw error;
    }

    logger.info({ withdrawalId: data.id, affiliateId }, 'Withdrawal requested');

    return data.id;
  }

  async getAffiliateStats(userId: string): Promise<any> {
    const affiliate = await this.getOrCreateAffiliate(userId);

    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_affiliate_id', affiliate.id);

    const totalReferrals = referrals?.length || 0;
    const validatedReferrals = referrals?.filter(r => r.is_validated).length || 0;
    const totalTickets = referrals?.reduce((sum, r) => sum + r.total_tickets_purchased, 0) || 0;
    const totalVolume = referrals?.reduce((sum, r) => sum + Number(r.total_value_sol), 0) || 0;
    const totalCommissions = referrals?.reduce((sum, r) => sum + Number(r.total_commission_earned), 0) || 0;
    const conversionRate = totalReferrals > 0 ? (validatedReferrals / totalReferrals) * 100 : 0;

    const currentTier = affiliate.manual_tier || calculateAffiliateTier(validatedReferrals);

    return {
      totalReferrals,
      validatedReferrals,
      totalClicks: 0,
      totalTickets,
      totalVolume,
      totalCommissions,
      conversionRate,
      currentTier,
      commissionRate: getCommissionRate(currentTier),
      referralCode: affiliate.referral_code,
      pendingEarnings: Number(affiliate.pending_earnings),
      totalEarned: Number(affiliate.total_earned),
    };
  }

  async getAffiliateReferrals(userId: string, limit: number = 20): Promise<any[]> {
    const affiliate = await this.getOrCreateAffiliate(userId);

    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select(`
        *,
        referred_user:users(wallet_address)
      `)
      .eq('referrer_affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    return referrals?.map(r => ({
      id: r.id,
      walletAddress: r.referred_user.wallet_address?.slice(0, 8) + '...' + r.referred_user.wallet_address?.slice(-6),
      isValidated: r.is_validated,
      ticketsPurchased: r.total_tickets_purchased,
      totalSpent: Number(r.total_value_sol),
      commissionEarned: Number(r.total_commission_earned),
      firstPurchaseAt: r.first_purchase_at,
      createdAt: r.created_at,
    })) || [];
  }

  async getValidatedReferralsCount(affiliateId: string): Promise<number> {
    const { data, error } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_affiliate_id', affiliateId)
      .eq('is_validated', true);

    if (error) {
      logger.error({ error, affiliateId }, 'Failed to get validated referrals count');
      throw error;
    }

    return data || 0;
  }

  async getAffiliateTier(affiliateId: string): Promise<AffiliateTier> {
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('manual_tier')
      .eq('id', affiliateId)
      .single();

    if (affiliate?.manual_tier) {
      return affiliate.manual_tier as AffiliateTier;
    }

    const validatedCount = await this.getValidatedReferralsCount(affiliateId);
    return calculateAffiliateTier(validatedCount);
  }

  async setManualTier(
    affiliateId: string,
    tier: AffiliateTier | null,
    adminId?: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const oldTier = await this.getAffiliateTier(affiliateId);

    const { error } = await supabaseAdmin
      .from('affiliates')
      .update({ manual_tier: tier, updated_at: new Date().toISOString() })
      .eq('id', affiliateId);

    if (error) {
      logger.error({ error, affiliateId, tier }, 'Failed to set manual tier');
      throw new Error('Failed to set manual tier');
    }

    if (adminId) {
      try {
        await auditService.logTierChange({
          affiliateId,
          adminId,
          action: 'SET_MANUAL_TIER',
          oldTier,
          newTier: tier,
          reason,
          ipAddress,
          userAgent,
        });
      } catch (auditError) {
        logger.error({ auditError }, 'Failed to log tier change to audit, but tier was updated');
      }
    }

    logger.info({ affiliateId, tier, adminId }, 'Manual tier set successfully');
  }

  async removeManualTier(
    affiliateId: string,
    adminId?: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const oldTier = await this.getAffiliateTier(affiliateId);

    await this.setManualTier(affiliateId, null);

    if (adminId) {
      try {
        await auditService.logTierChange({
          affiliateId,
          adminId,
          action: 'REMOVE_MANUAL_TIER',
          oldTier,
          newTier: null,
          reason,
          ipAddress,
          userAgent,
        });
      } catch (auditError) {
        logger.error({ auditError }, 'Failed to log tier removal to audit, but tier was removed');
      }
    }

    logger.info({ affiliateId, adminId }, 'Manual tier removed, using automatic calculation');
  }

  async getAffiliateById(affiliateId: string): Promise<Affiliate> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Affiliate not found');
    }

    return data;
  }

  calculateAffiliateTier(validatedCount: number): AffiliateTier {
    return calculateAffiliateTier(validatedCount);
  }

  async calculateCommissionForTicket(
    affiliateId: string,
    ticketPrice: bigint
  ): Promise<bigint> {
    const tier = await this.getAffiliateTier(affiliateId);
    return calculateAffiliateCommission(ticketPrice, tier);
  }

  async calculatePaymentBreakdownForTicket(
    affiliateId: string,
    ticketPrice: bigint
  ): Promise<AffiliatePaymentBreakdown> {
    const tier = await this.getAffiliateTier(affiliateId);
    return calculateAffiliatePaymentBreakdown(ticketPrice, tier);
  }

  getTierInfo(tier: AffiliateTier): AffiliateTierConfig | undefined {
    return AFFILIATE_TIER_CONFIGS.find(c => c.tier === tier);
  }

  getNextTierInfo(currentTier: AffiliateTier): AffiliateTierConfig | null {
    const currentIndex = AFFILIATE_TIER_CONFIGS.findIndex(c => c.tier === currentTier);
    if (currentIndex === -1 || currentIndex === AFFILIATE_TIER_CONFIGS.length - 1) {
      return null;
    }
    return AFFILIATE_TIER_CONFIGS[currentIndex + 1];
  }
}

export const affiliateService = new AffiliateService();
