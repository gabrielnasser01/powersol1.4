import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const LOTTERY_WALLETS = {
  'tri-daily': '4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx',
  'weekly': 'EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133',
  'jackpot': 'EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133',
  'mega': 'EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133',
  'grand-prize': 'EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133',
  'halloween': 'AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk',
  'special': 'AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk',
} as const;

export type LotteryType = keyof typeof LOTTERY_WALLETS;

interface WalletBalance {
  address: string;
  balanceLamports: number;
  balanceSol: number;
}

interface AllWalletBalances {
  triDaily: WalletBalance;
  weekly: WalletBalance;
  mega: WalletBalance;
  special: WalletBalance;
  totalSol: number;
}

class WalletBalanceService {
  private connection: Connection;
  private cache: Map<string, { balance: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 10000;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }

  private isCacheValid(address: string): boolean {
    const cached = this.cache.get(address);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_TTL_MS;
  }

  async getWalletBalance(address: string): Promise<number> {
    if (this.isCacheValid(address)) {
      return this.cache.get(address)!.balance;
    }

    try {
      const pubkey = new PublicKey(address);
      const balance = await this.connection.getBalance(pubkey);
      this.cache.set(address, { balance, timestamp: Date.now() });
      return balance;
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error);
      const cached = this.cache.get(address);
      return cached?.balance || 0;
    }
  }

  async getLotteryPoolBalance(lotteryType: string): Promise<WalletBalance> {
    const normalizedType = lotteryType.toLowerCase().replace('_', '-') as LotteryType;
    const address = LOTTERY_WALLETS[normalizedType] || LOTTERY_WALLETS['tri-daily'];

    const balanceLamports = await this.getWalletBalance(address);

    return {
      address,
      balanceLamports,
      balanceSol: balanceLamports / LAMPORTS_PER_SOL,
    };
  }

  async getAllLotteryBalances(): Promise<AllWalletBalances> {
    const [triDaily, weekly, mega, special] = await Promise.all([
      this.getLotteryPoolBalance('tri-daily'),
      this.getLotteryPoolBalance('weekly'),
      this.getLotteryPoolBalance('mega'),
      this.getLotteryPoolBalance('special'),
    ]);

    const totalSol = triDaily.balanceSol + weekly.balanceSol + mega.balanceSol + special.balanceSol;

    return {
      triDaily,
      weekly,
      mega,
      special,
      totalSol,
    };
  }

  async getGlobalPrizePool(): Promise<{ totalSol: number; breakdown: AllWalletBalances }> {
    const breakdown = await this.getAllLotteryBalances();
    return {
      totalSol: breakdown.totalSol,
      breakdown,
    };
  }

  getExplorerUrl(address: string): string {
    const cluster = SOLANA_RPC_URL.includes('devnet') ? 'devnet' :
                   SOLANA_RPC_URL.includes('testnet') ? 'testnet' : 'mainnet-beta';
    return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
  }
}

export const walletBalanceService = new WalletBalanceService();
