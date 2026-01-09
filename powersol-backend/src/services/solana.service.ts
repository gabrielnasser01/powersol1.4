import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  getConnection,
  getAuthorityKeypair,
  getTreasuryPublicKey,
  getAffiliatesPoolPublicKey,
  PROGRAM_IDS,
} from '@config/solana.js';
import {
  findTriDailyLotteryPDA,
  findJackpotLotteryPDA,
  findGrandPrizeLotteryPDA,
  findXmasLotteryPDA,
  findTicketPDA,
  findClaimPDA,
  findUserTicketsPDA,
  LotteryType,
  getLotteryPDAForType,
} from '../lib/anchor/pdas.js';
import { BlockchainError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';
import type {
  TransactionResult,
  LotteryAccount,
  TicketAccount,
  LotteryData,
} from '../types/solana.types.js';

const logger = loggers.solana;

export class SolanaService {
  private connection = getConnection();
  private authority = getAuthorityKeypair();
  private treasury = getTreasuryPublicKey();
  private affiliatesPool = getAffiliatesPoolPublicKey();
  private coreProgram: Program | null = null;
  private claimProgram: Program | null = null;

  constructor() {
    this.initializePrograms();
  }

  private initializePrograms() {
    try {
      const wallet = new Wallet(this.authority);
      const provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });

      const coreIdlPath = resolve(__dirname, '../../powersol-programs/idl/powersol_core.json');
      const claimIdlPath = resolve(__dirname, '../../powersol-programs/idl/powersol_claim.json');

      if (existsSync(coreIdlPath)) {
        const coreIdl = JSON.parse(readFileSync(coreIdlPath, 'utf-8'));
        this.coreProgram = new Program(coreIdl, PROGRAM_IDS.CORE, provider);
        logger.info('Core program initialized');
      } else {
        logger.warn(`Core IDL not found at ${coreIdlPath}`);
      }

      if (existsSync(claimIdlPath)) {
        const claimIdl = JSON.parse(readFileSync(claimIdlPath, 'utf-8'));
        this.claimProgram = new Program(claimIdl, PROGRAM_IDS.CLAIM, provider);
        logger.info('Claim program initialized');
      } else {
        logger.warn(`Claim IDL not found at ${claimIdlPath}`);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Anchor programs');
    }
  }

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
      const status = await this.connection.getSignatureStatus(signature);
      const result = status.value;

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
      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('lottery'), Buffer.from([lotteryId])],
        PROGRAM_IDS.CORE
      );
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

  async executeDraw(
    lotteryType: LotteryType,
    params: { round?: number; month?: number; year?: number },
    winningTickets: number[]
  ): Promise<string> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const { publicKey: lotteryPda } = getLotteryPDAForType(lotteryType, params, PROGRAM_IDS.CORE);

      logger.info({ lotteryType, params, winningTickets }, 'Executing lottery draw on-chain');

      const tx = await this.coreProgram.methods
        .executeDraw(winningTickets)
        .accounts({
          lottery: lotteryPda,
          authority: this.authority.publicKey,
        })
        .signers([this.authority])
        .rpc();

      logger.info({ signature: tx, lotteryType }, 'Lottery draw executed on-chain');

      return tx;
    } catch (error) {
      logger.error({ error, lotteryType, params }, 'Failed to execute draw');
      throw new BlockchainError('Failed to execute draw', error);
    }
  }

  async getLotteryDataByType(
    lotteryType: LotteryType,
    params: { round?: number; month?: number; year?: number }
  ): Promise<LotteryAccount | null> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const { publicKey: lotteryPda } = getLotteryPDAForType(lotteryType, params, PROGRAM_IDS.CORE);

      const lotteryAccount = await this.coreProgram.account.lottery.fetch(lotteryPda) as any;

      return {
        authority: lotteryAccount.authority as PublicKey,
        lotteryId: Number(lotteryAccount.lotteryId),
        ticketPrice: BigInt(lotteryAccount.ticketPrice.toString()),
        maxTickets: Number(lotteryAccount.maxTickets),
        currentTickets: Number(lotteryAccount.currentTickets),
        drawTimestamp: BigInt(lotteryAccount.drawTimestamp.toString()),
        isDrawn: Boolean(lotteryAccount.isDrawn),
        winningTickets: lotteryAccount.winningTickets as number[],
        treasury: lotteryAccount.treasury as PublicKey,
        affiliatesPool: lotteryAccount.affiliatesPool as PublicKey,
        prizePool: BigInt(lotteryAccount.prizePool.toString()),
        bump: Number(lotteryAccount.bump),
      };
    } catch (error) {
      logger.error({ error, lotteryType, params }, 'Failed to get lottery data');
      return null;
    }
  }

  async getLotteryAccountInfo(lotteryPda: PublicKey): Promise<LotteryAccount | null> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const lotteryAccount = await this.coreProgram.account.lottery.fetch(lotteryPda) as any;

      return {
        authority: lotteryAccount.authority as PublicKey,
        lotteryId: Number(lotteryAccount.lotteryId),
        ticketPrice: BigInt(lotteryAccount.ticketPrice.toString()),
        maxTickets: Number(lotteryAccount.maxTickets),
        currentTickets: Number(lotteryAccount.currentTickets),
        drawTimestamp: BigInt(lotteryAccount.drawTimestamp.toString()),
        isDrawn: Boolean(lotteryAccount.isDrawn),
        winningTickets: lotteryAccount.winningTickets as number[],
        treasury: lotteryAccount.treasury as PublicKey,
        affiliatesPool: lotteryAccount.affiliatesPool as PublicKey,
        prizePool: BigInt(lotteryAccount.prizePool.toString()),
        bump: Number(lotteryAccount.bump),
      };
    } catch (error) {
      logger.error({ error, lotteryPda: lotteryPda.toBase58() }, 'Failed to get lottery account');
      return null;
    }
  }

  async getTicketData(
    lotteryPda: PublicKey,
    ticketNumber: number
  ): Promise<TicketAccount | null> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const [ticketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('ticket'),
          lotteryPda.toBuffer(),
          new BN(ticketNumber).toArrayLike(Buffer, 'le', 4),
        ],
        PROGRAM_IDS.CORE
      );

      const ticketAccount = await this.coreProgram.account.ticket.fetch(ticketPda) as any;

      return {
        owner: ticketAccount.owner as PublicKey,
        lottery: ticketAccount.lottery as PublicKey,
        ticketNumber: Number(ticketAccount.ticketNumber),
        purchasedAt: BigInt(ticketAccount.purchasedAt.toString()),
        affiliateCode: ticketAccount.affiliateCode as string | null,
        isWinner: Boolean(ticketAccount.isWinner),
        tier: ticketAccount.tier as number | null,
        claimed: Boolean(ticketAccount.claimed),
        bump: Number(ticketAccount.bump),
      };
    } catch (error) {
      logger.error({ error, lotteryPda: lotteryPda.toBase58(), ticketNumber }, 'Failed to get ticket data');
      return null;
    }
  }

  async initializeTriDailyLottery(
    round: number,
    ticketPrice: bigint,
    maxTickets: number,
    drawTimestamp: number
  ): Promise<string> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const { publicKey: lotteryPda } = findTriDailyLotteryPDA(round, PROGRAM_IDS.CORE);

      const tx = await this.coreProgram.methods
        .initializeTriDailyLottery(
          new BN(round),
          new BN(ticketPrice.toString()),
          maxTickets,
          new BN(drawTimestamp)
        )
        .accounts({
          lottery: lotteryPda,
          authority: this.authority.publicKey,
          treasury: this.treasury,
          affiliatesPool: this.affiliatesPool,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.authority])
        .rpc();

      logger.info({ signature: tx, round }, 'Tri-daily lottery initialized on-chain');

      return tx;
    } catch (error) {
      logger.error({ error, round }, 'Failed to initialize tri-daily lottery');
      throw new BlockchainError('Failed to initialize tri-daily lottery', error);
    }
  }

  async initializeJackpotLottery(
    month: number,
    year: number,
    ticketPrice: bigint,
    maxTickets: number,
    drawTimestamp: number
  ): Promise<string> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const { publicKey: lotteryPda } = findJackpotLotteryPDA(month, year, PROGRAM_IDS.CORE);

      const tx = await this.coreProgram.methods
        .initializeJackpotLottery(
          month,
          year,
          new BN(ticketPrice.toString()),
          maxTickets,
          new BN(drawTimestamp)
        )
        .accounts({
          lottery: lotteryPda,
          authority: this.authority.publicKey,
          treasury: this.treasury,
          affiliatesPool: this.affiliatesPool,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.authority])
        .rpc();

      logger.info({ signature: tx, month, year }, 'Jackpot lottery initialized on-chain');

      return tx;
    } catch (error) {
      logger.error({ error, month, year }, 'Failed to initialize jackpot lottery');
      throw new BlockchainError('Failed to initialize jackpot lottery', error);
    }
  }

  async initializeGrandPrizeLottery(
    year: number,
    ticketPrice: bigint,
    maxTickets: number,
    drawTimestamp: number
  ): Promise<string> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const { publicKey: lotteryPda } = findGrandPrizeLotteryPDA(year, PROGRAM_IDS.CORE);

      const tx = await this.coreProgram.methods
        .initializeGrandPrizeLottery(
          year,
          new BN(ticketPrice.toString()),
          maxTickets,
          new BN(drawTimestamp)
        )
        .accounts({
          lottery: lotteryPda,
          authority: this.authority.publicKey,
          treasury: this.treasury,
          affiliatesPool: this.affiliatesPool,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.authority])
        .rpc();

      logger.info({ signature: tx, year }, 'Grand prize lottery initialized on-chain');

      return tx;
    } catch (error) {
      logger.error({ error, year }, 'Failed to initialize grand prize lottery');
      throw new BlockchainError('Failed to initialize grand prize lottery', error);
    }
  }

  getCoreProgram(): Program | null {
    return this.coreProgram;
  }

  getClaimProgram(): Program | null {
    return this.claimProgram;
  }

  async getLotteryData(onChainId: number): Promise<LotteryData | null> {
    try {
      if (!this.coreProgram) {
        throw new BlockchainError('Core program not initialized');
      }

      const [lotteryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('lottery'), Buffer.from([onChainId])],
        PROGRAM_IDS.CORE
      );

      const lotteryAccount = await this.coreProgram.account.lottery.fetch(lotteryPda) as any;

      return {
        currentTickets: Number(lotteryAccount.currentTickets),
        prizePool: BigInt(lotteryAccount.prizePool.toString()),
        isDrawn: Boolean(lotteryAccount.isDrawn),
        winningTicket: lotteryAccount.winningTickets?.length > 0 ? lotteryAccount.winningTickets[0] : null,
      };
    } catch (error) {
      logger.error({ error, onChainId }, 'Failed to get lottery data');
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
