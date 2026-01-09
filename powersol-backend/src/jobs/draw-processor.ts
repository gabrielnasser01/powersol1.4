import cron from 'node-cron';
import { lotteryService } from '@services/lottery.service.js';
import { vrfService } from '@services/vrf.service.js';
import { loggers } from '@utils/logger.js';

const logger = loggers.lottery;

async function processReadyDraws() {
  try {
    logger.info('Checking for lotteries ready to draw');

    const readyLotteries = await lotteryService.getLotteriesReadyForDraw();

    if (readyLotteries.length === 0) {
      logger.debug('No lotteries ready for draw');
      return;
    }

    logger.info({ count: readyLotteries.length }, 'Found lotteries ready for draw');

    for (const lottery of readyLotteries) {
      try {
        if (lottery.current_tickets === 0) {
          logger.warn({ lotteryId: lottery.id, type: lottery.lottery_type }, 'Lottery has no tickets, skipping draw');
          continue;
        }

        logger.info(
          {
            lotteryId: lottery.id,
            type: lottery.lottery_type,
            tickets: lottery.current_tickets,
          },
          'Initiating draw'
        );

        const requestId = await vrfService.requestRandomness(lottery.id);

        logger.info(
          {
            lotteryId: lottery.id,
            type: lottery.lottery_type,
            requestId,
          },
          'VRF randomness requested'
        );
      } catch (error) {
        logger.error(
          {
            error,
            lotteryId: lottery.id,
            type: lottery.lottery_type,
          },
          'Failed to process lottery draw'
        );
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error in processReadyDraws');
  }
}

export function startDrawProcessor() {
  logger.info('Starting Draw Processor');

  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Running scheduled draw check (every 5 minutes)');
    await processReadyDraws();
  });

  processReadyDraws();

  logger.info('Draw Processor started successfully');
  logger.info('Schedule: Every 5 minutes');
}
