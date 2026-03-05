import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

const CLAIM_PROGRAM_ID = new PublicKey(import.meta.env.VITE_CLAIM_PROGRAM_ID || 'DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK');
const LAMPORTS_PER_SOL = 1_000_000_000;

const encoder = new TextEncoder();

function toBytes(str: string): Uint8Array {
  return encoder.encode(str);
}

function u64ToLEBytes(value: bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, value, true);
  return new Uint8Array(buf);
}

function u32ToLEBytes(value: number): Uint8Array {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, value, true);
  return new Uint8Array(buf);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

interface ClaimableAffiliateWeek {
  week_number: number;
  pending_lamports: number;
  tier: number;
  referral_count: number;
  release_timestamp: string;
  is_available: boolean;
}

interface ClaimablePrize {
  prize_id: string;
  lottery_type: string;
  lottery_round: number;
  tier: number;
  amount_lamports: number;
  won_at: string;
}

interface NextRelease {
  next_release_timestamp: string;
  current_week: number;
  time_until_release: string;
}

function findPDA(seeds: Uint8Array[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

export const claimService = {
  async getClaimableAffiliateRewards(walletAddress: string): Promise<ClaimableAffiliateWeek[]> {
    const { data, error } = await supabase.rpc('get_claimable_affiliate_balance_v2', {
      p_wallet: walletAddress
    });

    if (error || !data) {
      return [];
    }

    return data;
  },

  async getNextAffiliateRelease(): Promise<NextRelease | null> {
    const { data, error } = await supabase.rpc('get_next_affiliate_release');

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  },

  async getTotalPendingAffiliateRewards(walletAddress: string): Promise<number> {
    const weeks = await this.getClaimableAffiliateRewards(walletAddress);
    return weeks
      .filter(w => w.is_available)
      .reduce((sum, w) => sum + w.pending_lamports, 0);
  },

  async getUnclaimedPrizes(walletAddress: string): Promise<ClaimablePrize[]> {
    const { data, error } = await supabase.rpc('get_unclaimed_prizes', {
      p_wallet: walletAddress
    });

    if (error || !data) {
      return [];
    }

    return data;
  },

  async claimAffiliateRewards(
    walletAddress: string,
    weekNumber: number,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    connection: Connection
  ): Promise<{ success: boolean; txSignature?: string; error?: string; amount?: number }> {
    try {
      const weeks = await this.getClaimableAffiliateRewards(walletAddress);
      const weekData = weeks.find(w => w.week_number === weekNumber);

      if (!weekData) {
        return { success: false, error: 'No rewards for this week' };
      }

      if (!weekData.is_available) {
        return { success: false, error: 'Claim not yet available - wait until Wednesday 23:59:59 GMT' };
      }

      const walletPubkey = new PublicKey(walletAddress);

      const [affiliatePoolPDA] = findPDA(
        [toBytes('affiliate_pool')],
        CLAIM_PROGRAM_ID
      );

      const [affiliateVaultPDA] = findPDA(
        [toBytes('affiliate_vault')],
        CLAIM_PROGRAM_ID
      );

      const [accumulatorPDA] = findPDA(
        [toBytes('accumulator'), walletPubkey.toBytes()],
        CLAIM_PROGRAM_ID
      );

      const weekBytes = u64ToLEBytes(BigInt(weekNumber));

      const [affiliateClaimPDA] = findPDA(
        [toBytes('affiliate_claim'), walletPubkey.toBytes(), weekBytes],
        CLAIM_PROGRAM_ID
      );

      const tx = new Transaction();

      const instructionData = concatBytes(
        new Uint8Array([8]),
        u64ToLEBytes(BigInt(weekData.pending_lamports)),
        new Uint8Array([weekData.tier]),
        u64ToLEBytes(BigInt(weekNumber)),
        u32ToLEBytes(weekData.referral_count),
        new Uint8Array(4)
      );

      tx.add({
        keys: [
          { pubkey: walletPubkey, isSigner: true, isWritable: true },
          { pubkey: affiliatePoolPDA, isSigner: false, isWritable: true },
          { pubkey: affiliateVaultPDA, isSigner: false, isWritable: true },
          { pubkey: accumulatorPDA, isSigner: false, isWritable: true },
          { pubkey: affiliateClaimPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: CLAIM_PROGRAM_ID,
        data: instructionData,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPubkey;

      const signedTx = await signTransaction(tx);
      const txSignature = await connection.sendRawTransaction(signedTx.serialize());

      await connection.confirmTransaction(txSignature, 'confirmed');

      await supabase.rpc('process_affiliate_claim_v2', {
        p_wallet: walletAddress,
        p_week_number: weekNumber,
        p_tx_signature: txSignature
      });

      return {
        success: true,
        txSignature,
        amount: weekData.pending_lamports
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAllAvailableAffiliateRewards(
    walletAddress: string,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    connection: Connection
  ): Promise<{ success: boolean; claimed: number; totalAmount: number; txSignatures: string[]; errors: string[] }> {
    const weeks = await this.getClaimableAffiliateRewards(walletAddress);
    const availableWeeks = weeks.filter(w => w.is_available && w.pending_lamports > 0);

    const txSignatures: string[] = [];
    const errors: string[] = [];
    let totalAmount = 0;

    for (const week of availableWeeks) {
      const result = await this.claimAffiliateRewards(
        walletAddress,
        week.week_number,
        signTransaction,
        connection
      );

      if (result.success && result.txSignature) {
        txSignatures.push(result.txSignature);
        totalAmount += result.amount || 0;
      } else if (result.error) {
        errors.push(`Week ${week.week_number}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: txSignatures.length,
      totalAmount,
      txSignatures,
      errors
    };
  },

  async claimPrize(
    walletAddress: string,
    prizeId: string,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    connection: Connection
  ): Promise<{ success: boolean; txSignature?: string; error?: string }> {
    try {
      const prizes = await this.getUnclaimedPrizes(walletAddress);
      const prize = prizes.find(p => p.prize_id === prizeId);

      if (!prize) {
        return { success: false, error: 'Prize not found or already claimed' };
      }

      const walletPubkey = new PublicKey(walletAddress);

      const lotteryTypeMap: Record<string, number> = {
        'tri-daily': 0,
        'special-event': 1,
        'jackpot': 2,
        'grand-prize': 3
      };
      const lotteryTypeNum = lotteryTypeMap[prize.lottery_type] || 0;

      const [prizePoolPDA] = findPDA(
        [toBytes('prize_pool'), new Uint8Array([lotteryTypeNum])],
        CLAIM_PROGRAM_ID
      );

      const [prizeVaultPDA] = findPDA(
        [toBytes('prize_vault'), prizePoolPDA.toBytes()],
        CLAIM_PROGRAM_ID
      );

      const roundBytes = u64ToLEBytes(BigInt(prize.lottery_round));

      const [prizeClaimPDA] = findPDA(
        [toBytes('prize_claim'), walletPubkey.toBytes(), prizePoolPDA.toBytes(), roundBytes],
        CLAIM_PROGRAM_ID
      );

      const tx = new Transaction();

      const instructionData = concatBytes(
        new Uint8Array([7]),
        u64ToLEBytes(BigInt(prize.amount_lamports)),
        new Uint8Array([prize.tier]),
        u64ToLEBytes(BigInt(prize.lottery_round))
      );

      tx.add({
        keys: [
          { pubkey: walletPubkey, isSigner: true, isWritable: true },
          { pubkey: prizePoolPDA, isSigner: false, isWritable: true },
          { pubkey: prizeVaultPDA, isSigner: false, isWritable: true },
          { pubkey: prizeClaimPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: CLAIM_PROGRAM_ID,
        data: instructionData,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = walletPubkey;

      const signedTx = await signTransaction(tx);
      const txSignature = await connection.sendRawTransaction(signedTx.serialize());

      await connection.confirmTransaction(txSignature, 'confirmed');

      await supabase.rpc('mark_prize_claimed', {
        p_winner_id: prizeId,
        p_tx_signature: txSignature
      });

      return { success: true, txSignature };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAllPrizes(
    walletAddress: string,
    signTransaction: (tx: Transaction) => Promise<Transaction>,
    connection: Connection
  ): Promise<{ success: boolean; claimed: number; txSignatures: string[]; errors: string[] }> {
    const prizes = await this.getUnclaimedPrizes(walletAddress);
    const txSignatures: string[] = [];
    const errors: string[] = [];

    for (const prize of prizes) {
      const result = await this.claimPrize(walletAddress, prize.prize_id, signTransaction, connection);
      if (result.success && result.txSignature) {
        txSignatures.push(result.txSignature);
      } else if (result.error) {
        errors.push(`${prize.lottery_type}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: txSignatures.length,
      txSignatures,
      errors
    };
  },

  formatLamports(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4);
  },

  lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
  },

  formatTimeUntilRelease(timeString: string): string {
    const match = timeString.match(/(\d+):(\d+):(\d+)/);
    if (!match) return timeString;

    const [, hours, minutes] = match;
    const totalHours = parseInt(hours);
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h ${minutes}m`;
    }
    return `${remainingHours}h ${minutes}m`;
  }
};
