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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOLANA_RPC_URL = Deno.env.get("SOLANA_RPC_URL") || "https://api.devnet.solana.com";
const AFFILIATES_POOL_PUBLIC = "8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf";
const DELTA_WALLET_PUBLIC = "2GqAmrgsyvkE7Y4uMZgn9iBJatDR6xPRvRsW21x5iyEU";

const LOTTERY_WALLETS: Record<string, string> = {
  "tri-daily": "4mwjVADtywLK9yRjiiuAynuJS3xJBK2Mdz9u6t1nmZjx",
  "weekly": "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
  "jackpot": "EXdNbkayPpUCGFd3Mk1HKHn1wTkYxD2zGLm29cKQi133",
  "grand-prize": "nTMcPkR8eYJFFy4Gcdk6wZcRphj5VFxK4CpviA2Qi9C",
  "special-event": "AJw2Lfe59VNetaEE1YzvKajWCVXifvMp2DGBBZBCRmTk",
};

async function getWalletBalanceLamports(walletAddress: string): Promise<bigint> {
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [walletAddress],
      }),
    });
    const data = await response.json();
    return BigInt(data.result?.value || 0);
  } catch (error) {
    console.error(`Failed to fetch wallet balance for ${walletAddress}:`, error);
    return BigInt(0);
  }
}

interface LotteryConfig {
  type: string;
  winnersSelectionType: "PERCENTAGE" | "FIXED";
  totalWinnersPercentage?: number;
  totalWinnersFixed?: number;
  winnerTiers: {
    tierNumber: number;
    winnersPercentage?: number;
    winnersCount?: number;
    poolPercentage: number;
    description: string;
  }[];
  ticketPriceLamports: number;
  maxTickets: number;
}

const LOTTERY_CONFIGS: Record<string, LotteryConfig> = {
  "tri-daily": {
    type: "tri-daily",
    winnersSelectionType: "PERCENTAGE",
    totalWinnersPercentage: 5,
    winnerTiers: [
      { tierNumber: 1, winnersPercentage: 1, poolPercentage: 20, description: "Tier 1 - Grand Prize" },
      { tierNumber: 2, winnersPercentage: 2, poolPercentage: 10, description: "Tier 2 - Major Prize" },
      { tierNumber: 3, winnersPercentage: 6, poolPercentage: 12.5, description: "Tier 3 - Medium Prize" },
      { tierNumber: 4, winnersPercentage: 36, poolPercentage: 27.5, description: "Tier 4 - Small Prize" },
      { tierNumber: 5, winnersPercentage: 55, poolPercentage: 30, description: "Tier 5 - Mini Prize" },
    ],
    ticketPriceLamports: 100000000,
    maxTickets: 1000,
  },
  "weekly": {
    type: "weekly",
    winnersSelectionType: "PERCENTAGE",
    totalWinnersPercentage: 5,
    winnerTiers: [
      { tierNumber: 1, winnersPercentage: 1, poolPercentage: 20, description: "Tier 1 - Grand Prize" },
      { tierNumber: 2, winnersPercentage: 2, poolPercentage: 10, description: "Tier 2 - Major Prize" },
      { tierNumber: 3, winnersPercentage: 6, poolPercentage: 12.5, description: "Tier 3 - Medium Prize" },
      { tierNumber: 4, winnersPercentage: 36, poolPercentage: 27.5, description: "Tier 4 - Small Prize" },
      { tierNumber: 5, winnersPercentage: 55, poolPercentage: 30, description: "Tier 5 - Mini Prize" },
    ],
    ticketPriceLamports: 150000000,
    maxTickets: 2000,
  },
  "jackpot": {
    type: "jackpot",
    winnersSelectionType: "FIXED",
    totalWinnersFixed: 100,
    winnerTiers: [
      { tierNumber: 1, winnersCount: 1, poolPercentage: 20, description: "Tier 1 - Champion" },
      { tierNumber: 2, winnersCount: 2, poolPercentage: 10, description: "Tier 2 - Runners-up" },
      { tierNumber: 3, winnersCount: 6, poolPercentage: 12.5, description: "Tier 3 - Top 10" },
      { tierNumber: 4, winnersCount: 36, poolPercentage: 27.5, description: "Tier 4 - Top 50" },
      { tierNumber: 5, winnersCount: 55, poolPercentage: 30, description: "Tier 5 - Top 100" },
    ],
    ticketPriceLamports: 200000000,
    maxTickets: 5000,
  },
  "grand-prize": {
    type: "grand-prize",
    winnersSelectionType: "FIXED",
    totalWinnersFixed: 3,
    winnerTiers: [
      { tierNumber: 1, winnersCount: 1, poolPercentage: 50, description: "1st Place - Champion" },
      { tierNumber: 2, winnersCount: 1, poolPercentage: 30, description: "2nd Place - Runner-up" },
      { tierNumber: 3, winnersCount: 1, poolPercentage: 20, description: "3rd Place - Third" },
    ],
    ticketPriceLamports: 330000000,
    maxTickets: 10000,
  },
  "special-event": {
    type: "special-event",
    winnersSelectionType: "PERCENTAGE",
    totalWinnersPercentage: 5,
    winnerTiers: [
      { tierNumber: 1, winnersPercentage: 1, poolPercentage: 20, description: "Tier 1 - Grand Prize" },
      { tierNumber: 2, winnersPercentage: 2, poolPercentage: 10, description: "Tier 2 - Major Prize" },
      { tierNumber: 3, winnersPercentage: 6, poolPercentage: 12.5, description: "Tier 3 - Medium Prize" },
      { tierNumber: 4, winnersPercentage: 36, poolPercentage: 27.5, description: "Tier 4 - Small Prize" },
      { tierNumber: 5, winnersPercentage: 55, poolPercentage: 30, description: "Tier 5 - Mini Prize" },
    ],
    ticketPriceLamports: 200000000,
    maxTickets: 7500,
  },
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function generateHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateTotalWinners(config: LotteryConfig, totalTickets: number): number {
  if (config.winnersSelectionType === "PERCENTAGE") {
    return Math.max(1, Math.floor((totalTickets * (config.totalWinnersPercentage || 0)) / 100));
  }
  return Math.min(totalTickets, config.totalWinnersFixed || 0);
}

function calculateWinnersPerTier(
  config: LotteryConfig,
  totalWinners: number
): { tierNumber: number; winnersCount: number; poolPercentage: number; description: string }[] {
  const results: { tierNumber: number; winnersCount: number; poolPercentage: number; description: string }[] = [];
  let assignedWinners = 0;

  for (let i = 0; i < config.winnerTiers.length; i++) {
    const tier = config.winnerTiers[i];
    let winnersCount: number;

    if (config.winnersSelectionType === "PERCENTAGE") {
      winnersCount = Math.floor((totalWinners * (tier.winnersPercentage || 0)) / 100);
    } else {
      winnersCount = tier.winnersCount || 0;
    }

    if (i === config.winnerTiers.length - 1) {
      winnersCount = Math.max(0, totalWinners - assignedWinners);
    }

    winnersCount = Math.min(winnersCount, totalWinners - assignedWinners);

    if (winnersCount > 0) {
      results.push({
        tierNumber: tier.tierNumber,
        winnersCount,
        poolPercentage: tier.poolPercentage,
        description: tier.description,
      });
      assignedWinners += winnersCount;
    }
  }

  return results;
}

interface ExpandedTicket {
  wallet_address: string;
  ticket_number: number;
  purchase_id: string;
}

function expandPurchasesToTickets(purchases: any[]): ExpandedTicket[] {
  const tickets: ExpandedTicket[] = [];
  let ticketCounter = 1;

  for (const purchase of purchases) {
    const qty = purchase.quantity || 1;
    for (let i = 0; i < qty; i++) {
      tickets.push({
        wallet_address: purchase.wallet_address,
        ticket_number: ticketCounter,
        purchase_id: purchase.id,
      });
      ticketCounter++;
    }
  }

  return tickets;
}

async function sweepExpiredPrizes(supabase: any, lotteryType: string) {
  try {
    const { data, error } = await supabase.rpc("sweep_expired_prizes", {
      p_lottery_type: lotteryType,
    });

    if (error) {
      console.error("Sweep expired prizes error:", error);
      return { swept_count: 0, total_swept_lamports: 0 };
    }

    const result = data?.[0] || { swept_count: 0, total_swept_lamports: 0 };
    if (result.swept_count > 0) {
      console.log(
        `Swept ${result.swept_count} expired prizes for ${lotteryType}, total: ${result.total_swept_lamports} lamports`
      );
    }
    return result;
  } catch (err) {
    console.error("Sweep expired prizes exception:", err);
    return { swept_count: 0, total_swept_lamports: 0 };
  }
}

async function getNextDrawTimestampForType(supabase: any, lotteryType: string, currentLotteryId: number): Promise<string | null> {
  const { data } = await supabase
    .from("blockchain_lotteries")
    .select("draw_timestamp")
    .eq("lottery_type", lotteryType)
    .eq("is_drawn", false)
    .gt("lottery_id", currentLotteryId)
    .order("draw_timestamp", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.draw_timestamp) {
    return new Date(data.draw_timestamp * 1000).toISOString();
  }
  return null;
}

async function executeDraw(supabase: any, lottery: any) {
  const config = LOTTERY_CONFIGS[lottery.lottery_type];
  if (!config) {
    await supabase
      .from("blockchain_lotteries")
      .update({ is_drawn: true, winning_ticket: null })
      .eq("id", lottery.id);

    return {
      lottery_id: lottery.lottery_id,
      status: "skipped_unknown_type",
      lottery_type: lottery.lottery_type,
      winners: [],
    };
  }

  const expiredSweep = await sweepExpiredPrizes(supabase, lottery.lottery_type);

  const { data: purchases, error: purchasesError } = await supabase
    .from("ticket_purchases")
    .select("*")
    .eq("lottery_round_id", lottery.lottery_id)
    .eq("lottery_type", lottery.lottery_type)
    .eq("is_drawn", false);

  if (purchasesError) throw purchasesError;

  const { data: blockchainTickets, error: btError } = await supabase
    .from("blockchain_tickets")
    .select("*")
    .eq("lottery_id", lottery.lottery_id);

  if (btError) throw btError;

  const hasBlockchainTickets = blockchainTickets && blockchainTickets.length > 0;
  const hasPurchases = purchases && purchases.length > 0;

  if (!hasBlockchainTickets && !hasPurchases) {
    await supabase
      .from("blockchain_lotteries")
      .update({ is_drawn: true, winning_ticket: null })
      .eq("id", lottery.id);

    return { lottery_id: lottery.lottery_id, status: "no_tickets", winners: [] };
  }

  let allTickets: ExpandedTicket[] = [];

  if (hasBlockchainTickets) {
    for (const bt of blockchainTickets) {
      const { data: userData } = await supabase
        .from("blockchain_users")
        .select("wallet_address")
        .eq("id", bt.user_id)
        .maybeSingle();

      allTickets.push({
        wallet_address: userData?.wallet_address || `unknown_${bt.user_id}`,
        ticket_number: bt.ticket_number,
        purchase_id: `blockchain_${bt.id}`,
      });
    }
  }

  if (hasPurchases) {
    const purchaseTickets = expandPurchasesToTickets(purchases);
    const offset = allTickets.length;
    for (const pt of purchaseTickets) {
      allTickets.push({
        ...pt,
        ticket_number: pt.ticket_number + offset,
      });
    }
  }

  const totalTickets = allTickets.length;
  const walletAddress = LOTTERY_WALLETS[lottery.lottery_type];
  const prizePool = walletAddress
    ? await getWalletBalanceLamports(walletAddress)
    : BigInt(0);

  const totalWinners = calculateTotalWinners(config, totalTickets);
  const tiersWithWinners = calculateWinnersPerTier(config, totalWinners);

  const shuffledTickets = shuffleArray(allTickets);
  const winners: any[] = [];
  let ticketIndex = 0;

  for (const tier of tiersWithWinners) {
    const tierPool = (prizePool * BigInt(Math.floor(tier.poolPercentage * 100))) / BigInt(10000);
    const prizePerWinner = tier.winnersCount > 0 ? tierPool / BigInt(tier.winnersCount) : BigInt(0);

    for (let i = 0; i < tier.winnersCount && ticketIndex < shuffledTickets.length; i++) {
      const winningTicket = shuffledTickets[ticketIndex];
      ticketIndex++;

      winners.push({
        lottery_id: lottery.lottery_id,
        ticket_number: winningTicket.ticket_number,
        tier: tier.tierNumber,
        tier_description: tier.description,
        prize_lamports: prizePerWinner.toString(),
        wallet_address: winningTicket.wallet_address,
      });
    }
  }

  const drawTimestamp = new Date().toISOString();
  const round = lottery.lottery_id;
  const drawNonce = Date.now();

  const commitHash = await generateHash(
    `${lottery.lottery_id}:${lottery.lottery_type}:${drawNonce}:${totalTickets}:${prizePool.toString()}`
  );
  const seedHash = await generateHash(
    `${commitHash}:${drawTimestamp}:${winners.map((w) => w.ticket_number).join(",")}`
  );

  const winnersJson = winners.map((w, idx) => ({
    position: idx + 1,
    wallet: w.wallet_address,
    prize_lamports: Number(w.prize_lamports),
    tier: `Tier ${w.tier}`,
  }));

  const { data: drawRecord, error: drawError } = await supabase
    .from("solana_draws")
    .insert({
      round,
      draw_account: `draw_${lottery.lottery_id}_${drawNonce}`,
      winning_number: winners.length > 0 ? winners[0].ticket_number : 0,
      winner_wallet: winners.length > 0 ? winners[0].wallet_address : null,
      prize_lamports: Number(prizePool),
      transaction_signature: `auto_draw_${drawNonce}`,
      draw_timestamp: drawTimestamp,
      is_claimed: false,
      commit_hash: commitHash,
      seed_hash: seedHash,
      participants_count: totalTickets,
      lottery_type: lottery.lottery_type,
      winners_json: winnersJson,
    })
    .select()
    .single();

  if (drawError) {
    console.error("Draw record insert error:", drawError);
  }

  const prizeIds: string[] = [];
  for (const winner of winners) {
    const { data: prizeData, error: prizeError } = await supabase
      .from("prizes")
      .insert({
        draw_id: drawRecord?.id || null,
        round,
        user_wallet: winner.wallet_address,
        ticket_number: winner.ticket_number,
        prize_amount_lamports: Number(winner.prize_lamports),
        prize_position: `Tier ${winner.tier}`,
        lottery_type: lottery.lottery_type,
        draw_date: drawTimestamp,
        claimed: false,
        expired: false,
      })
      .select("id")
      .maybeSingle();

    if (prizeError) {
      console.error("Prize insert error:", prizeError);
    } else if (prizeData?.id) {
      prizeIds.push(prizeData.id);
    }
  }

  await supabase
    .from("blockchain_lotteries")
    .update({
      is_drawn: true,
      winning_ticket: winners.length > 0 ? winners[0].ticket_number : null,
      prize_pool: Number(prizePool),
    })
    .eq("id", lottery.id);

  if (hasPurchases) {
    const purchaseIds = purchases.map((p: any) => p.id);
    await supabase
      .from("ticket_purchases")
      .update({ is_drawn: true })
      .in("id", purchaseIds);
  }

  if (hasBlockchainTickets) {
    for (const winner of winners) {
      const matchingBt = blockchainTickets.find(
        (bt: any) => bt.ticket_number === winner.ticket_number
      );
      if (matchingBt) {
        await supabase
          .from("blockchain_tickets")
          .update({ is_winner: true })
          .eq("id", matchingBt.id);
      }
    }
  }

  if (winners.length > 0) {
    const uniqueWinnerWallets = [...new Set(winners.map((w) => w.wallet_address))];
    const baseUrl = Deno.env.get("SUPABASE_URL");
    for (const wallet of uniqueWinnerWallets) {
      try {
        await fetch(`${baseUrl}/functions/v1/missions/first-win?wallet_address=${encodeURIComponent(wallet)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
        });
      } catch (err) {
        console.error(`Failed to trigger first-win mission for ${wallet}:`, err);
      }
    }
  }

  return {
    lottery_id: lottery.lottery_id,
    lottery_type: lottery.lottery_type,
    status: "completed",
    total_tickets: totalTickets,
    total_winners: winners.length,
    prize_pool: prizePool.toString(),
    prize_ids: prizeIds,
    expired_sweep: expiredSweep,
    winners: winners.map((w) => ({
      tier: w.tier,
      ticket_number: w.ticket_number,
      wallet: w.wallet_address,
      prize: w.prize_lamports,
    })),
  };
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getDate();
}

function calculateNextDrawTimestamp(lotteryType: string, currentDrawTimestamp: number): number | null {
  const currentDate = new Date(currentDrawTimestamp * 1000);

  switch (lotteryType) {
    case "tri-daily": {
      const nextDate = new Date(currentDrawTimestamp * 1000);
      nextDate.setUTCDate(nextDate.getUTCDate() + 3);
      nextDate.setUTCHours(23, 59, 59, 0);
      return Math.floor(nextDate.getTime() / 1000);
    }

    case "weekly": {
      const nextDate = new Date(currentDrawTimestamp * 1000);
      nextDate.setUTCDate(nextDate.getUTCDate() + 7);
      nextDate.setUTCHours(23, 59, 59, 0);
      return Math.floor(nextDate.getTime() / 1000);
    }

    case "jackpot": {
      let nextMonth = currentDate.getUTCMonth() + 1;
      let nextYear = currentDate.getUTCFullYear();

      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
      }

      const lastDay = getLastDayOfMonth(nextYear, nextMonth);
      const nextDate = new Date(Date.UTC(nextYear, nextMonth, lastDay, 23, 59, 59));
      return Math.floor(nextDate.getTime() / 1000);
    }

    case "grand-prize": {
      const nextYear = currentDate.getUTCFullYear() + 1;
      const nextDate = new Date(Date.UTC(nextYear, 11, 31, 23, 59, 59));
      return Math.floor(nextDate.getTime() / 1000);
    }

    case "special-event":
    default:
      return null;
  }
}

async function createNextLottery(supabase: any, lottery: any) {
  const config = LOTTERY_CONFIGS[lottery.lottery_type];
  if (!config) return null;

  if (lottery.lottery_type === "special-event") {
    return null;
  }

  const nextDrawTimestamp = calculateNextDrawTimestamp(lottery.lottery_type, lottery.draw_timestamp);

  if (!nextDrawTimestamp) {
    return null;
  }

  const { data: existing } = await supabase
    .from("blockchain_lotteries")
    .select("id")
    .eq("lottery_type", lottery.lottery_type)
    .eq("is_drawn", false)
    .gt("draw_timestamp", lottery.draw_timestamp)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return null;
  }

  const { data: maxLottery } = await supabase
    .from("blockchain_lotteries")
    .select("lottery_id")
    .eq("lottery_type", lottery.lottery_type)
    .order("lottery_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextLotteryId = (maxLottery?.lottery_id || 0) + 1;

  const { data: newLottery, error } = await supabase
    .from("blockchain_lotteries")
    .insert({
      lottery_id: nextLotteryId,
      lottery_type: lottery.lottery_type,
      ticket_price: config.ticketPriceLamports,
      max_tickets: config.maxTickets,
      draw_timestamp: nextDrawTimestamp,
      is_drawn: false,
      prize_pool: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Create next lottery error:", error);
    return null;
  }

  return newLottery;
}

function getAffiliatesPoolKeypair(): Keypair | null {
  try {
    const privateKeyString = Deno.env.get("SOLANA_AFFILIATES_POOL_PRIVATE");
    if (!privateKeyString) {
      console.error("SOLANA_AFFILIATES_POOL_PRIVATE not configured");
      return null;
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  } catch (err) {
    console.error("Failed to parse affiliates pool keypair:", err);
    return null;
  }
}

async function transferFromAffiliatesPoolToDelta(
  lamports: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (lamports <= 0) {
    return { success: true, signature: undefined };
  }

  const keypair = getAffiliatesPoolKeypair();
  if (!keypair) {
    return { success: false, error: "Affiliates pool keypair not available" };
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    const balance = await connection.getBalance(keypair.publicKey);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
    const fee = 5000;
    const maxTransferable = balance - rentExempt - fee;

    if (maxTransferable < lamports) {
      console.error(
        `Affiliates pool insufficient balance: has ${balance}, needs ${lamports} + ${rentExempt} rent + ${fee} fee`
      );
      return {
        success: false,
        error: `Insufficient balance: pool has ${balance} lamports, needs ${lamports + rentExempt + fee}`,
      };
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(DELTA_WALLET_PUBLIC),
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
      commitment: "confirmed",
    });

    console.log(`Sweep on-chain transfer: ${lamports} lamports -> delta wallet. Sig: ${signature}`);
    return { success: true, signature };
  } catch (err) {
    console.error("On-chain sweep transfer failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown transfer error" };
  }
}

async function sweepUnclaimedAffiliateRewards(supabase: ReturnType<typeof getSupabaseClient>) {
  try {
    const { data, error } = await supabase.rpc("sweep_unclaimed_affiliate_rewards_to_delta", {
      p_deadline_weeks_ago: 1,
    });

    if (error) {
      console.error("Sweep unclaimed rewards error:", error);
      return { swept: false, error: error.message };
    }

    const result = data?.[0] || { swept_count: 0, total_swept_lamports: 0 };

    let onchainTransfer = { success: true, signature: undefined as string | undefined };
    if (result.total_swept_lamports > 0) {
      onchainTransfer = await transferFromAffiliatesPoolToDelta(
        Number(result.total_swept_lamports)
      );

      if (onchainTransfer.success && onchainTransfer.signature) {
        await supabase
          .from("delta_transfers")
          .update({ transaction_signature: onchainTransfer.signature })
          .eq("source", "unclaimed_sweep")
          .is("transaction_signature", null);
      }
    }

    return {
      swept: true,
      swept_count: result.swept_count,
      total_swept_lamports: result.total_swept_lamports,
      onchain_transfer: onchainTransfer,
    };
  } catch (err) {
    console.error("Sweep unclaimed rewards exception:", err);
    return { swept: false, error: err instanceof Error ? err.message : "Unknown" };
  }
}

async function processDraws() {
  const supabase = getSupabaseClient();
  const nowTimestamp = Math.floor(Date.now() / 1000);

  const sweepResult = await sweepUnclaimedAffiliateRewards(supabase);

  const { data: lotteriesReady, error } = await supabase
    .from("blockchain_lotteries")
    .select("*")
    .eq("is_drawn", false)
    .lte("draw_timestamp", nowTimestamp);

  if (error) throw error;

  if (!lotteriesReady || lotteriesReady.length === 0) {
    return { message: "No lotteries ready for draw", processed: 0, sweep: sweepResult };
  }

  const results: any[] = [];

  for (const lottery of lotteriesReady) {
    try {
      const drawResult = await executeDraw(supabase, lottery);
      results.push(drawResult);

      if (drawResult.status !== "skipped_unknown_type") {
        const nextLottery = await createNextLottery(supabase, lottery);
        if (nextLottery) {
          results.push({
            action: "created_next_lottery",
            lottery_type: lottery.lottery_type,
            next_lottery_id: nextLottery.lottery_id,
            next_draw_timestamp: nextLottery.draw_timestamp,
          });

          if (drawResult.prize_ids && drawResult.prize_ids.length > 0) {
            const expiresAt = new Date(nextLottery.draw_timestamp * 1000).toISOString();
            const { error: expiresError } = await supabase
              .from("prizes")
              .update({ expires_at: expiresAt })
              .in("id", drawResult.prize_ids);

            if (expiresError) {
              console.error("Failed to set expires_at on prizes:", expiresError);
            }
          }
        }
      }
    } catch (err) {
      results.push({
        lottery_id: lottery.lottery_id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    message: `Processed ${lotteriesReady.length} lottery draws`,
    processed: lotteriesReady.length,
    results,
    sweep: sweepResult,
  };
}

async function getDrawStatus() {
  const supabase = getSupabaseClient();
  const nowTimestamp = Math.floor(Date.now() / 1000);

  const { data: pending } = await supabase
    .from("blockchain_lotteries")
    .select("lottery_id, lottery_type, draw_timestamp, prize_pool")
    .eq("is_drawn", false)
    .order("draw_timestamp", { ascending: true });

  const { data: recent } = await supabase
    .from("blockchain_lotteries")
    .select("lottery_id, lottery_type, draw_timestamp, winning_ticket, prize_pool")
    .eq("is_drawn", true)
    .order("draw_timestamp", { ascending: false })
    .limit(10);

  return {
    current_timestamp: nowTimestamp,
    pending_draws: (pending || []).map((l: any) => ({
      ...l,
      time_until_draw: l.draw_timestamp - nowTimestamp,
      ready: l.draw_timestamp <= nowTimestamp,
    })),
    recent_draws: recent || [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathMatch = url.pathname.match(/\/lottery-draw(\/.*)?$/);
    const path = pathMatch ? (pathMatch[1] || "") : "";

    let result: any;

    if (req.method === "POST" && (path === "/execute" || path === "" || path === "/")) {
      result = await processDraws();
    } else if (req.method === "GET" && path === "/status") {
      result = await getDrawStatus();
    } else {
      throw new Error("Not found");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Not found" ? 404 : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
