/*
  # Backfill Missed Affiliate Commissions

  1. Problem
    - Existing ticket purchases were processed before referral records existed
    - Commissions were incorrectly sent to house_earnings / delta_transfers as 'no_referral'

  2. Solution
    - Run the retroactive commission logic for all existing referrals
    - This one-time migration corrects historical data

  3. Affected Data
    - Recalculates commissions for all referred users who have purchases marked as 'no_referral'
    - Updates: referrals, affiliates, affiliate_pending_rewards, affiliate_weekly_accumulator
    - Moves incorrect house_earnings and delta_transfers to correct affiliate commission records
*/

DO $$
DECLARE
  v_ref record;
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
  v_total_commission_sol numeric;
  v_total_tickets int;
  v_total_value_sol numeric;
  v_lamports_per_sol constant bigint := 1000000000;
  v_affiliates_max_rate constant numeric := 0.30;
  v_week_number bigint;
  v_now timestamp with time zone := now();
  v_purchase_count int;
BEGIN
  FOR v_ref IN
    SELECT r.*, u.wallet_address as referred_wallet
    FROM referrals r
    JOIN users u ON u.id = r.referred_user_id
  LOOP
    v_referred_wallet := v_ref.referred_wallet;
    v_total_commission_sol := 0;
    v_total_tickets := 0;
    v_total_value_sol := 0;
    v_purchase_count := 0;

    SELECT a.id as aff_id, a.user_id as aff_user_id, a.manual_tier
    INTO v_affiliate
    FROM affiliates a
    WHERE a.id = v_ref.referrer_affiliate_id;

    IF v_affiliate IS NULL THEN
      CONTINUE;
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
      CONTINUE;
    END IF;

    FOR v_purchase IN
      SELECT tp.*
      FROM ticket_purchases tp
      JOIN delta_transfers dt ON dt.ticket_purchase_id = tp.id AND dt.source = 'no_referral'
      WHERE tp.wallet_address = v_referred_wallet
        AND tp.affiliate_commission_processed = true
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
      CONTINUE;
    END IF;

    UPDATE referrals SET
      is_validated = true,
      first_purchase_at = COALESCE(first_purchase_at, v_now),
      total_tickets_purchased = COALESCE(total_tickets_purchased, 0) + v_total_tickets,
      total_value_sol = COALESCE(total_value_sol, 0) + v_total_value_sol,
      total_commission_earned = COALESCE(total_commission_earned, 0) + v_total_commission_sol,
      updated_at = v_now
    WHERE id = v_ref.id;

    UPDATE affiliates SET
      total_earned = COALESCE(total_earned, 0) + v_total_commission_sol,
      pending_earnings = COALESCE(pending_earnings, 0) + v_total_commission_sol,
      updated_at = v_now
    WHERE id = v_affiliate.aff_id;

    v_week_number := floor(extract(epoch from v_now) / (7 * 24 * 60 * 60))::bigint;

    INSERT INTO affiliate_pending_rewards (affiliate_wallet, pending_lamports, tier, referral_count, total_earned_lamports, total_claimed_lamports, next_claim_nonce)
    VALUES (v_affiliate_wallet, floor(v_total_commission_sol * v_lamports_per_sol)::bigint, v_tier, 0, floor(v_total_commission_sol * v_lamports_per_sol)::bigint, 0, 0)
    ON CONFLICT (affiliate_wallet) DO UPDATE SET
      pending_lamports = affiliate_pending_rewards.pending_lamports + floor(v_total_commission_sol * v_lamports_per_sol)::bigint,
      total_earned_lamports = affiliate_pending_rewards.total_earned_lamports + floor(v_total_commission_sol * v_lamports_per_sol)::bigint,
      last_updated = v_now;

    INSERT INTO affiliate_weekly_accumulator (affiliate_wallet, week_number, pending_lamports, tier, referral_count, is_released)
    VALUES (v_affiliate_wallet, v_week_number, floor(v_total_commission_sol * v_lamports_per_sol)::bigint, v_tier, 0, false)
    ON CONFLICT (affiliate_wallet, week_number) DO UPDATE SET
      pending_lamports = affiliate_weekly_accumulator.pending_lamports + floor(v_total_commission_sol * v_lamports_per_sol)::bigint,
      updated_at = v_now;

    RAISE NOTICE 'Backfilled % purchases for referral % -> affiliate %', v_purchase_count, v_referred_wallet, v_affiliate_wallet;
  END LOOP;
END $$;
