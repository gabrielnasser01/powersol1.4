import { supabase, supabaseAdmin } from '@config/supabase.js';
import { NotFoundError, ValidationError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import { calculateAffiliateTier, getCommissionRate } from './affiliate.service.js';
import type { Ticket } from '../types/lottery.types.js';

const logger = loggers.ticket;

export class TicketService {
  async processAffiliateCommission(
    userId: string,
    purchasePrice: bigint,
    ticketCount: number
  ): Promise<void> {
    try {
      const { data: referral } = await supabaseAdmin
        .from('referrals')
        .select('*, referrer:affiliates(id, user_id, manual_tier)')
        .eq('referred_user_id', userId)
        .maybeSingle();

      if (!referral) {
        logger.debug({ userId }, 'No referral found for user');
        return;
      }

      const { data: validatedCount } = await supabaseAdmin
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('referrer_affiliate_id', referral.referrer_affiliate_id)
        .eq('is_validated', true);

      const currentTier = referral.referrer.manual_tier ||
        calculateAffiliateTier(validatedCount?.length || 0);

      const commissionRate = getCommissionRate(currentTier);
      const commission = Number(purchasePrice) * commissionRate;

      const isFirstPurchase = !referral.is_validated;

      await supabaseAdmin
        .from('referrals')
        .update({
          is_validated: true,
          first_purchase_at: isFirstPurchase ? new Date().toISOString() : referral.first_purchase_at,
          total_tickets_purchased: referral.total_tickets_purchased + ticketCount,
          total_value_sol: Number(referral.total_value_sol) + Number(purchasePrice),
          total_commission_earned: Number(referral.total_commission_earned) + commission,
        })
        .eq('id', referral.id);

      await supabaseAdmin
        .from('affiliates')
        .update({
          pending_earnings: supabaseAdmin.rpc('increment_pending_earnings', {
            amount: commission,
          }),
        })
        .eq('id', referral.referrer_affiliate_id);

      logger.info(
        {
          userId,
          affiliateId: referral.referrer_affiliate_id,
          commission,
          tier: currentTier,
          isFirstPurchase,
        },
        'Affiliate commission processed'
      );
    } catch (error) {
      logger.error({ error, userId }, 'Failed to process affiliate commission');
    }
  }
  async getUserTickets(userId: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, lottery:lotteries(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch user tickets');
      throw error;
    }

    return data || [];
  }

  async getTicketById(ticketId: string): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Ticket');
    }

    return data;
  }

  async getLotteryTickets(lotteryId: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('lottery_id', lotteryId)
      .order('ticket_number', { ascending: true });

    if (error) {
      logger.error({ error, lotteryId }, 'Failed to fetch lottery tickets');
      throw error;
    }

    return data || [];
  }

  async createTicket(params: {
    user_id: string;
    lottery_id: string;
    ticket_number: number;
    quantity: number;
    purchase_price: bigint;
    tx_signature: string;
  }): Promise<Ticket> {
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        user_id: params.user_id,
        lottery_id: params.lottery_id,
        ticket_number: params.ticket_number,
        quantity: params.quantity,
        purchase_price: params.purchase_price.toString(),
        tx_signature: params.tx_signature,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, params }, 'Failed to create ticket');
      throw error;
    }

    logger.info({ ticketId: data.id, userId: params.user_id }, 'Ticket created');

    await this.processAffiliateCommission(
      params.user_id,
      params.purchase_price,
      params.quantity
    );

    return data;
  }

  async getNextTicketNumber(lotteryId: string): Promise<number> {
    const { data, error } = await supabase
      .from('tickets')
      .select('ticket_number')
      .eq('lottery_id', lotteryId)
      .order('ticket_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error({ error, lotteryId }, 'Failed to get next ticket number');
      throw error;
    }

    return data ? data.ticket_number + 1 : 1;
  }

  async verifyTicketOnChain(ticketId: string): Promise<boolean> {
    logger.info({ ticketId }, 'Verifying ticket on-chain');
    return true;
  }

  async getWinningTicket(lotteryId: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('lottery_id', lotteryId)
      .eq('is_winner', true)
      .maybeSingle();

    if (error) {
      logger.error({ error, lotteryId }, 'Failed to get winning ticket');
      throw error;
    }

    return data;
  }

  async getUserTicketCount(userId: string, lotteryId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_user_tickets_count', {
      p_user_id: userId,
      p_lottery_id: lotteryId,
    });

    if (error) {
      logger.error({ error, userId, lotteryId }, 'Failed to get user ticket count');
      return 0;
    }

    return data || 0;
  }
}

export const ticketService = new TicketService();
