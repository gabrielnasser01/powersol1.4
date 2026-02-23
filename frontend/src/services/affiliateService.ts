import { Transaction } from '@solana/web3.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarned: number;
  pendingEarnings: number;
  tier: number;
  referralCode: string;
  conversionRate: number;
}

export interface AffiliateDashboard {
  affiliate: {
    id: string;
    user_id: string;
    referral_code: string;
    total_earned: number;
    pending_earnings: number;
    manual_tier: number | null;
    created_at: string;
  };
  stats: AffiliateStats;
  recentReferrals: Array<{
    id: string;
    referred_user: {
      wallet_address: string;
      username: string | null;
    };
    tickets_bought: number;
    commission_earned: number;
    created_at: string;
  }>;
  pendingWithdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    requested_at: string;
  }>;
}

export interface PrepareWithdrawResponse {
  success: boolean;
  data: {
    withdrawalId: string;
    serializedTx: string;
    blockhash: string;
    amount: number;
  };
}

export interface SubmitWithdrawResponse {
  success: boolean;
  data: {
    txSignature: string;
    confirmed: boolean;
    status: string;
  };
}

type SignTransaction = (transaction: Transaction) => Promise<Transaction>;

class AffiliateService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  async getDashboard(): Promise<AffiliateDashboard | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/affiliate/dashboard`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error('Failed to fetch dashboard');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching affiliate dashboard:', error);
      return null;
    }
  }

  async getEarnings(): Promise<{ totalEarned: number; pendingEarnings: number } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/affiliate/earnings`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return null;
    }
  }

  async claimRewards(
    amountSOL: number,
    signTransaction: SignTransaction
  ): Promise<{ signature: string }> {
    const prepareResponse = await fetch(`${API_BASE_URL}/api/affiliate/withdraw/prepare`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ amount: amountSOL }),
    });

    if (!prepareResponse.ok) {
      const error = await prepareResponse.json();
      throw new Error(error.error || 'Failed to prepare withdrawal');
    }

    const prepareResult: PrepareWithdrawResponse = await prepareResponse.json();
    const { withdrawalId, serializedTx } = prepareResult.data;

    const txBuffer = Buffer.from(serializedTx, 'base64');
    const transaction = Transaction.from(txBuffer);

    const signedTransaction = await signTransaction(transaction);
    const signedTxBase64 = signedTransaction.serialize().toString('base64');

    const submitResponse = await fetch(`${API_BASE_URL}/api/affiliate/withdraw/submit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ withdrawalId, signedTx: signedTxBase64 }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.json();
      throw new Error(error.error || 'Failed to submit withdrawal');
    }

    const submitResult: SubmitWithdrawResponse = await submitResponse.json();
    return { signature: submitResult.data.txSignature };
  }

  formatSOL(lamports: number): string {
    const sol = lamports / 1_000_000_000;
    return `${sol.toFixed(4)} SOL`;
  }

  formatUSD(lamports: number, solPrice: number = 100): string {
    const sol = lamports / 1_000_000_000;
    const usd = sol * solPrice;
    return `$${usd.toFixed(2)}`;
  }

  lamportsToSOL(lamports: number): number {
    return lamports / 1_000_000_000;
  }
}

export const affiliateService = new AffiliateService();
