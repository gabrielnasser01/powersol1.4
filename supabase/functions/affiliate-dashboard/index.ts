import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const REFERRAL_CODE_RE = /^[a-zA-Z0-9_-]{3,30}$/;

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

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
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
    const path = url.pathname.replace("/affiliate-dashboard", "");
    const supabase = getServiceClient();

    if (path === "/stats" || path === "/stats/") {
      const walletAddress = url.searchParams.get("wallet");
      if (!isValidWallet(walletAddress)) {
        return errorResponse("Valid wallet parameter required", 400);
      }

      const { data, error } = await supabase.rpc("get_affiliate_dashboard_stats", {
        p_wallet: walletAddress.trim(),
      });

      if (error) throw error;
      return successResponse(data?.[0] || null);
    }

    if (path === "/ranking" || path === "/ranking/") {
      const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "10")), 50);

      const { data, error } = await supabase.rpc("get_top_affiliates_ranking", {
        p_limit: limit,
      });

      if (error) throw error;
      return successResponse(data || []);
    }

    if (path === "/history" || path === "/history/") {
      const walletAddress = url.searchParams.get("wallet");
      if (!isValidWallet(walletAddress)) {
        return errorResponse("Valid wallet parameter required", 400);
      }
      const weeks = Math.min(Math.max(1, parseInt(url.searchParams.get("weeks") || "8")), 52);

      const { data, error } = await supabase.rpc("get_affiliate_weekly_history", {
        p_wallet: walletAddress.trim(),
        p_weeks: weeks,
      });

      if (error) throw error;
      return successResponse(data || []);
    }

    if (path === "/top-referrals" || path === "/top-referrals/") {
      const walletAddress = url.searchParams.get("wallet");
      if (!isValidWallet(walletAddress)) {
        return errorResponse("Valid wallet parameter required", 400);
      }
      const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "20")), 100);

      const { data, error } = await supabase.rpc("get_affiliate_top_referrals", {
        p_wallet: walletAddress.trim(),
        p_limit: limit,
      });

      if (error) throw error;
      return successResponse(data || []);
    }

    if (path === "/application-status" || path === "/application-status/") {
      const walletAddress = url.searchParams.get("wallet");
      if (!isValidWallet(walletAddress)) {
        return errorResponse("Valid wallet parameter required", 400);
      }

      const { data, error } = await supabase
        .from("affiliate_applications")
        .select("status, created_at")
        .eq("wallet_address", walletAddress.trim())
        .maybeSingle();

      if (error) throw error;
      return successResponse({
        hasApplied: !!data,
        status: data?.status || null,
        appliedAt: data?.created_at || null,
      });
    }

    if ((path === "/track" || path === "/track/") && req.method === "POST") {
      const body = await req.json();
      const { wallet, referral_code } = body;

      if (!isValidWallet(wallet)) {
        return errorResponse("Valid wallet required", 400);
      }
      if (!referral_code || typeof referral_code !== "string" || !REFERRAL_CODE_RE.test(referral_code)) {
        return errorResponse("Valid referral_code required", 400);
      }

      const { data, error } = await supabase.rpc("track_referral_visit", {
        p_referred_wallet: wallet.trim(),
        p_referral_code: referral_code.trim(),
      });

      if (error) throw error;
      return successResponse(data);
    }

    if ((path === "/commission" || path === "/commission/") && req.method === "POST") {
      const body = await req.json();
      const { buyer_wallet, ticket_price_lamports, lottery_id } = body;

      if (!isValidWallet(buyer_wallet)) {
        return errorResponse("Valid buyer_wallet required", 400);
      }
      if (typeof ticket_price_lamports !== "number" || ticket_price_lamports <= 0 || ticket_price_lamports > 100000000000) {
        return errorResponse("Valid ticket_price_lamports required", 400);
      }

      const { data, error } = await supabase.rpc("process_affiliate_commission", {
        p_buyer_wallet: buyer_wallet.trim(),
        p_ticket_price_lamports: ticket_price_lamports,
        p_lottery_id: lottery_id || null,
      });

      if (error) throw error;
      return successResponse(data);
    }

    if (path === "/referral-info" || path === "/referral-info/") {
      const walletAddress = url.searchParams.get("wallet");
      if (!isValidWallet(walletAddress)) {
        return errorResponse("Valid wallet parameter required", 400);
      }

      const { data, error } = await supabase.rpc("get_user_referral_info", {
        p_wallet: walletAddress.trim(),
      });

      if (error) throw error;
      return successResponse(data);
    }

    if (path === "/validate-code" || path === "/validate-code/") {
      const code = url.searchParams.get("code");
      if (!code || !REFERRAL_CODE_RE.test(code)) {
        return errorResponse("Valid code parameter required", 400);
      }

      const { data, error } = await supabase.rpc("get_affiliate_by_code", {
        p_referral_code: code.trim(),
      });

      if (error) throw error;

      const affiliateData = data?.[0] || null;
      return successResponse({
        isValid: !!affiliateData && affiliateData.is_active,
        affiliate: affiliateData ? {
          wallet: affiliateData.wallet_address,
          tier: affiliateData.tier,
          commissionRate: affiliateData.commission_rate,
        } : null,
      });
    }

    return errorResponse("Not found", 404);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
