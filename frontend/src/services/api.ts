const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xdcfwggwoutumhkcpkej.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkY2Z3Z2d3b3V0dW1oa2Nwa2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTMwNTksImV4cCI6MjA3ODc4OTA1OX0.oepi42XDyj6btCQA77dnWoWmhksH6f1OvUHjjzFXB7w';

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
    const url = `${SUPABASE_URL}/functions/v1/${functionName}${path}`;

    const response = await fetch(url, {
      ...options,
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
  }

  async login(walletAddress: string, _signature: string, referralCode?: string): Promise<{ token: string; user: any }> {
    return { token: walletAddress, user: { wallet: walletAddress } };
  }

  async getAffiliateInfo(userId: string): Promise<any> {
    return this.request('affiliates', `/info?user_id=${userId}`);
  }

  async getAffiliateReferrals(userId: string): Promise<any[]> {
    return this.request('affiliates', `/referrals?user_id=${userId}`);
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
    const result = await this.request<any>('api', '/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify({
        lottery_id: lotteryId,
        quantity,
        tx_signature: txSignature || `mock_${Date.now()}`,
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
    const result = await this.request<any>('api', `/prizes/${prizeId}/claim`, { method: 'POST' });
    return { signature: result.id };
  }

  async getAffiliateStats(walletAddress: string): Promise<any> {
    return this.request('affiliates', `/stats?wallet=${walletAddress}`);
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
    return this.request('affiliates', '/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyAffiliateApplication(walletAddress: string): Promise<any> {
    return this.request('affiliates', `/my-application?wallet=${walletAddress}`);
  }

  async getMissions(): Promise<any[]> {
    return this.request('missions', '');
  }

  async getMissionsByType(type: string): Promise<any[]> {
    return this.request('missions', `/type/${type}`);
  }

  async getUserMissionProgress(userId: string): Promise<any[]> {
    return this.request('missions', `/my-progress?user_id=${userId}`);
  }

  async completeMission(missionKey: string, userId: string, data?: any): Promise<any> {
    return this.request('missions', `/${missionKey}/complete?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async recordTicketPurchase(userId: string, data: {
    lottery_type: string;
    ticket_count: number;
    transaction_signature?: string;
  }): Promise<any> {
    return this.request('missions', `/ticket-purchase?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async recordDonation(userId: string, data: {
    amount_sol: number;
    transaction_signature: string;
  }): Promise<any> {
    return this.request('missions', `/donation?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeLoginMission(userId: string): Promise<any> {
    return this.request('missions', `/login?user_id=${userId}`, { method: 'POST' });
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
