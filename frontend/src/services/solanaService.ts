import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { LOTTERY_WALLETS } from './walletBalanceService';
import { TREASURY_WALLET, AFFILIATES_POOL_WALLET, anchorService } from './anchorService';
import { supabase } from '../lib/supabase';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const DELTA_WALLET = new PublicKey(import.meta.env.VITE_DELTA_WALLET || '2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU');

const DISTRIBUTION = {
  PRIZE_POOL: 40,
  TREASURY: 30,
  AFFILIATES_MAX: 30,
} as const;

const COMMISSION_RATES: Record<number, number> = { 1: 5, 2: 10, 3: 20, 4: 30 };

function getPrizeVaultForType(lotteryType?: string): PublicKey {
  const type = lotteryType || 'tri-daily';
  return anchorService.getPrizeVaultAddress(type);
}

export interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

class SolanaService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }

  getConnection(): Connection {
    return this.connection;
  }

  async getBalance(publicKey: string): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  async getAffiliateTierForBuyer(buyerWallet: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_tier_for_buyer', { buyer_wallet: buyerWallet });

      if (error || data === null || data === undefined) return 0;

      return data as number;
    } catch {
      return 0;
    }
  }

  async createTicketPurchaseTransaction(
    buyerPublicKey: string,
    amountSol: number,
    lotteryType?: string
  ): Promise<Transaction> {
    const buyer = new PublicKey(buyerPublicKey);
    const prizePoolWallet = getPrizeVaultForType(lotteryType);
    const totalLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    const prizePoolAmount = Math.floor((totalLamports * DISTRIBUTION.PRIZE_POOL) / 100);
    const treasuryAmount = Math.floor((totalLamports * DISTRIBUTION.TREASURY) / 100);
    const affiliatesReserved = totalLamports - prizePoolAmount - treasuryAmount;

    const tier = await this.getAffiliateTierForBuyer(buyerPublicKey);
    const commissionPct = tier > 0 ? (COMMISSION_RATES[tier] || 5) : 0;
    const affiliateCommission = Math.floor((totalLamports * commissionPct) / 100);
    const deltaAmount = affiliatesReserved - affiliateCommission;

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: buyer,
      blockhash,
      lastValidBlockHeight,
    });

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: prizePoolWallet,
        lamports: prizePoolAmount,
      })
    );

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: TREASURY_WALLET,
        lamports: treasuryAmount,
      })
    );

    if (affiliateCommission > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: AFFILIATES_POOL_WALLET,
          lamports: affiliateCommission,
        })
      );
    }

    if (deltaAmount > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyer,
          toPubkey: DELTA_WALLET,
          lamports: deltaAmount,
        })
      );
    }

    return transaction;
  }

  async createDonationTransaction(
    donorPublicKey: string,
    amountSol: number,
    recipientWallet?: string
  ): Promise<Transaction> {
    const donor = new PublicKey(donorPublicKey);
    const recipient = recipientWallet ? new PublicKey(recipientWallet) : getPrizeVaultForType('tri-daily');
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: donor,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: donor,
        toPubkey: recipient,
        lamports,
      })
    );

    return transaction;
  }

  async sendAndConfirmTransaction(signedTransaction: Transaction): Promise<string> {
    const signature = await this.connection.sendRawTransaction(
      signedTransaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'processed' }
    );

    const latestBlockhash = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, 'confirmed');

    return signature;
  }

  async purchaseTicketsWithWallet(
    wallet: WalletAdapter,
    quantity: number,
    ticketPriceSol: number,
    lotteryType?: string
  ): Promise<{ signature: string; success: boolean }> {
    if (!wallet.publicKey || !wallet.connected) {
      throw new Error('Wallet not connected');
    }

    const totalAmount = quantity * ticketPriceSol;
    const buyerKey = wallet.publicKey.toBase58();

    const balance = await this.getBalance(buyerKey);
    if (balance < totalAmount + 0.01) {
      throw new Error(`Insufficient balance. Need ${totalAmount.toFixed(4)} SOL plus fees, have ${balance.toFixed(4)} SOL`);
    }

    const transaction = await this.createTicketPurchaseTransaction(buyerKey, totalAmount, lotteryType);
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await this.sendAndConfirmTransaction(signedTransaction);

    return { signature, success: true };
  }

  async donateWithWallet(
    wallet: WalletAdapter,
    amountSol: number,
    recipientWallet?: string
  ): Promise<{ signature: string; success: boolean }> {
    if (!wallet.publicKey || !wallet.connected) {
      throw new Error('Wallet not connected');
    }

    const donorKey = wallet.publicKey.toBase58();

    const balance = await this.getBalance(donorKey);
    if (balance < amountSol + 0.01) {
      throw new Error(`Insufficient balance. Need ${amountSol.toFixed(4)} SOL plus fees, have ${balance.toFixed(4)} SOL`);
    }

    const transaction = await this.createDonationTransaction(donorKey, amountSol, recipientWallet);
    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await this.sendAndConfirmTransaction(signedTransaction);

    return { signature, success: true };
  }

  getExplorerUrl(signature: string): string {
    const cluster = SOLANA_RPC_URL.includes('devnet') ? 'devnet' :
                   SOLANA_RPC_URL.includes('testnet') ? 'testnet' : 'mainnet-beta';
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  }
}

export const solanaService = new SolanaService();
