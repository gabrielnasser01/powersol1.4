/*
  # Automatic Affiliate Commission on Ticket Purchase

  1. Changes
    - Adds `affiliate_commission_processed` boolean column to `ticket_purchases` to prevent double-processing
    - Creates `process_affiliate_commission_on_purchase()` trigger function that:
      - Looks up the buyer by wallet_address in `users`
      - Checks if the buyer has a referral in `referrals`
      - Calculates commission based on the affiliate's tier (5%/10%/20%/30%)
      - Updates `referrals` (tickets, value, commission totals)
      - Updates `affiliates` (total_earned, pending_earnings)
      - Inserts into `solana_affiliate_earnings`
      - Upserts `affiliate_pending_rewards`
      - Upserts `affiliate_weekly_accumulator`
      - Marks the ticket_purchase as commission-processed
      - If NO referral exists, inserts into `house_earnings` instead
    - Creates trigger `trg_auto_affiliate_commission` on `ticket_purchases` AFTER INSERT

  2. Security
    - Function runs as SECURITY DEFINER to access all required tables
    - Only fires on INSERT, not on UPDATE/DELETE
    - Idempotent: skips if `affiliate_commission_processed` is already true

  3. Important Notes
    - This replaces the need for frontend to call the process-commission edge function
    - Works for ALL lottery types (tri-daily, jackpot, grand-prize, special-event)
    - Commission rates: Tier 1=5%, Tier 2=10%, Tier 3=20%, Tier 4=30%
    - The HOUSE_COMMISSION_RATE (30%) is applied when no affiliate referral exists
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_purchases' AND column_name = 'affiliate_commission_processed'
  ) THEN
    ALTER TABLE ticket_purchases ADD COLUMN affiliate_commission_processed boolean DEFAULT false;
  END IF;
END $$;

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

DROP TRIGGER IF EXISTS trg_auto_affiliate_commission ON ticket_purchases;

CREATE TRIGGER trg_auto_affiliate_commission
  AFTER INSERT ON ticket_purchases
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission_on_purchase();