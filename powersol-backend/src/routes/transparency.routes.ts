import { Router } from 'express';
import { transparencyController } from '@controllers/transparency.controller.js';
import { optionalAuth } from '@middleware/auth.middleware.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.get(
  '/draws',
  optionalAuth,
  asyncHandler(transparencyController.getDraws.bind(transparencyController))
);

router.get(
  '/draws/:id',
  optionalAuth,
  asyncHandler(transparencyController.getDrawById.bind(transparencyController))
);

router.get(
  '/vrf',
  optionalAuth,
  asyncHandler(transparencyController.getVRFInfo.bind(transparencyController))
);

router.get(
  '/stats',
  optionalAuth,
  asyncHandler(transparencyController.getStats.bind(transparencyController))
);

router.get(
  '/on-chain/:address',
  optionalAuth,
  asyncHandler(transparencyController.getOnChainData.bind(transparencyController))
);

export default router;
