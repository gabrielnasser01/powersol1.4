import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

const CLAIM_PROGRAM_ID = new PublicKey('DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK');
const LAMPORTS_PER_SOL = 1_000_000_000;

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

function findPDA(seeds: (Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
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
        [Buffer.from('affiliate_pool')],
        CLAIM_PROGRAM_ID
      );

      const [affiliateVaultPDA] = findPDA(
        [Buffer.from('affiliate_vault')],
        CLAIM_PROGRAM_ID
      );

      const [accumulatorPDA] = findPDA(
        [Buffer.from('accumulator'), walletPubkey.toBuffer()],
        CLAIM_PROGRAM_ID
      );

      const weekBuffer = Buffer.alloc(8);
      weekBuffer.writeBigUInt64LE(BigInt(weekNumber));

      const [affiliateClaimPDA] = findPDA(
        [Buffer.from('affiliate_claim'), walletPubkey.toBuffer(), weekBuffer],
        CLAIM_PROGRAM_ID
      );

      const tx = new Transaction();

      const instructionData = Buffer.alloc(26);
      instructionData.writeUInt8(8, 0);
      instructionData.writeBigUInt64LE(BigInt(weekData.pending_lamports), 1);
      instructionData.writeUInt8(weekData.tier, 9);
      instructionData.writeBigUInt64LE(BigInt(weekNumber), 10);
      instructionData.writeUInt32LE(weekData.referral_count, 18);

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
        'halloween': 1,
        'jackpot': 2,
        'grand-prize': 3
      };
      const lotteryTypeNum = lotteryTypeMap[prize.lottery_type] || 0;

      const [prizePoolPDA] = findPDA(
        [Buffer.from('prize_pool'), Buffer.from([lotteryTypeNum])],
        CLAIM_PROGRAM_ID
      );

      const [prizeVaultPDA] = findPDA(
        [Buffer.from('prize_vault'), prizePoolPDA.toBuffer()],
        CLAIM_PROGRAM_ID
      );

      const roundBuffer = Buffer.alloc(8);
      roundBuffer.writeBigUInt64LE(BigInt(prize.lottery_round));

      const [prizeClaimPDA] = findPDA(
        [Buffer.from('prize_claim'), walletPubkey.toBuffer(), prizePoolPDA.toBuffer(), roundBuffer],
        CLAIM_PROGRAM_ID
      );

      const tx = new Transaction();

      const instructionData = Buffer.alloc(18);
      instructionData.writeUInt8(7, 0);
      instructionData.writeBigUInt64LE(BigInt(prize.amount_lamports), 1);
      instructionData.writeUInt8(prize.tier, 9);
      instructionData.writeBigUInt64LE(BigInt(prize.lottery_round), 10);

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
