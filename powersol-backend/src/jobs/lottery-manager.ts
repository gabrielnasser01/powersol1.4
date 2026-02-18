import cron from 'node-cron';
import { supabaseAdmin } from '@config/supabase.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loggers } from '@utils/logger.js';
import {
  calculateTriDailyRound,
  getNextTriDailyDrawTime,
  getCurrentMonth,
  getCurrentYear,
  getNextJackpotDrawTime,
  getGrandPrizeDrawTime,
  getSpecialEventDrawTime,
} from '@config/lotteries.js';

const logger = loggers.lottery;

async function createNextTriDailyLottery() {
  try {
    const currentRound = calculateTriDailyRound();
    const nextRound = currentRound + 1;

    const { data: existing } = await supabaseAdmin
      .from('lotteries')
      .select('id')
      .eq('lottery_id', nextRound)
      .eq('type', 'TRI_DAILY')
      .maybeSingle();

    if (existing) {
      logger.info({ round: nextRound }, 'Next TRI-DAILY lottery already exists');
      return;
    }

    const nextDraw = getNextTriDailyDrawTime();

    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .insert({
        lottery_id: nextRound,
        type: 'TRI_DAILY',
        ticket_price: (0.1 * LAMPORTS_PER_SOL).toString(),
        max_tickets: 1000,
        draw_timestamp: nextDraw.toISOString(),
        metadata: {
          name: 'Tri-Daily Lottery',
          description: 'Sorteio a cada 3 dias - 00:00 UTC',
          frequency: 'Every 3 days',
          round: nextRound,
        },
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, round: nextRound }, 'Failed to create next TRI-DAILY lottery');
      return;
    }

    logger.info({ lotteryId: data.id, round: nextRound }, 'Created next TRI-DAILY lottery');
  } catch (error) {
    logger.error({ error }, 'Error creating next TRI-DAILY lottery');
  }
}

async function createNextJackpotLottery() {
  try {
    const month = getCurrentMonth();
    const year = getCurrentYear();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const { data: existing } = await supabaseAdmin
      .from('lotteries')
      .select('id, metadata')
      .eq('lottery_type', 'JACKPOT')
      .eq('is_drawn', false)
      .maybeSingle();

    if (existing) {
      const metadata = (existing as any).metadata;
      if (metadata?.month === nextMonth && metadata?.year === nextYear) {
        logger.info({ month: nextMonth, year: nextYear }, 'Next JACKPOT lottery already exists');
        return;
      }
    }

    const nextDraw = getNextJackpotDrawTime();

    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .insert({
        lottery_id: nextYear * 100 + nextMonth,
        type: 'JACKPOT',
        ticket_price: (0.2 * LAMPORTS_PER_SOL).toString(),
        max_tickets: 5000,
        draw_timestamp: nextDraw.toISOString(),
        metadata: {
          name: 'Monthly Jackpot',
          description: 'Sorteio mensal com prêmio acumulado',
          frequency: 'Monthly',
          month: nextMonth,
          year: nextYear,
        },
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, month: nextMonth, year: nextYear }, 'Failed to create next JACKPOT lottery');
      return;
    }

    logger.info({ lotteryId: data.id, month: nextMonth, year: nextYear }, 'Created next JACKPOT lottery');
  } catch (error) {
    logger.error({ error }, 'Error creating next JACKPOT lottery');
  }
}

async function ensureSpecialLotteries() {
  try {
    const { data: specialEvent } = await supabaseAdmin
      .from('lotteries')
      .select('id')
      .eq('type', 'SPECIAL_EVENT')
      .eq('is_drawn', false)
      .maybeSingle();

    if (!specialEvent && new Date() < getSpecialEventDrawTime()) {
      await supabaseAdmin.from('lotteries').insert({
        lottery_id: 20260405,
        type: 'SPECIAL_EVENT',
        ticket_price: (0.2 * LAMPORTS_PER_SOL).toString(),
        max_tickets: 7500,
        draw_timestamp: getSpecialEventDrawTime().toISOString(),
        metadata: {
          name: 'Easter Special 2026',
          description: 'Sorteio especial de Pascoa',
          frequency: 'Seasonal',
          year: 2026,
        },
      });
      logger.info('Created Easter Special 2026 lottery');
    }

    const { data: grandPrize } = await supabaseAdmin
      .from('lotteries')
      .select('id')
      .eq('type', 'GRAND_PRIZE')
      .eq('is_drawn', false)
      .maybeSingle();

    const grandPrizeYear = new Date().getUTCFullYear() + 1;
    if (!grandPrize && new Date() < getGrandPrizeDrawTime()) {
      await supabaseAdmin.from('lotteries').insert({
        lottery_id: grandPrizeYear * 10000 + 101,
        type: 'GRAND_PRIZE',
        ticket_price: (0.33 * LAMPORTS_PER_SOL).toString(),
        max_tickets: 10000,
        draw_timestamp: getGrandPrizeDrawTime().toISOString(),
        metadata: {
          name: `New Year Grand Prize ${grandPrizeYear}`,
          description: 'Sorteio especial de Ano Novo',
          frequency: 'Yearly',
          year: grandPrizeYear,
        },
      });
      logger.info({ year: grandPrizeYear }, 'Created GRAND_PRIZE lottery');
    }
  } catch (error) {
    logger.error({ error }, 'Error ensuring special lotteries');
  }
}

export function startLotteryManager() {
  logger.info('Starting Lottery Manager');

  cron.schedule('0 23 * * *', async () => {
    logger.info('Running daily check for TRI-DAILY lottery creation');
    await createNextTriDailyLottery();
  });

  cron.schedule('0 0 28-31 * *', async () => {
    logger.info('Running scheduled JACKPOT lottery creation');
    await createNextJackpotLottery();
  });

  cron.schedule('0 0 * * *', async () => {
    logger.info('Ensuring special lotteries exist');
    await ensureSpecialLotteries();
  });

  ensureSpecialLotteries();
  createNextTriDailyLottery();

  logger.info('Lottery Manager started successfully');
  logger.info('Schedules:');
  logger.info('  - TRI-DAILY: Every 3 days at 00:00 UTC');
  logger.info('  - JACKPOT: Last day of each month at 00:00 UTC');
  logger.info('  - GRAND_PRIZE: January 1st at 00:00 UTC');
  logger.info('  - SPECIAL_EVENT: April 5, 2026 at 23:59 UTC');
}
