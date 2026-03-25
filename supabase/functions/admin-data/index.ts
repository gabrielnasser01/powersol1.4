import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_WALLETS = [
  "E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7",
  "9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ",
];

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const adminWallet = url.searchParams.get("wallet");

    if (!adminWallet || !ADMIN_WALLETS.includes(adminWallet)) {
      return errorResponse("Unauthorized", 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "stats") {
      const [
        { count: userCount },
        { count: ticketCount },
        { data: ticketSum },
        { count: drawCount },
        { data: prizeSum },
        { count: affiliateCount },
        { data: deltaSum },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("ticket_purchases")
          .select("*", { count: "exact", head: true }),
        supabase.from("ticket_purchases").select("total_sol"),
        supabase
          .from("solana_draws")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("prizes")
          .select("prize_amount_lamports, claimed"),
        supabase
          .from("affiliates")
          .select("*", { count: "exact", head: true }),
        supabase.from("delta_transfers").select("amount_lamports"),
      ]);

      const totalRevenueSol = (ticketSum || []).reduce(
        (s: number, t: any) => s + Number(t.total_sol || 0),
        0
      );
      const totalPrizesLamports = (prizeSum || []).reduce(
        (s: number, p: any) => s + Number(p.prize_amount_lamports || 0),
        0
      );
      const unclaimedPrizesLamports = (prizeSum || [])
        .filter((p: any) => !p.claimed)
        .reduce(
          (s: number, p: any) => s + Number(p.prize_amount_lamports || 0),
          0
        );
      const totalDeltaLamports = (deltaSum || []).reduce(
        (s: number, d: any) => s + Number(d.amount_lamports || 0),
        0
      );

      return jsonResponse({
        totalUsers: userCount || 0,
        totalTickets: ticketCount || 0,
        totalRevenueSol,
        totalDraws: drawCount || 0,
        totalPrizesLamports,
        unclaimedPrizesLamports,
        totalAffiliates: affiliateCount || 0,
        totalDeltaLamports,
      });
    }

    if (action === "users") {
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .order("power_points", { ascending: false });

      const { data: ticketAgg } = await supabase
        .from("ticket_purchases")
        .select("wallet_address, quantity, total_sol");

      const ticketMap: Record<string, { count: number; sol: number }> = {};
      (ticketAgg || []).forEach((t: any) => {
        if (!ticketMap[t.wallet_address])
          ticketMap[t.wallet_address] = { count: 0, sol: 0 };
        ticketMap[t.wallet_address].count += t.quantity;
        ticketMap[t.wallet_address].sol += Number(t.total_sol || 0);
      });

      const { data: prizes } = await supabase
        .from("prizes")
        .select("user_wallet, prize_amount_lamports");

      const prizeMap: Record<string, number> = {};
      (prizes || []).forEach((p: any) => {
        prizeMap[p.user_wallet] =
          (prizeMap[p.user_wallet] || 0) + Number(p.prize_amount_lamports || 0);
      });

      const { data: missionProgress } = await supabase
        .from("user_mission_progress")
        .select("wallet_address, completed");

      const missionMap: Record<string, number> = {};
      (missionProgress || []).forEach((m: any) => {
        const key = m.wallet_address || "";
        if (m.completed) {
          missionMap[key] = (missionMap[key] || 0) + 1;
        }
      });

      const result = (users || []).map((u: any) => ({
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

      return jsonResponse(result);
    }

    if (action === "user-missions") {
      const wallet = url.searchParams.get("target_wallet");
      if (!wallet) return errorResponse("Missing target_wallet", 400);

      const { data: progress } = await supabase
        .from("user_mission_progress")
        .select("*, missions(*)")
        .eq("wallet_address", wallet);

      return jsonResponse(progress || []);
    }

    if (action === "affiliates") {
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("*, users!affiliates_user_id_fkey(wallet_address)")
        .order("total_earned", { ascending: false });

      const { data: referrals } = await supabase
        .from("referrals")
        .select(
          "referrer_affiliate_id, total_tickets_purchased, total_value_sol, total_commission_earned, is_validated"
        );

      const refMap: Record<
        string,
        { count: number; value: number; commission: number }
      > = {};
      (referrals || []).forEach((r: any) => {
        const key = r.referrer_affiliate_id;
        if (!refMap[key]) refMap[key] = { count: 0, value: 0, commission: 0 };
        if (r.is_validated) refMap[key].count += 1;
        refMap[key].value += Number(r.total_value_sol || 0);
        refMap[key].commission += Number(r.total_commission_earned || 0);
      });

      const result = (affiliates || []).map((a: any) => ({
        affiliate_id: a.id,
        user_id: a.user_id,
        wallet_address: a.users?.wallet_address || "",
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

      return jsonResponse(result);
    }

    if (action === "affiliate-network") {
      const affiliateId = url.searchParams.get("affiliate_id");
      if (!affiliateId) return errorResponse("Missing affiliate_id", 400);

      const { data: referrals } = await supabase
        .from("referrals")
        .select(
          "*, users!referrals_referred_user_id_fkey(wallet_address, display_name, power_points, created_at)"
        )
        .eq("referrer_affiliate_id", affiliateId)
        .order("created_at", { ascending: false });

      return jsonResponse(referrals || []);
    }

    if (action === "revenue") {
      const period = url.searchParams.get("period") || "daily";

      const { data: tickets } = await supabase
        .from("ticket_purchases")
        .select("created_at, quantity, total_sol")
        .order("created_at", { ascending: true });

      const { data: houseEarnings } = await supabase
        .from("house_earnings")
        .select("created_at, amount_lamports");

      const { data: deltaTransfers } = await supabase
        .from("delta_transfers")
        .select("created_at, amount_lamports");

      const buckets: Record<
        string,
        {
          date: string;
          ticket_revenue_lamports: number;
          house_earnings_lamports: number;
          delta_lamports: number;
          ticket_count: number;
        }
      > = {};

      const getKey = (dateStr: string) => {
        const d = new Date(dateStr);
        if (period === "daily") return d.toISOString().split("T")[0];
        if (period === "weekly") {
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d);
          monday.setDate(diff);
          return monday.toISOString().split("T")[0];
        }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

      (tickets || []).forEach((t: any) => {
        const key = getKey(t.created_at);
        ensureBucket(key);
        buckets[key].ticket_revenue_lamports += Math.round(
          Number(t.total_sol || 0) * 1e9
        );
        buckets[key].ticket_count += t.quantity;
      });

      (houseEarnings || []).forEach((h: any) => {
        const key = getKey(h.created_at);
        ensureBucket(key);
        buckets[key].house_earnings_lamports += Number(h.amount_lamports || 0);
      });

      (deltaTransfers || []).forEach((d: any) => {
        const key = getKey(d.created_at);
        ensureBucket(key);
        buckets[key].delta_lamports += Number(d.amount_lamports || 0);
      });

      const result = Object.values(buckets).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      return jsonResponse(result);
    }

    if (action === "heatmap") {
      const TREASURY_WALLETS: Record<string, string> = {
        "4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx": "Tri-Daily",
        "AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk": "Special Event",
        "nTMcPkR8eYJFFy4Gcdk6wZcRphj5VFxK4CpviA2Qi9C": "Grand Prize",
        "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133": "Jackpot",
        "2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU": "Delta",
        "8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf": "Affiliates Pool",
        "55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1": "Dev Treasury",
      };

      const [
        { data: tickets },
        { data: deltaTransfers },
        { data: affiliateEarnings },
        { data: houseEarnings },
        { data: prizeClaims },
        { data: draws },
      ] = await Promise.all([
        supabase.from("ticket_purchases").select("lottery_type, total_sol, created_at"),
        supabase.from("delta_transfers").select("amount_lamports, created_at"),
        supabase.from("solana_affiliate_earnings").select("commission_lamports, earned_at"),
        supabase.from("house_earnings").select("amount_lamports, created_at"),
        supabase.from("onchain_prize_claims").select("lottery_type, amount_lamports, claimed_at"),
        supabase.from("solana_draws").select("lottery_type, prize_lamports, draw_timestamp"),
      ]);

      const map: Record<string, number> = {};

      const addActivity = (wallet: string, dateStr: string | null, count = 1) => {
        if (!dateStr) return;
        const day = new Date(dateStr).toISOString().split("T")[0];
        const key = `${wallet}|${day}`;
        map[key] = (map[key] || 0) + count;
      };

      const lotteryWalletMap: Record<string, string> = {
        "tri-daily": "4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx",
        "special-event": "AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk",
        "grand-prize": "nTMcPkR8eYJFFy4Gcdk6wZcRphj5VFxK4CpviA2Qi9C",
        "jackpot": "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
      };

      (tickets || []).forEach((t: any) => {
        const wallet = lotteryWalletMap[t.lottery_type];
        if (wallet) addActivity(wallet, t.created_at);
      });

      (deltaTransfers || []).forEach((d: any) => {
        addActivity("2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU", d.created_at);
      });

      (affiliateEarnings || []).forEach((a: any) => {
        addActivity("8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf", a.earned_at);
      });

      (houseEarnings || []).forEach((h: any) => {
        addActivity("55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1", h.created_at);
      });

      (prizeClaims || []).forEach((p: any) => {
        const wallet = lotteryWalletMap[p.lottery_type];
        if (wallet) addActivity(wallet, p.claimed_at);
      });

      (draws || []).forEach((d: any) => {
        const wallet = lotteryWalletMap[d.lottery_type];
        if (wallet) addActivity(wallet, d.draw_timestamp);
      });

      const result = Object.entries(map).map(([key, count]) => {
        const [wallet, date] = key.split("|");
        return {
          wallet_address: wallet,
          label: TREASURY_WALLETS[wallet] || wallet,
          date,
          action_count: count,
        };
      });

      return jsonResponse(result);
    }

    if (action === "mission-alerts") {
      const { data: progress } = await supabase
        .from("user_mission_progress")
        .select(
          "wallet_address, completed, progress, last_reset, missions(mission_key, name, mission_type)"
        )
        .eq("completed", false);

      const alerts: any[] = [];
      const now = new Date();

      (progress || []).forEach((p: any) => {
        const mission = p.missions;
        if (!mission || !p.wallet_address) return;

        const lastReset = p.last_reset ? new Date(p.last_reset) : null;
        if (lastReset) {
          const hoursSinceReset =
            (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
          if (mission.mission_type === "daily" && hoursSinceReset > 48) {
            alerts.push({
              wallet_address: p.wallet_address,
              mission_key: mission.mission_key,
              mission_name: mission.name,
              issue: `Daily mission not reset for ${Math.floor(hoursSinceReset)}h`,
            });
          }
          if (mission.mission_type === "weekly" && hoursSinceReset > 336) {
            alerts.push({
              wallet_address: p.wallet_address,
              mission_key: mission.mission_key,
              mission_name: mission.name,
              issue: `Weekly mission not reset for ${Math.floor(hoursSinceReset / 24)}d`,
            });
          }
        }
      });

      return jsonResponse(alerts);
    }

    if (action === "expired-prizes") {
      const { data } = await supabase
        .from("prizes")
        .select("*")
        .eq("claimed", false)
        .eq("expired", true)
        .order("expires_at", { ascending: false });

      return jsonResponse(data || []);
    }

    if (action === "unclaimed-affiliate-rewards") {
      const { data } = await supabase
        .from("affiliate_weekly_accumulator")
        .select("*")
        .eq("is_released", true)
        .eq("is_claimed", false)
        .eq("is_swept_to_delta", false)
        .order("pending_lamports", { ascending: false });

      return jsonResponse(data || []);
    }

    if (action === "ban-user") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { target_wallet, reason } = body;
      if (!target_wallet) return errorResponse("Missing target_wallet", 400);

      const { error: updateError } = await supabase
        .from("users")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_reason: reason || null,
        })
        .eq("wallet_address", target_wallet);

      if (updateError) return errorResponse(updateError.message, 500);

      await supabase.from("admin_ban_log").insert({
        admin_wallet: adminWallet,
        target_wallet,
        action: "ban",
        reason: reason || null,
      });

      return jsonResponse({ success: true });
    }

    if (action === "unban-user") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { target_wallet } = body;
      if (!target_wallet) return errorResponse("Missing target_wallet", 400);

      const { error: updateError } = await supabase
        .from("users")
        .update({
          is_banned: false,
          banned_at: null,
          banned_reason: null,
        })
        .eq("wallet_address", target_wallet);

      if (updateError) return errorResponse(updateError.message, 500);

      await supabase.from("admin_ban_log").insert({
        admin_wallet: adminWallet,
        target_wallet,
        action: "unban",
        reason: null,
      });

      return jsonResponse({ success: true });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
});
