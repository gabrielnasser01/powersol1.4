/*
  # Delta Tracking and Unclaimed Affiliate Rewards Sweep

  1. New Tables
    - `delta_transfers`
      - `id` (uuid, primary key)
      - `source` (text) - 'ticket_purchase' or 'unclaimed_sweep'
      - `ticket_purchase_id` (uuid, nullable) - FK to ticket_purchases if from purchase
      - `sweep_week_number` (bigint, nullable) - week number if from sweep
      - `affiliate_wallet` (text, nullable) - which affiliate's unclaimed rewards
      - `amount_lamports` (bigint) - delta amount sent to delta wallet
      - `tier` (smallint, nullable) - affiliate tier at time of transfer
      - `commission_rate` (numeric, nullable) - commission rate used
      - `transaction_signature` (text, nullable)
      - `created_at` (timestamptz)

  2. Modified Functions
    - Updates `process_affiliate_commission_on_purchase` to also track delta amount per purchase
    - Creates `sweep_unclaimed_affiliate_rewards` function to move expired unclaimed rewards to delta

  3. Security
    - RLS enabled on delta_transfers
    - Only service_role can write
    - Authenticated users can view their related delta entries

  4. Important Notes
    - When a ticket is purchased WITH a referral: delta = 30% - commission% (tracked in delta_transfers)
    - When a ticket is purchased WITHOUT a referral: full 30% goes to delta (tracked in delta_transfers)
    - Unclaimed affiliate rewards past the claim deadline are swept to delta
    - The affiliate_weekly_accumulator entries that pass their release deadline without being claimed
      get marked as swept and logged in delta_transfers
*/

CREATE TABLE IF NOT EXISTS delta_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('ticket_purchase', 'unclaimed_sweep', 'no_referral')),
  ticket_purchase_id uuid REFERENCES ticket_purchases(id),
  sweep_week_number bigint,
  affiliate_wallet text,
  amount_lamports bigint NOT NULL CHECK (amount_lamports > 0),
  tier smallint,
  commission_rate numeric,
  transaction_signature text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delta_transfers_source ON delta_transfers(source);
CREATE INDEX IF NOT EXISTS idx_delta_transfers_created ON delta_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_delta_transfers_sweep_week ON delta_transfers(sweep_week_number) WHERE sweep_week_number IS NOT NULL;

ALTER TABLE delta_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage delta_transfers"
  ON delta_transfers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view delta_transfers"
  ON delta_transfers FOR SELECT
  TO authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_weekly_accumulator' AND column_name = 'is_swept_to_delta'
  ) THEN
    ALTER TABLE affiliate_weekly_accumulator ADD COLUMN is_swept_to_delta boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_weekly_accumulator' AND column_name = 'swept_at'
  ) THEN
    ALTER TABLE affiliate_weekly_accumulator ADD COLUMN swept_at timestamptz;
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

DROP TRIGGER IF EXISTS trg_auto_affiliate_commission ON ticket_purchases;

CREATE TRIGGER trg_auto_affiliate_commission
  AFTER INSERT ON ticket_purchases
  FOR EACH ROW
  EXECUTE FUNCTION process_affiliate_commission_on_purchase();

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
  v_current_week := floor(extract(epoch from now()) / (7 * 24 * 60 * 60))::bigint;
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

CREATE OR REPLACE FUNCTION get_delta_summary()
RETURNS TABLE (
  total_from_purchases bigint,
  total_from_no_referral bigint,
  total_from_sweeps bigint,
  grand_total bigint,
  transfer_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN source = 'ticket_purchase' THEN amount_lamports ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN source = 'no_referral' THEN amount_lamports ELSE 0 END), 0)::bigint,
    COALESCE(SUM(CASE WHEN source = 'unclaimed_sweep' THEN amount_lamports ELSE 0 END), 0)::bigint,
    COALESCE(SUM(amount_lamports), 0)::bigint,
    COUNT(*)::bigint
  FROM delta_transfers;
END;
$$;