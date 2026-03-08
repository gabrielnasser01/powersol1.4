/*
  # Fix Week Number Calculation Consistency

  1. Problem
    - The `process_affiliate_commission_on_purchase` trigger uses `floor(epoch / 604800)`
      which produces week number 2931 for the current date
    - The `calculate_week_number()` function uses `(epoch - 345600) / 604800`
      which produces week number 2930 for the same date
    - The claim and release functions (`is_affiliate_claim_available`, 
      `get_wednesday_release_timestamp`) use `calculate_week_number`
    - Result: commissions are stored with week 2931 but claims look for week 2930
    - The sweep function also uses the wrong formula, causing premature or missed sweeps
    - The retroactive commission trigger (054) also uses the wrong formula

  2. Solution
    - Update ALL functions to use `calculate_week_number()` consistently
    - Fix existing data by converting week numbers from old formula to correct formula
    - Functions updated:
      - `process_affiliate_commission_on_purchase()` (ticket purchase trigger)
      - `sweep_unclaimed_affiliate_rewards_to_delta()` (sweep function)
      - `process_retroactive_affiliate_commission()` (retroactive trigger)

  3. Data Fix
    - Migrate existing `affiliate_weekly_accumulator` rows from wrong week numbers
      to correct week numbers
*/

-- 1. Fix the main commission trigger to use calculate_week_number()
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
  v_delta_lamports bigint;
  v_reserved_lamports bigint;
  v_lamports_per_sol constant bigint := 1000000000;
  v_affiliates_max_rate constant numeric := 0.30;
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

  v_reserved_lamports := floor(NEW.total_sol * v_lamports_per_sol * v_affiliates_max_rate)::bigint;

  SELECT id INTO v_buyer_user_id
  FROM users
  WHERE wallet_address = NEW.wallet_address
  LIMIT 1;

  IF v_buyer_user_id IS NULL THEN
    INSERT INTO delta_transfers (source, ticket_purchase_id, amount_lamports, transaction_signature)
    VALUES ('no_referral', NEW.id, v_reserved_lamports, NEW.transaction_signature);

    UPDATE ticket_purchases SET affiliate_commission_processed = true WHERE id = NEW.id;
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
      v_reserved_lamports,
      NEW.transaction_signature
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO delta_transfers (source, ticket_purchase_id, amount_lamports, transaction_signature)
    VALUES ('no_referral', NEW.id, v_reserved_lamports, NEW.transaction_signature);

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
  v_delta_lamports := v_reserved_lamports - v_commission_lamports;

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
    INSERT INTO solana_affiliate_earnings (affiliate_wallet, commission_lamports, transaction_signature)
    VALUES (v_affiliate_wallet, v_commission_lamports, NEW.transaction_signature);

    INSERT INTO affiliate_pending_rewards (affiliate_wallet, pending_lamports, tier, referral_count, total_earned_lamports, total_claimed_lamports, next_claim_nonce)
    VALUES (v_affiliate_wallet, v_commission_lamports, v_tier, CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END, v_commission_lamports, 0, 0)
    ON CONFLICT (affiliate_wallet) DO UPDATE SET
      pending_lamports = affiliate_pending_rewards.pending_lamports + EXCLUDED.pending_lamports,
      total_earned_lamports = affiliate_pending_rewards.total_earned_lamports + EXCLUDED.pending_lamports,
      tier = EXCLUDED.tier,
      referral_count = affiliate_pending_rewards.referral_count + CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END,
      last_updated = v_now;

    v_week_number := calculate_week_number(v_now);

    INSERT INTO affiliate_weekly_accumulator (affiliate_wallet, week_number, pending_lamports, tier, referral_count, is_released)
    VALUES (v_affiliate_wallet, v_week_number, v_commission_lamports, v_tier, CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END, false)
    ON CONFLICT (affiliate_wallet, week_number) DO UPDATE SET
      pending_lamports = affiliate_weekly_accumulator.pending_lamports + EXCLUDED.pending_lamports,
      tier = EXCLUDED.tier,
      referral_count = affiliate_weekly_accumulator.referral_count + CASE WHEN v_is_first_purchase THEN 1 ELSE 0 END,
      updated_at = v_now;
  END IF;

  IF v_delta_lamports > 0 THEN
    INSERT INTO delta_transfers (source, ticket_purchase_id, affiliate_wallet, amount_lamports, tier, commission_rate, transaction_signature)
    VALUES ('ticket_purchase', NEW.id, v_affiliate_wallet, v_delta_lamports, v_tier, v_commission_rate, NEW.transaction_signature);
  END IF;

  UPDATE ticket_purchases SET affiliate_commission_processed = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 2. Fix the sweep function to use calculate_week_number()
CREATE OR REPLACE FUNCTION sweep_unclaimed_affiliate_rewards_to_delta(
  p_deadline_weeks_ago int DEFAULT 1
)
RETURNS TABLE (
  swept_count int,
  total_swept_lamports bigint,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_week bigint;
  v_cutoff_week bigint;
  v_swept_count int := 0;
  v_total_lamports bigint := 0;
  v_details jsonb := '[]'::jsonb;
  v_record record;
BEGIN
  v_current_week := calculate_week_number(now());
  v_cutoff_week := v_current_week - p_deadline_weeks_ago;

  FOR v_record IN
    SELECT
      awa.id,
      awa.affiliate_wallet,
      awa.week_number,
      awa.pending_lamports,
      awa.tier
    FROM affiliate_weekly_accumulator awa
    WHERE awa.is_released = false
      AND awa.is_claimed = false
      AND COALESCE(awa.is_swept_to_delta, false) = false
      AND awa.pending_lamports > 0
      AND awa.week_number <= v_cutoff_week
    FOR UPDATE
  LOOP
    UPDATE affiliate_weekly_accumulator
    SET is_swept_to_delta = true,
        swept_at = now(),
        updated_at = now()
    WHERE id = v_record.id;

    INSERT INTO delta_transfers (source, sweep_week_number, affiliate_wallet, amount_lamports, tier)
    VALUES ('unclaimed_sweep', v_record.week_number, v_record.affiliate_wallet, v_record.pending_lamports, v_record.tier);

    UPDATE affiliate_pending_rewards
    SET pending_lamports = GREATEST(0, pending_lamports - v_record.pending_lamports),
        last_updated = now()
    WHERE affiliate_wallet = v_record.affiliate_wallet;

    v_swept_count := v_swept_count + 1;
    v_total_lamports := v_total_lamports + v_record.pending_lamports;

    v_details := v_details || jsonb_build_object(
      'affiliate_wallet', v_record.affiliate_wallet,
      'week_number', v_record.week_number,
      'amount_lamports', v_record.pending_lamports,
      'tier', v_record.tier
    );
  END LOOP;

  RETURN QUERY SELECT v_swept_count, v_total_lamports, v_details;
END;
$$;

-- 3. Fix the retroactive commission trigger to use calculate_week_number()
CREATE OR REPLACE FUNCTION process_retroactive_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_wallet text;
  v_affiliate record;
  v_affiliate_wallet text;
  v_tier int;
  v_commission_rate numeric;
  v_purchase record;
  v_commission_sol numeric;
  v_commission_lamports bigint;
  v_reserved_lamports bigint;
  v_delta_lamports bigint;
  v_total_commission_sol numeric := 0;
  v_total_tickets int := 0;
  v_total_value_sol numeric := 0;
  v_lamports_per_sol constant bigint := 1000000000;
  v_affiliates_max_rate constant numeric := 0.30;
  v_week_number bigint;
  v_now timestamp with time zone := now();
  v_purchase_count int := 0;
BEGIN
  SELECT wallet_address INTO v_referred_wallet
  FROM users
  WHERE id = NEW.referred_user_id;

  IF v_referred_wallet IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.id as aff_id, a.user_id as aff_user_id, a.manual_tier
  INTO v_affiliate
  FROM affiliates a
  WHERE a.id = NEW.referrer_affiliate_id;

  IF v_affiliate IS NULL THEN
    RETURN NEW;
  END IF;

  v_tier := COALESCE(v_affiliate.manual_tier, 1);
  v_commission_rate := CASE v_tier
    WHEN 4 THEN 0.30
    WHEN 3 THEN 0.20
    WHEN 2 THEN 0.10
    ELSE 0.05
  END;

  SELECT wallet_address INTO v_affiliate_wallet
  FROM users
  WHERE id = v_affiliate.aff_user_id;

  IF v_affiliate_wallet IS NULL THEN
    SELECT referral_code INTO v_affiliate_wallet
    FROM affiliates
    WHERE id = v_affiliate.aff_id;
  END IF;

  IF v_affiliate_wallet IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_purchase IN
    SELECT tp.*
    FROM ticket_purchases tp
    JOIN delta_transfers dt ON dt.ticket_purchase_id = tp.id AND dt.source = 'no_referral'
    WHERE tp.wallet_address = v_referred_wallet
      AND tp.affiliate_commission_processed = true
    ORDER BY tp.created_at ASC
  LOOP
    v_reserved_lamports := floor(v_purchase.total_sol * v_lamports_per_sol * v_affiliates_max_rate)::bigint;
    v_commission_sol := v_purchase.total_sol * v_commission_rate;
    v_commission_lamports := floor(v_commission_sol * v_lamports_per_sol)::bigint;
    v_delta_lamports := v_reserved_lamports - v_commission_lamports;

    v_total_commission_sol := v_total_commission_sol + v_commission_sol;
    v_total_tickets := v_total_tickets + COALESCE(v_purchase.quantity, 1);
    v_total_value_sol := v_total_value_sol + v_purchase.total_sol;

    DELETE FROM delta_transfers
    WHERE ticket_purchase_id = v_purchase.id AND source = 'no_referral';

    DELETE FROM house_earnings
    WHERE ticket_purchase_id = v_purchase.id;

    IF v_delta_lamports > 0 THEN
      INSERT INTO delta_transfers (source, ticket_purchase_id, affiliate_wallet, amount_lamports, tier, commission_rate, transaction_signature)
      VALUES ('ticket_purchase', v_purchase.id, v_affiliate_wallet, v_delta_lamports, v_tier, v_commission_rate, v_purchase.transaction_signature);
    END IF;

    INSERT INTO solana_affiliate_earnings (affiliate_wallet, commission_lamports, transaction_signature)
    VALUES (v_affiliate_wallet, v_commission_lamports, v_purchase.transaction_signature);

    v_purchase_count := v_purchase_count + 1;
  END LOOP;

  IF v_purchase_count = 0 THEN
    RETURN NEW;
  END IF;

  UPDATE referrals SET
    is_validated = true,
    first_purchase_at = COALESCE(first_purchase_at, v_now),
    total_tickets_purchased = COALESCE(total_tickets_purchased, 0) + v_total_tickets,
    total_value_sol = COALESCE(total_value_sol, 0) + v_total_value_sol,
    total_commission_earned = COALESCE(total_commission_earned, 0) + v_total_commission_sol,
    updated_at = v_now
  WHERE id = NEW.id;

  UPDATE affiliates SET
    total_earned = COALESCE(total_earned, 0) + v_total_commission_sol,
    pending_earnings = COALESCE(pending_earnings, 0) + v_total_commission_sol,
    updated_at = v_now
  WHERE id = v_affiliate.aff_id;

  v_week_number := calculate_week_number(v_now);

  INSERT INTO affiliate_pending_rewards (affiliate_wallet, pending_lamports, tier, referral_count, total_earned_lamports, total_claimed_lamports, next_claim_nonce)
  VALUES (v_affiliate_wallet, floor(v_total_commission_sol * v_lamports_per_sol)::bigint, v_tier, 1, floor(v_total_commission_sol * v_lamports_per_sol)::bigint, 0, 0)
  ON CONFLICT (affiliate_wallet) DO UPDATE SET
    pending_lamports = affiliate_pending_rewards.pending_lamports + floor(v_total_commission_sol * v_lamports_per_sol)::bigint,
    total_earned_lamports = affiliate_pending_rewards.total_earned_lamports + floor(v_total_commission_sol * v_lamports_per_sol)::bigint,
    tier = EXCLUDED.tier,
    referral_count = affiliate_pending_rewards.referral_count + 1,
    last_updated = v_now;

  INSERT INTO affiliate_weekly_accumulator (affiliate_wallet, week_number, pending_lamports, tier, referral_count, is_released)
  VALUES (v_affiliate_wallet, v_week_number, floor(v_total_commission_sol * v_lamports_per_sol)::bigint, v_tier, 1, false)
  ON CONFLICT (affiliate_wallet, week_number) DO UPDATE SET
    pending_lamports = affiliate_weekly_accumulator.pending_lamports + floor(v_total_commission_sol * v_lamports_per_sol)::bigint,
    tier = EXCLUDED.tier,
    referral_count = affiliate_weekly_accumulator.referral_count + 1,
    updated_at = v_now;

  RETURN NEW;
END;
$$;

-- 4. Fix existing data: migrate week_number from old formula to correct formula
-- Old formula: floor(epoch / 604800) = X
-- Correct formula: floor((epoch - 345600) / 604800) = X - 1 (approximately)
-- We need to convert each row's week_number

DO $$
DECLARE
  v_record record;
  v_correct_week bigint;
  v_epoch_start constant bigint := 345600;
  v_seconds_per_week constant bigint := 604800;
  v_existing record;
BEGIN
  FOR v_record IN
    SELECT id, affiliate_wallet, week_number, pending_lamports, tier, referral_count, 
           is_released, is_swept_to_delta, swept_at, created_at
    FROM affiliate_weekly_accumulator
    WHERE is_swept_to_delta = false
    ORDER BY created_at
  LOOP
    v_correct_week := calculate_week_number(v_record.created_at);
    
    IF v_correct_week != v_record.week_number THEN
      SELECT id INTO v_existing
      FROM affiliate_weekly_accumulator
      WHERE affiliate_wallet = v_record.affiliate_wallet
        AND week_number = v_correct_week
        AND id != v_record.id;

      IF v_existing IS NOT NULL THEN
        UPDATE affiliate_weekly_accumulator
        SET pending_lamports = pending_lamports + v_record.pending_lamports,
            referral_count = referral_count + v_record.referral_count,
            updated_at = now()
        WHERE id = v_existing.id;

        DELETE FROM affiliate_weekly_accumulator WHERE id = v_record.id;
      ELSE
        UPDATE affiliate_weekly_accumulator
        SET week_number = v_correct_week,
            updated_at = now()
        WHERE id = v_record.id;
      END IF;
    END IF;
  END LOOP;
END $$;
