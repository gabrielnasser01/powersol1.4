import { Router } from 'express';
import { auditController } from '@controllers/audit.controller.js';
import { authenticate } from '@middleware/auth.middleware.js';
import { requireAdmin } from '@middleware/admin.middleware.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.get(
  '/affiliates/:affiliateId',
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getAffiliateHistory.bind(auditController))
);

router.get(
  '/actions',
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getRecentAdminActions.bind(auditController))
);

router.get(
  '/stats',
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getAuditStats.bind(auditController))
);

router.get(
  '/admins',
  authenticate,
  requireAdmin,
  asyncHandler(auditController.getAdminActivitySummary.bind(auditController))
);

export default router;
