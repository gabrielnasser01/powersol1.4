import { isValidSolanaAddress, isValidEmail, isValidQuantity, sanitizeString, isValidUUID } from '../utils/security';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    functionName: string,
    path: string = '',
    options: RequestInit = {}
  ): Promise<T> {
    const safeFunctionName = encodeURIComponent(functionName);
    const url = `${SUPABASE_URL}/functions/v1/${safeFunctionName}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.getHeaders(),
          ...(options.headers as Record<string, string>),
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'API request failed');
      }

      return json as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireValidWallet(address: string): string {
    const trimmed = address.trim();
    if (!isValidSolanaAddress(trimmed)) {
      throw new Error('Invalid wallet address');
    }
    return trimmed;
  }

  async login(walletAddress: string, _signature: string, referralCode?: string): Promise<{ token: string; user: any }> {
    const wallet = this.requireValidWallet(walletAddress);
    return { token: wallet, user: { wallet } };
  }

  async getAffiliateInfo(userId: string): Promise<any> {
    const wallet = this.requireValidWallet(userId);
    return this.request('affiliates', `/info?user_id=${encodeURIComponent(wallet)}`);
  }

  async getAffiliateReferrals(userId: string): Promise<any[]> {
    const wallet = this.requireValidWallet(userId);
    return this.request('affiliates', `/referrals?user_id=${encodeURIComponent(wallet)}`);
  }

  async getActiveLotteries(): Promise<any[]> {
    return this.request('api', '/lotteries');
  }

  async getAllLotteries(): Promise<any[]> {
    return this.request('api', '/lotteries');
  }

  async getLotteryById(id: string): Promise<any> {
    const lotteries = await this.request<any[]>('api', '/lotteries');
    return lotteries.find(l => l.id === id);
  }

  async getLotteryStats(id: string): Promise<any> {
    return this.getLotteryById(id);
  }

  async getWinners(lotteryId: string): Promise<any[]> {
    const prizes = await this.request<any[]>('api', '/prizes');
    return prizes.filter(p => p.lottery_id === lotteryId);
  }

  async purchaseTicket(lotteryId: string, quantity: number, txSignature?: string): Promise<{ transaction: string; ticketNumber: number; ticketId: string }> {
    if (!isValidQuantity(quantity)) {
      throw new Error('Invalid ticket quantity');
    }
    if (txSignature && !/^[A-Za-z0-9]{64,128}$/.test(txSignature)) {
      throw new Error('Invalid transaction signature');
    }

    const result = await this.request<any>('api', '/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify({
        lottery_id: lotteryId,
        quantity,
        tx_signature: txSignature || `pending_${Date.now()}`,
      }),
    });
    return {
      transaction: result.tx_signature,
      ticketNumber: result.ticket_number,
      ticketId: result.id,
    };
  }

  async getMyTickets(): Promise<any[]> {
    return this.request('api', '/tickets/my-tickets');
  }

  async getTicketById(id: string): Promise<any> {
    const tickets = await this.getMyTickets();
    return tickets.find(t => t.id === id);
  }

  async verifyTicket(_id: string): Promise<{ isValid: boolean }> {
    return { isValid: true };
  }

  async getMyPrizes(): Promise<any[]> {
    return this.request('api', '/prizes');
  }

  async getUnclaimedPrizes(): Promise<any[]> {
    return this.request('api', '/prizes/unclaimed');
  }

  async claimPrize(prizeId: string): Promise<{ signature: string }> {
    if (!isValidUUID(prizeId)) {
      throw new Error('Invalid prize ID');
    }
    const result = await this.request<any>('api', `/prizes/${encodeURIComponent(prizeId)}/claim`, { method: 'POST' });
    return { signature: result.id };
  }

  async getAffiliateStats(walletAddress: string): Promise<any> {
    const wallet = this.requireValidWallet(walletAddress);
    return this.request('affiliates', `/stats?wallet=${encodeURIComponent(wallet)}`);
  }

  async submitAffiliateApplication(data: {
    wallet_address: string;
    full_name: string;
    email: string;
    country?: string;
    social_media?: string;
    marketing_experience?: string;
    marketing_strategy?: string;
  }): Promise<any> {
    this.requireValidWallet(data.wallet_address);
    if (!isValidEmail(data.email)) {
      throw new Error('Invalid email address');
    }

    const sanitized = {
      wallet_address: data.wallet_address.trim(),
      full_name: sanitizeString(data.full_name, 100),
      email: data.email.trim().toLowerCase(),
      country: data.country ? sanitizeString(data.country, 100) : undefined,
      social_media: data.social_media ? sanitizeString(data.social_media, 500) : undefined,
      marketing_experience: data.marketing_experience ? sanitizeString(data.marketing_experience, 2000) : undefined,
      marketing_strategy: data.marketing_strategy ? sanitizeString(data.marketing_strategy, 2000) : undefined,
    };

    return this.request('affiliates', '/submit', {
      method: 'POST',
      body: JSON.stringify(sanitized),
    });
  }

  async getMyAffiliateApplication(walletAddress: string): Promise<any> {
    const wallet = this.requireValidWallet(walletAddress);
    return this.request('affiliates', `/my-application?wallet=${encodeURIComponent(wallet)}`);
  }

  async getMissions(): Promise<any[]> {
    return this.request('missions', '');
  }

  async getMissionsByType(type: string): Promise<any[]> {
    const safeType = encodeURIComponent(sanitizeString(type, 50));
    return this.request('missions', `/type/${safeType}`);
  }

  async getUserMissionProgress(userId: string): Promise<any[]> {
    const wallet = this.requireValidWallet(userId);
    return this.request('missions', `/my-progress?wallet_address=${encodeURIComponent(wallet)}`);
  }

  async completeMission(missionKey: string, userId: string, data?: any): Promise<any> {
    const wallet = this.requireValidWallet(userId);
    const safeKey = encodeURIComponent(sanitizeString(missionKey, 100));
    return this.request('missions', `/${safeKey}/complete?wallet_address=${encodeURIComponent(wallet)}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async recordTicketPurchase(userId: string, data: {
    lottery_type: string;
    ticket_count: number;
    transaction_signature?: string;
  }): Promise<any> {
    const wallet = this.requireValidWallet(userId);
    return this.request('missions', `/ticket-purchase?wallet_address=${encodeURIComponent(wallet)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recordDonation(userId: string, data: {
    amount_sol: number;
    transaction_signature: string;
  }): Promise<any> {
    const wallet = this.requireValidWallet(userId);
    if (data.amount_sol <= 0 || data.amount_sol > 1000000) {
      throw new Error('Invalid donation amount');
    }
    return this.request('missions', `/donation?wallet_address=${encodeURIComponent(wallet)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeLoginMission(userId: string): Promise<any> {
    const wallet = this.requireValidWallet(userId);
    return this.request('missions', `/login?wallet_address=${encodeURIComponent(wallet)}`, { method: 'POST' });
  }

  async getTransparencyData(): Promise<any> {
    return this.request('api', '/transparency');
  }

  async getDrawStatus(): Promise<any> {
    return this.request('lottery-draw', '/status');
  }

  async triggerManualDraw(): Promise<any> {
    return this.request('lottery-draw', '/execute', { method: 'POST' });
  }
}

export const apiClient = new ApiClient();
