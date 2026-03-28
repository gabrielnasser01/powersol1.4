import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
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

const CLAIM_PROGRAM_ID = new PublicKey(
  "DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK"
);

const LOTTERY_TYPE_MAP: Record<string, number> = {
  "tri-daily": 0,
  weekly: 0,
  jackpot: 1,
  "grand-prize": 2,
  "special-event": 3,
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

function derivePrizeVaultPDA(lotteryTypeNum: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prize_vault"), Buffer.from([lotteryTypeNum])],
    CLAIM_PROGRAM_ID
  );
}

function deriveVaultSolPDA(
  lotteryTypeNum: number,
  prizeVaultKey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_sol"),
      Buffer.from([lotteryTypeNum]),
      prizeVaultKey.toBuffer(),
    ],
    CLAIM_PROGRAM_ID
  );
}

function deriveWinnerRecordPDA(
  prizeVaultKey: PublicKey,
  winnerKey: PublicKey,
  lotteryRound: number,
  tier: number
): [PublicKey, number] {
  const roundBuffer = Buffer.alloc(8);
  roundBuffer.writeBigUInt64LE(BigInt(lotteryRound));
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("winner"),
      prizeVaultKey.toBuffer(),
      winnerKey.toBuffer(),
      roundBuffer,
      Buffer.from([tier]),
    ],
    CLAIM_PROGRAM_ID
  );
}

function buildClaimLotteryPrizeIx(
  claimer: PublicKey,
  prizeVaultKey: PublicKey,
  prizeVaultPda: PublicKey,
  winnerRecordKey: PublicKey
): TransactionInstruction {
  const discriminator = Buffer.from([
    0x9b, 0x28, 0x27, 0xa5, 0x32, 0x7b, 0xae, 0xf1,
  ]);

  return new TransactionInstruction({
    programId: CLAIM_PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: prizeVaultKey, isSigner: false, isWritable: true },
      { pubkey: prizeVaultPda, isSigner: false, isWritable: true },
      { pubkey: winnerRecordKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });
}

async function handlePrepareClaim(prizeId: string, walletAddress: string) {
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
    return errorResponse(
      "Prize has expired. Unclaimed prizes are forfeited and added to the next draw."
    );
  }

  if (prize.expires_at && new Date(prize.expires_at) <= new Date()) {
    return errorResponse(
      "Prize claim deadline has passed. Unclaimed prizes are forfeited and added to the next draw."
    );
  }

  if (prize.user_wallet !== walletAddress) {
    return errorResponse("This prize belongs to a different wallet", 403);
  }

  if (prize.prize_amount_lamports <= 0) {
    return errorResponse("Invalid prize amount");
  }

  const lotteryType = prize.lottery_type as string;
  const typeNum = LOTTERY_TYPE_MAP[lotteryType];
  if (typeNum === undefined) {
    return errorResponse(`Unknown lottery type: ${lotteryType}`);
  }

  const tierMatch = prize.prize_position?.match(/Tier\s+(\d+)/i);
  const tier = tierMatch ? parseInt(tierMatch[1]) : 1;
  const round = prize.round;

  const claimerKey = new PublicKey(walletAddress);
  const [prizeVaultKey] = derivePrizeVaultPDA(typeNum);
  const [vaultSolKey] = deriveVaultSolPDA(typeNum, prizeVaultKey);
  const [winnerRecordKey] = deriveWinnerRecordPDA(
    prizeVaultKey,
    claimerKey,
    round,
    tier
  );

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const ix = buildClaimLotteryPrizeIx(
    claimerKey,
    prizeVaultKey,
    vaultSolKey,
    winnerRecordKey
  );

  const transaction = new Transaction({
    feePayer: claimerKey,
    blockhash,
    lastValidBlockHeight,
  }).add(ix);

  const serialized = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  return successResponse({
    transaction: serialized,
    prize_id: prizeId,
    amount_lamports: prize.prize_amount_lamports,
    amount_sol: prize.prize_amount_lamports / 1_000_000_000,
    lottery_type: lotteryType,
    round,
    tier,
    vault_address: vaultSolKey.toBase58(),
    winner_record: winnerRecordKey.toBase58(),
  });
}

async function handleConfirmClaim(
  prizeId: string,
  walletAddress: string,
  signature: string
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

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return errorResponse("Transaction not found on-chain. Wait and retry.");
    }

    if (txInfo.meta?.err) {
      return errorResponse("Transaction failed on-chain");
    }
  } catch {
    return errorResponse("Failed to verify transaction on-chain");
  }

  const { error: updateError } = await supabase.rpc("mark_prize_claimed", {
    p_winner_id: prizeId,
    p_tx_signature: signature,
  });

  if (updateError) {
    console.error("Failed to mark prize claimed in DB:", updateError);
    return successResponse({
      signature,
      warning:
        "Transaction confirmed but DB update failed. Contact support with your signature.",
    });
  }

  return successResponse({
    signature,
    amount_lamports: prize.prize_amount_lamports,
    amount_sol: prize.prize_amount_lamports / 1_000_000_000,
    explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });
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
      w.week_number === weekNumber &&
      w.is_available &&
      w.pending_lamports > 0
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
    return errorResponse(
      "Reward amount is too small to cover network fees"
    );
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
      console.error(
        "Failed to mark affiliate claim in DB:",
        claimError
      );
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
    const msg =
      txError instanceof Error ? txError.message : "Transaction failed";
    console.error("Affiliate claim transaction failed:", msg);
    return errorResponse(`Transaction failed: ${msg}`, 500);
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
      return await handlePrepareClaim(prize_id, wallet_address);
    }

    if (path === "/confirm") {
      const { prize_id, wallet_address, signature } = body;
      if (!prize_id || !wallet_address || !signature) {
        return errorResponse(
          "prize_id, wallet_address, and signature are required"
        );
      }
      return await handleConfirmClaim(prize_id, wallet_address, signature);
    }

    if (path === "/affiliate/claim" || path === "/affiliate/prepare") {
      const { wallet_address, week_number } = body;
      if (!wallet_address || week_number === undefined) {
        return errorResponse(
          "wallet_address and week_number are required"
        );
      }
      return await handleClaimAffiliate(wallet_address, week_number);
    }

    if (path === "/affiliate/confirm") {
      return successResponse({
        message:
          "Direct claim is now used. No separate confirm step needed.",
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("prize-claim error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
