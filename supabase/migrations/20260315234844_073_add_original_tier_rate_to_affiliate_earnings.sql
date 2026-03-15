/*
  # Add Original Tier and Rate to Affiliate Earnings

  1. New Columns
    - `solana_affiliate_earnings.original_tier` (smallint) - The affiliate tier at the time the commission was recorded
    - `solana_affiliate_earnings.original_rate` (numeric) - The commission rate applied at the time (e.g., 0.05, 0.10, 0.20, 0.30)

  2. Backfill Strategy
    - For most records: compute rate from commission_lamports / (ticket_price * 1e9), which is accurate
      for records whose commission_lamports were never modified by backfill migrations
    - For affiliate 9M6d (whose commission_lamports were rewritten by migration 066):
      - IDs 1,2 (March 4, before tier change): tier 1, rate 0.05
      - All other IDs (March 8+, after tier was set to 4): tier 4, rate 0.30
      Note: Migration 066 corrected these amounts to 30% because the affiliate should have
      been tier 4. The display will show the rate that was actually applied/owed.

  3. Trigger Update
    - Updates `process_affiliate_commission_on_purchase()` to store tier and rate at insert time

  4. RPC Update
    - Drops and recreates `get_affiliate_per_ticket_commissions()` to return stored original_tier and
      original_rate instead of computing from lamports (which was inaccurate for backfilled records)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_affiliate_earnings' AND column_name = 'original_tier'
  ) THEN
    ALTER TABLE solana_affiliate_earnings ADD COLUMN original_tier smallint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_affiliate_earnings' AND column_name = 'original_rate'
  ) THEN
    ALTER TABLE solana_affiliate_earnings ADD COLUMN original_rate numeric;
  END IF;
END $$;

UPDATE solana_affiliate_earnings sae
SET
  original_rate = CASE
    WHEN tp.total_sol > 0 THEN ROUND(sae.commission_lamports::numeric / (tp.total_sol * 1000000000), 4)
    ELSE 0
  END,
  original_tier = CASE
    WHEN tp.total_sol > 0 THEN
      CASE ROUND(sae.commission_lamports::numeric / (tp.total_sol * 1000000000), 4)
        WHEN 0.30 THEN 4
        WHEN 0.20 THEN 3
        WHEN 0.10 THEN 2
        WHEN 0.05 THEN 1
        ELSE 1
      END
    ELSE 1
  END
FROM ticket_purchases tp
WHERE tp.transaction_signature = sae.transaction_signature
  AND sae.original_rate IS NULL;

UPDATE solana_affiliate_earnings
SET original_tier = 1, original_rate = 0.05
WHERE affiliate_wallet = '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ'
  AND id IN (1, 2);

CREATE OR REPLACE FUNCTION process_affiliate_commission_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_user_id uuid;
  v_referral record;
  v_affiliate record;
  v_affiliate_wallet text;
  v_tier int;
  v_commission_rate numeric;
  v_commission_sol numeric;
  v_commission_lamports bigint;
  v_lamports_per_sol constant bigint := 1000000000;
  v_house_rate constant numeric := 0.30;
  v_is_first_purchase boolean;
  v_week_number bigint;
  v_now timestamp with time zone := now();
BEGIN
  IF NEW.affiliate_commission_processed = true THEN
    RETURN NEW;
  END IF;

  IF NEW.wallet_address IS NULL OR NEW.total_sol IS NULL OR NEW.total_sol <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_buyer_user_id
  FROM users
  WHERE wallet_address = NEW.wallet_address
  LIMIT 1;

  IF v_buyer_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.*, a.id as aff_id, a.user_id as aff_user_id, a.manual_tier, a.total_earned, a.pending_earnings
  INTO v_referral
  FROM referrals r
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  WHERE r.referred_user_id = v_buyer_user_id
  LIMIT 1;

  IF v_referral IS NULL OR v_referral.aff_id IS NULL THEN
    INSERT INTO house_earnings (ticket_purchase_id, wallet_address, lottery_type, amount_lamports, transaction_signature)
    VALUES (
      NEW.id,
      NEW.wallet_address,
      NEW.lottery_type,
      floor(NEW.total_sol * v_lamports_per_sol * v_house_rate)::bigint,
      NEW.transaction_signature
    )
    ON CONFLICT DO NOTHING;

    UPDATE ticket_purchases SET affiliate_commission_processed = true WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  v_tier := COALESCE(v_referral.manual_tier, 1);
  v_commission_rate := CASE v_tier
    WHEN 4 THEN 0.30
    WHEN 3 THEN 0.20
    WHEN 2 THEN 0.10
    ELSE 0.05
  END;

  v_commission_sol := NEW.total_sol * v_commission_rate;
  v_commission_lamports := floor(v_commission_sol * v_lamports_per_sol)::bigint;

  v_is_first_purchase := NOT COALESCE(v_referral.is_validated, false);

  UPDATE referrals SET
    is_validated = true,
    first_purchase_at = CASE WHEN v_is_first_purchase THEN v_now ELSE first_purchase_at END,
    total_tickets_purchased = COALESCE(total_tickets_purchased, 0) + COALESCE(NEW.quantity, 1),
    total_value_sol = COALESCE(total_value_sol, 0) + NEW.total_sol,
    total_commission_earned = COALESCE(total_commission_earned, 0) + v_commission_sol,
    updated_at = v_now
  WHERE id = v_referral.id;

  UPDATE affiliates SET
    total_earned = COALESCE(total_earned, 0) + v_commission_sol,
    pending_earnings = COALESCE(pending_earnings, 0) + v_commission_sol,
    updated_at = v_now
  WHERE id = v_referral.aff_id;

  SELECT wallet_address INTO v_affiliate_wallet
  FROM users
  WHERE id = v_referral.aff_user_id
  LIMIT 1;

  IF v_affiliate_wallet IS NULL THEN
    SELECT referral_code INTO v_affiliate_wallet
    FROM affiliates
    WHERE id = v_referral.aff_id;
  END IF;

  IF v_affiliate_wallet IS NOT NULL THEN
    INSERT INTO solana_affiliate_earnings (affiliate_wallet, commission_lamports, transaction_signature, original_tier, original_rate)
    VALUES (v_affiliate_wallet, v_commission_lamports, NEW.transaction_signature, v_tier, v_commission_rate);

    INSERT INTO affiliate_pending_rewards (affiliate_wallet, pending_lamports, tier, referral_count, total_earned_lamports, total_claimed_lamports, next_claim_nonce)
    VALUES (v_affiliate_wallet, v_commission_lamports, v_tier, CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END, v_commission_lamports, 0, 0)
    ON CONFLICT (affiliate_wallet) DO UPDATE SET
      pending_lamports = affiliate_pending_rewards.pending_lamports + EXCLUDED.pending_lamports,
      total_earned_lamports = affiliate_pending_rewards.total_earned_lamports + EXCLUDED.pending_lamports,
      tier = EXCLUDED.tier,
      referral_count = affiliate_pending_rewards.referral_count + CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END,
      last_updated = v_now;

    v_week_number := floor(extract(epoch from v_now) / (7 * 24 * 60 * 60))::bigint;

    INSERT INTO affiliate_weekly_accumulator (affiliate_wallet, week_number, pending_lamports, tier, referral_count, is_released)
    VALUES (v_affiliate_wallet, v_week_number, v_commission_lamports, v_tier, CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END, false)
    ON CONFLICT (affiliate_wallet, week_number) DO UPDATE SET
      pending_lamports = affiliate_weekly_accumulator.pending_lamports + EXCLUDED.pending_lamports,
      tier = EXCLUDED.tier,
      referral_count = affiliate_weekly_accumulator.referral_count + CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END,
      updated_at = v_now;
  END IF;

  UPDATE ticket_purchases SET affiliate_commission_processed = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS get_affiliate_per_ticket_commissions(text, integer, integer);

CREATE FUNCTION get_affiliate_per_ticket_commissions(
  p_wallet text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  earning_id bigint,
  ticket_id bigint,
  buyer_wallet text,
  lottery_type text,
  ticket_price_lamports bigint,
  commission_lamports bigint,
  commission_rate numeric,
  original_tier smallint,
  transaction_signature text,
  earned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sae.id AS earning_id,
    sae.ticket_id,
    tp.wallet_address AS buyer_wallet,
    tp.lottery_type,
    (tp.total_sol * 1000000000)::bigint AS ticket_price_lamports,
    sae.commission_lamports,
    COALESCE(
      sae.original_rate,
      CASE
        WHEN tp.total_sol > 0 THEN ROUND((sae.commission_lamports::numeric / (tp.total_sol * 1000000000)), 4)
        ELSE 0
      END
    ) AS commission_rate,
    sae.original_tier,
    sae.transaction_signature,
    sae.earned_at
  FROM solana_affiliate_earnings sae
  LEFT JOIN ticket_purchases tp ON tp.transaction_signature = sae.transaction_signature
  WHERE sae.affiliate_wallet = p_wallet
  ORDER BY sae.earned_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
