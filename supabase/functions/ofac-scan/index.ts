import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OFAC_SDN_CSV_URL =
  "https://www.treasury.gov/ofac/downloads/sdn.csv";

const OFAC_CONSOLIDATED_URL =
  "https://www.treasury.gov/ofac/downloads/consolidated/cons_prim.csv";

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function extractSolanaAddresses(csvText: string): string[] {
  const addresses = new Set<string>();
  const lines = csvText.split("\n");
  for (const line of lines) {
    const matches = line.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
    if (matches) {
      for (const candidate of matches) {
        if (
          SOLANA_ADDRESS_REGEX.test(candidate) &&
          candidate.length >= 32 &&
          candidate.length <= 44
        ) {
          addresses.add(candidate);
        }
      }
    }
  }
  return Array.from(addresses);
}

async function fetchOfacList(): Promise<{
  addresses: string[];
  source: string;
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  const allAddresses = new Set<string>();

  const sources = [
    { url: OFAC_SDN_CSV_URL, name: "sdn.csv" },
    { url: OFAC_CONSOLIDATED_URL, name: "cons_prim.csv" },
  ];

  for (const src of sources) {
    try {
      const response = await fetch(src.url, {
        headers: { "User-Agent": "PowerSOL-Compliance/1.0" },
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) {
        const text = await response.text();
        const found = extractSolanaAddresses(text);
        for (const addr of found) {
          allAddresses.add(addr);
        }
      }
    } catch {
      // continue with other sources
    }
  }

  return {
    addresses: Array.from(allAddresses),
    source: "ofac_sdn",
    fetchedAt,
  };
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

    const scanTimestamp = new Date().toISOString();
    let listUpdateResult = { fetched: 0, new: 0, reactivated: 0 };

    const ofacResult = await fetchOfacList();

    if (ofacResult.addresses.length > 0) {
      for (const addr of ofacResult.addresses) {
        const { data: existing } = await supabase
          .from("ofac_sanctioned_addresses")
          .select("id, is_active")
          .eq("wallet_address", addr)
          .maybeSingle();

        if (!existing) {
          await supabase.from("ofac_sanctioned_addresses").insert({
            wallet_address: addr,
            source: "ofac_sdn",
            list_name: "SDN",
            match_type: "exact_wallet",
            last_seen_in_fetch: ofacResult.fetchedAt,
            raw_entry: {
              fetched_at: ofacResult.fetchedAt,
              source_files: ["sdn.csv", "cons_prim.csv"],
            },
          });
          listUpdateResult.new++;
        } else {
          if (!existing.is_active) {
            listUpdateResult.reactivated++;
          }
          await supabase
            .from("ofac_sanctioned_addresses")
            .update({
              last_seen_in_fetch: ofacResult.fetchedAt,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      }
      listUpdateResult.fetched = ofacResult.addresses.length;
    }

    const { data: sanctionedRows } = await supabase
      .from("ofac_sanctioned_addresses")
      .select("wallet_address")
      .eq("is_active", true);

    const sanctionedSet = new Set(
      (sanctionedRows || []).map((r: any) => r.wallet_address.toLowerCase())
    );

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("wallet_address");

    if (usersError) {
      return new Response(
        JSON.stringify({ error: usersError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          scanned: 0,
          flagged: 0,
          list_update: listUpdateResult,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let flaggedCount = 0;
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
          ? {
              source: "OFAC SDN List",
              match_type: "exact_wallet",
              scan_type: "scheduled_30d",
              list_updated: ofacResult.fetchedAt,
            }
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

    if (flaggedWallets.length > 0) {
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
    }

    const clearWallets = users
      .map((u: any) => u.wallet_address)
      .filter((w: string) => !flaggedWallets.includes(w));

    if (clearWallets.length > 0) {
      const CLEAR_BATCH = 500;
      for (let i = 0; i < clearWallets.length; i += CLEAR_BATCH) {
        const batch = clearWallets.slice(i, i + CLEAR_BATCH);
        await supabase
          .from("users")
          .update({ ofac_checked: true })
          .in("wallet_address", batch);
      }
    }

    return new Response(
      JSON.stringify({
        scanned: users.length,
        flagged: flaggedCount,
        flagged_wallets: flaggedWallets,
        scan_date: scanTimestamp,
        list_update: listUpdateResult,
        sanctioned_addresses_in_db: sanctionedSet.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
