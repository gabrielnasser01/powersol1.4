import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "npm:@solana/web3.js@1.98.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_RPC_URL =
  Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";

const SOLANA_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

const LOTTERY_WALLET_SECRETS: Record<string, string> = {
  "tri-daily": "SOLANA_LOTTERY_TRI_DAILY_PRIVATE",
  weekly: "SOLANA_LOTTERY_WEEKLY_PRIVATE",
  jackpot: "SOLANA_LOTTERY_WEEKLY_PRIVATE",
  "grand-prize": "SOLANA_LOTTERY_MEGA_PRIVATE",
  "special-event": "SOLANA_SPECIAL_EVENT_PRIVATE",
};

const LOTTERY_WALLET_ADDRESSES: Record<string, string> = {
  "tri-daily": "4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx",
  weekly: "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
  jackpot: "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
  "grand-prize": "nTMcPkR8eYJFFy4Gcdk6wZcRphj5VFxK4CpviA2Qi9C",
  "special-event": "AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk",
};

const ESTIMATED_FEE_LAMPORTS = 5000;

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getKeypairFromSecret(secretName: string): Keypair | null {
  const raw = Deno.env.get(secretName);
  if (!raw) return null;

  try {
    const cleaned = raw.replace(/'/g, "").trim();
    const arr = JSON.parse(cleaned);
    return Keypair.fromSecretKey(new Uint8Array(arr));
  } catch {
    return null;
  }
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function successResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleClaimPrize(prizeId: string, walletAddress: string) {
  const supabase = getSupabaseClient();

  const { data: prize, error: prizeError } = await supabase
    .from("prizes")
    .select("*")
    .eq("id", prizeId)
    .maybeSingle();

  if (prizeError || !prize) {
    return errorResponse("Prize not found", 404);
  }

  if (prize.claimed) {
    return errorResponse("Prize already claimed");
  }

  if (prize.expired) {
    return errorResponse("Prize has expired. Unclaimed prizes are forfeited and added to the next draw.");
  }

  if (prize.expires_at && new Date(prize.expires_at) <= new Date()) {
    return errorResponse("Prize claim deadline has passed. Unclaimed prizes are forfeited and added to the next draw.");
  }

  if (prize.user_wallet !== walletAddress) {
    return errorResponse("This prize belongs to a different wallet", 403);
  }

  if (prize.prize_amount_lamports <= 0) {
    return errorResponse("Invalid prize amount");
  }

  const lotteryType = prize.lottery_type as string;
  const secretName = LOTTERY_WALLET_SECRETS[lotteryType];

  if (!secretName) {
    return errorResponse(`Unknown lottery type: ${lotteryType}`);
  }

  const senderKeypair = getKeypairFromSecret(secretName);

  if (!senderKeypair) {
    const fallbackAddress = LOTTERY_WALLET_ADDRESSES[lotteryType];
    console.error(
      `Missing secret ${secretName} for lottery type ${lotteryType}. Expected wallet: ${fallbackAddress}`
    );
    return errorResponse(
      "Prize wallet not configured. Please contact support.",
      503
    );
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const recipientPubkey = new PublicKey(walletAddress);
  const grossLamports = prize.prize_amount_lamports;
  const netLamports = grossLamports - ESTIMATED_FEE_LAMPORTS;

  if (netLamports <= 0) {
    return errorResponse("Prize amount is too small to cover network fees");
  }

  const senderBalance = await connection.getBalance(senderKeypair.publicKey);
  if (senderBalance < grossLamports) {
    console.error(
      `Insufficient balance in ${lotteryType} wallet. Has: ${senderBalance}, needs: ${grossLamports}`
    );
    return errorResponse(
      "Prize pool wallet has insufficient balance. Please contact support.",
      503
    );
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports: netLamports,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair],
      { commitment: "confirmed" }
    );

    const { error: updateError } = await supabase.rpc("mark_prize_claimed", {
      p_winner_id: prizeId,
      p_tx_signature: signature,
    });

    if (updateError) {
      console.error("Failed to mark prize claimed in DB:", updateError);
      return successResponse({
        signature,
        amount_lamports: netLamports,
        amount_sol: netLamports / 1_000_000_000,
        fee_lamports: ESTIMATED_FEE_LAMPORTS,
        explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        warning:
          "SOL sent but failed to update database. Contact support with your transaction signature.",
      });
    }

    return successResponse({
      signature,
      amount_lamports: netLamports,
      amount_sol: netLamports / 1_000_000_000,
      fee_lamports: ESTIMATED_FEE_LAMPORTS,
      explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (txError: unknown) {
    const msg = txError instanceof Error ? txError.message : "Transaction failed";
    console.error("Prize claim transaction failed:", msg);
    return errorResponse("Transaction failed. Please try again.", 500);
  }
}

async function handleClaimAffiliate(
  walletAddress: string,
  weekNumber: number
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc(
    "get_claimable_affiliate_balance_v2",
    { p_wallet: walletAddress }
  );

  if (error || !data) {
    return errorResponse("Failed to fetch claimable rewards");
  }

  const week = data.find(
    (w: {
      week_number: number;
      is_available: boolean;
      pending_lamports: number;
    }) =>
      w.week_number === weekNumber && w.is_available && w.pending_lamports > 0
  );

  if (!week) {
    return errorResponse("No claimable rewards for this week");
  }

  const secretName = "SOLANA_AFFILIATES_POOL_PRIVATE";
  const senderKeypair = getKeypairFromSecret(secretName);

  if (!senderKeypair) {
    return errorResponse(
      "Affiliate pool wallet not configured. Please contact support.",
      503
    );
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const recipientPubkey = new PublicKey(walletAddress);
  const grossLamports = week.pending_lamports;
  const netLamports = grossLamports - ESTIMATED_FEE_LAMPORTS;

  if (netLamports <= 0) {
    return errorResponse("Reward amount is too small to cover network fees");
  }

  const senderBalance = await connection.getBalance(senderKeypair.publicKey);
  if (senderBalance < grossLamports) {
    return errorResponse(
      "Affiliate pool has insufficient balance. Please contact support.",
      503
    );
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports: netLamports,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair],
      { commitment: "confirmed" }
    );

    const { error: claimError } = await supabase.rpc(
      "process_affiliate_claim_v2",
      {
        p_wallet: walletAddress,
        p_week_number: weekNumber,
        p_tx_signature: signature,
      }
    );

    if (claimError) {
      console.error("Failed to mark affiliate claim in DB:", claimError);
      return successResponse({
        signature,
        amount_lamports: netLamports,
        amount_sol: netLamports / 1_000_000_000,
        fee_lamports: ESTIMATED_FEE_LAMPORTS,
        week_number: weekNumber,
        explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        warning:
          "SOL sent but failed to update database. Contact support with your transaction signature.",
      });
    }

    return successResponse({
      signature,
      amount_lamports: netLamports,
      amount_sol: netLamports / 1_000_000_000,
      fee_lamports: ESTIMATED_FEE_LAMPORTS,
      week_number: weekNumber,
      explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (txError: unknown) {
    const msg = txError instanceof Error ? txError.message : "Transaction failed";
    console.error("Affiliate claim transaction failed:", msg);
    return errorResponse("Transaction failed. Please try again.", 500);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathMatch = url.pathname.match(/\/prize-claim(\/.*)?$/);
    const path = pathMatch ? pathMatch[1] || "" : "";

    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const body = await req.json();

    if (
      path === "/claim" ||
      path === "/prepare" ||
      path === "/prize" ||
      path === "" ||
      path === "/"
    ) {
      const { prize_id, wallet_address } = body;
      if (!prize_id || !wallet_address) {
        return errorResponse("prize_id and wallet_address are required");
      }
      if (!SOLANA_ADDR_RE.test(wallet_address.trim())) {
        return errorResponse("Invalid wallet address");
      }
      if (typeof prize_id === "string" && !UUID_RE.test(prize_id)) {
        return errorResponse("Invalid prize_id format");
      }
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      if (!checkRateLimit(`prize:${wallet_address}:${clientIp}`, 3, 60000)) {
        return errorResponse("Too many claim attempts. Try again later.", 429);
      }
      return await handleClaimPrize(prize_id, wallet_address.trim());
    }

    if (path === "/confirm") {
      return successResponse({
        message: "Direct claim is now used. No separate confirm step needed.",
      });
    }

    if (path === "/affiliate/claim" || path === "/affiliate/prepare") {
      const { wallet_address, week_number } = body;
      if (!wallet_address || week_number === undefined) {
        return errorResponse("wallet_address and week_number are required");
      }
      if (!SOLANA_ADDR_RE.test(wallet_address.trim())) {
        return errorResponse("Invalid wallet address");
      }
      if (typeof week_number !== "number" || week_number < 0 || !Number.isInteger(week_number)) {
        return errorResponse("Invalid week_number");
      }
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      if (!checkRateLimit(`aff:${wallet_address}:${clientIp}`, 3, 60000)) {
        return errorResponse("Too many claim attempts. Try again later.", 429);
      }
      return await handleClaimAffiliate(wallet_address.trim(), week_number);
    }

    if (path === "/affiliate/confirm") {
      return successResponse({
        message: "Direct claim is now used. No separate confirm step needed.",
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    console.error("prize-claim error:", err instanceof Error ? err.message : "Unknown");
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
