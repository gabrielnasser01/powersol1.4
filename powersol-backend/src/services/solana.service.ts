import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getConnection,
  getAuthorityKeypair,
  getTreasuryPublicKey,
  PROGRAM_IDS,
} from '@config/solana.js';
import { findLotteryPDA, findTicketPDA, findClaimPDA } from '../lib/anchor/pdas.js';
import { BlockchainError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import { retry } from '@utils/helpers.js';
import type {
  TransactionResult,
  LotteryAccount,
  TicketAccount,
} from '../types/solana.types.js';

const logger = loggers.solana;

export class SolanaService {
  private connection = getConnection();
  private authority = getAuthorityKeypair();
  private treasury = getTreasuryPublicKey();

  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error({ error, publicKey: publicKey.toBase58() }, 'Failed to get balance');
      throw new BlockchainError('Failed to get balance', error);
    }
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const result = await retry(async () => {
        const status = await this.connection.getSignatureStatus(signature);
        return status.value;
      });

      if (!result) {
        return false;
      }

      return result.confirmationStatus === 'confirmed' || result.confirmationStatus === 'finalized';
    } catch (error) {
      logger.error({ error, signature }, 'Failed to verify transaction');
      return false;
    }
  }

  async sendTransaction(transaction: Transaction): Promise<TransactionResult> {
    try {
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      transaction.feePayer = this.authority.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.authority],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      );

      logger.info({ signature }, 'Transaction sent successfully');

      return {
        signature,
        confirmed: true,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to send transaction');
      throw new BlockchainError('Failed to send transaction', error);
    }
  }

  async prepareClaimTransactionForUserSign(
    claimer: PublicKey,
    amount: bigint
  ): Promise<{ serializedTx: string; blockhash: string }> {
    try {
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = claimer;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.treasury,
          toPubkey: claimer,
          lamports: Number(amount),
        })
      );

      transaction.partialSign(this.authority);

      const serializedTx = transaction
        .serialize({ requireAllSignatures: false })
        .toString('base64');

      logger.info({ claimer: claimer.toBase58(), amount }, 'Claim transaction prepared for user signature');

      return { serializedTx, blockhash };
    } catch (error) {
      logger.error({ error, claimer: claimer.toBase58() }, 'Failed to prepare claim transaction');
      throw new BlockchainError('Failed to prepare claim transaction', error);
    }
  }

  async submitSignedClaimTransaction(signedTxBase64: string): Promise<TransactionResult> {
    try {
      const txBuffer = Buffer.from(signedTxBase64, 'base64');
      const transaction = Transaction.from(txBuffer);

      const signature = await this.connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await this.connection.confirmTransaction(signature, 'confirmed');

      logger.info({ signature }, 'Signed claim transaction submitted');

      return {
        signature,
        confirmed: true,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to submit signed claim transaction');
      throw new BlockchainError('Failed to submit signed claim transaction', error);
    }
  }

  async buildPurchaseTransaction(
    buyer: PublicKey,
    lotteryId: number,
    ticketNumber: number,
    ticketPrice: bigint
  ): Promise<Transaction> {
    try {
      const { publicKey: lotteryPda } = findLotteryPDA(lotteryId, PROGRAM_IDS.CORE);
      const { publicKey: ticketPda } = findTicketPDA(lotteryId, ticketNumber, PROGRAM_IDS.CORE);

      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: this.treasury,
          lamports: Number(ticketPrice),
        })
      );

      logger.info({ buyer: buyer.toBase58(), lotteryId, ticketNumber }, 'Purchase transaction built');

      return transaction;
    } catch (error) {
      logger.error({ error, buyer: buyer.toBase58(), lotteryId }, 'Failed to build purchase transaction');
      throw new BlockchainError('Failed to build purchase transaction', error);
    }
  }

  async buildClaimTransaction(
    claimer: PublicKey,
    amount: bigint
  ): Promise<Transaction> {
    try {
      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.treasury,
          toPubkey: claimer,
          lamports: Number(amount),
        })
      );

      logger.info({ claimer: claimer.toBase58(), amount }, 'Claim transaction built');

      return transaction;
    } catch (error) {
      logger.error({ error, claimer: claimer.toBase58() }, 'Failed to build claim transaction');
      throw new BlockchainError('Failed to build claim transaction', error);
    }
  }

  async executeDraw(lotteryId: number, winningTicket: number): Promise<string> {
    try {
      logger.info({ lotteryId, winningTicket }, 'Executing lottery draw');

      const transaction = new Transaction();

      const result = await this.sendTransaction(transaction);

      logger.info({ lotteryId, signature: result.signature }, 'Lottery draw executed');

      return result.signature;
    } catch (error) {
      logger.error({ error, lotteryId }, 'Failed to execute draw');
      throw new BlockchainError('Failed to execute draw', error);
    }
  }

  async getLotteryData(lotteryId: number): Promise<LotteryAccount | null> {
    try {
      const { publicKey: lotteryPda } = findLotteryPDA(lotteryId, PROGRAM_IDS.CORE);

      const accountInfo = await this.connection.getAccountInfo(lotteryPda);

      if (!accountInfo) {
        return null;
      }

      return {
        authority: this.authority.publicKey,
        lotteryId,
        ticketPrice: BigInt(0),
        maxTickets: 0,
        currentTickets: 0,
        drawTimestamp: BigInt(0),
        isDrawn: false,
        winningTicket: null,
        treasury: this.treasury,
        prizePool: BigInt(0),
      };
    } catch (error) {
      logger.error({ error, lotteryId }, 'Failed to get lottery data');
      return null;
    }
  }

  async getTicketData(
    lotteryId: number,
    ticketNumber: number
  ): Promise<TicketAccount | null> {
    try {
      const { publicKey: ticketPda } = findTicketPDA(lotteryId, ticketNumber, PROGRAM_IDS.CORE);

      const accountInfo = await this.connection.getAccountInfo(ticketPda);

      if (!accountInfo) {
        return null;
      }

      return {
        owner: PublicKey.default,
        lottery: PublicKey.default,
        ticketNumber,
        purchasedAt: BigInt(0),
      };
    } catch (error) {
      logger.error({ error, lotteryId, ticketNumber }, 'Failed to get ticket data');
      return null;
    }
  }

  async getTransactionDetails(signature: string): Promise<any> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      return tx;
    } catch (error) {
      logger.error({ error, signature }, 'Failed to get transaction details');
      return null;
    }
  }

  async airdropSOL(publicKey: PublicKey, amount: number): Promise<string> {
    try {
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      await this.connection.confirmTransaction(signature);

      logger.info({ publicKey: publicKey.toBase58(), amount }, 'Airdrop successful');

      return signature;
    } catch (error) {
      logger.error({ error, publicKey: publicKey.toBase58() }, 'Failed to airdrop');
      throw new BlockchainError('Failed to airdrop SOL', error);
    }
  }
}

export const solanaService = new SolanaService();
