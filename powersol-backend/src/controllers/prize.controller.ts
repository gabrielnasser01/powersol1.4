import { Request, Response, NextFunction } from 'express';
import { prizeClaimService } from '../services/prize-claim.service.js';

export class PrizeController {
  async getUserPrizes(req: Request, res: Response, next: NextFunction) {
    try {
      const userWallet = req.query.wallet as string;

      if (!userWallet) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }

      const prizes = await prizeClaimService.getUserPrizes(userWallet);

      res.json({
        success: true,
        data: prizes,
        total: prizes.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnclaimedPrizes(req: Request, res: Response, next: NextFunction) {
    try {
      const userWallet = req.query.wallet as string;

      if (!userWallet) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }

      const prizes = await prizeClaimService.getUnclaimedPrizes(userWallet);

      res.json({
        success: true,
        data: prizes,
        total: prizes.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getPrizeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { prizeId } = req.params;
      const prize = await prizeClaimService.getPrizeById(prizeId);

      res.json({
        success: true,
        data: prize
      });
    } catch (error) {
      next(error);
    }
  }

  async initiateClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const { prizeId } = req.params;
      const { wallet } = req.body;

      if (!wallet) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }

      const preparedTx = await prizeClaimService.initiateClaim(prizeId, wallet);

      res.json({
        success: true,
        data: {
          claimId: preparedTx.claimId,
          serializedTx: preparedTx.serializedTx,
          blockhash: preparedTx.blockhash,
          message: 'Transaction prepared. Please sign and submit.'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getClaimHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userWallet = req.query.wallet as string;

      if (!userWallet) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required'
        });
      }

      const claims = await prizeClaimService.getClaimHistory(userWallet);

      res.json({
        success: true,
        data: claims,
        total: claims.length
      });
    } catch (error) {
      next(error);
    }
  }
}

export const prizeController = new PrizeController();
