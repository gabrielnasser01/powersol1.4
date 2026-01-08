import { supabase } from '../lib/supabase';

export interface PowerPointsResult {
  success: boolean;
  pointsEarned?: number;
  newBalance?: number;
  alreadyClaimed?: boolean;
  error?: string;
}

export interface PowerPointsHistory {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export const powerPointsService = {
  async claimDailyLogin(walletAddress: string): Promise<PowerPointsResult> {
    try {
      const { data, error } = await supabase
        .rpc('claim_daily_login_points', { p_wallet_address: walletAddress });

      if (error) {
        console.error('Daily login claim error:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const result = data[0];
        return {
          success: true,
          pointsEarned: result.points_earned,
          newBalance: result.new_balance,
          alreadyClaimed: result.already_claimed,
        };
      }

      return { success: false, error: 'No data returned' };
    } catch (err) {
      console.error('Daily login error:', err);
      return { success: false, error: 'Failed to claim daily points' };
    }
  },

  async addPoints(
    walletAddress: string,
    amount: number,
    transactionType: string,
    description: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<PowerPointsResult> {
    try {
      const { data, error } = await supabase
        .rpc('add_power_points', {
          p_wallet_address: walletAddress,
          p_amount: amount,
          p_transaction_type: transactionType,
          p_description: description,
          p_reference_id: referenceId || null,
          p_reference_type: referenceType || null,
        });

      if (error) {
        console.error('Add points error:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const result = data[0];
        return {
          success: true,
          pointsEarned: amount,
          newBalance: result.new_balance,
        };
      }

      return { success: false, error: 'No data returned' };
    } catch (err) {
      console.error('Add points error:', err);
      return { success: false, error: 'Failed to add points' };
    }
  },

  async getHistory(limit: number = 50): Promise<PowerPointsHistory[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_my_power_points_history', { p_limit: limit });

      if (error) {
        console.error('History error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('History error:', err);
      return [];
    }
  },

  async getBalance(walletAddress: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('power_points')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (error || !data) {
        return 0;
      }

      return data.power_points || 0;
    } catch (err) {
      return 0;
    }
  },

  async getConfig(configKey: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('power_points_config')
        .select('points_value')
        .eq('config_key', configKey)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        const defaults: Record<string, number> = {
          daily_login: 10,
          donation_base: 50,
          ticket_tri_daily: 5,
          ticket_weekly: 10,
          ticket_mega: 25,
          mission_complete: 25,
        };
        return defaults[configKey] || 0;
      }

      return data.points_value;
    } catch (err) {
      return 0;
    }
  },
};
