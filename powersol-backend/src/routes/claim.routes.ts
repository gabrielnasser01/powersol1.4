import { Router } from 'express';
import { claimController } from '@controllers/claim.controller.js';
import { authenticate } from '@middleware/auth.middleware.js';
import { claimRateLimit } from '@middleware/rateLimit.middleware.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.post(
  '/prepare',
  authenticate,
  claimRateLimit,
  asyncHandler(claimController.prepareClaimTransaction.bind(claimController))
);

router.post(
  '/submit',
  authenticate,
  claimRateLimit,
  asyncHandler(claimController.submitSignedClaim.bind(claimController))
);

router.get(
  '/my-claims',
  authenticate,
  asyncHandler(claimController.getMyClaims.bind(claimController))
);

router.get(
  '/:id/status',
  asyncHandler(claimController.getClaimStatus.bind(claimController))
);

export default router;
