import { supabase } from '../lib/supabase';
import { apiClient } from '../services/api';
import { getActiveAffiliateCode, initAffiliateTracking } from '../utils/affiliateTracking';
import { solPriceService } from '../services/solPriceService';
import { walletBalanceService } from '../services/walletBalanceService';

function getSolUsdRate(): number {
  return solPriceService.getPrice();
}

export const LOTTERY_TICKET_PRICE_SOL = 0.1;
export const SPECIAL_EVENT_TICKET_PRICE_SOL = 0.2;
export const JACKPOT_TICKET_PRICE_SOL = 0.2;
export const GRAND_PRIZE_TICKET_PRICE_SOL = 0.33;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const HOUSE_COMMISSION_RATE = 0.30;

export interface ChainAdapter {
  buyTickets(params: { amount: number; lotteryType?: string }): Promise<{ txId: string; success: boolean; transaction?: string }>;
  fundJackpot(params: { amountSol: number }): Promise<{ txId: string; success: boolean }>;
  getPoolState(): Promise<{ totalSol: number; ticketCount: number }>;
  getGlobalPoolState(): Promise<{ totalSol: number; totalUsd: number; ticketCount: number; prizePoolSol: number; prizePoolUsd: number }>;
  getNextDraw(): Promise<any>;
  getRecentWinners(): Promise<any[]>;
  enterReferral(refPk: string): Promise<void>;
  getActiveLotteries(): Promise<any[]>;
  getLotteryStats(lotteryId: string): Promise<any>;
}

function getLotteryTypeFromPath(): string {
  const currentPath = window.location.pathname;
  if (currentPath.includes('/specialevent')) return 'special-event';
  if (currentPath.includes('/jackpot')) return 'jackpot';
  if (currentPath.includes('/grandprize')) return 'grand-prize';
  return 'tri-daily';
}

function getTicketPriceForType(type: string): number {
  switch (type) {
    case 'special-event': return SPECIAL_EVENT_TICKET_PRICE_SOL;
    case 'jackpot': return JACKPOT_TICKET_PRICE_SOL;
    case 'grand-prize': return GRAND_PRIZE_TICKET_PRICE_SOL;
    default: return LOTTERY_TICKET_PRICE_SOL;
  }
}

class RealChainAdapter implements ChainAdapter {
  async buyTickets({ amount, lotteryType }: { amount: number; lotteryType?: string }) {
    const type = lotteryType || getLotteryTypeFromPath();
    const ticketPriceSol = getTicketPriceForType(type);
    const affiliateCode = getActiveAffiliateCode();

    try {
      const { data: lotteries } = await supabase
        .from('blockchain_lotteries')
        .select('*')
        .eq('lottery_type', type)
        .eq('is_drawn', false)
        .order('draw_timestamp', { ascending: true })
        .limit(1);

      if (!lotteries || lotteries.length === 0) {
        throw new Error('No active lottery found for this type');
      }

      const lottery = lotteries[0];

      const result = await apiClient.purchaseTicket(lottery.id.toString(), amount);

      return {
        txId: result.ticketId,
        success: true,
        transaction: result.transaction,
      };
    } catch (error) {
      console.error('Failed to purchase tickets:', error);
      throw error;
    }
  }

  async fundJackpot({ amountSol }: { amountSol: number }) {
    const txId = 'fund_' + Math.random().toString(36).slice(2, 11);

    await supabase.rpc('increment_jackpot', {
      amount: Math.floor(amountSol * 0.4 * 1e9)
    });

    return { txId, success: true };
  }

  async getPoolState() {
    const type = getLotteryTypeFromPath();

    const walletBalance = await walletBalanceService.getLotteryPoolBalance(type);

    const { data: lottery } = await supabase
      .from('blockchain_lotteries')
      .select('lottery_id')
      .eq('lottery_type', type)
      .eq('is_drawn', false)
      .order('draw_timestamp', { ascending: true })
      .limit(1)
      .maybeSingle();

    let ticketCount = 0;
    if (lottery) {
      const { count } = await supabase
        .from('blockchain_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('lottery_id', lottery.lottery_id);
      ticketCount = count || 0;
    }

    return {
      totalSol: walletBalance.balanceSol,
      ticketCount,
    };
  }

  async getGlobalPoolState() {
    const type = getLotteryTypeFromPath();
    const walletBalance = await walletBalanceService.getLotteryPoolBalance(type);
    const prizePoolSol = walletBalance.balanceSol;

    const { count } = await supabase
      .from('blockchain_tickets')
      .select('id', { count: 'exact', head: true });

    const totalTickets = count || 0;

    return {
      totalSol: prizePoolSol,
      totalUsd: prizePoolSol * getSolUsdRate(),
      ticketCount: totalTickets,
      prizePoolSol: prizePoolSol,
      prizePoolUsd: prizePoolSol * getSolUsdRate(),
    };
  }

  async getNextDraw() {
    const type = getLotteryTypeFromPath();

    const [lottery, walletBalance] = await Promise.all([
      supabase
        .from('blockchain_lotteries')
        .select('*')
        .eq('lottery_type', type)
        .eq('is_drawn', false)
        .order('draw_timestamp', { ascending: true })
        .limit(1)
        .maybeSingle()
        .then(res => res.data),
      walletBalanceService.getLotteryPoolBalance(type),
    ]);

    if (!lottery) {
      return null;
    }

    return {
      id: `${type}-${lottery.lottery_id}`,
      type: type,
      poolSol: walletBalance.balanceSol,
      drawTime: new Date(Number(lottery.draw_timestamp) * 1000).toISOString(),
      maxTickets: lottery.max_tickets,
      ticketsSold: 0,
    };
  }

  async getRecentWinners() {
    const { data: draws } = await supabase
      .from('solana_draws')
      .select('*')
      .order('draw_timestamp', { ascending: false })
      .limit(10);

    if (!draws) return [];

    return draws.map(draw => ({
      drawId: `round-${draw.round}`,
      maskedPk: draw.winner_wallet
        ? `${draw.winner_wallet.slice(0, 3)}...${draw.winner_wallet.slice(-3)}`
        : 'Unknown',
      prizeSol: draw.prize_lamports / 1e9,
      timestamp: new Date(draw.draw_timestamp).getTime(),
    }));
  }

  async enterReferral(refPk: string) {
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) return;

    await supabase.from('affiliates').upsert({
      referral_code: refPk,
    }, { onConflict: 'referral_code' });
  }

  async getActiveLotteries() {
    const { data } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('is_drawn', false)
      .order('draw_timestamp', { ascending: true });

    return data || [];
  }

  async getLotteryStats(lotteryId: string) {
    const { data: lottery } = await supabase
      .from('blockchain_lotteries')
      .select('*')
      .eq('lottery_id', parseInt(lotteryId))
      .maybeSingle();

    if (!lottery) {
      return null;
    }

    const walletBalance = await walletBalanceService.getLotteryPoolBalance(lottery.lottery_type);

    const { count: ticketCount } = await supabase
      .from('blockchain_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('lottery_id', lottery.lottery_id);

    const { data: uniquePlayers } = await supabase
      .from('blockchain_tickets')
      .select('user_id')
      .eq('lottery_id', lottery.lottery_id);

    const uniquePlayerCount = new Set(uniquePlayers?.map(t => t.user_id)).size;

    return {
      totalTickets: ticketCount || 0,
      uniquePlayers: uniquePlayerCount,
      prizePool: walletBalance.balanceSol,
      drawTimestamp: lottery.draw_timestamp,
    };
  }
}

export const chainAdapter: ChainAdapter = new RealChainAdapter();

export function solToUsd(sol: number): number {
  return sol * getSolUsdRate();
}

export function usdToSol(usd: number): number {
  return usd / getSolUsdRate();
}

export function formatSol(amount: number): string {
  return `${amount.toFixed(2)} SOL`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function maskPublicKey(pk: string): string {
  if (pk.length < 8) return pk;
  return `${pk.slice(0, 3)}...${pk.slice(-3)}`;
}

export function generateTxId(): string {
  return Math.random().toString(36).slice(2, 11);
}
