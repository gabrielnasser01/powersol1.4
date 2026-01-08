import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { claimService } from '@services/claim.service.js';
import { ticketService } from '@services/ticket.service.js';
import { lotteryService } from '@services/lottery.service.js';
import { solanaService } from '@services/solana.service.js';
import { sendSuccess } from '@utils/response.js';
import { ValidationError } from '@utils/errors.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class ClaimController {
  async prepareClaimTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { ticketId } = req.body;
    const userId = req.user!.userId;
    const userWallet = req.user!.wallet;

    const ticket = await ticketService.getTicketById(ticketId);

    if (ticket.user_id !== userId) {
      throw new ValidationError('Not your ticket');
    }

    if (!ticket.is_winner) {
      throw new ValidationError('Ticket is not a winner');
    }

    const lottery = await lotteryService.getLotteryById(ticket.lottery_id);

    if (!lottery.is_drawn) {
      throw new ValidationError('Lottery not drawn yet');
    }

    const existingClaim = await claimService.getUserClaims(userId);
    const alreadyClaimed = existingClaim.some(
      (c) => c.ticket_id === ticketId && c.is_claimed
    );

    if (alreadyClaimed) {
      throw new ValidationError('Prize already claimed');
    }

    const claim = await claimService.createClaim({
      user_id: userId,
      ticket_id: ticketId,
      amount: lottery.prize_pool,
      claim_type: 'PRIZE',
    });

    const claimerPublicKey = new PublicKey(userWallet);
    const { serializedTx, blockhash } = await solanaService.prepareClaimTransactionForUserSign(
      claimerPublicKey,
      lottery.prize_pool
    );

    sendSuccess(res, {
      claimId: claim.id,
      serializedTx,
      blockhash,
      amount: lottery.prize_pool,
    });
  }

  async submitSignedClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { claimId, signedTx } = req.body;
    const userId = req.user!.userId;

    if (!claimId || !signedTx) {
      throw new ValidationError('claimId and signedTx are required');
    }

    const claim = await claimService.getClaimById(claimId);

    if (claim.user_id !== userId) {
      throw new ValidationError('Not your claim');
    }

    if (claim.is_claimed) {
      throw new ValidationError('Prize already claimed');
    }

    const result = await solanaService.submitSignedClaimTransaction(signedTx);

    await claimService.markAsClaimed(claimId, result.signature);

    sendSuccess(res, {
      txSignature: result.signature,
      confirmed: result.confirmed,
    });
  }

  async getMyClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const claims = await claimService.getUserClaims(userId);
    sendSuccess(res, claims);
  }

  async getClaimStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const status = await claimService.getClaimStatus(id);
    sendSuccess(res, status);
  }
}

export const claimController = new ClaimController();
