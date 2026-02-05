import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { LOTTERY_WALLETS } from './walletBalanceService';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

function getLotteryWalletForType(lotteryType?: string): string {
  const type = lotteryType || 'tri-daily';
  const normalizedType = type.toLowerCase().replace('_', '-') as keyof typeof LOTTERY_WALLETS;
  return LOTTERY_WALLETS[normalizedType] || LOTTERY_WALLETS['tri-daily'];
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

  async createTicketPurchaseTransaction(
    buyerPublicKey: string,
    amountSol: number,
    lotteryType?: string
  ): Promise<Transaction> {
    const buyer = new PublicKey(buyerPublicKey);
    const lotteryWallet = getLotteryWalletForType(lotteryType);
    const lottery = new PublicKey(lotteryWallet);
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: buyer,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: lottery,
        lamports,
      })
    );

    return transaction;
  }

  async createDonationTransaction(
    donorPublicKey: string,
    amountSol: number,
    recipientWallet?: string
  ): Promise<Transaction> {
    const donor = new PublicKey(donorPublicKey);
    const recipient = new PublicKey(recipientWallet || LOTTERY_WALLET);
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
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    );

    const confirmation = await this.connection.confirmTransaction({
      signature,
      blockhash: signedTransaction.recentBlockhash!,
      lastValidBlockHeight: signedTransaction.lastValidBlockHeight!,
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

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
