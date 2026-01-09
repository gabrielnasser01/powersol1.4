import { supabase, supabaseAdmin } from '@config/supabase.js';
import { NotFoundError, ValidationError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import type { Lottery, LotteryStats, Winner } from '../types/lottery.types.js';

const logger = loggers.lottery;

export class LotteryService {
  async getAllLotteries(): Promise<Lottery[]> {
    const { data, error } = await supabase
      .from('lotteries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch lotteries');
      throw error;
    }

    return data || [];
  }

  async getActiveLotteries(): Promise<Lottery[]> {
    const { data, error } = await supabase
      .from('lotteries')
      .select('*')
      .eq('is_drawn', false)
      .order('draw_timestamp', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch active lotteries');
      throw error;
    }

    return data || [];
  }

  async getLotteryById(lotteryId: string): Promise<Lottery> {
    const { data, error } = await supabase
      .from('lotteries')
      .select('*')
      .eq('id', lotteryId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Lottery');
    }

    return data;
  }

  async getLotteryStats(lotteryId: string): Promise<LotteryStats> {
    const lottery = await this.getLotteryById(lotteryId);

    const { data, error } = await supabase.rpc('get_lottery_stats', {
      p_lottery_id: lotteryId,
    });

    if (error) {
      logger.error({ error, lotteryId }, 'Failed to get lottery stats');
      throw error;
    }

    const stats = data?.[0] || {};

    return {
      totalTickets: Number(stats.total_tickets || lottery.current_tickets),
      uniquePlayers: Number(stats.unique_players || 0),
      prizePool: BigInt(stats.prize_pool || lottery.prize_pool || '0'),
      ticketPrice: BigInt(lottery.ticket_price),
      isDrawn: lottery.is_drawn,
      winningTicket: lottery.winning_ticket,
      timeUntilDraw: stats.time_until_draw,
    };
  }

  async getWinners(lotteryId: string): Promise<Winner[]> {
    const { data, error } = await supabase
      .from('draws')
      .select(
        `
        *,
        lottery:lotteries(*),
        ticket:tickets(*, user:users(*))
      `
      )
      .eq('lottery_id', lotteryId);

    if (error) {
      logger.error({ error, lotteryId }, 'Failed to get winners');
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((draw: any) => ({
      lottery_id: draw.lottery.id,
      lottery_type: draw.lottery.type,
      winning_ticket: draw.winning_ticket,
      winner_wallet: draw.ticket?.user?.wallet_address || 'Unknown',
      prize_amount: BigInt(draw.lottery.prize_pool),
      drawn_at: new Date(draw.drawn_at),
      claimed: draw.ticket?.is_winner || false,
    }));
  }

  async createLottery(params: {
    lottery_id: number;
    type: string;
    ticket_price: bigint;
    max_tickets: number;
    draw_timestamp: Date;
  }): Promise<Lottery> {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .insert({
        lottery_id: params.lottery_id,
        type: params.type,
        ticket_price: params.ticket_price.toString(),
        max_tickets: params.max_tickets,
        draw_timestamp: params.draw_timestamp.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, params }, 'Failed to create lottery');
      throw error;
    }

    logger.info({ lotteryId: data.id }, 'Lottery created');

    return data;
  }

  async updateLottery(
    lotteryId: string,
    updates: Partial<Lottery>
  ): Promise<Lottery> {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .update(updates)
      .eq('id', lotteryId)
      .select()
      .single();

    if (error) {
      logger.error({ error, lotteryId, updates }, 'Failed to update lottery');
      throw error;
    }

    return data;
  }

  async markAsDrawn(
    lotteryId: string,
    winningTicket: number,
    txSignature: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('lotteries')
      .update({
        is_drawn: true,
        winning_ticket: winningTicket,
        tx_signature: txSignature,
        drawn_at: new Date().toISOString(),
      })
      .eq('id', lotteryId);

    if (error) {
      logger.error({ error, lotteryId }, 'Failed to mark lottery as drawn');
      throw error;
    }

    await supabaseAdmin
      .from('tickets')
      .update({ is_winner: true })
      .eq('lottery_id', lotteryId)
      .eq('ticket_number', winningTicket);

    logger.info({ lotteryId, winningTicket }, 'Lottery marked as drawn');
  }

  async getLotteriesReadyForDraw(): Promise<Lottery[]> {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .select('*')
      .eq('is_drawn', false)
      .lte('draw_timestamp', new Date().toISOString());

    if (error) {
      logger.error({ error }, 'Failed to fetch lotteries ready for draw');
      throw error;
    }

    return data || [];
  }
}

export const lotteryService = new LotteryService();
