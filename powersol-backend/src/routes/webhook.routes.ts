import { Router } from 'express';
import { webhookController } from '@controllers/webhook.controller.js';
import { asyncHandler } from '@utils/helpers.js';

const router = Router();

router.post(
  '/switchboard',
  asyncHandler(webhookController.handleSwitchboard.bind(webhookController))
);

router.post(
  '/helius',
  asyncHandler(webhookController.handleHelius.bind(webhookController))
);

export default router;
