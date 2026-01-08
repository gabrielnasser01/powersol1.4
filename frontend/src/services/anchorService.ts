import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { WalletAdapter } from './solanaService';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const PROGRAM_ID = new PublicKey('GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW');
export const TREASURY_WALLET = new PublicKey('55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1');
export const AFFILIATES_POOL_WALLET = new PublicKey('8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf');

export type LotteryType = 'tri-daily' | 'jackpot' | 'grand-prize' | 'xmas';

export interface LotteryInfo {
  type: LotteryType;
  round?: number;
  month?: number;
  year?: number;
}

const IDL: Idl = {
  version: "0.1.0",
  name: "powersol_core",
  instructions: [
    {
      name: "purchaseTicket",
      accounts: [
        { name: "buyer", isMut: true, isSigner: true },
        { name: "lottery", isMut: true, isSigner: false },
        { name: "ticket", isMut: true, isSigner: false },
        { name: "userTickets", isMut: true, isSigner: false },
        { name: "treasury", isMut: true, isSigner: false },
        { name: "affiliatesPool", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "affiliateCode", type: { option: "string" } },
      ],
    },
  ],
  accounts: [],
  types: [],
};

class AnchorService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }

  getConnection(): Connection {
    return this.connection;
  }

  deriveLotteryPDA(lotteryInfo: LotteryInfo): [PublicKey, number] {
    let seeds: Buffer[];

    switch (lotteryInfo.type) {
      case 'tri-daily':
        seeds = [
          Buffer.from('tri_daily'),
          new BN(lotteryInfo.round || 1).toArrayLike(Buffer, 'le', 8),
        ];
        break;
      case 'jackpot':
        seeds = [
          Buffer.from('jackpot'),
          new BN(lotteryInfo.month || 1).toArrayLike(Buffer, 'le', 2),
          new BN(lotteryInfo.year || new Date().getFullYear()).toArrayLike(Buffer, 'le', 4),
        ];
        break;
      case 'grand-prize':
        seeds = [
          Buffer.from('grand_prize'),
          new BN(lotteryInfo.year || new Date().getFullYear()).toArrayLike(Buffer, 'le', 4),
        ];
        break;
      case 'xmas':
        seeds = [
          Buffer.from('xmas'),
          new BN(lotteryInfo.year || new Date().getFullYear()).toArrayLike(Buffer, 'le', 4),
        ];
        break;
      default:
        throw new Error(`Unknown lottery type: ${lotteryInfo.type}`);
    }

    return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  }

  deriveTicketPDA(lottery: PublicKey, ticketNumber: number): [PublicKey, number] {
    const seeds = [
      Buffer.from('ticket'),
      lottery.toBuffer(),
      new BN(ticketNumber).toArrayLike(Buffer, 'le', 4),
    ];
    return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  }

  deriveUserTicketsPDA(user: PublicKey, lottery: PublicKey): [PublicKey, number] {
    const seeds = [
      Buffer.from('user_tickets'),
      user.toBuffer(),
      lottery.toBuffer(),
    ];
    return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
  }

  async getLotteryAccount(lotteryPDA: PublicKey): Promise<{
    currentTickets: number;
    maxTickets: number;
    ticketPrice: bigint;
    prizePool: bigint;
    isDrawn: boolean;
    drawTimestamp: number;
  } | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(lotteryPDA);
      if (!accountInfo) return null;

      const data = accountInfo.data;
      const currentTickets = data.readUInt32LE(8 + 32 + 8 + 33 + 8 + 4);
      const maxTickets = data.readUInt32LE(8 + 32 + 8 + 33 + 8);
      const ticketPriceBuf = data.slice(8 + 32 + 8 + 33, 8 + 32 + 8 + 33 + 8);
      const ticketPrice = BigInt('0x' + Buffer.from(ticketPriceBuf).reverse().toString('hex'));

      return {
        currentTickets,
        maxTickets,
        ticketPrice,
        prizePool: BigInt(0),
        isDrawn: false,
        drawTimestamp: 0,
      };
    } catch {
      return null;
    }
  }

  async createPurchaseTicketInstruction(
    buyer: PublicKey,
    lotteryPDA: PublicKey,
    nextTicketNumber: number,
    affiliateCode: string | null
  ): Promise<TransactionInstruction> {
    const [ticketPDA] = this.deriveTicketPDA(lotteryPDA, nextTicketNumber);
    const [userTicketsPDA] = this.deriveUserTicketsPDA(buyer, lotteryPDA);

    const discriminator = Buffer.from([195, 70, 183, 196, 89, 55, 8, 44]);

    let affiliateData: Buffer;
    if (affiliateCode) {
      const codeBuffer = Buffer.from(affiliateCode, 'utf8');
      affiliateData = Buffer.concat([
        Buffer.from([1]),
        Buffer.from([codeBuffer.length, 0, 0, 0]),
        codeBuffer,
      ]);
    } else {
      affiliateData = Buffer.from([0]);
    }

    const data = Buffer.concat([discriminator, affiliateData]);

    const keys = [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: lotteryPDA, isSigner: false, isWritable: true },
      { pubkey: ticketPDA, isSigner: false, isWritable: true },
      { pubkey: userTicketsPDA, isSigner: false, isWritable: true },
      { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
      { pubkey: AFFILIATES_POOL_WALLET, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: PROGRAM_ID,
      data,
    });
  }

  async purchaseTicketOnChain(
    wallet: WalletAdapter,
    lotteryInfo: LotteryInfo,
    affiliateCode: string | null = null
  ): Promise<{ signature: string; ticketNumber: number }> {
    if (!wallet.publicKey || !wallet.connected) {
      throw new Error('Wallet not connected');
    }

    const buyer = wallet.publicKey;
    const [lotteryPDA] = this.deriveLotteryPDA(lotteryInfo);

    const lotteryAccount = await this.getLotteryAccount(lotteryPDA);
    if (!lotteryAccount) {
      throw new Error('Lottery not found on-chain. The lottery may not have been initialized yet.');
    }

    const nextTicketNumber = lotteryAccount.currentTickets + 1;

    if (nextTicketNumber > lotteryAccount.maxTickets) {
      throw new Error('Lottery is full');
    }

    const instruction = await this.createPurchaseTicketInstruction(
      buyer,
      lotteryPDA,
      nextTicketNumber,
      affiliateCode
    );

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: buyer,
      blockhash,
      lastValidBlockHeight,
    }).add(instruction);

    const signedTransaction = await wallet.signTransaction(transaction);

    const signature = await this.connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );

    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return { signature, ticketNumber: nextTicketNumber };
  }

  async purchaseMultipleTicketsOnChain(
    wallet: WalletAdapter,
    lotteryInfo: LotteryInfo,
    quantity: number,
    affiliateCode: string | null = null
  ): Promise<{ signatures: string[]; ticketNumbers: number[] }> {
    if (!wallet.publicKey || !wallet.connected) {
      throw new Error('Wallet not connected');
    }

    const signatures: string[] = [];
    const ticketNumbers: number[] = [];

    for (let i = 0; i < quantity; i++) {
      const result = await this.purchaseTicketOnChain(wallet, lotteryInfo, affiliateCode);
      signatures.push(result.signature);
      ticketNumbers.push(result.ticketNumber);
    }

    return { signatures, ticketNumbers };
  }

  async checkLotteryExists(lotteryInfo: LotteryInfo): Promise<boolean> {
    const [lotteryPDA] = this.deriveLotteryPDA(lotteryInfo);
    const accountInfo = await this.connection.getAccountInfo(lotteryPDA);
    return accountInfo !== null;
  }

  getExplorerUrl(signature: string): string {
    const cluster = SOLANA_RPC_URL.includes('devnet') ? 'devnet' :
                   SOLANA_RPC_URL.includes('testnet') ? 'testnet' : 'mainnet-beta';
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  }
}

export const anchorService = new AnchorService();
