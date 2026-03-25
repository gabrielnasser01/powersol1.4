import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const VALID_PLATFORMS = new Set(["discord", "twitter_follow", "tiktok_follow", "twitter_like", "twitter_repost", "twitter_comment"]);
const VALID_MISSION_TYPES = new Set(["daily", "weekly", "social", "activity", "special"]);

function getStartOfDayGMT(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 1, 0);
  return d;
}

function getStartOfWeekGMT(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 1, 0);
  return d;
}

function isWithinCurrentDay(claimedAt: Date, now: Date): boolean {
  const todayStart = getStartOfDayGMT(now);
  return claimedAt >= todayStart;
}

function isWithinCurrentWeek(claimedAt: Date, now: Date): boolean {
  const weekStart = getStartOfWeekGMT(now);
  return claimedAt >= weekStart;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

function isValidWallet(addr: string): boolean {
  return typeof addr === "string" && SOLANA_ADDR_RE.test(addr.trim());
}

function sanitize(input: string, maxLen = 200): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
  if (!VALID_MISSION_TYPES.has(type)) {
    throw new Error("Invalid mission type");
  }

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
    (progressData || []).map((p: Record<string, unknown>) => [p.mission_id, p])
  );

  const now = new Date();

  return missions.map((mission: Record<string, unknown>) => {
    const progress = progressMap.get(mission.id as string) as Record<string, unknown> | undefined;

    if (progress && progress.completed === true) {
      const missionType = mission.mission_type as string;
      const claimedAt = new Date((progress.completed_at || progress.last_reset) as string);

      if (missionType === "daily" && !isWithinCurrentDay(claimedAt, now)) {
        return {
          ...mission,
          user_progress: { ...progress, completed: false, progress: { ...(progress.progress as Record<string, unknown> || {}), eligible: false } },
        };
      }

      if (missionType === "weekly" && !isWithinCurrentWeek(claimedAt, now)) {
        return {
          ...mission,
          user_progress: { ...progress, completed: false, progress: { ...(progress.progress as Record<string, unknown> || {}), eligible: false } },
        };
      }
    }

    return { ...mission, user_progress: progress || null };
  });
}

async function markMissionEligible(walletAddress: string, missionKey: string, additionalData?: Record<string, unknown>) {
  const supabase = getServiceClient();
  const safeMissionKey = sanitize(missionKey, 100);

  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("mission_key", safeMissionKey)
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
    if (safeMissionKey === "weekly_streak") {
      // no time gate - streak resets to 0 on claim, so reaching 7 again is the only guard
    } else if (mission.mission_type === "social" || mission.mission_type === "activity") {
      return { alreadyCompleted: true, missionKey: safeMissionKey };
    } else {
      const now = new Date();
      const claimedAt = new Date(existing.completed_at || existing.last_reset);

      if (mission.mission_type === "daily" && isWithinCurrentDay(claimedAt, now)) {
        return { alreadyCompleted: true, missionKey: safeMissionKey };
      }

      if (mission.mission_type === "weekly" && isWithinCurrentWeek(claimedAt, now)) {
        return { alreadyCompleted: true, missionKey: safeMissionKey };
      }
    }
  }

  const progressData = { ...(additionalData || {}), eligible: true, eligible_at: new Date().toISOString() };
  const nowISO = new Date().toISOString();

  const { error: upsertError } = await supabase
    .from("user_mission_progress")
    .upsert({
      wallet_address: walletAddress,
      mission_id: mission.id,
      completed: false,
      progress: progressData,
      last_reset: nowISO,
    }, {
      onConflict: "wallet_address,mission_id",
    });

  if (upsertError) throw upsertError;

  return {
    eligible: true,
    mission: mission.name,
    missionKey: safeMissionKey,
    powerPoints: mission.power_points,
  };
}

async function tryMarkEligible(walletAddress: string, missionKey: string, additionalData?: Record<string, unknown>) {
  try {
    return await markMissionEligible(walletAddress, missionKey, additionalData);
  } catch {
    return null;
  }
}

async function claimMission(walletAddress: string, missionKey: string) {
  const supabase = getServiceClient();
  const safeMissionKey = sanitize(missionKey, 100);

  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("mission_key", safeMissionKey)
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
    if (safeMissionKey === "weekly_streak") {
      // no time gate - eligible flag is the only guard
    } else if (mission.mission_type === "social" || mission.mission_type === "activity") {
      throw new Error("Mission already claimed");
    } else {
      const now = new Date();
      const claimedAt = new Date(existing.completed_at || existing.last_reset);

      if (mission.mission_type === "daily" && isWithinCurrentDay(claimedAt, now)) {
        throw new Error("Mission already claimed today");
      }
      if (mission.mission_type === "weekly" && isWithinCurrentWeek(claimedAt, now)) {
        throw new Error("Mission already claimed this week");
      }
    }
  }

  if (!existing?.progress?.eligible) {
    throw new Error("Mission not yet eligible");
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("user_mission_progress")
    .update({
      completed: true,
      completed_at: now,
      last_reset: now,
      progress: { ...existing.progress, eligible: false, claimed_at: now },
    })
    .eq("id", existing.id);

  if (updateError) throw updateError;

  await supabase.rpc("add_power_points", {
    p_wallet_address: walletAddress,
    p_amount: mission.power_points,
    p_transaction_type: "mission_complete",
    p_description: `Completed mission: ${mission.name}`,
    p_reference_type: "mission",
    p_reference_id: mission.id,
  });

  if (safeMissionKey === "weekly_streak") {
    await supabase
      .from("users")
      .update({ login_streak: 0 })
      .eq("wallet_address", walletAddress);
  }

  return {
    powerPoints: mission.power_points,
    mission: mission.name,
    missionKey: safeMissionKey,
  };
}

async function checkAndCompleteTicketMilestones(walletAddress: string) {
  const supabase = getServiceClient();
  const completed: Record<string, unknown>[] = [];

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

  const milestones: [number, string][] = [
    [10, "activity_buy_10_tickets"],
    [50, "activity_50_tickets"],
    [100, "activity_100_tickets"],
  ];

  for (const [threshold, key] of milestones) {
    if (totalTickets >= threshold) {
      const result = await tryMarkEligible(walletAddress, key);
      if (result) completed.push(result);
    }
  }

  if (weeklyTickets >= 5) {
    const result = await tryMarkEligible(walletAddress, "weekly_5_tickets");
    if (result) completed.push(result);
  }

  if (weeklyUniqueLotteries >= 2) {
    const result = await tryMarkEligible(walletAddress, "weekly_buy_2_different");
    if (result) completed.push(result);
  }

  return completed;
}

async function recordTicketPurchase(walletAddress: string, body: Record<string, unknown>) {
  const { lottery_type, quantity, ticket_count } = body;
  const ticketQty = Math.min(Math.max(1, Number(quantity || ticket_count || 1)), 100);

  const validTypes = ["tri_daily", "jackpot", "special_event", "grand_prize"];
  const safeType = typeof lottery_type === "string" && validTypes.includes(lottery_type) ? lottery_type : "tri_daily";

  const powerPointsMap: Record<string, number> = {
    tri_daily: 10,
    jackpot: 20,
    special_event: 20,
    grand_prize: 30,
  };

  const powerPointsEarned = (powerPointsMap[safeType] || 10) * ticketQty;
  const supabase = getServiceClient();

  await supabase.rpc("add_power_points", {
    p_wallet_address: walletAddress,
    p_amount: powerPointsEarned,
    p_transaction_type: "ticket_purchase",
    p_description: `Purchased ${ticketQty} ${safeType} ticket${ticketQty > 1 ? "s" : ""}`,
  });

  const dailyResult = await tryMarkEligible(walletAddress, "daily_buy_ticket");
  const milestoneResults = await checkAndCompleteTicketMilestones(walletAddress);
  const completedMissions = [dailyResult, ...milestoneResults].filter(Boolean);

  return {
    powerPoints: powerPointsEarned,
    completedMissions,
    totalMissionPoints: completedMissions.reduce((sum, m) => sum + ((m as Record<string, number>)?.powerPoints || 0), 0),
  };
}

async function recordDonation(walletAddress: string, body: Record<string, unknown>) {
  const { amount_sol, transaction_signature } = body;

  if (typeof amount_sol !== "number" || amount_sol < 0.05 || amount_sol > 10000) {
    throw new Error("Invalid donation amount (min 0.05 SOL)");
  }

  if (!transaction_signature || typeof transaction_signature !== "string" || transaction_signature.length > 256) {
    throw new Error("Invalid transaction signature");
  }

  const supabase = getServiceClient();

  const { data: donationResult, error: donationError } = await supabase.rpc("record_donation_with_tiers", {
    p_wallet_address: walletAddress,
    p_amount_sol: amount_sol,
    p_transaction_signature: transaction_signature,
  });

  if (donationError) throw donationError;

  const result = donationResult?.[0] || { points_earned: 50, new_balance: 0, tier_matched: 0.05 };
  const missionResult = await tryMarkEligible(walletAddress, "daily_donation", { amount_sol });

  return {
    powerPoints: result.points_earned,
    newBalance: result.new_balance,
    tierMatched: result.tier_matched,
    missionCompleted: missionResult,
  };
}

async function completeLogin(walletAddress: string) {
  const supabase = getServiceClient();
  const loginResult = await markMissionEligible(walletAddress, "daily_login");

  await supabase.rpc("claim_daily_login_points", { p_wallet_address: walletAddress });

  const { data: userData } = await supabase
    .from("users")
    .select("login_streak")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  const streak = userData?.login_streak || 0;
  if (streak >= 7) {
    await tryMarkEligible(walletAddress, "weekly_streak");
  }

  return { ...loginResult, loginStreak: streak };
}

async function recordVisit(walletAddress: string) {
  return await tryMarkEligible(walletAddress, "daily_visit");
}

async function completeSocialMission(walletAddress: string, platform: string) {
  if (!platform || !VALID_PLATFORMS.has(platform)) {
    throw new Error("Invalid platform");
  }

  const missionKeyMap: Record<string, string> = {
    discord: "social_discord_join",
    twitter_follow: "social_twitter_follow",
    tiktok_follow: "social_tiktok_follow",
    twitter_like: "weekly_twitter_like",
    twitter_repost: "weekly_twitter_repost",
    twitter_comment: "weekly_twitter_comment",
  };

  return await markMissionEligible(walletAddress, missionKeyMap[platform]);
}

async function recordReferral(walletAddress: string, referredUserId: string) {
  if (!isValidWallet(referredUserId)) {
    throw new Error("Invalid referred user ID");
  }

  const supabase = getServiceClient();

  const { data: referralCount } = await supabase
    .from("referrals")
    .select("id", { count: "exact" })
    .eq("referrer_id", walletAddress)
    .eq("is_valid", true);

  const count = (referralCount?.length || 0) + 1;
  const eligible: Record<string, unknown>[] = [];

  const weeklyResult = await tryMarkEligible(walletAddress, "weekly_refer");
  if (weeklyResult) eligible.push(weeklyResult);

  const thresholds: [number, string][] = [
    [3, "social_invite_3"],
    [5, "social_invite_5"],
    [10, "social_invite_10"],
    [100, "social_invite_100"],
    [1000, "social_invite_1000"],
    [5000, "social_invite_5000"],
  ];

  for (const [threshold, key] of thresholds) {
    if (count >= threshold) {
      const result = await tryMarkEligible(walletAddress, key);
      if (result) eligible.push(result);
    }
  }

  return { eligibleMissions: eligible, totalReferrals: count };
}

async function checkWinMilestones(walletAddress: string) {
  const supabase = getServiceClient();
  const completed: Record<string, unknown>[] = [];

  const { data: totalWins } = await supabase.rpc("get_user_total_wins_by_wallet", {
    wallet_param: walletAddress,
  });

  const milestones: [number, string][] = [
    [1, "activity_first_win"],
    [3, "activity_3_wins"],
    [5, "activity_5_wins"],
    [10, "activity_10_wins"],
  ];

  for (const [threshold, key] of milestones) {
    if ((totalWins || 0) >= threshold) {
      const result = await tryMarkEligible(walletAddress, key);
      if (result) completed.push(result);
    }
  }

  return { totalWins: totalWins || 0, eligibleMissions: completed };
}

async function recordFirstWin(walletAddress: string) {
  return await checkWinMilestones(walletAddress);
}

async function recordBecameAffiliate(walletAddress: string) {
  return await markMissionEligible(walletAddress, "activity_become_affiliate");
}

async function recordExploreTransparency(walletAddress: string) {
  return await tryMarkEligible(walletAddress, "activity_explore_transparency");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(clientIp, 60, 60000)) {
      return errorResponse("Too many requests", 429);
    }

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
      if (!isValidWallet(walletParam)) {
        return errorResponse("Invalid wallet address format", 400);
      }
      walletAddress = walletParam.trim();
    }

    let result: unknown;

    if (req.method === "GET" && (path === "" || path === "/")) {
      result = await getAllMissions();
    } else if (req.method === "GET" && path.startsWith("/type/")) {
      const type = path.replace("/type/", "");
      result = await getMissionsByType(type);
    } else if (req.method === "GET" && path === "/my-progress") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      result = await getUserProgress(walletAddress);
    } else if (req.method === "POST" && path === "/claim") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      const body = await req.json().catch(() => ({}));
      const missionKey = sanitize(body.mission_key, 100);
      if (!missionKey) return errorResponse("Invalid mission key", 400);
      result = await claimMission(walletAddress, missionKey);
    } else if (req.method === "POST" && path.includes("/complete")) {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      const pathParts = path.split("/");
      const missionKey = sanitize(pathParts[1], 100);
      if (!missionKey) return errorResponse("Invalid mission key", 400);
      const body = req.headers.get("content-type")?.includes("application/json")
        ? await req.json().catch(() => ({}))
        : {};
      result = await markMissionEligible(walletAddress, missionKey, body);
    } else if (req.method === "POST" && path === "/ticket-purchase") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      const body = await req.json();
      result = await recordTicketPurchase(walletAddress, body);
    } else if (req.method === "POST" && path === "/donation") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      const body = await req.json();
      result = await recordDonation(walletAddress, body);
    } else if (req.method === "POST" && path === "/login") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      result = await completeLogin(walletAddress);
    } else if (req.method === "POST" && path === "/visit") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      result = await recordVisit(walletAddress);
    } else if (req.method === "POST" && path === "/social") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      const body = await req.json();
      result = await completeSocialMission(walletAddress, body.platform);
    } else if (req.method === "POST" && path === "/referral") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      const body = await req.json();
      result = await recordReferral(walletAddress, body.referred_user_id);
    } else if (req.method === "POST" && path === "/first-win") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      result = await recordFirstWin(walletAddress);
    } else if (req.method === "POST" && path === "/became-affiliate") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      result = await recordBecameAffiliate(walletAddress);
    } else if (req.method === "POST" && path === "/explore-transparency") {
      if (!walletAddress) return errorResponse("Wallet address required", 401);
      result = await recordExploreTransparency(walletAddress);
    } else {
      return errorResponse("Not found", 404);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";
    const status = message.includes("required") ? 401 : message === "Not found" ? 404 : 400;

    return errorResponse(
      status === 400 ? "Bad request" : message,
      status
    );
  }
});
