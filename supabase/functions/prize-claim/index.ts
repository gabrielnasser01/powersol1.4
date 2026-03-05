import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "npm:@solana/web3.js@1.98.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_RPC_URL =
  Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";

const LOTTERY_WALLET_SECRETS: Record<string, string> = {
  "tri-daily": "LOTTERY_TRI_DAILY_PRIVATE_KEY",
  weekly: "LOTTERY_WEEKLY_PRIVATE_KEY",
  jackpot: "LOTTERY_WEEKLY_PRIVATE_KEY",
  "grand-prize": "LOTTERY_GRAND_PRIZE_PRIVATE_KEY",
  "special-event": "SPECIAL_EVENT_PRIVATE_KEY",
};

const LOTTERY_WALLET_ADDRESSES: Record<string, string> = {
  "tri-daily": "4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx",
  weekly: "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
  jackpot: "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
  "grand-prize": "nTMcPkR8eYJFFy4Gcdk6wZcRphj5VFxK4CpviA2Qi9C",
  "special-event": "AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk",
};

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

async function handlePreparePrizeClaim(
  prizeId: string,
  walletAddress: string
) {
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
  const amountLamports = prize.prize_amount_lamports;

  const senderBalance = await connection.getBalance(senderKeypair.publicKey);
  if (senderBalance < amountLamports) {
    console.error(
      `Insufficient balance in ${lotteryType} wallet. Has: ${senderBalance}, needs: ${amountLamports}`
    );
    return errorResponse(
      "Prize pool wallet has insufficient balance. Please contact support.",
      503
    );
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: recipientPubkey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports: amountLamports,
    })
  );

  transaction.partialSign(senderKeypair);

  const serializedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  return successResponse({
    serialized_tx: serializedTx,
    amount_lamports: amountLamports,
    amount_sol: amountLamports / 1_000_000_000,
    prize_id: prizeId,
  });
}

async function handleConfirmPrizeClaim(
  prizeId: string,
  signature: string
) {
  const supabase = getSupabaseClient();

  const { data: prize, error: prizeError } = await supabase
    .from("prizes")
    .select("id, claimed")
    .eq("id", prizeId)
    .maybeSingle();

  if (prizeError || !prize) {
    return errorResponse("Prize not found", 404);
  }

  if (prize.claimed) {
    return errorResponse("Prize already claimed");
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");

  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return errorResponse(
        "Transaction not found on chain. It may still be processing. Please try again in a few seconds.",
        404
      );
    }

    if (txInfo.meta?.err) {
      return errorResponse("Transaction failed on chain", 400);
    }
  } catch (verifyError: unknown) {
    console.error("Failed to verify transaction:", verifyError);
  }

  const { error: updateError } = await supabase.rpc("mark_prize_claimed", {
    p_winner_id: prizeId,
    p_tx_signature: signature,
  });

  if (updateError) {
    console.error("Failed to mark prize claimed in DB:", updateError);
    return errorResponse("Failed to update claim status", 500);
  }

  return successResponse({
    signature,
    explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });
}

async function handlePrepareAffiliateClaim(
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

  const secretName = "AFFILIATES_POOL_PRIVATE_KEY";
  const senderKeypair = getKeypairFromSecret(secretName);

  if (!senderKeypair) {
    return errorResponse(
      "Affiliate pool wallet not configured. Please contact support.",
      503
    );
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const recipientPubkey = new PublicKey(walletAddress);
  const amountLamports = week.pending_lamports;

  const senderBalance = await connection.getBalance(senderKeypair.publicKey);
  if (senderBalance < amountLamports) {
    return errorResponse(
      "Affiliate pool has insufficient balance. Please contact support.",
      503
    );
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: recipientPubkey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports: amountLamports,
    })
  );

  transaction.partialSign(senderKeypair);

  const serializedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  return successResponse({
    serialized_tx: serializedTx,
    amount_lamports: amountLamports,
    amount_sol: amountLamports / 1_000_000_000,
    week_number: weekNumber,
  });
}

async function handleConfirmAffiliateClaim(
  walletAddress: string,
  weekNumber: number,
  signature: string
) {
  const supabase = getSupabaseClient();

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");

  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return errorResponse(
        "Transaction not found on chain. It may still be processing. Please try again in a few seconds.",
        404
      );
    }

    if (txInfo.meta?.err) {
      return errorResponse("Transaction failed on chain", 400);
    }
  } catch (verifyError: unknown) {
    console.error("Failed to verify affiliate transaction:", verifyError);
  }

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
    return errorResponse("Failed to update claim status", 500);
  }

  return successResponse({
    signature,
    explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });
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

    if (path === "/prepare" || path === "/prize" || path === "" || path === "/") {
      const { prize_id, wallet_address } = body;
      if (!prize_id || !wallet_address) {
        return errorResponse("prize_id and wallet_address are required");
      }
      return await handlePreparePrizeClaim(prize_id, wallet_address);
    }

    if (path === "/confirm") {
      const { prize_id, signature } = body;
      if (!prize_id || !signature) {
        return errorResponse("prize_id and signature are required");
      }
      return await handleConfirmPrizeClaim(prize_id, signature);
    }

    if (path === "/affiliate/prepare") {
      const { wallet_address, week_number } = body;
      if (!wallet_address || week_number === undefined) {
        return errorResponse("wallet_address and week_number are required");
      }
      return await handlePrepareAffiliateClaim(wallet_address, week_number);
    }

    if (path === "/affiliate/confirm") {
      const { wallet_address, week_number, signature } = body;
      if (!wallet_address || week_number === undefined || !signature) {
        return errorResponse(
          "wallet_address, week_number, and signature are required"
        );
      }
      return await handleConfirmAffiliateClaim(
        wallet_address,
        week_number,
        signature
      );
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("prize-claim error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
