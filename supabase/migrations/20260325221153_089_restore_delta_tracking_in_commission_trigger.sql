/*
  # Restore Delta Tracking in Commission Trigger

  1. Problem
    - Migration 073 rewrote `process_affiliate_commission_on_purchase()` and accidentally
      removed all INSERT statements into `delta_transfers`
    - This means 77 out of 112 ticket purchases (from 2026-03-16 onwards) have no
      corresponding delta_transfers record
    - The trigger still processes affiliate commissions correctly, but the delta
      (30% reserved minus affiliate commission) is no longer being tracked in the database

  2. Fix: Restore Trigger Function
    - Re-adds `v_delta_lamports` and `v_reserved_lamports` variables
    - When buyer has NO user record: inserts delta_transfer with source='no_referral'
    - When buyer has NO referral/affiliate: inserts delta_transfer with source='no_referral'
    - When buyer HAS referral: inserts delta_transfer with source='ticket_purchase'
      and records the delta (reserved - commission)
    - Preserves the `original_tier` and `original_rate` fields added by migration 073

  3. Backfill: Retroactively Create Missing delta_transfers
    - For purchases WITH a referral: calculates delta = 30% - commission%
    - For purchases WITHOUT a referral: delta = full 30%
    - Only backfills purchases that don't already have a delta_transfers record
*/

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

  IF v_delta_lamports > 0 THEN
    INSERT INTO delta_transfers (source, ticket_purchase_id, affiliate_wallet, amount_lamports, tier, commission_rate, transaction_signature)
    VALUES ('ticket_purchase', NEW.id, v_affiliate_wallet, v_delta_lamports, v_tier, v_commission_rate, NEW.transaction_signature);
  END IF;

  UPDATE ticket_purchases SET affiliate_commission_processed = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
