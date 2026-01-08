import { Router } from 'express';
import { lotteryController } from '@controllers/lottery.controller.js';
import { optionalAuth } from '@middleware/auth.middleware.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(lotteryController.getAllLotteries.bind(lotteryController))
);

router.get(
  '/active',
  optionalAuth,
  asyncHandler(lotteryController.getActiveLotteries.bind(lotteryController))
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(lotteryController.getLotteryById.bind(lotteryController))
);

router.get(
  '/:id/stats',
  optionalAuth,
  asyncHandler(lotteryController.getLotteryStats.bind(lotteryController))
);

router.get(
  '/:id/winners',
  optionalAuth,
  asyncHandler(lotteryController.getWinners.bind(lotteryController))
);

router.post(
  '/:id/draw',
  asyncHandler(lotteryController.drawLottery.bind(lotteryController))
);

export default router;
