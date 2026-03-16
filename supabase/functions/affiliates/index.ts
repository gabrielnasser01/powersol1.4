import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function isValidWallet(addr: unknown): addr is string {
  return typeof addr === "string" && SOLANA_ADDR_RE.test(addr.trim());
}

function sanitize(input: unknown, maxLen = 500): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(/[<>]/g, "").replace(/javascript:/gi, "").trim().slice(0, maxLen);
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

async function submitApplication(req: Request) {
  const body = await req.json();
  const { wallet_address, full_name, email, country, social_media, marketing_experience, marketing_strategy } = body;

  if (!isValidWallet(wallet_address)) {
    throw new Error("Invalid wallet address");
  }
  if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2 || full_name.length > 100) {
    throw new Error("Invalid name (2-100 characters)");
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 320) {
    throw new Error("Invalid email address");
  }

  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("affiliate_applications")
    .select("id")
    .eq("wallet_address", wallet_address.trim())
    .maybeSingle();

  if (existing) {
    throw new Error("You have already submitted an application");
  }

  const { data, error } = await supabase
    .from("affiliate_applications")
    .insert({
      wallet_address: wallet_address.trim(),
      full_name: sanitize(full_name, 100),
      email: email.trim().toLowerCase(),
      country: sanitize(country, 100) || null,
      social_media: sanitize(social_media, 500) || null,
      marketing_experience: sanitize(marketing_experience, 2000) || null,
      marketing_strategy: sanitize(marketing_strategy, 2000) || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMyApplication(walletAddress: string) {
  if (!isValidWallet(walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("affiliate_applications")
    .select("*")
    .eq("wallet_address", walletAddress.trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listApplications(url: URL) {
  const status = url.searchParams.get("status");
  const validStatuses = ["pending", "approved", "rejected"];
  if (status && !validStatuses.includes(status)) {
    throw new Error("Invalid status filter");
  }

  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50")), 100);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));

  const supabase = getServiceClient();

  let query = supabase
    .from("affiliate_applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { applications: data || [], total: count || 0 };
}

async function updateApplicationStatus(applicationId: string, body: Record<string, unknown>) {
  if (!UUID_RE.test(applicationId)) {
    throw new Error("Invalid application ID");
  }

  const { status, admin_notes } = body;
  const validStatuses = ["pending", "approved", "rejected"];

  if (!status || typeof status !== "string" || !validStatuses.includes(status)) {
    throw new Error("Invalid status value");
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("affiliate_applications")
    .update({
      status,
      admin_notes: sanitize(admin_notes, 1000) || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (error) throw error;

  if (status === "approved") {
    const { data: app } = await supabase
      .from("affiliate_applications")
      .select("wallet_address")
      .eq("id", applicationId)
      .single();

    if (app) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", app.wallet_address)
        .maybeSingle();

      if (user) {
        const { data: existing } = await supabase
          .from("affiliates")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from("affiliates")
            .insert({
              user_id: user.id,
              referral_code: app.wallet_address,
              total_earned: 0,
              pending_earnings: 0,
              manual_tier: 1,
            });
        }

        try {
          const baseUrl = Deno.env.get("SUPABASE_URL");
          await fetch(
            `${baseUrl}/functions/v1/missions/became-affiliate?wallet_address=${encodeURIComponent(app.wallet_address)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
            }
          );
        } catch (err) {
          console.error("Failed to trigger affiliate mission:", err);
        }
      }
    }
  }

  return data;
}

async function deleteApplication(applicationId: string) {
  if (!UUID_RE.test(applicationId)) {
    throw new Error("Invalid application ID");
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("affiliate_applications")
    .delete()
    .eq("id", applicationId);

  if (error) throw error;
  return { success: true };
}

async function registerReferral(req: Request) {
  const body = await req.json();
  const { wallet_address, referral_code } = body;

  if (!isValidWallet(wallet_address)) {
    throw new Error("Invalid wallet address");
  }
  if (!referral_code || typeof referral_code !== "string" || referral_code.trim().length < 2) {
    throw new Error("Invalid referral code");
  }

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", wallet_address.trim())
    .maybeSingle();

  if (!user) {
    const { data: newUser, error: createErr } = await supabase
      .from("users")
      .insert({ wallet_address: wallet_address.trim() })
      .select("id")
      .single();

    if (createErr || !newUser) {
      throw new Error("Failed to create user");
    }

    return await processReferral(supabase, newUser.id, referral_code.trim());
  }

  return await processReferral(supabase, user.id, referral_code.trim());
}

async function processReferral(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  referralCode: string
) {
  const { data: existingRef } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (existingRef) {
    return { success: true, message: "Referral already registered" };
  }

  let affiliate = null;

  const { data: byCode } = await supabase
    .from("affiliates")
    .select("id, user_id")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (byCode) {
    affiliate = byCode;
  } else if (SOLANA_ADDR_RE.test(referralCode)) {
    const { data: refUser } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", referralCode)
      .maybeSingle();

    if (refUser) {
      const { data: byUser } = await supabase
        .from("affiliates")
        .select("id, user_id")
        .eq("user_id", refUser.id)
        .maybeSingle();

      if (byUser) {
        affiliate = byUser;
      }
    }
  }

  if (!affiliate) {
    return { success: false, message: "Affiliate not found" };
  }

  if (affiliate.user_id === userId) {
    return { success: false, message: "Cannot refer yourself" };
  }

  const { error: insertErr } = await supabase
    .from("referrals")
    .insert({
      referred_user_id: userId,
      referrer_affiliate_id: affiliate.id,
      referral_code_used: referralCode,
      is_validated: false,
    });

  if (insertErr) {
    throw new Error("Failed to register referral");
  }

  return { success: true, message: "Referral registered" };
}

const LAMPORTS_PER_SOL = 1_000_000_000;
const COMMISSION_RATES: Record<number, number> = { 1: 0.05, 2: 0.10, 3: 0.20, 4: 0.30 };

async function processCommission(req: Request) {
  const body = await req.json();
  const { buyer_wallet, quantity, total_sol, transaction_signature } = body;

  if (!isValidWallet(buyer_wallet)) {
    throw new Error("Invalid wallet address");
  }
  if (typeof quantity !== "number" || quantity < 1 || quantity > 1000) {
    throw new Error("Invalid quantity");
  }
  if (typeof total_sol !== "number" || total_sol <= 0) {
    throw new Error("Invalid total_sol");
  }

  const supabase = getServiceClient();

  const { data: buyerUser } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", buyer_wallet.trim())
    .maybeSingle();

  if (!buyerUser) {
    return { success: false, message: "Buyer not found" };
  }

  const { data: referral } = await supabase
    .from("referrals")
    .select("*, affiliates!referrer_affiliate_id(id, user_id, manual_tier, referral_code, total_earned, pending_earnings)")
    .eq("referred_user_id", buyerUser.id)
    .maybeSingle();

  if (!referral || !referral.affiliates) {
    return { success: false, message: "No referral found for buyer" };
  }

  const affiliate = referral.affiliates as Record<string, unknown>;
  const affiliateId = affiliate.id as string;
  const tier = (affiliate.manual_tier as number) || 1;
  const commissionRate = COMMISSION_RATES[tier] || 0.05;
  const commissionSol = total_sol * commissionRate;
  const commissionLamports = Math.floor(commissionSol * LAMPORTS_PER_SOL);

  const isFirstPurchase = !referral.is_validated;

  await supabase
    .from("referrals")
    .update({
      is_validated: true,
      first_purchase_at: isFirstPurchase ? new Date().toISOString() : referral.first_purchase_at,
      total_tickets_purchased: (referral.total_tickets_purchased || 0) + quantity,
      total_value_sol: Number(referral.total_value_sol || 0) + total_sol,
      total_commission_earned: Number(referral.total_commission_earned || 0) + commissionSol,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referral.id);

  const currentTotalEarned = Number(affiliate.total_earned || 0);
  const currentPending = Number(affiliate.pending_earnings || 0);

  await supabase
    .from("affiliates")
    .update({
      total_earned: currentTotalEarned + commissionSol,
      pending_earnings: currentPending + commissionSol,
      updated_at: new Date().toISOString(),
    })
    .eq("id", affiliateId);

  const { data: affiliateUser } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", affiliate.user_id as string)
    .maybeSingle();

  const affiliateWallet = affiliateUser?.wallet_address || (affiliate.referral_code as string);

  await supabase
    .from("solana_affiliate_earnings")
    .insert({
      affiliate_wallet: affiliateWallet,
      commission_lamports: commissionLamports,
      transaction_signature: transaction_signature || null,
    });

  const { data: pendingRewards } = await supabase
    .from("affiliate_pending_rewards")
    .select("*")
    .eq("affiliate_wallet", affiliateWallet)
    .maybeSingle();

  if (pendingRewards) {
    await supabase
      .from("affiliate_pending_rewards")
      .update({
        pending_lamports: (pendingRewards.pending_lamports || 0) + commissionLamports,
        total_earned_lamports: (pendingRewards.total_earned_lamports || 0) + commissionLamports,
        tier: tier,
        referral_count: (pendingRewards.referral_count || 0) + (isFirstPurchase ? 1 : 0),
        last_updated: new Date().toISOString(),
      })
      .eq("id", pendingRewards.id);
  } else {
    await supabase
      .from("affiliate_pending_rewards")
      .insert({
        affiliate_wallet: affiliateWallet,
        pending_lamports: commissionLamports,
        tier: tier,
        referral_count: 1,
        total_earned_lamports: commissionLamports,
        total_claimed_lamports: 0,
        next_claim_nonce: 0,
      });
  }

  const weekStart = getWeekStart();
  const weekNumber = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));

  const { data: weeklyAcc } = await supabase
    .from("affiliate_weekly_accumulator")
    .select("*")
    .eq("affiliate_wallet", affiliateWallet)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (weeklyAcc) {
    await supabase
      .from("affiliate_weekly_accumulator")
      .update({
        pending_lamports: (weeklyAcc.pending_lamports || 0) + commissionLamports,
        referral_count: (weeklyAcc.referral_count || 0) + (isFirstPurchase ? 1 : 0),
        tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", weeklyAcc.id);
  } else {
    await supabase
      .from("affiliate_weekly_accumulator")
      .insert({
        affiliate_wallet: affiliateWallet,
        week_number: weekNumber,
        pending_lamports: commissionLamports,
        tier: tier,
        referral_count: isFirstPurchase ? 1 : 0,
        is_released: false,
      });
  }

  return {
    success: true,
    commission_sol: commissionSol,
    commission_lamports: commissionLamports,
    tier,
    commission_rate: commissionRate,
    is_first_purchase: isFirstPurchase,
  };
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day >= 3 ? day - 3 : day + 4;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

async function getAffiliateStats(walletAddress: string) {
  if (!isValidWallet(walletAddress)) {
    throw new Error("Invalid wallet address");
  }

  const supabase = getServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", walletAddress.trim())
    .maybeSingle();

  if (!user) {
    return { is_affiliate: false };
  }

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!affiliate) {
    return { is_affiliate: false };
  }

  const { data: referrals } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_affiliate_id", affiliate.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const totalReferrals = referrals?.length || 0;
  const validatedReferrals = (referrals || []).filter((r: Record<string, boolean>) => r.is_validated).length;

  return {
    is_affiliate: true,
    affiliate,
    stats: {
      total_earnings: affiliate.total_earned || 0,
      pending_earnings: affiliate.pending_earnings || 0,
      total_referrals: totalReferrals,
      validated_referrals: validatedReferrals,
    },
    recent_referrals: referrals?.slice(0, 10) || [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(clientIp, 30, 60000)) {
      return errorResponse("Too many requests", 429);
    }

    const url = new URL(req.url);
    const pathMatch = url.pathname.match(/\/affiliates(\/.*)?$/);
    const path = pathMatch ? (pathMatch[1] || "") : "";

    let result: unknown;

    if (req.method === "POST" && path === "/process-commission") {
      result = await processCommission(req);
    } else if (req.method === "POST" && path === "/register-referral") {
      result = await registerReferral(req);
    } else if (req.method === "POST" && (path === "/submit" || path === "" || path === "/")) {
      result = await submitApplication(req);
    } else if (req.method === "GET" && path === "/my-application") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) return errorResponse("Wallet address required", 400);
      result = await getMyApplication(wallet);
    } else if (req.method === "GET" && path === "/list") {
      result = await listApplications(url);
    } else if (req.method === "PATCH" && path.includes("/status")) {
      const pathParts = path.split("/");
      const applicationId = pathParts[1];
      const body = await req.json();
      result = await updateApplicationStatus(applicationId, body);
    } else if (req.method === "DELETE") {
      const pathParts = path.split("/");
      const applicationId = pathParts[1];
      result = await deleteApplication(applicationId);
    } else if (req.method === "GET" && path === "/stats") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) return errorResponse("Wallet address required", 400);
      result = await getAffiliateStats(wallet);
    } else {
      return errorResponse("Not found", 404);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";
    const status = message === "Not found" ? 404 : 400;

    return errorResponse(
      status === 400 ? "Bad request" : message,
      status
    );
  }
});
