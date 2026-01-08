import { Response } from 'express';
import { authService } from '@services/auth.service.js';
import { sendSuccess } from '@utils/response.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class AuthController {
  async getNonce(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { wallet, ref } = req.query as { wallet: string; ref?: string };
    const result = await authService.getNonce(wallet, ref);
    sendSuccess(res, result);
  }

  async authenticateWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = await authService.authenticateWallet(req.body);
    sendSuccess(res, result);
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = await authService.getUserById(req.user!.userId);
    sendSuccess(res, { user });
  }
}

export const authController = new AuthController();
