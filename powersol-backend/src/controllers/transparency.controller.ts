import { Response } from 'express';
import { supabase } from '@config/supabase.js';
import { VRF_QUEUE, ENV } from '@config/index.js';
import { solanaService } from '@services/solana.service.js';
import { sendSuccess } from '@utils/response.js';
import { NotFoundError } from '@utils/errors.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export class TransparencyController {
  async getDraws(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { data, error } = await supabase
      .from('draws')
      .select(
        `
        *,
        lottery:lotteries(*)
      `
      )
      .order('drawn_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    sendSuccess(res, data || []);
  }

  async getDrawById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('draws')
      .select(
        `
        *,
        lottery:lotteries(*),
        ticket:tickets(*, user:users(*))
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Draw');
    }

    sendSuccess(res, data);
  }

  async getVRFInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    sendSuccess(res, {
      queuePubkey: VRF_QUEUE.toBase58(),
      oraclePubkey: VRF_QUEUE.toBase58(),
      commitment: ENV.RPC_COMMITMENT,
      cluster: ENV.CLUSTER,
    });
  }

  async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { data, error } = await supabase.rpc('get_transparency_stats');

    if (error) {
      throw error;
    }

    const stats = data?.[0] || {
      total_lotteries: 0,
      total_draws: 0,
      total_tickets: 0,
      total_prize_pool: 0,
      total_winners: 0,
      total_claimed: 0,
    };

    sendSuccess(res, {
      totalLotteries: Number(stats.total_lotteries),
      totalDraws: Number(stats.total_draws),
      totalTickets: Number(stats.total_tickets),
      totalPrizePool: BigInt(stats.total_prize_pool),
      totalWinners: Number(stats.total_winners),
      totalClaimed: Number(stats.total_claimed),
    });
  }

  async getOnChainData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { address } = req.params;
    const txDetails = await solanaService.getTransactionDetails(address);

    if (!txDetails) {
      throw new NotFoundError('On-chain data');
    }

    sendSuccess(res, {
      address,
      data: txDetails,
    });
  }
}

export const transparencyController = new TransparencyController();
