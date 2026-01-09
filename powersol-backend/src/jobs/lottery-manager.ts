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
  getXmasDrawTime,
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
          description: 'Sorteio 3x por dia - 8h, 16h e 00h UTC',
          frequency: '3x per day',
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
        ticket_price: (0.5 * LAMPORTS_PER_SOL).toString(),
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
    const { data: xmas } = await supabaseAdmin
      .from('lotteries')
      .select('id')
      .eq('type', 'XMAS')
      .eq('is_drawn', false)
      .maybeSingle();

    if (!xmas && new Date() < getXmasDrawTime()) {
      await supabaseAdmin.from('lotteries').insert({
        lottery_id: 20241225,
        type: 'XMAS',
        ticket_price: (0.75 * LAMPORTS_PER_SOL).toString(),
        max_tickets: 7500,
        draw_timestamp: getXmasDrawTime().toISOString(),
        metadata: {
          name: 'Christmas Special 2024',
          description: 'Sorteio especial de Natal',
          frequency: 'Yearly',
          year: 2024,
        },
      });
      logger.info('Created XMAS 2024 lottery');
    }

    const { data: grandPrize } = await supabaseAdmin
      .from('lotteries')
      .select('id')
      .eq('type', 'GRAND_PRIZE')
      .eq('is_drawn', false)
      .maybeSingle();

    if (!grandPrize && new Date() < getGrandPrizeDrawTime()) {
      await supabaseAdmin.from('lotteries').insert({
        lottery_id: 20250101,
        type: 'GRAND_PRIZE',
        ticket_price: (1.0 * LAMPORTS_PER_SOL).toString(),
        max_tickets: 10000,
        draw_timestamp: getGrandPrizeDrawTime().toISOString(),
        metadata: {
          name: 'New Year Grand Prize 2025',
          description: 'Sorteio especial de Ano Novo',
          frequency: 'Yearly',
          year: 2025,
        },
      });
      logger.info('Created GRAND_PRIZE 2025 lottery');
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
  logger.info('  - TRI-DAILY: Daily check at 23:00 UTC (creates every 3 days)');
  logger.info('  - JACKPOT: Days 28-31 of each month at 00:00 UTC');
  logger.info('  - SPECIAL: Daily check at 00:00 UTC');
}
