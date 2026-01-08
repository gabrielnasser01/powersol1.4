import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getAuthorityKeypair, getTreasuryPublicKey, PROGRAM_IDS } from '@config/solana.js';
import {
  getLotteryPDAForType,
  LotteryType,
  findTicketPDA,
  findUserTicketsPDA,
} from '../lib/anchor/pdas.js';
import {
  getLotteryConfig,
  calculateTriDailyRound,
  getCurrentMonth,
  getCurrentYear,
} from '@config/lotteries.js';
import { BlockchainError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';

const logger = loggers.solana;

export class SolanaLotteryService {
  private connection = getConnection();
  private authority = getAuthorityKeypair();
  private treasury = getTreasuryPublicKey();

  getLotteryPDA(type: LotteryType): { publicKey: PublicKey; bump: number } {
    const params = this.getLotteryParams(type);
    return getLotteryPDAForType(type, params, PROGRAM_IDS.CORE);
  }

  private getLotteryParams(type: LotteryType): {
    round?: number;
    month?: number;
    year?: number;
  } {
    switch (type) {
      case LotteryType.TRI_DAILY:
        return { round: calculateTriDailyRound() };
      case LotteryType.JACKPOT:
        return { month: getCurrentMonth(), year: getCurrentYear() };
      case LotteryType.GRAND_PRIZE:
        return { year: getCurrentYear() + 1 };
      case LotteryType.XMAS:
        return { year: 2024 };
      default:
        throw new Error(`Unknown lottery type: ${type}`);
    }
  }

  async buildPurchaseTransaction(
    buyer: PublicKey,
    lotteryType: LotteryType,
    ticketNumber: number
  ): Promise<Transaction> {
    try {
      const config = getLotteryConfig(lotteryType);
      const lotteryPDA = this.getLotteryPDA(lotteryType);
      const params = this.getLotteryParams(lotteryType);

      const lotteryId = params.round || params.month || params.year || 1;
      const ticketPDA = findTicketPDA(lotteryId, ticketNumber, PROGRAM_IDS.CORE);
      const userTicketsPDA = findUserTicketsPDA(buyer, lotteryId, PROGRAM_IDS.CORE);

      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: this.treasury,
          lamports: Number(config.ticketPrice),
        })
      );

      logger.info(
        {
          buyer: buyer.toBase58(),
          lotteryType,
          ticketNumber,
          lotteryPDA: lotteryPDA.publicKey.toBase58(),
          ticketPDA: ticketPDA.publicKey.toBase58(),
        },
        'Purchase transaction built'
      );

      return transaction;
    } catch (error) {
      logger.error({ error, buyer: buyer.toBase58(), lotteryType }, 'Failed to build purchase transaction');
      throw new BlockchainError('Failed to build purchase transaction', error);
    }
  }

  async buildDrawTransaction(lotteryType: LotteryType, winningTicket: number): Promise<Transaction> {
    try {
      const lotteryPDA = this.getLotteryPDA(lotteryType);

      const transaction = new Transaction();

      logger.info(
        {
          lotteryType,
          winningTicket,
          lotteryPDA: lotteryPDA.publicKey.toBase58(),
        },
        'Draw transaction built'
      );

      return transaction;
    } catch (error) {
      logger.error({ error, lotteryType }, 'Failed to build draw transaction');
      throw new BlockchainError('Failed to build draw transaction', error);
    }
  }

  async getLotteryAccountInfo(lotteryType: LotteryType): Promise<any> {
    try {
      const lotteryPDA = this.getLotteryPDA(lotteryType);
      const accountInfo = await this.connection.getAccountInfo(lotteryPDA.publicKey);

      if (!accountInfo) {
        logger.warn({ lotteryType }, 'Lottery account not found on-chain');
        return null;
      }

      return {
        publicKey: lotteryPDA.publicKey.toBase58(),
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
        data: accountInfo.data,
      };
    } catch (error) {
      logger.error({ error, lotteryType }, 'Failed to get lottery account info');
      return null;
    }
  }

  async getTicketAccountInfo(
    lotteryId: number,
    ticketNumber: number
  ): Promise<any> {
    try {
      const ticketPDA = findTicketPDA(lotteryId, ticketNumber, PROGRAM_IDS.CORE);
      const accountInfo = await this.connection.getAccountInfo(ticketPDA.publicKey);

      if (!accountInfo) {
        return null;
      }

      return {
        publicKey: ticketPDA.publicKey.toBase58(),
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
      };
    } catch (error) {
      logger.error({ error, lotteryId, ticketNumber }, 'Failed to get ticket account info');
      return null;
    }
  }

  async getUserTickets(userPubkey: PublicKey, lotteryId: number): Promise<any> {
    try {
      const userTicketsPDA = findUserTicketsPDA(userPubkey, lotteryId, PROGRAM_IDS.CORE);
      const accountInfo = await this.connection.getAccountInfo(userTicketsPDA.publicKey);

      if (!accountInfo) {
        return { ticketNumbers: [], count: 0 };
      }

      return {
        publicKey: userTicketsPDA.publicKey.toBase58(),
        ticketNumbers: [],
        count: 0,
      };
    } catch (error) {
      logger.error({ error, user: userPubkey.toBase58(), lotteryId }, 'Failed to get user tickets');
      return { ticketNumbers: [], count: 0 };
    }
  }

  getExpectedPrizeForType(lotteryType: LotteryType, totalSales: bigint): bigint {
    const config = getLotteryConfig(lotteryType);
    return (totalSales * BigInt(config.prizeDistribution.winner)) / BigInt(100);
  }

  getTreasuryShareForType(lotteryType: LotteryType, totalSales: bigint): bigint {
    const config = getLotteryConfig(lotteryType);
    return (totalSales * BigInt(config.prizeDistribution.treasury)) / BigInt(100);
  }

  getAffiliateShareForType(lotteryType: LotteryType, totalSales: bigint): bigint {
    const config = getLotteryConfig(lotteryType);
    return (totalSales * BigInt(config.prizeDistribution.affiliates)) / BigInt(100);
  }
}

export const solanaLotteryService = new SolanaLotteryService();
