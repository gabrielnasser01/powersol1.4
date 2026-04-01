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

const OFAC_SDN_CSV_URL =
  "https://www.treasury.gov/ofac/downloads/sdn.csv";

let cachedSdnAddresses: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

async function fetchOfacAddresses(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedSdnAddresses && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSdnAddresses;
  }

  const addresses = new Set<string>();

  try {
    const resp = await fetch(OFAC_SDN_CSV_URL, {
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) {
      const text = await resp.text();
      const solanaRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
      const lines = text.split("\n");
      for (const line of lines) {
        if (
          line.toLowerCase().includes("digital currency") ||
          line.toLowerCase().includes("virtual currency") ||
          line.toLowerCase().includes("crypto") ||
          line.toLowerCase().includes("sol") ||
          line.toLowerCase().includes("solana")
        ) {
          const matches = line.match(solanaRegex);
          if (matches) {
            for (const m of matches) {
              addresses.add(m);
            }
          }
        }
      }
    }
  } catch {
    // fallback to known addresses only
  }

  const knownOfacSolana = [
    "GqfLbPF1SzEuKbq5ExMhRDnRJoJTtHFMR5xByxfnRc6L",
    "4wJT7Clc3Mxy6MR3S3DV9z9qydrYHPRVPZCnFhsrRUjx",
    "FihstCyELhRSUPcWjuSL8TSiisnRMMDFxgvbJjYjsBkK",
  ];
  for (const addr of knownOfacSolana) {
    addresses.add(addr);
  }

  cachedSdnAddresses = addresses;
  cacheTimestamp = now;

  return addresses;
}

async function checkWalletAgainstOfac(
  walletAddress: string
): Promise<{ isSanctioned: boolean; source: string; matchedAddress?: string }> {
  const ofacAddresses = await fetchOfacAddresses();

  if (ofacAddresses.has(walletAddress)) {
    return {
      isSanctioned: true,
      source: "ofac_sdn",
      matchedAddress: walletAddress,
    };
  }

  return { isSanctioned: false, source: "ofac_sdn" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "check-age-verification") {
      const walletAddress = url.searchParams.get("wallet");
      if (!walletAddress) return errorResponse("Missing wallet", 400);

      const { data } = await supabase
        .from("compliance_age_verifications")
        .select("id, wallet_address, verified_at, is_valid")
        .eq("wallet_address", walletAddress)
        .eq("is_valid", true)
        .maybeSingle();

      return jsonResponse({ verified: !!data, data });
    }

    if (action === "submit-age-verification") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { wallet_address, signature, message_signed } = body;

      if (!wallet_address || !signature || !message_signed) {
        return errorResponse("Missing required fields", 400);
      }

      const { data: existing } = await supabase
        .from("compliance_age_verifications")
        .select("id")
        .eq("wallet_address", wallet_address)
        .eq("is_valid", true)
        .maybeSingle();

      if (existing) {
        return jsonResponse({ success: true, already_verified: true });
      }

      const { error: insertError } = await supabase
        .from("compliance_age_verifications")
        .upsert(
          {
            wallet_address,
            signature,
            message_signed,
            verified_at: new Date().toISOString(),
            is_valid: true,
          },
          { onConflict: "wallet_address" }
        );

      if (insertError) return errorResponse(insertError.message, 500);

      await supabase.from("compliance_audit_log").insert({
        wallet_address,
        action: "age_verification_submitted",
        details: { message_signed },
      });

      return jsonResponse({ success: true, already_verified: false });
    }

    if (action === "check-wallet-risk") {
      const walletAddress = url.searchParams.get("wallet");
      if (!walletAddress) return errorResponse("Missing wallet", 400);

      const { data: blocked } = await supabase
        .from("compliance_blocked_wallets")
        .select("id, reason, source")
        .eq("wallet_address", walletAddress)
        .eq("is_active", true)
        .maybeSingle();

      if (blocked) {
        return jsonResponse({
          allowed: false,
          risk_level: "sanctioned",
          reason: blocked.reason,
          source: blocked.source,
        });
      }

      const { data: recentCheck } = await supabase
        .from("compliance_wallet_checks")
        .select("*")
        .eq("wallet_address", walletAddress)
        .gt("expires_at", new Date().toISOString())
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentCheck) {
        return jsonResponse({
          allowed: !recentCheck.is_sanctioned,
          risk_level: recentCheck.risk_level,
          cached: true,
          checked_at: recentCheck.checked_at,
          expires_at: recentCheck.expires_at,
        });
      }

      const ofacResult = await checkWalletAgainstOfac(walletAddress);
      const riskLevel = ofacResult.isSanctioned ? "sanctioned" : "clear";

      await supabase.from("compliance_wallet_checks").insert({
        wallet_address: walletAddress,
        check_type: "ofac_sdn",
        risk_level: riskLevel,
        is_sanctioned: ofacResult.isSanctioned,
        details: ofacResult,
        checked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (ofacResult.isSanctioned) {
        await supabase.from("compliance_blocked_wallets").upsert(
          {
            wallet_address: walletAddress,
            reason: "OFAC SDN sanctioned address",
            blocked_by: "system",
            source: "ofac",
            is_active: true,
          },
          { onConflict: "wallet_address" }
        );

        await supabase.from("compliance_audit_log").insert({
          wallet_address: walletAddress,
          action: "wallet_sanctioned_auto_block",
          details: ofacResult,
        });
      }

      await supabase.from("compliance_audit_log").insert({
        wallet_address: walletAddress,
        action: "wallet_risk_check",
        details: { risk_level: riskLevel, source: ofacResult.source },
      });

      return jsonResponse({
        allowed: !ofacResult.isSanctioned,
        risk_level: riskLevel,
        cached: false,
        checked_at: new Date().toISOString(),
      });
    }

    if (action === "compliance-status") {
      const walletAddress = url.searchParams.get("wallet");
      if (!walletAddress) return errorResponse("Missing wallet", 400);

      const [ageResult, riskResult, blockedResult] = await Promise.all([
        supabase
          .from("compliance_age_verifications")
          .select("id, verified_at, is_valid")
          .eq("wallet_address", walletAddress)
          .eq("is_valid", true)
          .maybeSingle(),
        supabase
          .from("compliance_wallet_checks")
          .select("risk_level, is_sanctioned, checked_at, expires_at")
          .eq("wallet_address", walletAddress)
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("compliance_blocked_wallets")
          .select("reason, source")
          .eq("wallet_address", walletAddress)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      return jsonResponse({
        age_verified: !!ageResult.data,
        age_verified_at: ageResult.data?.verified_at || null,
        risk_level: riskResult.data?.risk_level || "unchecked",
        is_sanctioned: riskResult.data?.is_sanctioned || false,
        risk_checked_at: riskResult.data?.checked_at || null,
        risk_expires_at: riskResult.data?.expires_at || null,
        is_blocked: !!blockedResult.data,
        block_reason: blockedResult.data?.reason || null,
        block_source: blockedResult.data?.source || null,
      });
    }

    const adminWallet = url.searchParams.get("wallet");
    if (!adminWallet || !ADMIN_WALLETS.includes(adminWallet)) {
      return errorResponse("Unauthorized", 403);
    }

    if (action === "admin-overview") {
      const [
        { count: totalVerified },
        { count: totalChecks },
        { count: totalBlocked },
        { data: recentAudit },
        { data: recentBlocked },
        { data: riskBreakdown },
      ] = await Promise.all([
        supabase
          .from("compliance_age_verifications")
          .select("*", { count: "exact", head: true })
          .eq("is_valid", true),
        supabase
          .from("compliance_wallet_checks")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("compliance_blocked_wallets")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("compliance_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("compliance_blocked_wallets")
          .select("*")
          .eq("is_active", true)
          .order("blocked_at", { ascending: false }),
        supabase
          .from("compliance_wallet_checks")
          .select("risk_level"),
      ]);

      const breakdown: Record<string, number> = {};
      (riskBreakdown || []).forEach((r: any) => {
        breakdown[r.risk_level] = (breakdown[r.risk_level] || 0) + 1;
      });

      return jsonResponse({
        total_age_verified: totalVerified || 0,
        total_wallet_checks: totalChecks || 0,
        total_blocked: totalBlocked || 0,
        risk_breakdown: breakdown,
        recent_audit: recentAudit || [],
        blocked_wallets: recentBlocked || [],
      });
    }

    if (action === "admin-verifications") {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 50;
      const offset = (page - 1) * limit;

      const { data, count } = await supabase
        .from("compliance_age_verifications")
        .select("*", { count: "exact" })
        .order("verified_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return jsonResponse({ data: data || [], total: count || 0, page });
    }

    if (action === "admin-wallet-checks") {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = 50;
      const offset = (page - 1) * limit;

      const { data, count } = await supabase
        .from("compliance_wallet_checks")
        .select("*", { count: "exact" })
        .order("checked_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return jsonResponse({ data: data || [], total: count || 0, page });
    }

    if (action === "admin-block-wallet") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { target_wallet, reason } = body;
      if (!target_wallet) return errorResponse("Missing target_wallet", 400);

      await supabase.from("compliance_blocked_wallets").upsert(
        {
          wallet_address: target_wallet,
          reason: reason || "Manually blocked by admin",
          blocked_by: adminWallet,
          source: "manual",
          is_active: true,
          blocked_at: new Date().toISOString(),
          unblocked_at: null,
        },
        { onConflict: "wallet_address" }
      );

      await supabase.from("compliance_audit_log").insert({
        wallet_address: target_wallet,
        action: "admin_block_wallet",
        performed_by: adminWallet,
        details: { reason },
      });

      return jsonResponse({ success: true });
    }

    if (action === "admin-unblock-wallet") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { target_wallet } = body;
      if (!target_wallet) return errorResponse("Missing target_wallet", 400);

      await supabase
        .from("compliance_blocked_wallets")
        .update({
          is_active: false,
          unblocked_at: new Date().toISOString(),
        })
        .eq("wallet_address", target_wallet)
        .eq("is_active", true);

      await supabase.from("compliance_audit_log").insert({
        wallet_address: target_wallet,
        action: "admin_unblock_wallet",
        performed_by: adminWallet,
      });

      return jsonResponse({ success: true });
    }

    if (action === "admin-revoke-age") {
      if (req.method !== "POST") return errorResponse("Method not allowed", 405);
      const body = await req.json();
      const { target_wallet, reason } = body;
      if (!target_wallet) return errorResponse("Missing target_wallet", 400);

      await supabase
        .from("compliance_age_verifications")
        .update({
          is_valid: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason || "Revoked by admin",
        })
        .eq("wallet_address", target_wallet);

      await supabase.from("compliance_audit_log").insert({
        wallet_address: target_wallet,
        action: "admin_revoke_age_verification",
        performed_by: adminWallet,
        details: { reason },
      });

      return jsonResponse({ success: true });
    }

    if (action === "admin-audit-log") {
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const targetWallet = url.searchParams.get("target_wallet");
      const limit = 100;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("compliance_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (targetWallet) {
        query = query.eq("wallet_address", targetWallet);
      }

      const { data, count } = await query;
      return jsonResponse({ data: data || [], total: count || 0, page });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
});
