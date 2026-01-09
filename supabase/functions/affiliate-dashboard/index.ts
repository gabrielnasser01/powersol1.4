import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/affiliate-dashboard", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (path === "/stats" || path === "/stats/") {
      const walletAddress = url.searchParams.get("wallet");
      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "wallet parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("get_affiliate_dashboard_stats", {
        p_wallet: walletAddress,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/ranking" || path === "/ranking/") {
      const limit = parseInt(url.searchParams.get("limit") || "10");

      const { data, error } = await supabase.rpc("get_top_affiliates_ranking", {
        p_limit: limit,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/history" || path === "/history/") {
      const walletAddress = url.searchParams.get("wallet");
      const weeks = parseInt(url.searchParams.get("weeks") || "8");

      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "wallet parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("get_affiliate_weekly_history", {
        p_wallet: walletAddress,
        p_weeks: weeks,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/top-referrals" || path === "/top-referrals/") {
      const walletAddress = url.searchParams.get("wallet");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "wallet parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("get_affiliate_top_referrals", {
        p_wallet: walletAddress,
        p_limit: limit,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/application-status" || path === "/application-status/") {
      const walletAddress = url.searchParams.get("wallet");

      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "wallet parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("affiliate_applications")
        .select("status, created_at")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            hasApplied: !!data,
            status: data?.status || null,
            appliedAt: data?.created_at || null,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((path === "/track" || path === "/track/") && req.method === "POST") {
      const body = await req.json();
      const { wallet, referral_code } = body;

      if (!wallet || !referral_code) {
        return new Response(
          JSON.stringify({ error: "wallet and referral_code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("track_referral_visit", {
        p_referred_wallet: wallet,
        p_referral_code: referral_code,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((path === "/commission" || path === "/commission/") && req.method === "POST") {
      const body = await req.json();
      const { buyer_wallet, ticket_price_lamports, lottery_id } = body;

      if (!buyer_wallet || !ticket_price_lamports) {
        return new Response(
          JSON.stringify({ error: "buyer_wallet and ticket_price_lamports are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("process_affiliate_commission", {
        p_buyer_wallet: buyer_wallet,
        p_ticket_price_lamports: ticket_price_lamports,
        p_lottery_id: lottery_id || null,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/referral-info" || path === "/referral-info/") {
      const walletAddress = url.searchParams.get("wallet");

      if (!walletAddress) {
        return new Response(
          JSON.stringify({ error: "wallet parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("get_user_referral_info", {
        p_wallet: walletAddress,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (path === "/validate-code" || path === "/validate-code/") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response(
          JSON.stringify({ error: "code parameter required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc("get_affiliate_by_code", {
        p_referral_code: code,
      });

      if (error) throw error;

      const affiliateData = data?.[0] || null;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            isValid: !!affiliateData && affiliateData.is_active,
            affiliate: affiliateData ? {
              wallet: affiliateData.wallet_address,
              tier: affiliateData.tier,
              commissionRate: affiliateData.commission_rate,
            } : null,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Not found", 
        availableEndpoints: [
          "GET /stats?wallet=...",
          "GET /ranking?limit=...",
          "GET /history?wallet=...&weeks=...",
          "GET /top-referrals?wallet=...&limit=...",
          "GET /application-status?wallet=...",
          "GET /referral-info?wallet=...",
          "GET /validate-code?code=...",
          "POST /track {wallet, referral_code}",
          "POST /commission {buyer_wallet, ticket_price_lamports, lottery_id?}"
        ] 
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
