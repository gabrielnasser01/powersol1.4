import { Response } from 'express';
import { auditService } from '@services/audit.service.js';
import { sendSuccess } from '@utils/response.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class AuditController {
  async getAffiliateHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { affiliateId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await auditService.getAffiliateHistory(affiliateId, limit);

    sendSuccess(res, {
      affiliateId,
      history,
      total: history.length,
    });
  }

  async getRecentAdminActions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const adminId = req.query.adminId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const actions = await auditService.getRecentAdminActions(adminId, limit);

    sendSuccess(res, {
      actions,
      total: actions.length,
      adminId: adminId || 'all',
    });
  }

  async getAuditStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await auditService.getAuditStats();
    sendSuccess(res, stats);
  }

  async getAdminActivitySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const summary = await auditService.getAdminActivitySummary();
    sendSuccess(res, {
      admins: summary,
      total: summary.length,
    });
  }
}

export const auditController = new AuditController();
