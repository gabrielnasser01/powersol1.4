import { Router } from 'express';
import { missionController } from '@controllers/mission.controller.js';
import { authenticate, optionalAuth } from '@middleware/auth.middleware.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(missionController.getAllMissions.bind(missionController))
);

router.get(
  '/type/:type',
  optionalAuth,
  asyncHandler(missionController.getMissionsByType.bind(missionController))
);

router.get(
  '/my-progress',
  authenticate,
  asyncHandler(missionController.getMyProgress.bind(missionController))
);

router.post(
  '/:missionKey/complete',
  authenticate,
  asyncHandler(missionController.completeMission.bind(missionController))
);

router.post(
  '/ticket-purchase',
  authenticate,
  asyncHandler(missionController.recordTicketPurchase.bind(missionController))
);

router.post(
  '/donation',
  authenticate,
  asyncHandler(missionController.recordDonation.bind(missionController))
);

router.post(
  '/login',
  authenticate,
  asyncHandler(missionController.completeLogin.bind(missionController))
);

router.post(
  '/transparency-visit',
  authenticate,
  asyncHandler(missionController.completeTransparencyVisit.bind(missionController))
);

export default router;
