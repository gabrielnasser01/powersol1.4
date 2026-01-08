import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { logger } from './utils/logger.js';
import {
  testSupabaseConnection,
  testSolanaConnection,
  testRedisConnection,
} from './config/index.js';
import { startJobs } from './jobs/index.js';

async function bootstrap() {
  try {
    logger.info('Starting PowerSOL Backend...');

    logger.info('Testing connections...');
    const [supabaseOk, solanaOk, redisOk] = await Promise.all([
      testSupabaseConnection(),
      testSolanaConnection(),
      testRedisConnection(),
    ]);

    if (!supabaseOk) {
      logger.error('Supabase connection failed');
      process.exit(1);
    }

    if (!solanaOk) {
      logger.error('Solana connection failed');
      process.exit(1);
    }

    if (!redisOk) {
      logger.error('Redis connection failed');
      process.exit(1);
    }

    logger.info('All connections successful');

    const app = createApp();

    const server = app.listen(ENV.PORT, () => {
      logger.info(`Server running on port ${ENV.PORT}`);
      logger.info(`Environment: ${ENV.NODE_ENV}`);
      logger.info(`Cluster: ${ENV.CLUSTER}`);
    });

    startJobs();

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
