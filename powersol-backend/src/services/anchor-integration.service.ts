import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { deriveLotteryPDA, derivePrizePDA, deriveTicketPDA } from '../lib/anchor/pdas';

interface LotteryTypeEnum {
  triDaily?: {};
  jackpot?: {};
  xmas?: {};
  grandPrize?: {};
}

interface InitializeLotteryParams {
  lotteryType: 'TRI_DAILY' | 'JACKPOT' | 'XMAS' | 'GRAND_PRIZE';
  ticketPrice: number;
  drawInterval: number;
  maxTickets: number;
  month?: number;
  year?: number;
}

interface PurchaseTicketParams {
  lotteryId: PublicKey;
  buyer: PublicKey;
  ticketNumber: number;
}

interface DrawWinnerParams {
  lotteryId: PublicKey;
  vrfResult: number[];
}

interface ClaimPrizeParams {
  lotteryId: PublicKey;
  winner: PublicKey;
  prizeAmount: number;
}

class AnchorIntegrationService {
  private connection: Connection;
  private coreProgram: Program | null = null;
  private claimProgram: Program | null = null;
  private coreProgramId: PublicKey;
  private claimProgramId: PublicKey;
  private authorityWallet: Keypair;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    const coreProgramIdStr = process.env.ANCHOR_CORE_PROGRAM_ID || process.env.CORE_PROGRAM_ID;
    const claimProgramIdStr = process.env.ANCHOR_CLAIM_PROGRAM_ID || process.env.CLAIM_PROGRAM_ID;

    if (!coreProgramIdStr || !claimProgramIdStr) {
      console.warn('Missing ANCHOR_CORE_PROGRAM_ID or ANCHOR_CLAIM_PROGRAM_ID - Anchor integration disabled');
      this.coreProgramId = PublicKey.default;
      this.claimProgramId = PublicKey.default;
      this.authorityWallet = Keypair.generate();
      return;
    }

    this.coreProgramId = new PublicKey(coreProgramIdStr);
    this.claimProgramId = new PublicKey(claimProgramIdStr);

    const authorityPrivateKey = process.env.SOLANA_AUTHORITY_PRIVATE;
    if (authorityPrivateKey) {
      try {
        const privateKeyArray = JSON.parse(authorityPrivateKey);
        this.authorityWallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      } catch {
        console.warn('Failed to parse SOLANA_AUTHORITY_PRIVATE - using generated keypair');
        this.authorityWallet = Keypair.generate();
      }
    } else {
      const walletPath = process.env.LOTTERY_WALLET_PATH || '/wallets/lottery-wallet.json';
      const fullPath = resolve(__dirname, '../../..', walletPath);

      if (existsSync(fullPath)) {
        const walletData = JSON.parse(readFileSync(fullPath, 'utf-8'));
        this.authorityWallet = Keypair.fromSecretKey(new Uint8Array(walletData));
      } else {
        console.warn(`Lottery wallet not found at: ${fullPath} - using generated keypair`);
        this.authorityWallet = Keypair.generate();
      }
    }

    this.initializePrograms();
  }

  private initializePrograms() {
    try {
      const wallet = new Wallet(this.authorityWallet);
      const provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });

      const coreIdlPath = resolve(__dirname, '../../../powersol-programs/target/idl/powersol_core.json');
      const claimIdlPath = resolve(__dirname, '../../../powersol-programs/target/idl/powersol_claim.json');

      if (existsSync(coreIdlPath)) {
        const coreIdl = JSON.parse(readFileSync(coreIdlPath, 'utf-8'));
        this.coreProgram = new Program(coreIdl, this.coreProgramId, provider);
      }

      if (existsSync(claimIdlPath)) {
        const claimIdl = JSON.parse(readFileSync(claimIdlPath, 'utf-8'));
        this.claimProgram = new Program(claimIdl, this.claimProgramId, provider);
      }
    } catch (error) {
      console.error('Failed to initialize Anchor programs:', error);
    }
  }

  private mapLotteryType(type: string): LotteryTypeEnum {
    const normalized = type.toLowerCase().replace(/_/g, '');

    switch (normalized) {
      case 'tridaily':
        return { triDaily: {} };
      case 'jackpot':
        return { jackpot: {} };
      case 'xmas':
        return { xmas: {} };
      case 'grandprize':
        return { grandPrize: {} };
      default:
        throw new Error(`Unknown lottery type: ${type}`);
    }
  }

  async initializeLottery(params: InitializeLotteryParams): Promise<string> {
    if (!this.coreProgram) {
      throw new Error('Core program not initialized');
    }

    const lotteryId = Keypair.generate().publicKey;
    const lotteryPda = deriveLotteryPDA(
      this.coreProgramId,
      lotteryId,
      params.month,
      params.year
    );

    const lotteryType = this.mapLotteryType(params.lotteryType);

    await this.coreProgram.methods
      .initialize({
        lotteryType,
        ticketPrice: new BN(params.ticketPrice * 1e9),
        drawInterval: new BN(params.drawInterval),
        maxTickets: new BN(params.maxTickets),
        month: params.month || null,
        year: params.year || null
      })
      .accounts({
        lottery: lotteryPda,
        authority: this.authorityWallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([this.authorityWallet])
      .rpc();

    return lotteryPda.toBase58();
  }

  async purchaseTicket(params: PurchaseTicketParams): Promise<string> {
    if (!this.coreProgram) {
      throw new Error('Core program not initialized');
    }

    const lotteryPda = deriveLotteryPDA(this.coreProgramId, params.lotteryId);
    const ticketPda = deriveTicketPDA(this.coreProgramId, params.lotteryId, params.ticketNumber);

    const treasuryPda = new PublicKey(process.env.ANCHOR_TREASURY_PDA!);

    const tx = await this.coreProgram.methods
      .purchaseTicket(new BN(params.ticketNumber))
      .accounts({
        lottery: lotteryPda,
        ticket: ticketPda,
        buyer: params.buyer,
        treasury: treasuryPda,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    return tx;
  }

  async drawWinner(params: DrawWinnerParams): Promise<string> {
    if (!this.coreProgram) {
      throw new Error('Core program not initialized');
    }

    const lotteryPda = deriveLotteryPDA(this.coreProgramId, params.lotteryId);

    const tx = await this.coreProgram.methods
      .draw(params.vrfResult)
      .accounts({
        lottery: lotteryPda,
        authority: this.authorityWallet.publicKey
      })
      .signers([this.authorityWallet])
      .rpc();

    return tx;
  }

  async claimPrize(params: ClaimPrizeParams): Promise<string> {
    if (!this.claimProgram) {
      throw new Error('Claim program not initialized');
    }

    const lotteryPda = deriveLotteryPDA(this.coreProgramId, params.lotteryId);
    const prizePda = derivePrizePDA(this.claimProgramId, params.lotteryId, params.winner);
    const treasuryPda = new PublicKey(process.env.ANCHOR_TREASURY_PDA!);

    const tx = await this.claimProgram.methods
      .claim(new BN(params.prizeAmount * 1e9))
      .accounts({
        prize: prizePda,
        winner: params.winner,
        treasury: treasuryPda,
        authority: this.authorityWallet.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([this.authorityWallet])
      .rpc();

    return tx;
  }

  async closeLottery(lotteryId: PublicKey): Promise<string> {
    if (!this.coreProgram) {
      throw new Error('Core program not initialized');
    }

    const lotteryPda = deriveLotteryPDA(this.coreProgramId, lotteryId);

    const tx = await this.coreProgram.methods
      .close()
      .accounts({
        lottery: lotteryPda,
        authority: this.authorityWallet.publicKey
      })
      .signers([this.authorityWallet])
      .rpc();

    return tx;
  }

  async getLotteryData(lotteryId: PublicKey): Promise<any> {
    if (!this.coreProgram) {
      throw new Error('Core program not initialized');
    }

    const lotteryPda = deriveLotteryPDA(this.coreProgramId, lotteryId);
    const lotteryAccount = await this.coreProgram.account.lottery.fetch(lotteryPda);

    return lotteryAccount;
  }

  async getTicketData(lotteryId: PublicKey, ticketNumber: number): Promise<any> {
    if (!this.coreProgram) {
      throw new Error('Core program not initialized');
    }

    const ticketPda = deriveTicketPDA(this.coreProgramId, lotteryId, ticketNumber);
    const ticketAccount = await this.coreProgram.account.ticket.fetch(ticketPda);

    return ticketAccount;
  }

  async getPrizeData(lotteryId: PublicKey, winner: PublicKey): Promise<any> {
    if (!this.claimProgram) {
      throw new Error('Claim program not initialized');
    }

    const prizePda = derivePrizePDA(this.claimProgramId, lotteryId, winner);
    const prizeAccount = await this.claimProgram.account.prize.fetch(prizePda);

    return prizeAccount;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getCoreProgram(): Program | null {
    return this.coreProgram;
  }

  getClaimProgram(): Program | null {
    return this.claimProgram;
  }

  getAuthorityPublicKey(): PublicKey {
    return this.authorityWallet.publicKey;
  }
}

export const anchorIntegrationService = new AnchorIntegrationService();
export default anchorIntegrationService;
