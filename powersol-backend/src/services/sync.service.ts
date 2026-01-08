import { supabaseAdmin } from '@config/supabase.js';
import { solanaService } from './solana.service.js';
import { lotteryService } from './lottery.service.js';
import { loggers } from '@utils/logger.js';

const logger = loggers.solana;

export class SyncService {
  async syncLotteries(): Promise<void> {
    try {
      logger.info('Starting lottery synchronization');

      const lotteries = await lotteryService.getActiveLotteries();

      for (const lottery of lotteries) {
        await this.syncLottery(lottery.id, lottery.lottery_id);
      }

      logger.info({ count: lotteries.length }, 'Lottery synchronization completed');
    } catch (error) {
      logger.error({ error }, 'Failed to sync lotteries');
      throw error;
    }
  }

  async syncLottery(lotteryId: string, onChainId: number): Promise<void> {
    try {
      const onChainData = await solanaService.getLotteryData(onChainId);

      if (!onChainData) {
        logger.warn({ lotteryId, onChainId }, 'No on-chain data found');
        return;
      }

      await supabaseAdmin
        .from('lotteries')
        .update({
          current_tickets: onChainData.currentTickets,
          prize_pool: onChainData.prizePool.toString(),
        })
        .eq('id', lotteryId);

      logger.debug({ lotteryId, onChainId }, 'Lottery synced');
    } catch (error) {
      logger.error({ error, lotteryId }, 'Failed to sync lottery');
    }
  }

  async syncTicketTransaction(txSignature: string): Promise<void> {
    try {
      logger.info({ txSignature }, 'Syncing ticket transaction');

      const txDetails = await solanaService.getTransactionDetails(txSignature);

      if (!txDetails) {
        logger.warn({ txSignature }, 'Transaction not found on-chain');
        return;
      }

      await supabaseAdmin
        .from('transaction_logs')
        .update({ status: 'SUCCESS' })
        .eq('tx_signature', txSignature);

      logger.info({ txSignature }, 'Ticket transaction synced');
    } catch (error) {
      logger.error({ error, txSignature }, 'Failed to sync ticket transaction');
    }
  }

  async verifyPendingTransactions(): Promise<void> {
    try {
      logger.info('Verifying pending transactions');

      const { data: pendingTxs } = await supabaseAdmin
        .from('transaction_logs')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(100);

      if (!pendingTxs || pendingTxs.length === 0) {
        return;
      }

      for (const tx of pendingTxs) {
        const isConfirmed = await solanaService.verifyTransaction(tx.tx_signature);

        if (isConfirmed) {
          await supabaseAdmin
            .from('transaction_logs')
            .update({ status: 'SUCCESS' })
            .eq('id', tx.id);

          logger.info({ txSignature: tx.tx_signature }, 'Transaction confirmed');
        }
      }

      logger.info({ count: pendingTxs.length }, 'Pending transactions verified');
    } catch (error) {
      logger.error({ error }, 'Failed to verify pending transactions');
    }
  }
}

export const syncService = new SyncService();
