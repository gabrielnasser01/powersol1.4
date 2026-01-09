import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { affiliateService } from '@services/affiliate.service.js';
import { solanaService } from '@services/solana.service.js';
import { sendSuccess } from '@utils/response.js';
import { ValidationError } from '@utils/errors.js';
import { solToLamports } from '@utils/helpers.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class AffiliateController {
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const dashboard = await affiliateService.getDashboard(userId);
    sendSuccess(res, dashboard);
  }

  async getReferrals(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    const referrals = await affiliateService.getAffiliateReferrals(userId, limit);
    sendSuccess(res, referrals);
  }

  async getEarnings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const affiliate = await affiliateService.getAffiliateByUserId(userId);

    if (!affiliate) {
      throw new ValidationError('Not an affiliate');
    }

    sendSuccess(res, {
      totalEarned: affiliate.total_earned,
      pendingEarnings: affiliate.pending_earnings,
    });
  }

  async prepareWithdraw(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { amount } = req.body;
    const userId = req.user!.userId;
    const userWallet = req.user!.wallet;

    const affiliate = await affiliateService.getAffiliateByUserId(userId);

    if (!affiliate) {
      throw new ValidationError('Not an affiliate');
    }

    const amountLamports = solToLamports(amount);

    if (amountLamports > BigInt(affiliate.pending_earnings || 0)) {
      throw new ValidationError('Insufficient balance');
    }

    const withdrawalId = await affiliateService.requestWithdrawal(
      affiliate.id,
      amountLamports
    );

    const claimerPublicKey = new PublicKey(userWallet);
    const { serializedTx, blockhash } = await solanaService.prepareClaimTransactionForUserSign(
      claimerPublicKey,
      amountLamports
    );

    sendSuccess(res, {
      withdrawalId,
      serializedTx,
      blockhash,
      amount: amountLamports,
    });
  }

  async submitWithdraw(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { withdrawalId, signedTx } = req.body;
    const userId = req.user!.userId;

    if (!withdrawalId || !signedTx) {
      throw new ValidationError('withdrawalId and signedTx are required');
    }

    const affiliate = await affiliateService.getAffiliateByUserId(userId);

    if (!affiliate) {
      throw new ValidationError('Not an affiliate');
    }

    const result = await solanaService.submitSignedClaimTransaction(signedTx);

    sendSuccess(res, {
      txSignature: result.signature,
      confirmed: result.confirmed,
      status: 'COMPLETED',
    });
  }

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const stats = await affiliateService.getAffiliateStats(userId);
    sendSuccess(res, stats);
  }

  async setManualTier(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { affiliateId } = req.params;
    const { tier, reason } = req.body;

    if (!tier || tier < 1 || tier > 4) {
      throw new ValidationError('Invalid tier. Must be 1-4');
    }

    const adminId = req.user!.userId;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    await affiliateService.setManualTier(
      affiliateId,
      tier,
      adminId,
      reason,
      ipAddress,
      userAgent
    );

    const updatedAffiliate = await affiliateService.getAffiliateById(affiliateId);
    const effectiveTier = await affiliateService.getAffiliateTier(affiliateId);

    sendSuccess(res, {
      message: 'Manual tier set successfully',
      affiliateId,
      manualTier: tier,
      effectiveTier,
      affiliate: updatedAffiliate,
    });
  }

  async removeManualTier(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { affiliateId } = req.params;
    const { reason } = req.body;

    const adminId = req.user!.userId;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    await affiliateService.removeManualTier(
      affiliateId,
      adminId,
      reason,
      ipAddress,
      userAgent
    );

    const updatedAffiliate = await affiliateService.getAffiliateById(affiliateId);
    const effectiveTier = await affiliateService.getAffiliateTier(affiliateId);

    sendSuccess(res, {
      message: 'Manual tier removed, using automatic calculation',
      affiliateId,
      manualTier: null,
      effectiveTier,
      affiliate: updatedAffiliate,
    });
  }

  async getAffiliateTier(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { affiliateId } = req.params;

    const affiliate = await affiliateService.getAffiliateById(affiliateId);
    const effectiveTier = await affiliateService.getAffiliateTier(affiliateId);
    const validatedCount = await affiliateService.getValidatedReferralsCount(affiliateId);

    sendSuccess(res, {
      affiliateId,
      manualTier: (affiliate as any).manual_tier || null,
      effectiveTier,
      validatedReferrals: validatedCount,
      calculatedTier: await affiliateService.calculateAffiliateTier(validatedCount),
    });
  }
}

export const affiliateController = new AffiliateController();
