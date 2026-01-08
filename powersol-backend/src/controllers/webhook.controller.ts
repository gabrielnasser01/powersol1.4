import { Request, Response } from 'express';
import { vrfService } from '@services/vrf.service.js';
import { sendSuccess } from '@utils/response.js';
import { logger } from '@utils/logger.js';

export class WebhookController {
  async handleSwitchboard(req: Request, res: Response): Promise<void> {
    const { requestId, randomness } = req.body;

    logger.info({ requestId }, 'Switchboard webhook received');

    const randomnessBuffer = Buffer.from(randomness, 'hex');

    await vrfService.processVRFCallback(requestId, randomnessBuffer);

    sendSuccess(res, { received: true });
  }

  async handleHelius(req: Request, res: Response): Promise<void> {
    logger.info({ body: req.body }, 'Helius webhook received');

    sendSuccess(res, { received: true });
  }
}

export const webhookController = new WebhookController();
