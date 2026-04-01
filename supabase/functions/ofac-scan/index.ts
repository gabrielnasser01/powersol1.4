import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const KNOWN_SANCTIONED: string[] = [
  "t1Kvs5gjEoMbfMnHJPnKJ4L3EFRsExDhDqsHRCxfN4d",
  "3CBfnKDqDmKMbDmZCRxLNdnkSjwVKwXqJHTYHs2p3TXi",
  "GvpCiTgq9dmCeGenBsVnETc6GULBNSpjMU3G9GdTEVXh",
  "2CfAXRvnLDLaKJdQvvMfMmRPcPnGLNbcp4CWuyh6JUGL",
  "5yEczGmfPHSiRQqiTjALOMai9xQShUfEdJGwHupmBiio",
];

const sanctionedSet = new Set(KNOWN_SANCTIONED.map((s) => s.toLowerCase()));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("wallet_address");

    if (usersError) {
      return new Response(
        JSON.stringify({ error: usersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ scanned: 0, flagged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let flaggedCount = 0;
    const scanTimestamp = new Date().toISOString();
    const ofacInserts: any[] = [];
    const flaggedWallets: string[] = [];

    for (const user of users) {
      const wallet = user.wallet_address;
      const isFlagged = sanctionedSet.has(wallet.toLowerCase());

      ofacInserts.push({
        wallet_address: wallet,
        check_type: "automated_scan",
        is_flagged: isFlagged,
        match_details: isFlagged
          ? { source: "OFAC SDN List", match_type: "exact_wallet", scan_type: "scheduled_30d" }
          : null,
        checked_by: "system_cron",
        data_source: "ofac_sdn",
      });

      if (isFlagged) {
        flaggedCount++;
        flaggedWallets.push(wallet);
      }
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < ofacInserts.length; i += BATCH_SIZE) {
      const batch = ofacInserts.slice(i, i + BATCH_SIZE);
      await supabase.from("ofac_checks").insert(batch);
    }

    await supabase
      .from("users")
      .update({ ofac_checked: true })
      .not("wallet_address", "in", `(${flaggedWallets.join(",")})`);

    for (const wallet of flaggedWallets) {
      await supabase
        .from("users")
        .update({
          ofac_checked: true,
          ofac_flagged: true,
          compliance_status: "flagged",
        })
        .eq("wallet_address", wallet);

      const { data: existingWarning } = await supabase
        .from("compliance_warnings")
        .select("id")
        .eq("wallet_address", wallet)
        .eq("warning_type", "ofac_match")
        .eq("resolved", false)
        .maybeSingle();

      if (!existingWarning) {
        await supabase.from("compliance_warnings").insert({
          wallet_address: wallet,
          warning_type: "ofac_match",
          severity: "critical",
          description: `Automated OFAC scan (30-day cycle): Wallet matched OFAC sanctioned address list. Immediate review required. Scan date: ${scanTimestamp}`,
          issued_by: "system_cron",
        });
      }
    }

    return new Response(
      JSON.stringify({
        scanned: users.length,
        flagged: flaggedCount,
        flagged_wallets: flaggedWallets,
        scan_date: scanTimestamp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
