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
        { data: ticketData },
        { count: drawCount },
        { data: prizeSum },
        { count: affiliateCount },
        { data: deltaSum },
        { data: devTreasurySum },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("ticket_purchases").select("quantity, total_sol"),
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
        supabase.from("dev_treasury_transfers").select("amount_lamports"),
      ]);

      const totalTickets = (ticketData || []).reduce(
        (s: number, t: any) => s + Number(t.quantity || 0),
        0
      );
      const totalRevenueSol = (ticketData || []).reduce(
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
      const totalDevTreasuryLamports = (devTreasurySum || []).reduce(
        (s: number, d: any) => s + Number(d.amount_lamports || 0),
        0
      );

      return jsonResponse({
        totalUsers: userCount || 0,
        totalTickets,
        totalRevenueSol,
        totalDraws: drawCount || 0,
        totalPrizesLamports,
        unclaimedPrizesLamports,
        totalAffiliates: affiliateCount || 0,
        totalDeltaLamports,
        totalDevTreasuryLamports,
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
      const [
        { data: affiliates },
        { data: referrals },
        { data: earnings },
        { data: weeklyAccum },
        { data: onchainClaims },
      ] = await Promise.all([
        supabase
          .from("affiliates")
          .select("*, users!affiliates_user_id_fkey(wallet_address)")
          .order("total_earned", { ascending: false }),
        supabase
          .from("referrals")
          .select(
            "referrer_affiliate_id, total_tickets_purchased, total_value_sol, total_commission_earned, is_validated"
          ),
        supabase
          .from("solana_affiliate_earnings")
          .select("affiliate_wallet, commission_lamports"),
        supabase
          .from("affiliate_weekly_accumulator")
          .select(
            "affiliate_wallet, pending_lamports, is_released, is_claimed, is_swept_to_delta"
          ),
        supabase
          .from("onchain_affiliate_claims")
          .select("affiliate_wallet, amount_lamports"),
      ]);

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

      const earnedMap: Record<string, number> = {};
      (earnings || []).forEach((e: any) => {
        earnedMap[e.affiliate_wallet] =
          (earnedMap[e.affiliate_wallet] || 0) +
          Number(e.commission_lamports || 0);
      });

      const pendingMap: Record<string, number> = {};
      (weeklyAccum || []).forEach((w: any) => {
        if (
          !w.is_released &&
          !w.is_claimed &&
          !w.is_swept_to_delta
        ) {
          const wallet = w.affiliate_wallet;
          pendingMap[wallet] =
            (pendingMap[wallet] || 0) + Number(w.pending_lamports || 0);
        }
      });

      const claimedMap: Record<string, number> = {};
      (onchainClaims || []).forEach((c: any) => {
        claimedMap[c.affiliate_wallet] =
          (claimedMap[c.affiliate_wallet] || 0) +
          Number(c.amount_lamports || 0);
      });

      const expiredMap: Record<string, { lamports: number; weeks: number }> = {};
      (weeklyAccum || []).forEach((w: any) => {
        if (w.is_swept_to_delta && !w.is_claimed) {
          const wallet = w.affiliate_wallet;
          if (!expiredMap[wallet]) expiredMap[wallet] = { lamports: 0, weeks: 0 };
          expiredMap[wallet].lamports += Number(w.pending_lamports || 0);
          expiredMap[wallet].weeks += 1;
        }
      });

      const result = (affiliates || []).map((a: any) => {
        const wallet = a.users?.wallet_address || "";
        const totalEarnedLamports = earnedMap[wallet] || 0;
        const totalClaimedLamports = claimedMap[wallet] || 0;
        const trulyPendingLamports = pendingMap[wallet] || 0;

        return {
          affiliate_id: a.id,
          user_id: a.user_id,
          wallet_address: wallet,
          referral_code: a.referral_code,
          total_earned: totalEarnedLamports / 1e9,
          pending_earnings: trulyPendingLamports / 1e9,
          total_claimed_sol: totalClaimedLamports / 1e9,
          manual_tier: a.manual_tier,
          referral_count: refMap[a.id]?.count || 0,
          total_referral_value_sol: refMap[a.id]?.value || 0,
          total_commission_earned: refMap[a.id]?.commission || 0,
          expired_rewards_sol: (expiredMap[wallet]?.lamports || 0) / 1e9,
          expired_weeks: expiredMap[wallet]?.weeks || 0,
          created_at: a.created_at,
        };
      });

      result.sort((a: any, b: any) => b.total_earned - a.total_earned);

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

      const [
        { data: tickets },
        { data: devTreasury },
        { data: deltaTransfers },
      ] = await Promise.all([
        supabase
          .from("ticket_purchases")
          .select("created_at, quantity, total_sol")
          .order("created_at", { ascending: true }),
        supabase
          .from("dev_treasury_transfers")
          .select("created_at, amount_lamports"),
        supabase
          .from("delta_transfers")
          .select("created_at, amount_lamports"),
      ]);

      const buckets: Record<
        string,
        {
          date: string;
          ticket_revenue_lamports: number;
          dev_treasury_lamports: number;
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
            dev_treasury_lamports: 0,
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

      (devTreasury || []).forEach((d: any) => {
        const key = getKey(d.created_at);
        ensureBucket(key);
        buckets[key].dev_treasury_lamports += Number(d.amount_lamports || 0);
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
      const TREASURY_LABELS: Record<string, string> = {
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
        { data: devTreasuryData },
      ] = await Promise.all([
        supabase.from("ticket_purchases").select("lottery_type, total_sol, created_at"),
        supabase.from("delta_transfers").select("amount_lamports, created_at"),
        supabase.from("solana_affiliate_earnings").select("commission_lamports, earned_at"),
        supabase.from("dev_treasury_transfers").select("amount_lamports, created_at"),
      ]);

      const map: Record<string, number> = {};

      const addLamports = (wallet: string, dateStr: string | null, lamports: number) => {
        if (!dateStr || !lamports) return;
        const day = new Date(dateStr).toISOString().split("T")[0];
        const key = `${wallet}|${day}`;
        map[key] = (map[key] || 0) + lamports;
      };

      const DEV_TREASURY = "55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1";
      const PRIZE_POOL_PCT = 0.40;

      const lotteryWalletMap: Record<string, string> = {
        "tri-daily": "4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx",
        "special-event": "AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk",
        "grand-prize": "nTMcPkR8eYJFFy4Gcdk6wZcRphj5VFxK4CpviA2Qi9C",
        "jackpot": "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
      };

      (tickets || []).forEach((t: any) => {
        const totalLamports = Math.round(parseFloat(t.total_sol || "0") * 1e9);
        const prizePoolLamports = Math.floor(totalLamports * PRIZE_POOL_PCT);

        const wallet = lotteryWalletMap[t.lottery_type];
        if (wallet) addLamports(wallet, t.created_at, prizePoolLamports);
      });

      (devTreasuryData || []).forEach((d: any) => {
        addLamports(DEV_TREASURY, d.created_at, Number(d.amount_lamports));
      });

      (deltaTransfers || []).forEach((d: any) => {
        addLamports("2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU", d.created_at, Number(d.amount_lamports));
      });

      (affiliateEarnings || []).forEach((a: any) => {
        addLamports("8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf", a.earned_at, Number(a.commission_lamports));
      });

      const result = Object.entries(map).map(([key, lamports]) => {
        const [wallet, date] = key.split("|");
        return {
          wallet_address: wallet,
          label: TREASURY_LABELS[wallet] || wallet,
          date,
          lamports,
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

    if (action === "sybil-analysis") {
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("id, user_id, referral_code, manual_tier, total_earned, pending_earnings, users!affiliates_user_id_fkey(wallet_address)")
        .order("total_earned", { ascending: false });

      const { data: referrals } = await supabase
        .from("referrals")
        .select("referrer_affiliate_id, referred_user_id, is_validated, total_tickets_purchased, total_value_sol, total_commission_earned, created_at, users!referrals_referred_user_id_fkey(wallet_address, created_at)");

      const { data: ticketPurchases } = await supabase
        .from("ticket_purchases")
        .select("wallet_address, quantity, total_sol, created_at");

      const ticketsByWallet: Record<string, { totalTickets: number; totalSol: number; purchaseDates: string[] }> = {};
      (ticketPurchases || []).forEach((t: any) => {
        if (!ticketsByWallet[t.wallet_address]) {
          ticketsByWallet[t.wallet_address] = { totalTickets: 0, totalSol: 0, purchaseDates: [] };
        }
        ticketsByWallet[t.wallet_address].totalTickets += t.quantity;
        ticketsByWallet[t.wallet_address].totalSol += Number(t.total_sol || 0);
        ticketsByWallet[t.wallet_address].purchaseDates.push(t.created_at);
      });

      const refsByAffiliate: Record<string, any[]> = {};
      (referrals || []).forEach((r: any) => {
        const key = r.referrer_affiliate_id;
        if (!refsByAffiliate[key]) refsByAffiliate[key] = [];
        refsByAffiliate[key].push(r);
      });

      const alerts: any[] = [];

      (affiliates || []).forEach((aff: any) => {
        const wallet = aff.users?.wallet_address || "";
        const refs = refsByAffiliate[aff.id] || [];
        if (refs.length === 0) return;

        const validatedRefs = refs.filter((r: any) => r.is_validated);
        const singleTicketRefs: any[] = [];
        const zeroTicketRefs: any[] = [];
        const lowValueRefs: any[] = [];
        const rapidSignupWallets: any[] = [];

        refs.forEach((r: any) => {
          const refWallet = r.users?.wallet_address || "";
          const ticketData = ticketsByWallet[refWallet];
          const totalTickets = ticketData?.totalTickets || Number(r.total_tickets_purchased || 0);
          const totalSol = ticketData?.totalSol || Number(r.total_value_sol || 0);

          if (totalTickets === 0) {
            zeroTicketRefs.push({ wallet: refWallet, tickets: 0, sol: 0, created: r.created_at });
          } else if (totalTickets === 1) {
            singleTicketRefs.push({ wallet: refWallet, tickets: 1, sol: totalSol, created: r.created_at });
          }

          if (totalTickets > 0 && totalSol > 0 && totalSol / totalTickets < 0.005) {
            lowValueRefs.push({ wallet: refWallet, tickets: totalTickets, sol: totalSol, created: r.created_at });
          }
        });

        const signupTimes = refs
          .map((r: any) => new Date(r.created_at).getTime())
          .sort((a: number, b: number) => a - b);

        for (let j = 1; j < signupTimes.length; j++) {
          const diffMinutes = (signupTimes[j] - signupTimes[j - 1]) / (1000 * 60);
          if (diffMinutes < 5) {
            const matchingRef = refs.find((r: any) =>
              new Date(r.created_at).getTime() === signupTimes[j]
            );
            if (matchingRef) {
              rapidSignupWallets.push({
                wallet: matchingRef.users?.wallet_address || "",
                gap_minutes: Math.round(diffMinutes * 10) / 10,
                created: matchingRef.created_at,
              });
            }
          }
        }

        const singleTicketRate = refs.length > 0
          ? (singleTicketRefs.length + zeroTicketRefs.length) / refs.length
          : 0;

        const riskScore =
          (singleTicketRate > 0.7 ? 40 : singleTicketRate > 0.5 ? 20 : 0) +
          (rapidSignupWallets.length > 3 ? 30 : rapidSignupWallets.length > 1 ? 15 : 0) +
          (zeroTicketRefs.length > refs.length * 0.5 ? 20 : zeroTicketRefs.length > refs.length * 0.3 ? 10 : 0) +
          (refs.length > 10 && singleTicketRate > 0.6 ? 10 : 0);

        if (riskScore > 0 || singleTicketRefs.length > 0 || rapidSignupWallets.length > 0) {
          alerts.push({
            affiliate_id: aff.id,
            wallet_address: wallet,
            referral_code: aff.referral_code,
            manual_tier: aff.manual_tier,
            total_earned: Number(aff.total_earned || 0),
            total_referrals: refs.length,
            validated_referrals: validatedRefs.length,
            single_ticket_referrals: singleTicketRefs.length,
            zero_ticket_referrals: zeroTicketRefs.length,
            single_ticket_rate: Math.round(singleTicketRate * 100),
            rapid_signups: rapidSignupWallets,
            single_ticket_wallets: singleTicketRefs.slice(0, 20),
            zero_ticket_wallets: zeroTicketRefs.slice(0, 20),
            low_value_refs: lowValueRefs.slice(0, 10),
            risk_score: Math.min(riskScore, 100),
          });
        }
      });

      alerts.sort((a: any, b: any) => b.risk_score - a.risk_score);

      return jsonResponse(alerts);
    }

    if (action === "whale-analysis") {
      const [
        { data: currentTickets },
        { data: allTickets },
        { data: prizes },
        { data: draws },
      ] = await Promise.all([
        supabase
          .from("ticket_purchases")
          .select("wallet_address, lottery_type, lottery_round_id, quantity")
          .eq("is_drawn", false),
        supabase
          .from("ticket_purchases")
          .select("wallet_address, lottery_type, quantity"),
        supabase
          .from("prizes")
          .select("user_wallet, lottery_type, prize_amount_lamports, prize_position"),
        supabase
          .from("solana_draws")
          .select("lottery_type, round, participants_count"),
      ]);

      const roundTotals: Record<string, number> = {};
      (currentTickets || []).forEach((t: any) => {
        const key = `${t.lottery_type}|${t.lottery_round_id}`;
        roundTotals[key] = (roundTotals[key] || 0) + Number(t.quantity || 0);
      });

      const userCurrentByLottery: Record<string, Record<string, number>> = {};
      (currentTickets || []).forEach((t: any) => {
        if (!userCurrentByLottery[t.wallet_address]) userCurrentByLottery[t.wallet_address] = {};
        const key = `${t.lottery_type}|${t.lottery_round_id}`;
        userCurrentByLottery[t.wallet_address][t.lottery_type] =
          (userCurrentByLottery[t.wallet_address][t.lottery_type] || 0) + Number(t.quantity || 0);
        userCurrentByLottery[t.wallet_address][`${t.lottery_type}_total`] = roundTotals[key] || 0;
      });

      const userAllTickets: Record<string, number> = {};
      (allTickets || []).forEach((t: any) => {
        userAllTickets[t.wallet_address] = (userAllTickets[t.wallet_address] || 0) + Number(t.quantity || 0);
      });

      const totalDrawParticipants: Record<string, number> = {};
      const drawCounts: Record<string, number> = {};
      (draws || []).forEach((d: any) => {
        totalDrawParticipants[d.lottery_type] =
          (totalDrawParticipants[d.lottery_type] || 0) + Number(d.participants_count || 0);
        drawCounts[d.lottery_type] = (drawCounts[d.lottery_type] || 0) + 1;
      });

      const userPrizes: Record<string, { count: number; lamports: number }> = {};
      (prizes || []).forEach((p: any) => {
        if (!userPrizes[p.user_wallet]) userPrizes[p.user_wallet] = { count: 0, lamports: 0 };
        userPrizes[p.user_wallet].count += 1;
        userPrizes[p.user_wallet].lamports += Number(p.prize_amount_lamports || 0);
      });

      const totalAllTickets = Object.values(userAllTickets).reduce((s, v) => s + v, 0);

      const wallets = new Set<string>();
      (currentTickets || []).forEach((t: any) => wallets.add(t.wallet_address));

      const lotteryTypes = ["tri-daily", "jackpot", "special-event", "grand-prize"];

      const result = Array.from(wallets).map((wallet) => {
        const concentration: Record<string, { user: number; total: number; pct: number }> = {};
        let totalUserCurrent = 0;
        let totalCurrentPool = 0;

        lotteryTypes.forEach((lt) => {
          const userT = userCurrentByLottery[wallet]?.[lt] || 0;
          const totalT = userCurrentByLottery[wallet]?.[`${lt}_total`] || 0;
          if (userT > 0) {
            concentration[lt] = {
              user: userT,
              total: totalT,
              pct: totalT > 0 ? Math.round((userT / totalT) * 10000) / 100 : 0,
            };
            totalUserCurrent += userT;
            totalCurrentPool += totalT;
          }
        });

        const overallConcentration = totalCurrentPool > 0
          ? Math.round((totalUserCurrent / totalCurrentPool) * 10000) / 100
          : 0;

        const prizeData = userPrizes[wallet] || { count: 0, lamports: 0 };
        const totalTicketsAll = userAllTickets[wallet] || 0;
        const winRate = totalTicketsAll > 0
          ? Math.round((prizeData.count / totalTicketsAll) * 10000) / 100
          : 0;

        const globalShare = totalAllTickets > 0
          ? Math.round((totalTicketsAll / totalAllTickets) * 10000) / 100
          : 0;

        const maxConcentration = Object.values(concentration).reduce(
          (max, c) => Math.max(max, c.pct), 0
        );

        const whaleScore =
          (maxConcentration > 50 ? 40 : maxConcentration > 30 ? 25 : maxConcentration > 20 ? 10 : 0) +
          (overallConcentration > 40 ? 25 : overallConcentration > 25 ? 15 : 0) +
          (winRate > 20 ? 20 : winRate > 10 ? 10 : 0) +
          (globalShare > 15 ? 15 : globalShare > 10 ? 10 : globalShare > 5 ? 5 : 0);

        return {
          wallet_address: wallet,
          concentration,
          overall_concentration: overallConcentration,
          total_current_tickets: totalUserCurrent,
          total_all_time_tickets: totalTicketsAll,
          global_ticket_share: globalShare,
          prizes_won: prizeData.count,
          prizes_won_lamports: prizeData.lamports,
          win_rate: winRate,
          whale_score: Math.min(whaleScore, 100),
        };
      });

      result.sort((a: any, b: any) => b.whale_score - a.whale_score);

      return jsonResponse({
        users: result,
        round_totals: roundTotals,
        lottery_types: lotteryTypes,
      });
    }

    if (action === "save-whale-snapshot") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { users } = body;
      if (!Array.isArray(users) || users.length === 0) {
        return errorResponse("Missing users array", 400);
      }

      const today = new Date().toISOString().split("T")[0];
      const rows = users.map((u: any) => ({
        wallet_address: u.wallet_address,
        whale_score: u.whale_score || 0,
        overall_concentration: u.overall_concentration || 0,
        global_ticket_share: u.global_ticket_share || 0,
        win_rate: u.win_rate || 0,
        total_current_tickets: u.total_current_tickets || 0,
        total_all_time_tickets: u.total_all_time_tickets || 0,
        prizes_won: u.prizes_won || 0,
        prizes_won_lamports: u.prizes_won_lamports || 0,
        concentration_data: u.concentration || {},
        snapshot_date: today,
      }));

      const { error: upsertError } = await supabase
        .from("whale_score_history")
        .upsert(rows, { onConflict: "wallet_address,snapshot_date" });

      if (upsertError) return errorResponse(upsertError.message, 500);

      return jsonResponse({ success: true, saved: rows.length, date: today });
    }

    if (action === "whale-history") {
      const days = parseInt(url.searchParams.get("days") || "30", 10);
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split("T")[0];

      const { data } = await supabase
        .from("whale_score_history")
        .select("*")
        .gte("snapshot_date", sinceStr)
        .order("snapshot_date", { ascending: false })
        .order("whale_score", { ascending: false });

      const walletPeaks: Record<string, any> = {};
      (data || []).forEach((row: any) => {
        const w = row.wallet_address;
        if (!walletPeaks[w] || row.whale_score > walletPeaks[w].peak_score) {
          walletPeaks[w] = {
            wallet_address: w,
            peak_score: row.whale_score,
            peak_date: row.snapshot_date,
            latest_score: walletPeaks[w]?.latest_score ?? row.whale_score,
            latest_date: walletPeaks[w]?.latest_date ?? row.snapshot_date,
            snapshots: walletPeaks[w]?.snapshots || 0,
            peak_concentration: row.overall_concentration,
            peak_global_share: row.global_ticket_share,
            peak_win_rate: row.win_rate,
            all_time_tickets: row.total_all_time_tickets,
            prizes_won: row.prizes_won,
            prizes_won_lamports: row.prizes_won_lamports,
          };
        }
        if (!walletPeaks[w].latest_date || row.snapshot_date > walletPeaks[w].latest_date) {
          walletPeaks[w].latest_score = row.whale_score;
          walletPeaks[w].latest_date = row.snapshot_date;
        }
        walletPeaks[w].snapshots = (walletPeaks[w].snapshots || 0) + 1;
      });

      const timeline: Record<string, any[]> = {};
      (data || []).forEach((row: any) => {
        const w = row.wallet_address;
        if (!timeline[w]) timeline[w] = [];
        timeline[w].push({
          date: row.snapshot_date,
          score: row.whale_score,
          concentration: row.overall_concentration,
          global_share: row.global_ticket_share,
        });
      });

      const ranking = Object.values(walletPeaks)
        .sort((a: any, b: any) => b.peak_score - a.peak_score);

      return jsonResponse({ ranking, timeline, total_snapshots: (data || []).length });
    }

    if (action === "update-tier") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { affiliate_id, new_tier } = body;
      if (!affiliate_id || new_tier === undefined) {
        return errorResponse("Missing affiliate_id or new_tier", 400);
      }
      if (![1, 2, 3, 4].includes(Number(new_tier))) {
        return errorResponse("Invalid tier (must be 1-4)", 400);
      }

      const { error: updateError } = await supabase
        .from("affiliates")
        .update({ manual_tier: Number(new_tier), updated_at: new Date().toISOString() })
        .eq("id", affiliate_id);

      if (updateError) return errorResponse(updateError.message, 500);

      return jsonResponse({ success: true, affiliate_id, new_tier: Number(new_tier) });
    }

    if (action === "batch-update-affiliates") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { changes } = body;
      if (!Array.isArray(changes) || changes.length === 0) {
        return errorResponse("Missing or empty changes array", 400);
      }

      const results: { affiliate_id: string; success: boolean; error?: string }[] = [];

      for (const change of changes) {
        const { affiliate_id, referral_code, new_tier } = change;
        if (!affiliate_id) {
          results.push({ affiliate_id: "unknown", success: false, error: "Missing affiliate_id" });
          continue;
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (new_tier !== undefined) {
          if (![1, 2, 3, 4].includes(Number(new_tier))) {
            results.push({ affiliate_id, success: false, error: "Invalid tier" });
            continue;
          }
          updates.manual_tier = Number(new_tier);
        }

        if (referral_code !== undefined) {
          const code = String(referral_code).trim().toLowerCase();
          if (code.length < 2 || code.length > 30) {
            results.push({ affiliate_id, success: false, error: "Code must be 2-30 chars" });
            continue;
          }
          if (!/^[a-z0-9_-]+$/.test(code)) {
            results.push({ affiliate_id, success: false, error: "Code can only contain a-z, 0-9, - and _" });
            continue;
          }
          const { data: existing } = await supabase
            .from("affiliates")
            .select("id")
            .eq("referral_code", code)
            .neq("id", affiliate_id)
            .maybeSingle();
          if (existing) {
            results.push({ affiliate_id, success: false, error: `Code "${code}" already taken` });
            continue;
          }
          updates.referral_code = code;
        }

        const { error: updateError } = await supabase
          .from("affiliates")
          .update(updates)
          .eq("id", affiliate_id);

        if (updateError) {
          results.push({ affiliate_id, success: false, error: updateError.message });
        } else {
          results.push({ affiliate_id, success: true });
        }
      }

      const allSuccess = results.every((r) => r.success);
      return jsonResponse({ success: allSuccess, results });
    }

    if (action === "applications") {
      const statusFilter = url.searchParams.get("status") || "all";

      let query = supabase
        .from("affiliate_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) return errorResponse(fetchError.message, 500);

      return jsonResponse(data || []);
    }

    if (action === "review-application") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { application_id, decision, admin_notes } = body;
      if (!application_id || !decision) {
        return errorResponse("Missing application_id or decision", 400);
      }
      if (!["approved", "rejected"].includes(decision)) {
        return errorResponse("Decision must be 'approved' or 'rejected'", 400);
      }

      const { data: app, error: fetchErr } = await supabase
        .from("affiliate_applications")
        .select("*")
        .eq("id", application_id)
        .maybeSingle();

      if (fetchErr) return errorResponse(fetchErr.message, 500);
      if (!app) return errorResponse("Application not found", 404);

      const { error: updateError } = await supabase
        .from("affiliate_applications")
        .update({
          status: decision,
          admin_notes: admin_notes || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", application_id);

      if (updateError) return errorResponse(updateError.message, 500);

      if (decision === "approved") {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", app.wallet_address)
          .maybeSingle();

        if (existingUser) {
          const { data: existingAffiliate } = await supabase
            .from("affiliates")
            .select("id")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (!existingAffiliate) {
            const code = app.wallet_address.slice(0, 4) + app.wallet_address.slice(-4);
            await supabase.from("affiliates").insert({
              user_id: existingUser.id,
              referral_code: code.toLowerCase(),
              manual_tier: 1,
            });
          }
        }
      }

      return jsonResponse({ success: true, application_id, decision });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
});
