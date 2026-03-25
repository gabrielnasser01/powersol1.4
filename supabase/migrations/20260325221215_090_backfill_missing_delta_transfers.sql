/*
  # Backfill Missing Delta Transfers

  1. Problem
    - 77 ticket purchases between 2026-03-16 and 2026-03-25 have no delta_transfers
      record due to migration 073 accidentally removing the INSERT logic

  2. Backfill Strategy
    - For purchases WITH a referral (affiliate exists):
      - Look up the affiliate tier from solana_affiliate_earnings (original_tier/original_rate)
      - Calculate: reserved = total_sol * 30%, commission = total_sol * rate, delta = reserved - commission
      - Insert with source='ticket_purchase'
    - For purchases WITHOUT a referral:
      - delta = full 30% of total_sol
      - Insert with source='no_referral'
    - Only processes purchases that do NOT already have a delta_transfers entry

  3. Important Notes
    - Uses LEFT JOIN to detect which purchases are missing delta records
    - Matches affiliate earnings via transaction_signature to get accurate tier/rate
    - No data is modified or deleted, only new delta_transfers rows are inserted
*/

DO $$
DECLARE
  v_rec record;
  v_lamports_per_sol constant bigint := 1000000000;
  v_max_rate constant numeric := 0.30;
  v_reserved bigint;
  v_commission bigint;
  v_delta bigint;
  v_count int := 0;
BEGIN
  FOR v_rec IN
    SELECT
      tp.id,
      tp.wallet_address,
      tp.total_sol,
      tp.transaction_signature,
      sae.affiliate_wallet,
      sae.commission_lamports,
      sae.original_tier,
      sae.original_rate
    FROM ticket_purchases tp
    LEFT JOIN delta_transfers dt ON dt.ticket_purchase_id = tp.id
    LEFT JOIN solana_affiliate_earnings sae ON sae.transaction_signature = tp.transaction_signature
    WHERE dt.id IS NULL
    ORDER BY tp.created_at
  LOOP
    v_reserved := floor(v_rec.total_sol * v_lamports_per_sol * v_max_rate)::bigint;

    IF v_rec.affiliate_wallet IS NOT NULL AND v_rec.commission_lamports IS NOT NULL THEN
      v_commission := v_rec.commission_lamports;
      v_delta := v_reserved - v_commission;

      IF v_delta > 0 THEN
        INSERT INTO delta_transfers (
          source, ticket_purchase_id, affiliate_wallet,
          amount_lamports, tier, commission_rate, transaction_signature
        )
        VALUES (
          'ticket_purchase', v_rec.id, v_rec.affiliate_wallet,
          v_delta, v_rec.original_tier,
          v_rec.original_rate, v_rec.transaction_signature
        );
        v_count := v_count + 1;
      END IF;
    ELSE
      INSERT INTO delta_transfers (
        source, ticket_purchase_id, amount_lamports, transaction_signature
      )
      VALUES (
        'no_referral', v_rec.id, v_reserved, v_rec.transaction_signature
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfilled % missing delta_transfers records', v_count;
END $$;
