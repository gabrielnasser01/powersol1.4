import { PublicKey } from '@solana/web3.js';

export interface TransactionResult {
  signature: string;
  confirmed: boolean;
  slot?: number;
  err?: unknown;
}

export interface LotteryAccount {
  authority: PublicKey;
  lotteryId: number;
  ticketPrice: bigint;
  maxTickets: number;
  currentTickets: number;
  drawTimestamp: bigint;
  isDrawn: boolean;
  winningTickets: number[];
  treasury: PublicKey;
  affiliatesPool: PublicKey;
  prizePool: bigint;
  bump: number;
}

export interface TicketAccount {
  owner: PublicKey;
  lottery: PublicKey;
  ticketNumber: number;
  purchasedAt: bigint;
  affiliateCode: string | null;
  isWinner: boolean;
  tier: number | null;
  claimed: boolean;
  bump: number;
}

export interface PrizePoolAccount {
  authority: PublicKey;
  totalAmount: bigint;
  claimedAmount: bigint;
  bump: number;
}

export interface AffiliatePoolAccount {
  authority: PublicKey;
  totalAmount: bigint;
  claimedAmount: bigint;
  bump: number;
}

export interface LotteryData {
  currentTickets: number;
  prizePool: bigint;
  isDrawn: boolean;
  winningTicket: number | null;
}
