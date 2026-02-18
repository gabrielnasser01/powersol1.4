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

async function getUserProgress(walletAddress: string) {
  const supabase = getServiceClient();

  const missions = await getAllMissions();

  const { data: progressData, error } = await supabase
    .from("user_mission_progress")
    .select("*")
    .eq("wallet_address", walletAddress);

  if (error) throw error;

  const progressMap = new Map(
    (progressData || []).map(p => [p.mission_id, p])
  );

  return missions.map(mission => ({
    ...mission,
    user_progress: progressMap.get(mission.id) || null,
  }));
}

async function completeMission(walletAddress: string, missionKey: string, additionalData?: any) {
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
    .eq("wallet_address", walletAddress)
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
      wallet_address: walletAddress,
      mission_id: mission.id,
      completed: true,
      completed_at: new Date().toISOString(),
      progress: additionalData || {},
      last_reset: new Date().toISOString(),
    }, {
      onConflict: "wallet_address,mission_id",
    });

  if (upsertError) throw upsertError;

  await supabase.rpc("increment_power_points_by_wallet", {
    wallet_param: walletAddress,
    points_param: mission.power_points,
  });

  return {
    powerPoints: mission.power_points,
    mission: mission.name,
    missionKey: missionKey,
  };
}

async function tryCompleteMission(walletAddress: string, missionKey: string, additionalData?: any) {
  try {
    return await completeMission(walletAddress, missionKey, additionalData);
  } catch (e) {
    return null;
  }
}

async function checkAndCompleteTicketMilestones(walletAddress: string) {
  const supabase = getServiceClient();
  const completed: any[] = [];

  const { data: totalTickets } = await supabase.rpc("get_user_total_tickets_by_wallet", {
    wallet_param: walletAddress,
  });

  const { data: uniqueLotteries } = await supabase.rpc("get_user_unique_lottery_types_by_wallet", {
    wallet_param: walletAddress,
  });

  const { data: weeklyTickets } = await supabase.rpc("get_user_weekly_tickets_by_wallet", {
    wallet_param: walletAddress,
  });

  const { data: weeklyUniqueLotteries } = await supabase.rpc("get_user_weekly_unique_lotteries_by_wallet", {
    wallet_param: walletAddress,
  });

  if (totalTickets >= 1) {
    const result = await tryCompleteMission(walletAddress, "activity_first_ticket");
    if (result) completed.push(result);
  }

  if (totalTickets >= 10) {
    const result = await tryCompleteMission(walletAddress, "activity_10_tickets");
    if (result) completed.push(result);

    const result2 = await tryCompleteMission(walletAddress, "activity_buy_10_tickets");
    if (result2) completed.push(result2);
  }

  if (totalTickets >= 50) {
    const result = await tryCompleteMission(walletAddress, "activity_50_tickets");
    if (result) completed.push(result);
  }

  if (totalTickets >= 100) {
    const result = await tryCompleteMission(walletAddress, "activity_100_tickets");
    if (result) completed.push(result);
  }

  if (uniqueLotteries >= 4) {
    const result = await tryCompleteMission(walletAddress, "activity_buy_all_lotteries");
    if (result) completed.push(result);
  }

  if (weeklyTickets >= 5) {
    const result = await tryCompleteMission(walletAddress, "weekly_5_tickets");
    if (result) completed.push(result);
  }

  if (weeklyUniqueLotteries >= 2) {
    const result = await tryCompleteMission(walletAddress, "weekly_buy_2_different");
    if (result) completed.push(result);
  }

  return completed;
}

async function recordTicketPurchase(walletAddress: string, body: any) {
  const { lottery_type, quantity, ticket_count } = body;
  const ticketQty = quantity || ticket_count || 1;

  const powerPointsMap: Record<string, number> = {
    tri_daily: 10,
    jackpot: 20,
    xmas: 20,
    grand_prize: 30,
  };

  const powerPointsEarned = (powerPointsMap[lottery_type] || 10) * ticketQty;

  const supabase = getServiceClient();

  await supabase.rpc("increment_power_points_by_wallet", {
    wallet_param: walletAddress,
    points_param: powerPointsEarned,
  });

  const dailyResult = await tryCompleteMission(walletAddress, "daily_buy_ticket");

  const milestoneResults = await checkAndCompleteTicketMilestones(walletAddress);

  const completedMissions = [dailyResult, ...milestoneResults].filter(Boolean);

  return {
    powerPoints: powerPointsEarned,
    completedMissions,
    totalMissionPoints: completedMissions.reduce((sum, m) => sum + (m?.powerPoints || 0), 0),
  };
}

async function recordDonation(walletAddress: string, body: any) {
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
    .eq("user_id", walletAddress)
    .gte("created_at", today.toISOString())
    .maybeSingle();

  if (todayDonation) {
    throw new Error("Donation mission already completed today");
  }

  const powerPointsEarned = 50;

  const { error } = await supabase
    .from("donations")
    .insert({
      user_id: walletAddress,
      amount_sol,
      transaction_signature,
      power_points_earned: powerPointsEarned,
    });

  if (error) throw error;

  await supabase.rpc("increment_power_points_by_wallet", {
    wallet_param: walletAddress,
    points_param: powerPointsEarned,
  });

  const missionResult = await tryCompleteMission(walletAddress, "daily_donation", { amount_sol });

  return {
    powerPoints: powerPointsEarned,
    missionCompleted: missionResult,
  };
}

async function completeLogin(walletAddress: string) {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("user_mission_progress")
    .select("*, missions!inner(mission_key)")
    .eq("wallet_address", walletAddress)
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

  return await completeMission(walletAddress, "daily_login");
}

async function recordVisit(walletAddress: string) {
  return await tryCompleteMission(walletAddress, "daily_visit");
}

async function completeSocialMission(walletAddress: string, platform: string) {
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

  return await completeMission(walletAddress, missionKey);
}

async function recordReferral(walletAddress: string, referredUserId: string) {
  const supabase = getServiceClient();

  const { data: referralCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact" })
    .eq("referrer_id", walletAddress)
    .eq("is_valid", true);

  const count = (referralCount?.length || 0) + 1;

  const completed: any[] = [];

  const weeklyResult = await tryCompleteMission(walletAddress, "weekly_refer");
  if (weeklyResult) completed.push(weeklyResult);

  if (count >= 3) {
    const result = await tryCompleteMission(walletAddress, "social_invite_3");
    if (result) completed.push(result);
  }
  if (count >= 5) {
    const result = await tryCompleteMission(walletAddress, "social_invite_5");
    if (result) completed.push(result);
  }
  if (count >= 10) {
    const result = await tryCompleteMission(walletAddress, "social_invite_10");
    if (result) completed.push(result);
  }
  if (count >= 100) {
    const result = await tryCompleteMission(walletAddress, "social_invite_100");
    if (result) completed.push(result);
  }
  if (count >= 1000) {
    const result = await tryCompleteMission(walletAddress, "social_invite_1000");
    if (result) completed.push(result);
  }
  if (count >= 5000) {
    const result = await tryCompleteMission(walletAddress, "social_invite_5000");
    if (result) completed.push(result);
  }

  return {
    completedMissions: completed,
    totalReferrals: count,
  };
}

async function recordFirstWin(walletAddress: string) {
  return await completeMission(walletAddress, "activity_first_win");
}

async function recordBecameAffiliate(walletAddress: string) {
  return await completeMission(walletAddress, "activity_become_affiliate");
}

async function recordExploreTransparency(walletAddress: string) {
  return await tryCompleteMission(walletAddress, "activity_explore_transparency");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/missions", "");
    const authHeader = req.headers.get("Authorization");

    let walletAddress: string | undefined;
    if (authHeader) {
      const supabase = getSupabaseClient(authHeader);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const svc = getServiceClient();
        const { data: userData } = await svc
          .from("users")
          .select("wallet_address")
          .eq("id", user.id)
          .maybeSingle();
        walletAddress = userData?.wallet_address;
      }
    }

    const walletParam = url.searchParams.get("wallet_address") || url.searchParams.get("user_id");
    if (walletParam && !walletAddress) {
      walletAddress = walletParam;
    }

    let result: any;

    if (req.method === "GET" && (path === "" || path === "/")) {
      result = await getAllMissions();
    } else if (req.method === "GET" && path.startsWith("/type/")) {
      const type = path.replace("/type/", "");
      result = await getMissionsByType(type);
    } else if (req.method === "GET" && path === "/my-progress") {
      if (!walletAddress) throw new Error("Wallet address required");
      result = await getUserProgress(walletAddress);
    } else if (req.method === "POST" && path.includes("/complete")) {
      if (!walletAddress) throw new Error("Wallet address required");
      const pathParts = path.split("/");
      const missionKey = pathParts[1];
      const body = req.headers.get("content-type")?.includes("application/json")
        ? await req.json().catch(() => ({}))
        : {};
      result = await completeMission(walletAddress, missionKey, body);
    } else if (req.method === "POST" && path === "/ticket-purchase") {
      if (!walletAddress) throw new Error("Wallet address required");
      const body = await req.json();
      result = await recordTicketPurchase(walletAddress, body);
    } else if (req.method === "POST" && path === "/donation") {
      if (!walletAddress) throw new Error("Wallet address required");
      const body = await req.json();
      result = await recordDonation(walletAddress, body);
    } else if (req.method === "POST" && path === "/login") {
      if (!walletAddress) throw new Error("Wallet address required");
      result = await completeLogin(walletAddress);
    } else if (req.method === "POST" && path === "/visit") {
      if (!walletAddress) throw new Error("Wallet address required");
      result = await recordVisit(walletAddress);
    } else if (req.method === "POST" && path === "/social") {
      if (!walletAddress) throw new Error("Wallet address required");
      const body = await req.json();
      result = await completeSocialMission(walletAddress, body.platform);
    } else if (req.method === "POST" && path === "/referral") {
      if (!walletAddress) throw new Error("Wallet address required");
      const body = await req.json();
      result = await recordReferral(walletAddress, body.referred_user_id);
    } else if (req.method === "POST" && path === "/first-win") {
      if (!walletAddress) throw new Error("Wallet address required");
      result = await recordFirstWin(walletAddress);
    } else if (req.method === "POST" && path === "/became-affiliate") {
      if (!walletAddress) throw new Error("Wallet address required");
      result = await recordBecameAffiliate(walletAddress);
    } else if (req.method === "POST" && path === "/explore-transparency") {
      if (!walletAddress) throw new Error("Wallet address required");
      result = await recordExploreTransparency(walletAddress);
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
