import { Response } from 'express';
import { lotteryService } from '@services/lottery.service.js';
import { vrfService } from '@services/vrf.service.js';
import { sendSuccess } from '@utils/response.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class LotteryController {
  async getAllLotteries(req: AuthenticatedRequest, res: Response): Promise<void> {
    const lotteries = await lotteryService.getAllLotteries();
    sendSuccess(res, lotteries);
  }

  async getActiveLotteries(req: AuthenticatedRequest, res: Response): Promise<void> {
    const lotteries = await lotteryService.getActiveLotteries();
    sendSuccess(res, lotteries);
  }

  async getLotteryById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const lottery = await lotteryService.getLotteryById(id);
    sendSuccess(res, lottery);
  }

  async getLotteryStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const stats = await lotteryService.getLotteryStats(id);
    sendSuccess(res, stats);
  }

  async getWinners(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const winners = await lotteryService.getWinners(id);
    sendSuccess(res, winners);
  }

  async drawLottery(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const requestId = await vrfService.requestRandomness(id);

    sendSuccess(res, {
      message: 'Draw initiated',
      requestId,
    });
  }
}

export const lotteryController = new LotteryController();
