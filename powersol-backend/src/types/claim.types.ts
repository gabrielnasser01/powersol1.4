export interface Claim {
  id: string;
  user_id: string;
  ticket_id: string | null;
  amount: string;
  claim_type: 'PRIZE' | 'AFFILIATE' | 'MISSION';
  is_claimed: boolean;
  tx_signature: string | null;
  created_at: string;
  claimed_at: string | null;
}

export interface ClaimStatus {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  txSignature: string | null;
  amount: bigint;
  createdAt: Date;
  claimedAt: Date | null;
}

export type ClaimType = 'PRIZE' | 'AFFILIATE' | 'MISSION';

export interface PreparedTransaction {
  serializedTx: string;
  blockhash: string;
}

export interface PrizeClaimOnChain {
  claimer: string;
  lottery: string;
  ticketNumber: number;
  amount: bigint;
  claimed: boolean;
  claimTime: number;
}

export interface AffiliateClaimOnChain {
  claimer: string;
  amount: bigint;
  claimed: boolean;
  claimTime: number;
}
