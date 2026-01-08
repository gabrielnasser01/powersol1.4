import { Router } from 'express';
import { affiliateController } from '@controllers/affiliate.controller.js';
import { authenticate } from '@middleware/auth.middleware.js';
import { requireAdmin } from '@middleware/admin.middleware.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.get(
  '/dashboard',
  authenticate,
  asyncHandler(affiliateController.getDashboard.bind(affiliateController))
);

router.get(
  '/referrals',
  authenticate,
  asyncHandler(affiliateController.getReferrals.bind(affiliateController))
);

router.get(
  '/earnings',
  authenticate,
  asyncHandler(affiliateController.getEarnings.bind(affiliateController))
);

router.post(
  '/withdraw/prepare',
  authenticate,
  asyncHandler(affiliateController.prepareWithdraw.bind(affiliateController))
);

router.post(
  '/withdraw/submit',
  authenticate,
  asyncHandler(affiliateController.submitWithdraw.bind(affiliateController))
);

router.get(
  '/stats',
  authenticate,
  asyncHandler(affiliateController.getStats.bind(affiliateController))
);

router.get(
  '/:affiliateId/tier',
  authenticate,
  requireAdmin,
  asyncHandler(affiliateController.getAffiliateTier.bind(affiliateController))
);

router.post(
  '/:affiliateId/tier/set',
  authenticate,
  requireAdmin,
  asyncHandler(affiliateController.setManualTier.bind(affiliateController))
);

router.delete(
  '/:affiliateId/tier',
  authenticate,
  requireAdmin,
  asyncHandler(affiliateController.removeManualTier.bind(affiliateController))
);

export default router;
