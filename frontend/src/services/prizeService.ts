import { Transaction } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Prize {
  id: string;
  draw_id: number | null;
  round: number;
  user_wallet: string;
  ticket_number: number;
  prize_amount_lamports: number;
  prize_position: string;
  lottery_type: string;
  draw_date: string;
  claimed: boolean;
  claimed_at: string | null;
  claim_signature: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrizeClaim {
  id: string;
  prize_id: string;
  user_wallet: string;
  amount_lamports: number;
  signature: string | null;
  status: 'pending' | 'completed' | 'failed';
  error_message: string | null;
  claimed_at: string;
  created_at: string;
}

export interface ClaimResponse {
  success: boolean;
  data: {
    claimId: string;
    signature: string;
  };
}

interface PrepareClaimResponse {
  success: boolean;
  data: {
    claimId: string;
    serializedTx: string;
    blockhash: string;
    amount: number;
  };
}

type SignTransaction = (transaction: Transaction) => Promise<Transaction>;

class PrizeService {
  async getUserPrizes(wallet: string): Promise<Prize[]> {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('user_wallet', wallet)
        .order('draw_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching prizes:', error);
      return [];
    }
  }

  async getUnclaimedPrizes(wallet: string): Promise<Prize[]> {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('user_wallet', wallet)
        .eq('claimed', false)
        .order('draw_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching unclaimed prizes:', error);
      return [];
    }
  }

  async claimPrize(
    prizeId: string,
    wallet: string,
    signTransaction: SignTransaction
  ): Promise<ClaimResponse> {
    const prepareResponse = await fetch(`${API_BASE_URL}/prizes/${prizeId}/claim/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet }),
    });

    if (!prepareResponse.ok) {
      let message = 'Failed to prepare claim';
      try { const err = await prepareResponse.json(); message = err.error || message; } catch {}
      throw new Error(message);
    }

    const prepareResult: PrepareClaimResponse = await prepareResponse.json();
    const { claimId, serializedTx } = prepareResult.data;

    const txBuffer = Buffer.from(serializedTx, 'base64');
    const transaction = Transaction.from(txBuffer);

    const signedTransaction = await signTransaction(transaction);
    const signedTxBase64 = signedTransaction.serialize().toString('base64');

    const submitResponse = await fetch(`${API_BASE_URL}/prizes/claim/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claimId, signedTx: signedTxBase64 }),
    });

    if (!submitResponse.ok) {
      let message = 'Failed to submit claim';
      try { const err = await submitResponse.json(); message = err.error || message; } catch {}
      throw new Error(message);
    }

    return await submitResponse.json();
  }

  async getClaimHistory(wallet: string): Promise<PrizeClaim[]> {
    try {
      const { data, error } = await supabase
        .from('prize_claims')
        .select('*')
        .eq('user_wallet', wallet)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching claim history:', error);
      return [];
    }
  }

  formatPrizeAmount(lamports: number): string {
    const sol = lamports / 1000000000;
    return `${sol.toFixed(2)} SOL`;
  }

  formatPrizeAmountUSD(lamports: number, solPrice: number = 100): string {
    const sol = lamports / 1000000000;
    const usd = sol * solPrice;
    return `$${usd.toFixed(2)}`;
  }
}

export const prizeService = new PrizeService();
