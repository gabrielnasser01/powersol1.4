import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

export const SOLANA_NETWORK = (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'testnet' | 'mainnet-beta';
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

export const SOLANA_ADDRESSES = {
  TREASURY: process.env.TREASURY_ADDRESS || '',
  AFFILIATES_POOL: process.env.AFFILIATES_POOL_ADDRESS || '',
  DELTA: process.env.DELTA_ADDRESS || '',
};

export const DISTRIBUTION = {
  PRIZE_POOL: 0.40,
  TREASURY: 0.30,
  AFFILIATES_MAX: 0.30,

  TIER_RATES: {
    TIER_1: 0.05,
    TIER_2: 0.10,
    TIER_3: 0.20,
    TIER_4: 0.30,
  }
} as const;

export const PROGRAM_IDS = {
  CORE: new PublicKey(process.env.CORE_PROGRAM_ID || 'GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW'),
  CLAIM: new PublicKey(process.env.CLAIM_PROGRAM_ID || 'DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK'),
  VRF: new PublicKey(process.env.VRF_PROGRAM_ID || '11111111111111111111111111111111'),
};

export const VRF_QUEUE = new PublicKey(
  process.env.VRF_QUEUE_ADDRESS || '11111111111111111111111111111111'
);

let connection: Connection | null = null;
let authorityKeypair: Keypair | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return connection;
}

export function getAuthorityKeypair(): Keypair {
  if (!authorityKeypair) {
    const privateKeyString = process.env.AUTHORITY_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('AUTHORITY_PRIVATE_KEY not found in environment');
    }

    const privateKeyArray = JSON.parse(privateKeyString);
    authorityKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }
  return authorityKeypair;
}

export function getTreasuryPublicKey(): PublicKey {
  if (!SOLANA_ADDRESSES.TREASURY) {
    throw new Error('TREASURY_ADDRESS not found in environment');
  }
  return new PublicKey(SOLANA_ADDRESSES.TREASURY);
}

export function getAffiliatesPoolPublicKey(): PublicKey {
  if (!SOLANA_ADDRESSES.AFFILIATES_POOL) {
    throw new Error('AFFILIATES_POOL_ADDRESS not found in environment');
  }
  return new PublicKey(SOLANA_ADDRESSES.AFFILIATES_POOL);
}

export function getDeltaPublicKey(): PublicKey {
  if (!SOLANA_ADDRESSES.DELTA) {
    throw new Error('DELTA_ADDRESS not found in environment');
  }
  return new PublicKey(SOLANA_ADDRESSES.DELTA);
}

let treasuryKeypair: Keypair | null = null;
let affiliatesKeypair: Keypair | null = null;
let deltaKeypair: Keypair | null = null;

export function getTreasuryKeypair(): Keypair {
  if (!treasuryKeypair) {
    const privateKeyString = process.env.TREASURY_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('TREASURY_PRIVATE_KEY not found in environment');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }
  return treasuryKeypair;
}

export function getAffiliatesKeypair(): Keypair {
  if (!affiliatesKeypair) {
    const privateKeyString = process.env.AFFILIATES_POOL_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('AFFILIATES_POOL_PRIVATE_KEY not found in environment');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    affiliatesKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }
  return affiliatesKeypair;
}

export function getDeltaKeypair(): Keypair {
  if (!deltaKeypair) {
    const privateKeyString = process.env.DELTA_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('DELTA_PRIVATE_KEY not found in environment');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    deltaKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }
  return deltaKeypair;
}

export function calculateDelta(ticketPrice: bigint, tierCommissionRate: number): bigint {
  const maxReserved = (ticketPrice * BigInt(30)) / BigInt(100);
  const actualCommission = (ticketPrice * BigInt(Math.floor(tierCommissionRate * 100))) / BigInt(100);
  return maxReserved - actualCommission;
}

export function calculateAffiliateAmounts(
  ticketPrice: bigint,
  tierCommissionRate: number
): {
  reserved: bigint;
  commission: bigint;
  delta: bigint;
} {
  const reserved = (ticketPrice * BigInt(30)) / BigInt(100);
  const commission = (ticketPrice * BigInt(Math.floor(tierCommissionRate * 100))) / BigInt(100);
  const delta = reserved - commission;

  return { reserved, commission, delta };
}
