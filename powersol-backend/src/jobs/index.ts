import { startLotteryManager } from './lottery-manager.js';
import { startDrawProcessor } from './draw-processor.js';
import { logger } from '@utils/logger.js';

export function startJobs() {
  logger.info('Starting all background jobs...');

  try {
    startLotteryManager();
    startDrawProcessor();

    logger.info('All background jobs started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start background jobs');
    throw error;
  }
}

export * from './lottery-manager.js';
export * from './draw-processor.js';
