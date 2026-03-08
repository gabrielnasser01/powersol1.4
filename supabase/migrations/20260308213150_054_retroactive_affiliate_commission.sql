/*
  # Retroactive Affiliate Commission Processing

  1. Problem
    - When a user arrives via referral link, they often buy tickets BEFORE
      the referral record is created in the database (race condition)
    - The commission trigger runs at INSERT time on ticket_purchases,
      but at that point the referral row doesn't exist yet
    - All those purchases get marked as 'no_referral' and the affiliate
      earns nothing from them

  2. Solution
    - Add a trigger on the `referrals` table that fires AFTER INSERT
    - When a new referral is created, it finds all ticket_purchases from
      that referred user that were incorrectly classified as 'no_referral'
    - It retroactively calculates and credits the affiliate commission
    - It corrects the house_earnings and delta_transfers records

  3. Changes
    - New function: `process_retroactive_affiliate_commission()`
    - New trigger: `trg_retroactive_commission_on_referral` on `referrals`

  4. Security
    - No RLS changes needed (trigger runs as definer)
*/

CREATE OR REPLACE FUNCTION process_retroactive_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
  v_is_first boolean := true;
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

  v_week_number := floor(extract(epoch from v_now) / (7 * 24 * 60 * 60))::bigint;

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

DROP TRIGGER IF EXISTS trg_retroactive_commission_on_referral ON referrals;

CREATE TRIGGER trg_retroactive_commission_on_referral
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION process_retroactive_affiliate_commission();
