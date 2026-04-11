import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/age-verification", "");

    if (req.method === "GET" && (path === "/check" || path === "")) {
      const wallet = url.searchParams.get("wallet_address");
      if (!wallet || !SOLANA_ADDR_RE.test(wallet)) {
        return errorResponse("Valid wallet_address required", 400);
      }

      const { data: verification } = await supabase
        .from("age_verifications")
        .select("id, wallet_address, verified_at")
        .eq("wallet_address", wallet.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: user } = await supabase
        .from("users")
        .select("age_verified")
        .eq("wallet_address", wallet.trim())
        .maybeSingle();

      return jsonResponse({
        wallet_address: wallet,
        is_verified: !!(verification || user?.age_verified),
        verified_at: verification?.verified_at || null,
      });
    }

    if (req.method === "POST" && path === "/sign") {
      const body = await req.json();
      const { wallet_address, signature, message_signed } = body;

      if (!wallet_address || !SOLANA_ADDR_RE.test(wallet_address)) {
        return errorResponse("Valid wallet_address required", 400);
      }
      if (!signature || typeof signature !== "string" || signature.length < 10) {
        return errorResponse("Valid signature required", 400);
      }
      if (!message_signed || typeof message_signed !== "string") {
        return errorResponse("message_signed required", 400);
      }

      const { data: existing } = await supabase
        .from("age_verifications")
        .select("id")
        .eq("wallet_address", wallet_address.trim())
        .maybeSingle();

      if (existing) {
        return jsonResponse({
          success: true,
          already_verified: true,
          wallet_address,
        });
      }

      const { error: insertError } = await supabase
        .from("age_verifications")
        .insert({
          wallet_address: wallet_address.trim(),
          signature,
          message_signed,
          verified_at: new Date().toISOString(),
          user_agent: req.headers.get("user-agent") || null,
        });

      if (insertError) return errorResponse(insertError.message, 500);

      await supabase
        .from("users")
        .update({ age_verified: true })
        .eq("wallet_address", wallet_address.trim());

      return jsonResponse({
        success: true,
        already_verified: false,
        wallet_address,
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
});
