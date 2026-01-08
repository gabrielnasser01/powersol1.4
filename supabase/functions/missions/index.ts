import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getSupabaseClient(authHeader?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

async function getAllMissions() {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("is_active", true)
    .order("mission_type", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getMissionsByType(type: string) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("is_active", true)
    .eq("mission_type", type)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getUserProgress(userId: string) {
  const supabase = getServiceClient();

  const missions = await getAllMissions();

  const { data: progressData, error } = await supabase
    .from("user_mission_progress")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;

  const progressMap = new Map(
    (progressData || []).map(p => [p.mission_id, p])
  );

  return missions.map(mission => ({
    ...mission,
    user_progress: progressMap.get(mission.id) || null,
  }));
}

async function completeMission(userId: string, missionKey: string, additionalData?: any) {
  const supabase = getServiceClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("mission_key", missionKey)
    .maybeSingle();

  if (!mission) {
    throw new Error("Mission not found");
  }

  const { data: existing } = await supabase
    .from("user_mission_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_id", mission.id)
    .maybeSingle();

  if (existing?.completed) {
    if (mission.mission_type === "social" || mission.mission_type === "activity") {
      throw new Error("Mission already completed");
    }

    const now = new Date();
    const lastReset = new Date(existing.last_reset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (mission.mission_type === "daily" && hoursSinceReset < 24) {
      throw new Error("Daily mission already completed today");
    }

    if (mission.mission_type === "weekly" && hoursSinceReset < 168) {
      throw new Error("Weekly mission already completed this week");
    }
  }

  const { error: upsertError } = await supabase
    .from("user_mission_progress")
    .upsert({
      user_id: userId,
      mission_id: mission.id,
      completed: true,
      completed_at: new Date().toISOString(),
      progress: additionalData || {},
      last_reset: new Date().toISOString(),
    }, {
      onConflict: "user_id,mission_id",
    });

  if (upsertError) throw upsertError;

  await supabase.rpc("increment_power_points", {
    user_id_param: userId,
    points_param: mission.power_points,
  });

  return {
    powerPoints: mission.power_points,
    mission: mission.name,
    missionKey: missionKey,
  };
}

async function tryCompleteMission(userId: string, missionKey: string, additionalData?: any) {
  try {
    return await completeMission(userId, missionKey, additionalData);
  } catch (e) {
    return null;
  }
}

async function checkAndCompleteTicketMilestones(userId: string) {
  const supabase = getServiceClient();
  const completed: any[] = [];

  const { data: totalTickets } = await supabase.rpc("get_user_total_tickets", {
    user_id_param: userId,
  });

  const { data: uniqueLotteries } = await supabase.rpc("get_user_unique_lottery_types", {
    user_id_param: userId,
  });

  const { data: weeklyTickets } = await supabase.rpc("get_user_weekly_tickets", {
    user_id_param: userId,
  });

  const { data: weeklyUniqueLotteries } = await supabase.rpc("get_user_weekly_unique_lotteries", {
    user_id_param: userId,
  });

  if (totalTickets >= 1) {
    const result = await tryCompleteMission(userId, "activity_first_ticket");
    if (result) completed.push(result);
  }

  if (totalTickets >= 10) {
    const result = await tryCompleteMission(userId, "activity_10_tickets");
    if (result) completed.push(result);

    const result2 = await tryCompleteMission(userId, "activity_buy_10_tickets");
    if (result2) completed.push(result2);
  }

  if (totalTickets >= 50) {
    const result = await tryCompleteMission(userId, "activity_50_tickets");
    if (result) completed.push(result);
  }

  if (totalTickets >= 100) {
    const result = await tryCompleteMission(userId, "activity_100_tickets");
    if (result) completed.push(result);
  }

  if (uniqueLotteries >= 4) {
    const result = await tryCompleteMission(userId, "activity_buy_all_lotteries");
    if (result) completed.push(result);
  }

  if (weeklyTickets >= 5) {
    const result = await tryCompleteMission(userId, "weekly_5_tickets");
    if (result) completed.push(result);
  }

  if (weeklyUniqueLotteries >= 2) {
    const result = await tryCompleteMission(userId, "weekly_buy_2_different");
    if (result) completed.push(result);
  }

  return completed;
}

async function recordTicketPurchase(userId: string, body: any) {
  const { lottery_type, quantity, ticket_count, transaction_signature, total_sol, wallet_address } = body;
  const ticketQty = quantity || ticket_count || 1;

  const powerPointsMap: Record<string, number> = {
    tri_daily: 10,
    jackpot: 20,
    xmas: 20,
    grand_prize: 30,
  };

  const powerPointsEarned = (powerPointsMap[lottery_type] || 10) * ticketQty;

  const supabase = getServiceClient();

  const { error } = await supabase
    .from("ticket_purchases")
    .insert({
      user_id: userId,
      wallet_address: wallet_address || null,
      lottery_type: lottery_type || "tri_daily",
      quantity: ticketQty,
      total_sol: total_sol || 0,
      transaction_signature,
    });

  if (error) throw error;

  await supabase.rpc("increment_power_points", {
    user_id_param: userId,
    points_param: powerPointsEarned,
  });

  const dailyResult = await tryCompleteMission(userId, "daily_buy_ticket");

  const milestoneResults = await checkAndCompleteTicketMilestones(userId);

  const completedMissions = [dailyResult, ...milestoneResults].filter(Boolean);

  return {
    powerPoints: powerPointsEarned,
    completedMissions,
    totalMissionPoints: completedMissions.reduce((sum, m) => sum + (m?.powerPoints || 0), 0),
  };
}

async function recordDonation(userId: string, body: any) {
  const { amount_sol, transaction_signature } = body;

  if (amount_sol < 0.05) {
    throw new Error("Minimum donation is 0.05 SOL");
  }

  const supabase = getServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayDonation } = await supabase
    .from("donations")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", today.toISOString())
    .maybeSingle();

  if (todayDonation) {
    throw new Error("Donation mission already completed today");
  }

  const powerPointsEarned = 50;

  const { error } = await supabase
    .from("donations")
    .insert({
      user_id: userId,
      amount_sol,
      transaction_signature,
      power_points_earned: powerPointsEarned,
    });

  if (error) throw error;

  await supabase.rpc("increment_power_points", {
    user_id_param: userId,
    points_param: powerPointsEarned,
  });

  const missionResult = await tryCompleteMission(userId, "daily_donation", { amount_sol });

  return {
    powerPoints: powerPointsEarned,
    missionCompleted: missionResult,
  };
}

async function completeLogin(userId: string) {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("user_mission_progress")
    .select("*, missions!inner(mission_key)")
    .eq("user_id", userId)
    .eq("missions.mission_key", "daily_login")
    .maybeSingle();

  if (existing?.completed) {
    const now = new Date();
    const lastReset = new Date(existing.last_reset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset < 24) {
      return {
        powerPoints: 0,
        mission: "Daily Login",
        alreadyCompleted: true,
        nextAvailable: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  return await completeMission(userId, "daily_login");
}

async function recordVisit(userId: string) {
  return await tryCompleteMission(userId, "daily_visit");
}

async function completeSocialMission(userId: string, platform: string) {
  const missionKeyMap: Record<string, string> = {
    discord: "social_discord_join",
    twitter_follow: "social_twitter_follow",
    tiktok_follow: "social_tiktok_follow",
    twitter_like: "weekly_twitter_like",
    twitter_repost: "weekly_twitter_repost",
    twitter_comment: "weekly_twitter_comment",
  };

  const missionKey = missionKeyMap[platform];
  if (!missionKey) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  return await completeMission(userId, missionKey);
}

async function recordReferral(userId: string, referredUserId: string) {
  const supabase = getServiceClient();

  const { data: referralCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact" })
    .eq("referrer_id", userId)
    .eq("is_valid", true);

  const count = (referralCount?.length || 0) + 1;

  const completed: any[] = [];

  const weeklyResult = await tryCompleteMission(userId, "weekly_refer");
  if (weeklyResult) completed.push(weeklyResult);

  if (count >= 3) {
    const result = await tryCompleteMission(userId, "social_invite_3");
    if (result) completed.push(result);
  }
  if (count >= 5) {
    const result = await tryCompleteMission(userId, "social_invite_5");
    if (result) completed.push(result);
  }
  if (count >= 10) {
    const result = await tryCompleteMission(userId, "social_invite_10");
    if (result) completed.push(result);
  }
  if (count >= 100) {
    const result = await tryCompleteMission(userId, "social_invite_100");
    if (result) completed.push(result);
  }
  if (count >= 1000) {
    const result = await tryCompleteMission(userId, "social_invite_1000");
    if (result) completed.push(result);
  }
  if (count >= 5000) {
    const result = await tryCompleteMission(userId, "social_invite_5000");
    if (result) completed.push(result);
  }

  return {
    completedMissions: completed,
    totalReferrals: count,
  };
}

async function recordFirstWin(userId: string) {
  return await completeMission(userId, "activity_first_win");
}

async function recordBecameAffiliate(userId: string) {
  return await completeMission(userId, "activity_become_affiliate");
}

async function recordExploreTransparency(userId: string) {
  return await tryCompleteMission(userId, "activity_explore_transparency");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/missions", "");
    const authHeader = req.headers.get("Authorization");

    let userId: string | undefined;
    if (authHeader) {
      const supabase = getSupabaseClient(authHeader);
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    const userIdParam = url.searchParams.get("user_id");
    if (userIdParam && !userId) {
      userId = userIdParam;
    }

    let result: any;

    if (req.method === "GET" && (path === "" || path === "/")) {
      result = await getAllMissions();
    } else if (req.method === "GET" && path.startsWith("/type/")) {
      const type = path.replace("/type/", "");
      result = await getMissionsByType(type);
    } else if (req.method === "GET" && path === "/my-progress") {
      if (!userId) throw new Error("User ID required");
      result = await getUserProgress(userId);
    } else if (req.method === "POST" && path.includes("/complete")) {
      if (!userId) throw new Error("User ID required");
      const pathParts = path.split("/");
      const missionKey = pathParts[1];
      const body = req.headers.get("content-type")?.includes("application/json")
        ? await req.json().catch(() => ({}))
        : {};
      result = await completeMission(userId, missionKey, body);
    } else if (req.method === "POST" && path === "/ticket-purchase") {
      if (!userId) throw new Error("User ID required");
      const body = await req.json();
      result = await recordTicketPurchase(userId, body);
    } else if (req.method === "POST" && path === "/donation") {
      if (!userId) throw new Error("User ID required");
      const body = await req.json();
      result = await recordDonation(userId, body);
    } else if (req.method === "POST" && path === "/login") {
      if (!userId) throw new Error("User ID required");
      result = await completeLogin(userId);
    } else if (req.method === "POST" && path === "/visit") {
      if (!userId) throw new Error("User ID required");
      result = await recordVisit(userId);
    } else if (req.method === "POST" && path === "/social") {
      if (!userId) throw new Error("User ID required");
      const body = await req.json();
      result = await completeSocialMission(userId, body.platform);
    } else if (req.method === "POST" && path === "/referral") {
      if (!userId) throw new Error("User ID required");
      const body = await req.json();
      result = await recordReferral(userId, body.referred_user_id);
    } else if (req.method === "POST" && path === "/first-win") {
      if (!userId) throw new Error("User ID required");
      result = await recordFirstWin(userId);
    } else if (req.method === "POST" && path === "/became-affiliate") {
      if (!userId) throw new Error("User ID required");
      result = await recordBecameAffiliate(userId);
    } else if (req.method === "POST" && path === "/explore-transparency") {
      if (!userId) throw new Error("User ID required");
      result = await recordExploreTransparency(userId);
    } else {
      throw new Error("Not found");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("required") ? 401 : message === "Not found" ? 404 : 400;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
