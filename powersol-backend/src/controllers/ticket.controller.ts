import { Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { ticketService } from '@services/ticket.service.js';
import { lotteryService } from '@services/lottery.service.js';
import { solanaService } from '@services/solana.service.js';
import { sendSuccess } from '@utils/response.js';
import { ValidationError } from '@utils/errors.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class TicketController {
  async purchaseTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { lotteryId, quantity } = req.body;
    const userId = req.user!.userId;
    const userWallet = req.user!.wallet;

    const lottery = await lotteryService.getLotteryById(lotteryId);

    if (lottery.is_drawn) {
      throw new ValidationError('Lottery already drawn');
    }

    if (lottery.current_tickets + quantity > lottery.max_tickets) {
      throw new ValidationError('Not enough tickets available');
    }

    const startTicketNumber = await ticketService.getNextTicketNumber(lotteryId);

    const buyerPublicKey = new PublicKey(userWallet);
    const transaction = await solanaService.buildPurchaseTransaction(
      buyerPublicKey,
      lottery.lottery_id,
      startTicketNumber,
      lottery.ticket_price
    );

    const serializedTx = transaction.serialize({ requireAllSignatures: false }).toString('base64');

    const createdTickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await ticketService.createTicket({
        user_id: userId,
        lottery_id: lotteryId,
        ticket_number: startTicketNumber + i,
        quantity: 1,
        purchase_price: lottery.ticket_price,
        tx_signature: 'pending',
      });
      createdTickets.push(ticket);
    }

    sendSuccess(res, {
      transaction: serializedTx,
      ticketNumber: startTicketNumber,
      tickets: createdTickets,
      ticketIds: createdTickets.map(t => t.id),
    });
  }

  async getMyTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const tickets = await ticketService.getUserTickets(userId);
    sendSuccess(res, tickets);
  }

  async getTicketById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const ticket = await ticketService.getTicketById(id);
    sendSuccess(res, ticket);
  }

  async verifyTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const isValid = await ticketService.verifyTicketOnChain(id);
    sendSuccess(res, { isValid });
  }
}

export const ticketController = new TicketController();
