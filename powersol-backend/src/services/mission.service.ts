import { supabase, supabaseAdmin } from '@config/supabase.js';
import { NotFoundError, ValidationError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';

const logger = loggers.mission;

interface Mission {
  id: string;
  mission_type: 'daily' | 'weekly' | 'social' | 'activity';
  mission_key: string;
  name: string;
  description: string;
  power_points: number;
  icon: string;
  requirements: any;
  is_active: boolean;
  created_at: string;
}

interface UserMissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  completed: boolean;
  completed_at: string | null;
  progress: any;
  last_reset: string;
  created_at: string;
}

interface MissionWithProgress extends Mission {
  user_progress?: UserMissionProgress;
}

export class MissionService {
  async getAllMissions(): Promise<Mission[]> {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('is_active', true)
      .order('mission_type', { ascending: true });

    if (error) {
      logger.error({ error }, 'Failed to fetch missions');
      throw error;
    }

    return data || [];
  }

  async getMissionsByType(type: 'daily' | 'weekly' | 'social' | 'activity'): Promise<Mission[]> {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('is_active', true)
      .eq('mission_type', type)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error, type }, 'Failed to fetch missions by type');
      throw error;
    }

    return data || [];
  }

  async getMissionByKey(key: string): Promise<Mission | null> {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('mission_key', key)
      .maybeSingle();

    if (error) {
      logger.error({ error, key }, 'Failed to fetch mission by key');
      throw error;
    }

    return data;
  }

  async getUserProgress(userId: string): Promise<MissionWithProgress[]> {
    const missions = await this.getAllMissions();

    const { data: progressData, error } = await supabase
      .from('user_mission_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch user progress');
      throw error;
    }

    const progressMap = new Map(
      (progressData || []).map(p => [p.mission_id, p])
    );

    return missions.map(mission => ({
      ...mission,
      user_progress: progressMap.get(mission.id)
    }));
  }

  async completeMission(userId: string, missionKey: string, additionalData?: any): Promise<{ powerPoints: number }> {
    const mission = await this.getMissionByKey(missionKey);
    if (!mission) {
      throw new NotFoundError('Mission not found');
    }

    const { data: existing } = await supabase
      .from('user_mission_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_id', mission.id)
      .maybeSingle();

    if (existing?.completed) {
      if (mission.mission_type === 'social' || mission.mission_type === 'activity') {
        throw new ValidationError('Mission already completed');
      }

      const now = new Date();
      const lastReset = new Date(existing.last_reset);
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      if (mission.mission_type === 'daily' && hoursSinceReset < 24) {
        throw new ValidationError('Daily mission already completed today');
      }

      if (mission.mission_type === 'weekly' && hoursSinceReset < 168) {
        throw new ValidationError('Weekly mission already completed this week');
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from('user_mission_progress')
      .upsert({
        user_id: userId,
        mission_id: mission.id,
        completed: true,
        completed_at: new Date().toISOString(),
        progress: additionalData || {},
        last_reset: new Date().toISOString()
      }, {
        onConflict: 'user_id,mission_id'
      });

    if (upsertError) {
      logger.error({ error: upsertError, userId, missionKey }, 'Failed to complete mission');
      throw upsertError;
    }

    logger.info({ userId, missionKey, powerPoints: mission.power_points }, 'Mission completed');

    return { powerPoints: mission.power_points };
  }

  async recordTicketPurchase(
    userId: string,
    lotteryType: 'tri_daily' | 'jackpot' | 'special_event' | 'grand_prize',
    ticketCount: number,
    transactionSignature?: string
  ): Promise<{ powerPoints: number }> {
    const powerPointsMap = {
      tri_daily: 10,
      jackpot: 20,
      special_event: 20,
      grand_prize: 30
    };

    const powerPointsEarned = powerPointsMap[lotteryType] * ticketCount;

    const { error } = await supabaseAdmin
      .from('ticket_purchases')
      .insert({
        user_id: userId,
        lottery_type: lotteryType,
        ticket_count: ticketCount,
        power_points_earned: powerPointsEarned,
        transaction_signature: transactionSignature
      });

    if (error) {
      logger.error({ error, userId, lotteryType, ticketCount }, 'Failed to record ticket purchase');
      throw error;
    }

    await this.checkAndCompleteTicketMissions(userId);

    logger.info({ userId, lotteryType, ticketCount, powerPointsEarned }, 'Ticket purchase recorded');

    return { powerPoints: powerPointsEarned };
  }

  async recordDonation(
    userId: string,
    amountSol: number,
    transactionSignature: string
  ): Promise<{ powerPoints: number }> {
    if (amountSol < 0.05) {
      throw new ValidationError('Minimum donation is 0.05 SOL');
    }

    const { data: todayDonation } = await supabase
      .from('donations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .maybeSingle();

    if (todayDonation) {
      throw new ValidationError('Donation mission already completed today');
    }

    const powerPointsEarned = 50;

    const { error } = await supabaseAdmin
      .from('donations')
      .insert({
        user_id: userId,
        amount_sol: amountSol,
        transaction_signature: transactionSignature,
        power_points_earned: powerPointsEarned
      });

    if (error) {
      logger.error({ error, userId, amountSol }, 'Failed to record donation');
      throw error;
    }

    await this.completeMission(userId, 'daily_donation', { amount_sol: amountSol });

    logger.info({ userId, amountSol, powerPointsEarned }, 'Donation recorded');

    return { powerPoints: powerPointsEarned };
  }

  private async checkAndCompleteTicketMissions(userId: string): Promise<void> {
    const { data: purchases } = await supabase
      .from('ticket_purchases')
      .select('lottery_type, ticket_count')
      .eq('user_id', userId);

    if (!purchases) return;

    const totalTickets = purchases.reduce((sum, p) => sum + p.ticket_count, 0);
    const uniqueLotteries = new Set(purchases.map(p => p.lottery_type));

    try {
      if (totalTickets >= 1) {
        await this.completeMission(userId, 'daily_buy_ticket');
      }
    } catch (error) {

    }

    try {
      if (totalTickets >= 10) {
        await this.completeMission(userId, 'activity_buy_10_tickets');
      }
    } catch (error) {

    }

    try {
      if (uniqueLotteries.size >= 4) {
        await this.completeMission(userId, 'activity_buy_all_lotteries');
      }
    } catch (error) {

    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const { data: weekPurchases } = await supabase
      .from('ticket_purchases')
      .select('lottery_type')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    if (weekPurchases) {
      const weeklyUniqueLotteries = new Set(weekPurchases.map(p => p.lottery_type));
      try {
        if (weeklyUniqueLotteries.size >= 2) {
          await this.completeMission(userId, 'weekly_buy_2_different');
        }
      } catch (error) {

      }
    }
  }

  async checkValidatedRefs(userId: string): Promise<void> {
    const refMissions = [
      { key: 'social_invite_3', count: 3 },
      { key: 'social_invite_5', count: 5 },
      { key: 'social_invite_10', count: 10 },
      { key: 'social_invite_100', count: 100 },
      { key: 'social_invite_1000', count: 1000 },
      { key: 'social_invite_5000', count: 5000 }
    ];

    for (const mission of refMissions) {
      try {
        await this.completeMission(userId, mission.key);
      } catch (error) {

      }
    }
  }
}

export const missionService = new MissionService();
