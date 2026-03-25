import { supabase } from '../lib/supabase';

const ADMIN_WALLETS = [
  'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7',
  '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ',
];

export function isAdminWallet(wallet: string | null): boolean {
  if (!wallet) return false;
  return ADMIN_WALLETS.includes(wallet);
}

export interface UserRanking {
  id: string;
  wallet_address: string;
  display_name: string | null;
  power_points: number;
  login_streak: number;
  last_login_date: string | null;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  total_tickets: number;
  total_spent_sol: number;
  total_won_lamports: number;
  missions_completed: number;
}

export interface AffiliateRanking {
  affiliate_id: string;
  user_id: string;
  wallet_address: string;
  referral_code: string;
  total_earned: number;
  pending_earnings: number;
  total_claimed_sol: number;
  manual_tier: number | null;
  referral_count: number;
  total_referral_value_sol: number;
  total_commission_earned: number;
  created_at: string;
}

export interface RevenueData {
  date: string;
  ticket_revenue_lamports: number;
  house_earnings_lamports: number;
  delta_lamports: number;
  ticket_count: number;
}

export interface WalletActivity {
  wallet_address: string;
  date: string;
  action_count: number;
}

export interface MissionAlert {
  wallet_address: string;
  mission_key: string;
  mission_name: string;
  issue: string;
}

class AdminService {
  async getAllUsers(): Promise<UserRanking[]> {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('power_points', { ascending: false });

    if (usersError) throw usersError;

    const wallets = (users || []).map(u => u.wallet_address);

    const { data: ticketAgg } = await supabase
      .from('ticket_purchases')
      .select('wallet_address, quantity, total_sol');

    const ticketMap: Record<string, { count: number; sol: number }> = {};
    (ticketAgg || []).forEach(t => {
      if (!ticketMap[t.wallet_address]) ticketMap[t.wallet_address] = { count: 0, sol: 0 };
      ticketMap[t.wallet_address].count += t.quantity;
      ticketMap[t.wallet_address].sol += Number(t.total_sol || 0);
    });

    const { data: prizes } = await supabase
      .from('prizes')
      .select('user_wallet, prize_amount_lamports');

    const prizeMap: Record<string, number> = {};
    (prizes || []).forEach(p => {
      prizeMap[p.user_wallet] = (prizeMap[p.user_wallet] || 0) + Number(p.prize_amount_lamports || 0);
    });

    const { data: missionProgress } = await supabase
      .from('user_mission_progress')
      .select('wallet_address, completed');

    const missionMap: Record<string, number> = {};
    (missionProgress || []).forEach(m => {
      const key = m.wallet_address || '';
      if (m.completed) {
        missionMap[key] = (missionMap[key] || 0) + 1;
      }
    });

    return (users || []).map(u => ({
      id: u.id,
      wallet_address: u.wallet_address,
      display_name: u.display_name,
      power_points: u.power_points || 0,
      login_streak: u.login_streak || 0,
      last_login_date: u.last_login_date,
      is_banned: u.is_banned || false,
      banned_at: u.banned_at,
      banned_reason: u.banned_reason,
      created_at: u.created_at,
      total_tickets: ticketMap[u.wallet_address]?.count || 0,
      total_spent_sol: ticketMap[u.wallet_address]?.sol || 0,
      total_won_lamports: prizeMap[u.wallet_address] || 0,
      missions_completed: missionMap[u.wallet_address] || 0,
    }));
  }

  async getUserMissionDetails(walletAddress: string) {
    const { data: progress } = await supabase
      .from('user_mission_progress')
      .select('*, missions(*)')
      .eq('wallet_address', walletAddress);

    return progress || [];
  }

  async getAffiliateRankings(): Promise<AffiliateRanking[]> {
    const { data: affiliates, error } = await supabase
      .from('affiliates')
      .select('*, users!affiliates_user_id_fkey(wallet_address)')
      .order('total_earned', { ascending: false });

    if (error) throw error;

    const affiliateIds = (affiliates || []).map(a => a.id);

    const { data: referrals } = await supabase
      .from('referrals')
      .select('referrer_affiliate_id, total_tickets_purchased, total_value_sol, total_commission_earned, is_validated');

    const refMap: Record<string, { count: number; value: number; commission: number }> = {};
    (referrals || []).forEach(r => {
      const key = r.referrer_affiliate_id;
      if (!refMap[key]) refMap[key] = { count: 0, value: 0, commission: 0 };
      if (r.is_validated) refMap[key].count += 1;
      refMap[key].value += Number(r.total_value_sol || 0);
      refMap[key].commission += Number(r.total_commission_earned || 0);
    });

    return (affiliates || []).map(a => ({
      affiliate_id: a.id,
      user_id: a.user_id,
      wallet_address: (a.users as any)?.wallet_address || '',
      referral_code: a.referral_code,
      total_earned: Number(a.total_earned || 0),
      pending_earnings: Number(a.pending_earnings || 0),
      total_claimed_sol: Number(a.total_claimed_sol || 0),
      manual_tier: a.manual_tier,
      referral_count: refMap[a.id]?.count || 0,
      total_referral_value_sol: refMap[a.id]?.value || 0,
      total_commission_earned: refMap[a.id]?.commission || 0,
      created_at: a.created_at,
    }));
  }

  async getAffiliateNetwork(affiliateId: string) {
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*, users!referrals_referred_user_id_fkey(wallet_address, display_name, power_points, created_at)')
      .eq('referrer_affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    return referrals || [];
  }

  async getRevenueData(period: 'daily' | 'weekly' | 'monthly'): Promise<RevenueData[]> {
    const { data: tickets } = await supabase
      .from('ticket_purchases')
      .select('created_at, quantity, total_sol')
      .order('created_at', { ascending: true });

    const { data: houseEarnings } = await supabase
      .from('house_earnings')
      .select('created_at, amount_lamports');

    const { data: deltaTransfers } = await supabase
      .from('delta_transfers')
      .select('created_at, amount_lamports');

    const buckets: Record<string, RevenueData> = {};

    const getKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (period === 'daily') return d.toISOString().split('T')[0];
      if (period === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        return monday.toISOString().split('T')[0];
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const ensureBucket = (key: string) => {
      if (!buckets[key]) {
        buckets[key] = {
          date: key,
          ticket_revenue_lamports: 0,
          house_earnings_lamports: 0,
          delta_lamports: 0,
          ticket_count: 0,
        };
      }
    };

    (tickets || []).forEach(t => {
      const key = getKey(t.created_at);
      ensureBucket(key);
      buckets[key].ticket_revenue_lamports += Math.round(Number(t.total_sol || 0) * 1e9);
      buckets[key].ticket_count += t.quantity;
    });

    (houseEarnings || []).forEach(h => {
      const key = getKey(h.created_at);
      ensureBucket(key);
      buckets[key].house_earnings_lamports += Number(h.amount_lamports || 0);
    });

    (deltaTransfers || []).forEach(d => {
      const key = getKey(d.created_at);
      ensureBucket(key);
      buckets[key].delta_lamports += Number(d.amount_lamports || 0);
    });

    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getWalletHeatmap(): Promise<WalletActivity[]> {
    const { data: tickets } = await supabase
      .from('ticket_purchases')
      .select('wallet_address, created_at');

    const { data: missionProgress } = await supabase
      .from('user_mission_progress')
      .select('wallet_address, completed_at')
      .not('completed_at', 'is', null);

    const map: Record<string, number> = {};

    const addActivity = (wallet: string | null, dateStr: string | null) => {
      if (!wallet || !dateStr) return;
      const day = new Date(dateStr).toISOString().split('T')[0];
      const key = `${wallet}|${day}`;
      map[key] = (map[key] || 0) + 1;
    };

    (tickets || []).forEach(t => addActivity(t.wallet_address, t.created_at));
    (missionProgress || []).forEach(m => addActivity(m.wallet_address, m.completed_at));

    return Object.entries(map).map(([key, count]) => {
      const [wallet, date] = key.split('|');
      return { wallet_address: wallet, date, action_count: count };
    });
  }

  async getMissionAlerts(): Promise<MissionAlert[]> {
    const { data: progress } = await supabase
      .from('user_mission_progress')
      .select('wallet_address, completed, progress, last_reset, missions(mission_key, name, mission_type)')
      .eq('completed', false);

    const alerts: MissionAlert[] = [];
    const now = new Date();

    (progress || []).forEach(p => {
      const mission = p.missions as any;
      if (!mission || !p.wallet_address) return;

      const lastReset = p.last_reset ? new Date(p.last_reset) : null;
      if (lastReset) {
        const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
        if (mission.mission_type === 'daily' && hoursSinceReset > 48) {
          alerts.push({
            wallet_address: p.wallet_address,
            mission_key: mission.mission_key,
            mission_name: mission.name,
            issue: `Daily mission not reset for ${Math.floor(hoursSinceReset)}h`,
          });
        }
        if (mission.mission_type === 'weekly' && hoursSinceReset > 336) {
          alerts.push({
            wallet_address: p.wallet_address,
            mission_key: mission.mission_key,
            mission_name: mission.name,
            issue: `Weekly mission not reset for ${Math.floor(hoursSinceReset / 24)}d`,
          });
        }
      }
    });

    return alerts;
  }

  async getExpiredUnclaimedPrizes() {
    const { data } = await supabase
      .from('prizes')
      .select('*')
      .eq('claimed', false)
      .eq('expired', true)
      .order('expires_at', { ascending: false });

    return data || [];
  }

  async getUnclaimedAffiliateRewards() {
    const { data } = await supabase
      .from('affiliate_weekly_accumulator')
      .select('*')
      .eq('is_released', true)
      .eq('is_claimed', false)
      .eq('is_swept_to_delta', false)
      .order('pending_lamports', { ascending: false });

    return data || [];
  }

  async getPlatformStats() {
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: ticketCount } = await supabase
      .from('ticket_purchases')
      .select('*', { count: 'exact', head: true });

    const { data: ticketSum } = await supabase
      .from('ticket_purchases')
      .select('total_sol');

    const totalRevenueSol = (ticketSum || []).reduce((sum, t) => sum + Number(t.total_sol || 0), 0);

    const { count: drawCount } = await supabase
      .from('solana_draws')
      .select('*', { count: 'exact', head: true });

    const { data: prizeSum } = await supabase
      .from('prizes')
      .select('prize_amount_lamports, claimed');

    const totalPrizesLamports = (prizeSum || []).reduce((sum, p) => sum + Number(p.prize_amount_lamports || 0), 0);
    const unclaimedPrizesLamports = (prizeSum || [])
      .filter(p => !p.claimed)
      .reduce((sum, p) => sum + Number(p.prize_amount_lamports || 0), 0);

    const { count: affiliateCount } = await supabase
      .from('affiliates')
      .select('*', { count: 'exact', head: true });

    const { data: deltaSum } = await supabase
      .from('delta_transfers')
      .select('amount_lamports');

    const totalDeltaLamports = (deltaSum || []).reduce((sum, d) => sum + Number(d.amount_lamports || 0), 0);

    return {
      totalUsers: userCount || 0,
      totalTickets: ticketCount || 0,
      totalRevenueSol,
      totalDraws: drawCount || 0,
      totalPrizesLamports,
      unclaimedPrizesLamports,
      totalAffiliates: affiliateCount || 0,
      totalDeltaLamports,
    };
  }

  async banUser(targetWallet: string, adminWallet: string, reason: string) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason,
      })
      .eq('wallet_address', targetWallet);

    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('admin_ban_log')
      .insert({
        admin_wallet: adminWallet,
        target_wallet: targetWallet,
        action: 'ban',
        reason,
      });

    if (logError) console.error('Failed to log ban action:', logError);
  }

  async unbanUser(targetWallet: string, adminWallet: string) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_banned: false,
        banned_at: null,
        banned_reason: null,
      })
      .eq('wallet_address', targetWallet);

    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('admin_ban_log')
      .insert({
        admin_wallet: adminWallet,
        target_wallet: targetWallet,
        action: 'unban',
        reason: null,
      });

    if (logError) console.error('Failed to log unban action:', logError);
  }
}

export const adminService = new AdminService();
