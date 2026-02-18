import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
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

async function submitApplication(req: Request) {
  const body = await req.json();
  const { wallet_address, full_name, email, country, social_media, marketing_experience, marketing_strategy } = body;

  if (!wallet_address || !full_name || !email) {
    throw new Error("Missing required fields: wallet_address, full_name, email");
  }

  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("affiliate_applications")
    .select("id")
    .eq("wallet_address", wallet_address)
    .maybeSingle();

  if (existing) {
    throw new Error("You have already submitted an application");
  }

  const { data, error } = await supabase
    .from("affiliate_applications")
    .insert({
      wallet_address,
      full_name,
      email,
      country: country || null,
      social_media: social_media || null,
      marketing_experience: marketing_experience || null,
      marketing_strategy: marketing_strategy || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getMyApplication(walletAddress: string) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("affiliate_applications")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listApplications(url: URL) {
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

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

async function updateApplicationStatus(applicationId: string, body: any) {
  const { status, admin_notes } = body;

  if (!status) {
    throw new Error("Status is required");
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("affiliate_applications")
    .update({
      status,
      admin_notes: admin_notes || null,
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
      await supabase
        .from("affiliates")
        .upsert({
          wallet_address: app.wallet_address,
          tier: 1,
          commission_rate: 0.05,
          is_active: true,
        }, { onConflict: "wallet_address" });
    }
  }

  return data;
}

async function deleteApplication(applicationId: string) {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("affiliate_applications")
    .delete()
    .eq("id", applicationId);

  if (error) throw error;
  return { success: true };
}

async function getAffiliateStats(walletAddress: string) {
  const supabase = getServiceClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (!affiliate) {
    return { is_affiliate: false };
  }

  const { data: earnings } = await supabase
    .from("solana_affiliate_earnings")
    .select("*")
    .eq("affiliate_wallet", walletAddress)
    .order("created_at", { ascending: false });

  const totalEarnings = (earnings || []).reduce((sum, e) => sum + (e.commission_amount || 0), 0);
  const pendingEarnings = (earnings || [])
    .filter(e => e.status === "pending")
    .reduce((sum, e) => sum + (e.commission_amount || 0), 0);

  return {
    is_affiliate: true,
    affiliate,
    stats: {
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings,
      total_referrals: earnings?.length || 0,
    },
    recent_earnings: earnings?.slice(0, 10) || [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathMatch = url.pathname.match(/\/affiliates(\/.*)?$/);
    const path = pathMatch ? (pathMatch[1] || "") : "";

    let result: any;

    if (req.method === "POST" && (path === "/submit" || path === "" || path === "/")) {
      result = await submitApplication(req);
    } else if (req.method === "GET" && path === "/my-application") {
      const wallet = url.searchParams.get("wallet");
      if (!wallet) throw new Error("Wallet address required");
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
      if (!wallet) throw new Error("Wallet address required");
      result = await getAffiliateStats(wallet);
    } else {
      throw new Error("Not found");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Not found" ? 404 : 400;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});