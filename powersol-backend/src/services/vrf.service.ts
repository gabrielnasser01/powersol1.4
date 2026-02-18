import { PublicKey } from '@solana/web3.js';
import { getConnection, VRF_QUEUE } from '@config/solana.js';
import { supabaseAdmin } from '@config/supabase.js';
import { lotteryService } from './lottery.service.js';
import { solanaService } from './solana.service.js';
import { ExternalServiceError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import { LotteryType } from '../lib/anchor/pdas.js';
import type { VRFProof } from '../types/lottery.types.js';

const logger = loggers.vrf;

export class VRFService {
  private connection = getConnection();

  private getLotteryParams(lottery: any): { round?: number; month?: number; year?: number } {
    const metadata = lottery.metadata || {};
    switch (lottery.lottery_type) {
      case LotteryType.TRI_DAILY:
        return { round: metadata.round || lottery.lottery_id };
      case LotteryType.JACKPOT:
        return { month: metadata.month, year: metadata.year };
      case LotteryType.GRAND_PRIZE:
        return { year: metadata.year || new Date().getFullYear() + 1 };
      case LotteryType.SPECIAL_EVENT:
        return { year: metadata.year || 2026 };
      default:
        return { round: lottery.lottery_id };
    }
  }

  async requestRandomness(lotteryId: string): Promise<string> {
    try {
      logger.info({ lotteryId }, 'Requesting VRF randomness');

      const lottery = await lotteryService.getLotteryById(lotteryId);

      if (lottery.is_drawn) {
        throw new ExternalServiceError('VRF', 'Lottery already drawn');
      }

      const requestId = `vrf_${lotteryId}_${Date.now()}`;

      await supabaseAdmin
        .from('lotteries')
        .update({ vrf_request_id: requestId })
        .eq('id', lotteryId);

      logger.info({ lotteryId, requestId }, 'VRF randomness requested');

      return requestId;
    } catch (error) {
      logger.error({ error, lotteryId }, 'Failed to request randomness');
      throw new ExternalServiceError('VRF', 'Failed to request randomness', error);
    }
  }

  async processVRFCallback(requestId: string, randomness: Buffer): Promise<void> {
    try {
      logger.info({ requestId }, 'Processing VRF callback');

      const { data: lottery } = await supabaseAdmin
        .from('lotteries')
        .select('*')
        .eq('vrf_request_id', requestId)
        .single();

      if (!lottery) {
        throw new ExternalServiceError('VRF', 'Lottery not found for request ID');
      }

      if (lottery.is_drawn) {
        logger.warn({ lotteryId: lottery.id }, 'Lottery already drawn, ignoring callback');
        return;
      }

      const winningTicket = await this.selectWinningTicket(lottery.id, randomness);

      const lotteryType = lottery.lottery_type as LotteryType;
      const params = this.getLotteryParams(lottery);

      const txSignature = await solanaService.executeDraw(
        lotteryType,
        params,
        [winningTicket]
      );

      await lotteryService.markAsDrawn(lottery.id, winningTicket, txSignature);

      const vrfProof: VRFProof = {
        publicKey: VRF_QUEUE.toBase58(),
        proof: randomness.toString('hex'),
        message: requestId,
        currentRound: Date.now(),
        status: 'SUCCESS',
      };

      await supabaseAdmin.from('draws').insert({
        lottery_id: lottery.id,
        winning_ticket: winningTicket,
        vrf_proof: vrfProof,
        randomness: randomness.toString('hex'),
        tx_signature: txSignature,
      });

      logger.info(
        { lotteryId: lottery.id, winningTicket, txSignature },
        'VRF callback processed successfully'
      );
    } catch (error) {
      logger.error({ error, requestId }, 'Failed to process VRF callback');
      throw error;
    }
  }

  async selectWinningTicket(lotteryId: string, randomness: Buffer): Promise<number> {
    try {
      const lottery = await lotteryService.getLotteryById(lotteryId);

      if (lottery.current_tickets === 0) {
        throw new ExternalServiceError('VRF', 'No tickets sold for this lottery');
      }

      const randomValue = randomness.readUInt32BE(0);
      const winningTicket = (randomValue % lottery.current_tickets) + 1;

      logger.info({ lotteryId, winningTicket, totalTickets: lottery.current_tickets }, 'Winning ticket selected');

      return winningTicket;
    } catch (error) {
      logger.error({ error, lotteryId }, 'Failed to select winning ticket');
      throw error;
    }
  }

  async getVRFAccountInfo(): Promise<any> {
    try {
      const accountInfo = await this.connection.getAccountInfo(VRF_QUEUE);

      return {
        queuePubkey: VRF_QUEUE.toBase58(),
        exists: accountInfo !== null,
        lamports: accountInfo?.lamports || 0,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get VRF account info');
      return null;
    }
  }

  async simulateRandomDraw(lotteryId: string): Promise<number> {
    try {
      logger.info({ lotteryId }, 'Simulating random draw for testing');

      const lottery = await lotteryService.getLotteryById(lotteryId);

      if (lottery.current_tickets === 0) {
        throw new ExternalServiceError('VRF', 'No tickets sold');
      }

      const winningTicket = Math.floor(Math.random() * lottery.current_tickets) + 1;

      logger.info({ lotteryId, winningTicket }, 'Simulated draw completed');

      return winningTicket;
    } catch (error) {
      logger.error({ error, lotteryId }, 'Failed to simulate draw');
      throw error;
    }
  }
}

export const vrfService = new VRFService();
