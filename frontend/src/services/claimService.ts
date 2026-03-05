import { Transaction } from '@solana/web3.js';
import { supabase } from '../lib/supabase';
import { solanaService } from './solanaService';

const LAMPORTS_PER_SOL = 1_000_000_000;

const PRIZE_CLAIM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prize-claim`;

const edgeFunctionHeaders = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

type SignTransaction = (transaction: Transaction) => Promise<Transaction>;

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

interface PrepareResponse {
  success: boolean;
  error?: string;
  serialized_tx?: string;
  amount_lamports?: number;
  amount_sol?: number;
  prize_id?: string;
  week_number?: number;
}

interface ConfirmResponse {
  success: boolean;
  error?: string;
  signature?: string;
  explorer_url?: string;
}

async function signAndSendTransaction(
  serializedTxBase64: string,
  signTransaction: SignTransaction
): Promise<string> {
  const txBuffer = Buffer.from(serializedTxBase64, 'base64');
  const transaction = Transaction.from(txBuffer);
  const signedTransaction = await signTransaction(transaction);
  const signature = await solanaService.sendAndConfirmTransaction(signedTransaction);
  return signature;
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

  async claimPrize(
    walletAddress: string,
    prizeId: string,
    signTransaction: SignTransaction
  ): Promise<{ success: boolean; signature?: string; error?: string; explorerUrl?: string }> {
    try {
      const prepareResponse = await fetch(`${PRIZE_CLAIM_URL}/prepare`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ prize_id: prizeId, wallet_address: walletAddress }),
      });

      const prepareResult: PrepareResponse = await prepareResponse.json();

      if (!prepareResult.success || !prepareResult.serialized_tx) {
        return { success: false, error: prepareResult.error || 'Failed to prepare claim transaction' };
      }

      const signature = await signAndSendTransaction(
        prepareResult.serialized_tx,
        signTransaction
      );

      const confirmResponse = await fetch(`${PRIZE_CLAIM_URL}/confirm`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ prize_id: prizeId, signature }),
      });

      const confirmResult: ConfirmResponse = await confirmResponse.json();

      if (!confirmResult.success) {
        return {
          success: true,
          signature,
          explorerUrl: solanaService.getExplorerUrl(signature),
          error: 'SOL sent but failed to update database. Contact support with your transaction signature.',
        };
      }

      return {
        success: true,
        signature: confirmResult.signature || signature,
        explorerUrl: confirmResult.explorer_url || solanaService.getExplorerUrl(signature),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAffiliateRewards(
    walletAddress: string,
    weekNumber: number,
    signTransaction: SignTransaction
  ): Promise<{ success: boolean; signature?: string; error?: string; amount?: number }> {
    try {
      const prepareResponse = await fetch(`${PRIZE_CLAIM_URL}/affiliate/prepare`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ wallet_address: walletAddress, week_number: weekNumber }),
      });

      const prepareResult: PrepareResponse = await prepareResponse.json();

      if (!prepareResult.success || !prepareResult.serialized_tx) {
        return { success: false, error: prepareResult.error || 'Failed to prepare claim transaction' };
      }

      const signature = await signAndSendTransaction(
        prepareResult.serialized_tx,
        signTransaction
      );

      const confirmResponse = await fetch(`${PRIZE_CLAIM_URL}/affiliate/confirm`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ wallet_address: walletAddress, week_number: weekNumber, signature }),
      });

      const confirmResult: ConfirmResponse = await confirmResponse.json();

      if (!confirmResult.success) {
        return {
          success: true,
          signature,
          amount: prepareResult.amount_lamports || 0,
          error: 'SOL sent but failed to update database. Contact support with your transaction signature.',
        };
      }

      return {
        success: true,
        signature,
        amount: prepareResult.amount_lamports || 0,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      return { success: false, error: errorMessage };
    }
  },

  async claimAllAvailableAffiliateRewards(
    walletAddress: string,
    signTransaction: SignTransaction
  ): Promise<{ success: boolean; claimed: number; totalAmount: number; signatures: string[]; errors: string[] }> {
    const weeks = await this.getClaimableAffiliateRewards(walletAddress);
    const availableWeeks = weeks.filter(w => w.is_available && w.pending_lamports > 0);

    const signatures: string[] = [];
    const errors: string[] = [];
    let totalAmount = 0;

    for (const week of availableWeeks) {
      const result = await this.claimAffiliateRewards(
        walletAddress,
        week.week_number,
        signTransaction
      );

      if (result.success && result.signature) {
        signatures.push(result.signature);
        totalAmount += result.amount || 0;
      } else if (result.error) {
        errors.push(`Week ${week.week_number}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: signatures.length,
      totalAmount,
      signatures,
      errors
    };
  },

  async claimAllPrizes(
    walletAddress: string,
    signTransaction: SignTransaction
  ): Promise<{ success: boolean; claimed: number; signatures: string[]; errors: string[] }> {
    const prizes = await this.getUnclaimedPrizes(walletAddress);
    const signatures: string[] = [];
    const errors: string[] = [];

    for (const prize of prizes) {
      const result = await this.claimPrize(walletAddress, prize.prize_id, signTransaction);
      if (result.success && result.signature) {
        signatures.push(result.signature);
      } else if (result.error) {
        errors.push(`${prize.lottery_type}: ${result.error}`);
      }
    }

    return {
      success: errors.length === 0,
      claimed: signatures.length,
      signatures,
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
