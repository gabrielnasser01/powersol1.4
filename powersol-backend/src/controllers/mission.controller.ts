import { Response } from 'express';
import { missionService } from '@services/mission.service.js';
import { sendSuccess } from '@utils/response.js';
import { ValidationError } from '@utils/errors.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class MissionController {
  async getAllMissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (userId) {
      const missionsWithProgress = await missionService.getUserProgress(userId);
      sendSuccess(res, missionsWithProgress);
    } else {
      const missions = await missionService.getAllMissions();
      sendSuccess(res, missions);
    }
  }

  async getMissionsByType(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { type } = req.params;

    if (!['daily', 'weekly', 'social', 'activity'].includes(type)) {
      throw new ValidationError('Invalid mission type');
    }

    const missions = await missionService.getMissionsByType(type as any);
    sendSuccess(res, missions);
  }

  async getMyProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const progress = await missionService.getUserProgress(userId);
    sendSuccess(res, progress);
  }

  async completeMission(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { missionKey } = req.params;
    const userId = req.user!.userId;
    const additionalData = req.body;

    const result = await missionService.completeMission(userId, missionKey, additionalData);

    sendSuccess(res, {
      message: 'Mission completed successfully',
      powerPoints: result.powerPoints
    });
  }

  async recordTicketPurchase(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { lotteryType, ticketCount, transactionSignature } = req.body;

    if (!['tri_daily', 'jackpot', 'special_event', 'grand_prize'].includes(lotteryType)) {
      throw new ValidationError('Invalid lottery type');
    }

    if (!ticketCount || ticketCount < 1) {
      throw new ValidationError('Invalid ticket count');
    }

    const result = await missionService.recordTicketPurchase(
      userId,
      lotteryType,
      ticketCount,
      transactionSignature
    );

    sendSuccess(res, {
      message: 'Ticket purchase recorded',
      powerPoints: result.powerPoints
    });
  }

  async recordDonation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { amountSol, transactionSignature } = req.body;

    if (!amountSol || amountSol < 0.05) {
      throw new ValidationError('Minimum donation is 0.05 SOL');
    }

    if (!transactionSignature) {
      throw new ValidationError('Transaction signature is required');
    }

    const result = await missionService.recordDonation(
      userId,
      amountSol,
      transactionSignature
    );

    sendSuccess(res, {
      message: 'Donation recorded successfully',
      powerPoints: result.powerPoints
    });
  }

  async completeLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const result = await missionService.completeMission(userId, 'daily_login');

    sendSuccess(res, {
      message: 'Login mission completed',
      powerPoints: result.powerPoints
    });
  }

  async completeTransparencyVisit(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const result = await missionService.completeMission(userId, 'activity_explore_transparency');

    sendSuccess(res, {
      message: 'Transparency mission completed',
      powerPoints: result.powerPoints
    });
  }
}

export const missionController = new MissionController();
