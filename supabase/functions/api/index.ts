import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseClient(authHeader?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = authHeader
    ? Deno.env.get("SUPABASE_ANON_KEY")!
    : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function handleLotteries(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("solana_lottery_state")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function handleTickets(req: Request, supabase: ReturnType<typeof createClient>, userId?: string) {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname.includes("/my-tickets")) {
    if (!userId) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from("solana_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data;
  }

  if (req.method === "POST" && url.pathname.includes("/purchase")) {
    if (!userId) throw new Error("Unauthorized");

    const body = await req.json();
    const { lottery_id, quantity, tx_signature } = body;

    if (!lottery_id || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("Invalid purchase parameters");
    }

    if (tx_signature && typeof tx_signature === "string" && tx_signature.length > 256) {
      throw new Error("Invalid transaction signature");
    }

    const serviceClient = getServiceClient();

    const { data: lottery, error: lotteryError } = await serviceClient
      .from("solana_lottery_state")
      .select("*")
      .eq("id", lottery_id)
      .maybeSingle();

    if (lotteryError || !lottery) throw new Error("Lottery not found");

    const { data: lastTicket } = await serviceClient
      .from("solana_tickets")
      .select("ticket_number")
      .eq("lottery_id", lottery_id)
      .order("ticket_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = lastTicket ? lastTicket.ticket_number + 1 : 1;

    const { data: ticket, error: ticketError } = await serviceClient
      .from("solana_tickets")
      .insert({
        user_id: userId,
        lottery_id,
        ticket_number: nextNumber,
        quantity,
        purchase_price: lottery.ticket_price * quantity,
        tx_signature: tx_signature || null,
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    await serviceClient
      .from("ticket_purchases")
      .insert({
        user_id: userId,
        lottery_type: lottery.lottery_type || "tri_daily",
        ticket_count: quantity,
        power_points_earned: quantity * 10,
      });

    return ticket;
  }

  throw new Error("Invalid ticket endpoint");
}

async function handlePrizes(req: Request, supabase: ReturnType<typeof createClient>, userId?: string) {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.pathname.includes("/unclaimed")) {
      const { data, error } = await supabase
        .from("prizes")
        .select("*")
        .eq("status", "unclaimed")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }

    if (url.pathname.includes("/claims")) {
      const { data, error } = await supabase
        .from("prize_claims")
        .select("*, prize:prizes(*)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from("prizes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data;
  }

  if (req.method === "POST" && url.pathname.includes("/claim")) {
    if (!userId) throw new Error("Unauthorized");

    const pathParts = url.pathname.split("/");
    const prizeId = pathParts[pathParts.indexOf("prizes") + 1];

    if (!prizeId || !UUID_RE.test(prizeId)) {
      throw new Error("Invalid prize ID");
    }

    const serviceClient = getServiceClient();

    const { data: prize, error: prizeError } = await serviceClient
      .from("prizes")
      .select("*")
      .eq("id", prizeId)
      .maybeSingle();

    if (prizeError || !prize) throw new Error("Prize not found");
    if (prize.winner_user_id !== userId) throw new Error("Not your prize");
    if (prize.status !== "unclaimed") throw new Error("Prize already claimed");

    const { data: claim, error: claimError } = await serviceClient
      .from("prize_claims")
      .insert({
        prize_id: prizeId,
        user_id: userId,
        status: "pending",
      })
      .select()
      .single();

    if (claimError) throw claimError;

    await serviceClient
      .from("prizes")
      .update({ status: "claimed" })
      .eq("id", prizeId);

    return claim;
  }

  throw new Error("Invalid prizes endpoint");
}

async function handleTransparency(supabase: ReturnType<typeof createClient>) {
  const { data: lotteries } = await supabase
    .from("solana_lottery_state")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: draws } = await supabase
    .from("solana_draws")
    .select("*")
    .order("drawn_at", { ascending: false })
    .limit(20);

  const { count: totalTickets } = await supabase
    .from("solana_tickets")
    .select("*", { count: "exact", head: true });

  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  return {
    lotteries: lotteries || [],
    recent_draws: draws || [],
    stats: {
      total_tickets: totalTickets || 0,
      total_users: totalUsers || 0,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(clientIp, 120, 60000)) {
      return errorResponse("Too many requests", 429);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/api", "");
    const authHeader = req.headers.get("Authorization");

    const supabase = getSupabaseClient(authHeader || undefined);

    let userId: string | undefined;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    let result: unknown;

    if (path.startsWith("/lotteries")) {
      result = await handleLotteries(supabase);
    } else if (path.startsWith("/tickets")) {
      result = await handleTickets(req, supabase, userId);
    } else if (path.startsWith("/prizes")) {
      result = await handlePrizes(req, supabase, userId);
    } else if (path.startsWith("/transparency")) {
      result = await handleTransparency(supabase);
    } else if (path === "/health" || path === "/") {
      result = { status: "ok", timestamp: new Date().toISOString() };
    } else {
      return errorResponse("Not found", 404);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";
    const status = message === "Unauthorized" ? 401 : message === "Not found" ? 404 : 400;

    return errorResponse(
      status === 400 ? "Bad request" : message,
      status
    );
  }
});
