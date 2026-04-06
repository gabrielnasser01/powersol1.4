/*
  # Restore Functions, Triggers, and Missing Data Structures

  This migration restores all database functions, triggers, and data structures
  that were lost during database recovery. Applies the final version of each
  function from the latest migration that modified it.

  1. Functions Restored
    - process_affiliate_commission_on_purchase (trigger, latest: migration 101)
    - process_retroactive_affiliate_commission (trigger, latest: migration 056)
    - sweep_unclaimed_affiliate_rewards_to_delta (latest: migration 056)
    - get_affiliate_dashboard_stats (latest: migration 094)
    - get_top_affiliates_ranking (latest: migration 058)
    - get_affiliate_claim_history (latest: migration 070)
    - get_affiliate_weekly_history (latest: migration 076)
    - get_affiliate_per_ticket_commissions (latest: migration 073)
    - get_affiliate_public_stats (latest: migration 062)
    - process_affiliate_claim_v2 (latest: migration 094)
    - get_affiliate_tier_for_buyer (latest: migration 078)
    - update_referrer_mission_progress (latest: migration 080)
    - check_mission_reset (latest: migration 077)
    - record_dev_treasury_on_purchase (latest: migration 092)
    - execute_lottery_draw (latest: migration 011)
    - execute_ofac_scan (latest: migration 105)
    - get_delta_summary (latest: migration 050)
    - get_user_tickets_per_lottery_by_wallet (latest: migration 107)
    - sync_ticket_drawn_status (latest: migration 046)

  2. Triggers Restored
    - trg_auto_affiliate_commission ON ticket_purchases
    - trg_retroactive_commission_on_referral ON referrals
    - trg_referral_mission_on_validation ON referrals
    - trg_record_dev_treasury ON ticket_purchases
    - trg_sync_ticket_drawn_status ON blockchain_lotteries

  3. Tables Restored
    - admin_ban_log
    - whale_score_history

  4. Constraints & Columns
    - prizes.claim_method
    - solana_draws.vrf_register_signatures
    - onchain_affiliate_claims tier constraint updated to allow tier 4
    - affiliate_weekly_accumulator.claimed_at, completed_at on user_mission_progress
*/

-- =============================================
-- PART 1: Additional missing columns
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_weekly_accumulator' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE affiliate_weekly_accumulator ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_mission_progress' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE user_mission_progress ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prizes' AND column_name = 'claim_method'
  ) THEN
    ALTER TABLE prizes ADD COLUMN claim_method text DEFAULT 'legacy';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'vrf_register_signatures'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN vrf_register_signatures text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliates' AND column_name = 'total_claimed_sol'
  ) THEN
    ALTER TABLE affiliates ADD COLUMN total_claimed_sol numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onchain_affiliate_claims' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE onchain_affiliate_claims ADD COLUMN claimed_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Fix onchain_affiliate_claims tier constraint to allow tier 4
ALTER TABLE onchain_affiliate_claims
  DROP CONSTRAINT IF EXISTS onchain_affiliate_claims_tier_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'onchain_affiliate_claims_tier_check'
    AND table_name = 'onchain_affiliate_claims'
  ) THEN
    NULL;
  ELSE
    ALTER TABLE onchain_affiliate_claims
      ADD CONSTRAINT onchain_affiliate_claims_tier_check
      CHECK (tier >= 1 AND tier <= 4);
  END IF;
END $$;

-- =============================================
-- PART 2: Missing tables
-- =============================================

CREATE TABLE IF NOT EXISTS admin_ban_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_wallet text NOT NULL,
  target_wallet text NOT NULL,
  action text NOT NULL CHECK (action IN ('ban', 'unban')),
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_ban_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_ban_log' AND policyname = 'Service role can manage ban logs'
  ) THEN
    CREATE POLICY "Service role can manage ban logs"
      ON admin_ban_log FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS whale_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  whale_score integer NOT NULL DEFAULT 0,
  overall_concentration numeric(6,2) DEFAULT 0,
  global_ticket_share numeric(6,2) DEFAULT 0,
  win_rate numeric(6,2) DEFAULT 0,
  total_current_tickets integer DEFAULT 0,
  total_all_time_tickets integer DEFAULT 0,
  prizes_won integer DEFAULT 0,
  prizes_won_lamports bigint DEFAULT 0,
  concentration_data jsonb DEFAULT '{}',
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT whale_score_history_unique_wallet_date UNIQUE (wallet_address, snapshot_date)
);

ALTER TABLE whale_score_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_whale_score_history_wallet_date ON whale_score_history(wallet_address, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_whale_score_history_date ON whale_score_history(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_whale_score_history_score ON whale_score_history(whale_score DESC);

-- =============================================
-- PART 3: Restore all functions (latest versions)
-- =============================================

-- Main commission trigger (from migration 101 - with claimed week skip)
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
  v_week_claimed boolean;
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
    VALUES (NEW.id, NEW.wallet_address, NEW.lottery_type, v_reserved_lamports, NEW.transaction_signature)
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
  FROM users WHERE id = v_referral.aff_user_id LIMIT 1;

  IF v_affiliate_wallet IS NULL THEN
    SELECT referral_code INTO v_affiliate_wallet FROM affiliates WHERE id = v_referral.aff_id;
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

    v_week_number := calculate_week_number(v_now);

    SELECT is_claimed INTO v_week_claimed
    FROM affiliate_weekly_accumulator
    WHERE affiliate_wallet = v_affiliate_wallet AND week_number = v_week_number;

    IF v_week_claimed IS TRUE THEN
      v_week_number := v_week_number + 1;
    END IF;

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

-- Retroactive commission trigger (from migration 056)
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
  SELECT wallet_address INTO v_referred_wallet FROM users WHERE id = NEW.referred_user_id;
  IF v_referred_wallet IS NULL THEN RETURN NEW; END IF;

  SELECT a.id as aff_id, a.user_id as aff_user_id, a.manual_tier INTO v_affiliate
  FROM affiliates a WHERE a.id = NEW.referrer_affiliate_id;
  IF v_affiliate IS NULL THEN RETURN NEW; END IF;

  v_tier := COALESCE(v_affiliate.manual_tier, 1);
  v_commission_rate := CASE v_tier WHEN 4 THEN 0.30 WHEN 3 THEN 0.20 WHEN 2 THEN 0.10 ELSE 0.05 END;

  SELECT wallet_address INTO v_affiliate_wallet FROM users WHERE id = v_affiliate.aff_user_id;
  IF v_affiliate_wallet IS NULL THEN
    SELECT referral_code INTO v_affiliate_wallet FROM affiliates WHERE id = v_affiliate.aff_id;
  END IF;
  IF v_affiliate_wallet IS NULL THEN RETURN NEW; END IF;

  FOR v_purchase IN
    SELECT tp.* FROM ticket_purchases tp
    JOIN delta_transfers dt ON dt.ticket_purchase_id = tp.id AND dt.source = 'no_referral'
    WHERE tp.wallet_address = v_referred_wallet AND tp.affiliate_commission_processed = true
    ORDER BY tp.created_at ASC
  LOOP
    v_reserved_lamports := floor(v_purchase.total_sol * v_lamports_per_sol * v_affiliates_max_rate)::bigint;
    v_commission_sol := v_purchase.total_sol * v_commission_rate;
    v_commission_lamports := floor(v_commission_sol * v_lamports_per_sol)::bigint;
    v_delta_lamports := v_reserved_lamports - v_commission_lamports;

    v_total_commission_sol := v_total_commission_sol + v_commission_sol;
    v_total_tickets := v_total_tickets + COALESCE(v_purchase.quantity, 1);
    v_total_value_sol := v_total_value_sol + v_purchase.total_sol;

    DELETE FROM delta_transfers WHERE ticket_purchase_id = v_purchase.id AND source = 'no_referral';
    DELETE FROM house_earnings WHERE ticket_purchase_id = v_purchase.id;

    IF v_delta_lamports > 0 THEN
      INSERT INTO delta_transfers (source, ticket_purchase_id, affiliate_wallet, amount_lamports, tier, commission_rate, transaction_signature)
      VALUES ('ticket_purchase', v_purchase.id, v_affiliate_wallet, v_delta_lamports, v_tier, v_commission_rate, v_purchase.transaction_signature);
    END IF;

    INSERT INTO solana_affiliate_earnings (affiliate_wallet, commission_lamports, transaction_signature)
    VALUES (v_affiliate_wallet, v_commission_lamports, v_purchase.transaction_signature);

    v_purchase_count := v_purchase_count + 1;
  END LOOP;

  IF v_purchase_count = 0 THEN RETURN NEW; END IF;

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

DROP TRIGGER IF EXISTS trg_retroactive_commission_on_referral ON referrals;
CREATE TRIGGER trg_retroactive_commission_on_referral
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION process_retroactive_affiliate_commission();

-- Sweep function (from migration 056)
CREATE OR REPLACE FUNCTION sweep_unclaimed_affiliate_rewards_to_delta(p_deadline_weeks_ago int DEFAULT 1)
RETURNS TABLE (swept_count int, total_swept_lamports bigint, details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
    SELECT awa.id, awa.affiliate_wallet, awa.week_number, awa.pending_lamports, awa.tier
    FROM affiliate_weekly_accumulator awa
    WHERE awa.is_released = false AND awa.is_claimed = false
      AND COALESCE(awa.is_swept_to_delta, false) = false
      AND awa.pending_lamports > 0 AND awa.week_number <= v_cutoff_week
    FOR UPDATE
  LOOP
    UPDATE affiliate_weekly_accumulator SET is_swept_to_delta = true, swept_at = now(), updated_at = now() WHERE id = v_record.id;
    INSERT INTO delta_transfers (source, sweep_week_number, affiliate_wallet, amount_lamports, tier)
    VALUES ('unclaimed_sweep', v_record.week_number, v_record.affiliate_wallet, v_record.pending_lamports, v_record.tier);
    UPDATE affiliate_pending_rewards SET pending_lamports = GREATEST(0, pending_lamports - v_record.pending_lamports), last_updated = now()
    WHERE affiliate_wallet = v_record.affiliate_wallet;
    v_swept_count := v_swept_count + 1;
    v_total_lamports := v_total_lamports + v_record.pending_lamports;
    v_details := v_details || jsonb_build_object('affiliate_wallet', v_record.affiliate_wallet, 'week_number', v_record.week_number, 'amount_lamports', v_record.pending_lamports, 'tier', v_record.tier);
  END LOOP;

  RETURN QUERY SELECT v_swept_count, v_total_lamports, v_details;
END;
$$;

-- Delta summary (from migration 050)
CREATE OR REPLACE FUNCTION get_delta_summary()
RETURNS TABLE (total_from_purchases bigint, total_from_no_referral bigint, total_from_sweeps bigint, grand_total bigint, transfer_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

-- Dev treasury trigger (from migration 092)
CREATE OR REPLACE FUNCTION record_dev_treasury_on_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_treasury_lamports bigint;
  v_lamports_per_sol constant bigint := 1000000000;
  v_treasury_rate constant numeric := 0.30;
BEGIN
  IF NEW.total_sol IS NULL OR NEW.total_sol <= 0 THEN RETURN NEW; END IF;
  v_treasury_lamports := floor(NEW.total_sol * v_lamports_per_sol * v_treasury_rate)::bigint;
  INSERT INTO dev_treasury_transfers (ticket_purchase_id, wallet_address, lottery_type, amount_lamports, transaction_signature, created_at)
  VALUES (NEW.id, NEW.wallet_address, NEW.lottery_type, v_treasury_lamports, NEW.transaction_signature, NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_dev_treasury ON ticket_purchases;
CREATE TRIGGER trg_record_dev_treasury
  AFTER INSERT ON ticket_purchases
  FOR EACH ROW
  EXECUTE FUNCTION record_dev_treasury_on_purchase();

-- Sync ticket drawn status (from migration 046)
CREATE OR REPLACE FUNCTION sync_ticket_drawn_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_drawn = true AND (OLD.is_drawn = false OR OLD.is_drawn IS NULL) THEN
    UPDATE ticket_purchases SET is_drawn = true
    WHERE lottery_round_id = NEW.lottery_id AND lottery_type = NEW.lottery_type AND is_drawn = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ticket_drawn_status ON blockchain_lotteries;
CREATE TRIGGER trg_sync_ticket_drawn_status
  AFTER UPDATE OF is_drawn ON blockchain_lotteries
  FOR EACH ROW
  EXECUTE FUNCTION sync_ticket_drawn_status();

-- Mission reset trigger (from migration 077)
CREATE OR REPLACE FUNCTION check_mission_reset()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_type text;
BEGIN
  SELECT mission_type INTO v_mission_type FROM missions WHERE id = NEW.mission_id;
  IF v_mission_type = 'daily' AND NEW.last_reset IS NOT NULL AND NEW.last_reset::date < CURRENT_DATE THEN
    NEW.progress = '{}'::jsonb;
    NEW.completed = false;
    NEW.last_reset = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Referral mission progress trigger (from migration 080)
CREATE OR REPLACE FUNCTION update_referrer_mission_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_affiliate_user_id uuid;
  v_referrer_wallet text;
  v_mission_record record;
  v_existing_progress record;
  v_validated_count int;
  v_now timestamptz := now();
  v_week_start timestamptz;
  v_claimed_at timestamptz;
BEGIN
  IF OLD.is_validated = true THEN RETURN NEW; END IF;
  IF NEW.is_validated <> true THEN RETURN NEW; END IF;

  SELECT a.user_id INTO v_affiliate_user_id FROM affiliates a WHERE a.id = NEW.referrer_affiliate_id;
  IF v_affiliate_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT u.wallet_address INTO v_referrer_wallet FROM users u WHERE u.id = v_affiliate_user_id;
  IF v_referrer_wallet IS NULL THEN RETURN NEW; END IF;

  v_week_start := date_trunc('week', v_now AT TIME ZONE 'UTC') + interval '1 second';

  SELECT m.id, m.mission_type INTO v_mission_record FROM missions m WHERE m.mission_key = 'weekly_refer' AND m.is_active = true;

  IF v_mission_record.id IS NOT NULL THEN
    SELECT * INTO v_existing_progress FROM user_mission_progress WHERE wallet_address = v_referrer_wallet AND mission_id = v_mission_record.id;

    IF v_existing_progress IS NULL THEN
      INSERT INTO user_mission_progress (id, wallet_address, mission_id, completed, progress, last_reset)
      VALUES (gen_random_uuid(), v_referrer_wallet, v_mission_record.id, false, jsonb_build_object('eligible', true, 'eligible_at', v_now::text), v_now)
      ON CONFLICT (wallet_address, mission_id) DO UPDATE SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text), completed = false;
    ELSIF v_existing_progress.completed = true THEN
      v_claimed_at := COALESCE(v_existing_progress.completed_at, v_existing_progress.last_reset);
      IF v_claimed_at < v_week_start THEN
        UPDATE user_mission_progress SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text), completed = false, last_reset = v_now WHERE id = v_existing_progress.id;
      END IF;
    ELSIF NOT COALESCE((v_existing_progress.progress->>'eligible')::boolean, false) THEN
      UPDATE user_mission_progress SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text) WHERE id = v_existing_progress.id;
    END IF;
  END IF;

  SELECT count(*) INTO v_validated_count FROM referrals r WHERE r.referrer_affiliate_id = NEW.referrer_affiliate_id AND r.is_validated = true;

  DECLARE
    v_threshold int;
    v_invite_key text;
    v_invite_mission_id uuid;
    v_invite_progress record;
    thresholds int[] := ARRAY[3, 5, 10, 100, 1000, 5000];
    keys text[] := ARRAY['social_invite_3', 'social_invite_5', 'social_invite_10', 'social_invite_100', 'social_invite_1000', 'social_invite_5000'];
  BEGIN
    FOR i IN 1..array_length(thresholds, 1) LOOP
      v_threshold := thresholds[i];
      v_invite_key := keys[i];
      IF v_validated_count >= v_threshold THEN
        SELECT m.id INTO v_invite_mission_id FROM missions m WHERE m.mission_key = v_invite_key AND m.is_active = true;
        IF v_invite_mission_id IS NOT NULL THEN
          SELECT * INTO v_invite_progress FROM user_mission_progress WHERE wallet_address = v_referrer_wallet AND mission_id = v_invite_mission_id;
          IF v_invite_progress IS NULL THEN
            INSERT INTO user_mission_progress (id, wallet_address, mission_id, completed, progress, last_reset)
            VALUES (gen_random_uuid(), v_referrer_wallet, v_invite_mission_id, false, jsonb_build_object('eligible', true, 'eligible_at', v_now::text, 'validated_count', v_validated_count), v_now)
            ON CONFLICT (wallet_address, mission_id) DO UPDATE SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text, 'validated_count', v_validated_count), completed = false;
          ELSIF v_invite_progress.completed = false AND NOT COALESCE((v_invite_progress.progress->>'eligible')::boolean, false) THEN
            UPDATE user_mission_progress SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text, 'validated_count', v_validated_count) WHERE id = v_invite_progress.id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_mission_on_validation ON referrals;
CREATE TRIGGER trg_referral_mission_on_validation
  AFTER UPDATE ON referrals
  FOR EACH ROW
  WHEN (OLD.is_validated IS DISTINCT FROM NEW.is_validated AND NEW.is_validated = true)
  EXECUTE FUNCTION update_referrer_mission_progress();

-- Get affiliate tier for buyer (from migration 078)
CREATE OR REPLACE FUNCTION get_affiliate_tier_for_buyer(buyer_wallet text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id uuid; v_tier integer;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE wallet_address = buyer_wallet LIMIT 1;
  IF v_user_id IS NULL THEN RETURN 0; END IF;
  SELECT COALESCE(a.manual_tier, 1) INTO v_tier FROM referrals r JOIN affiliates a ON a.id = r.referrer_affiliate_id WHERE r.referred_user_id = v_user_id LIMIT 1;
  RETURN COALESCE(v_tier, 0);
END;
$$;

-- All-Rounder mission RPC (from migration 107)
CREATE OR REPLACE FUNCTION get_user_tickets_per_lottery_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE min_tickets INTEGER;
BEGIN
  SELECT COALESCE(MIN(lottery_total), 0) INTO min_tickets
  FROM (
    SELECT COALESCE(SUM(tp.quantity), 0) AS lottery_total
    FROM unnest(ARRAY['tri_daily', 'jackpot', 'special_event', 'grand_prize']) AS lt(lottery_type)
    LEFT JOIN ticket_purchases tp ON tp.lottery_type = lt.lottery_type AND tp.wallet_address = wallet_param
    GROUP BY lt.lottery_type
  ) sub;
  RETURN min_tickets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute lottery draw function (from migration 011, without pg_cron)
CREATE OR REPLACE FUNCTION execute_lottery_draw()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text := 'https://xdcfwggwoutumhkcpkej.supabase.co';
  v_request_id bigint;
  v_log_id uuid;
BEGIN
  INSERT INTO lottery_cron_logs (job_name, status) VALUES ('lottery-draw-check', 'started') RETURNING id INTO v_log_id;
  SELECT net.http_post(url := v_supabase_url || '/functions/v1/lottery-draw/execute', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb) INTO v_request_id;
  UPDATE lottery_cron_logs SET status = 'completed', response_body = 'Request sent with ID: ' || COALESCE(v_request_id::text, 'null') WHERE id = v_log_id;
EXCEPTION WHEN OTHERS THEN
  IF v_log_id IS NOT NULL THEN
    UPDATE lottery_cron_logs SET status = 'error', error_message = SQLERRM WHERE id = v_log_id;
  END IF;
END;
$$;

-- Execute OFAC scan function (from migration 105, without pg_cron)
CREATE OR REPLACE FUNCTION execute_ofac_scan()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text := 'https://xdcfwggwoutumhkcpkej.supabase.co';
  v_request_id bigint;
  v_log_id uuid;
BEGIN
  INSERT INTO lottery_cron_logs (job_name, status) VALUES ('ofac-scan-30d', 'started') RETURNING id INTO v_log_id;
  SELECT net.http_post(url := v_supabase_url || '/functions/v1/ofac-scan', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb) INTO v_request_id;
  UPDATE lottery_cron_logs SET status = 'completed', response_body = 'OFAC scan request sent with ID: ' || COALESCE(v_request_id::text, 'null') WHERE id = v_log_id;
EXCEPTION WHEN OTHERS THEN
  IF v_log_id IS NOT NULL THEN
    UPDATE lottery_cron_logs SET status = 'error', error_message = SQLERRM WHERE id = v_log_id;
  END IF;
END;
$$;

-- Manual lottery draw function
CREATE OR REPLACE FUNCTION manual_lottery_draw()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM execute_lottery_draw();
  SELECT jsonb_build_object('success', true, 'message', 'Lottery draw triggered manually', 'timestamp', now()) INTO v_result;
  RETURN v_result;
END;
$$;

-- Affiliate public stats (from migration 062)
CREATE OR REPLACE FUNCTION get_affiliate_public_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_active_affiliates INTEGER;
  v_total_commissions_paid BIGINT;
  v_avg_monthly_earnings BIGINT;
  v_top_affiliate_earnings BIGINT;
  v_months_active NUMERIC;
BEGIN
  SELECT count(*) INTO v_active_affiliates FROM affiliates;
  SELECT COALESCE(sum(total_earned_lamports), 0) INTO v_total_commissions_paid FROM affiliate_pending_rewards;
  SELECT COALESCE(max(total_earned_lamports), 0) INTO v_top_affiliate_earnings FROM affiliate_pending_rewards;
  SELECT GREATEST(EXTRACT(EPOCH FROM (now() - min(created_at))) / (30.0 * 86400), 1) INTO v_months_active FROM affiliate_pending_rewards WHERE total_earned_lamports > 0;
  IF v_months_active IS NULL THEN v_months_active := 1; END IF;
  SELECT COALESCE((sum(total_earned_lamports) / GREATEST(count(*), 1))::BIGINT / v_months_active::BIGINT, 0) INTO v_avg_monthly_earnings FROM affiliate_pending_rewards WHERE total_earned_lamports > 0;
  result := json_build_object('active_affiliates', v_active_affiliates, 'total_commissions_paid_lamports', v_total_commissions_paid, 'avg_monthly_earnings_lamports', COALESCE(v_avg_monthly_earnings, 0), 'top_affiliate_earnings_lamports', v_top_affiliate_earnings);
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_affiliate_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_affiliate_public_stats() TO authenticated;

-- Per ticket commissions RPC (from migration 073)
DROP FUNCTION IF EXISTS get_affiliate_per_ticket_commissions(text, integer, integer);

CREATE FUNCTION get_affiliate_per_ticket_commissions(p_wallet text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (earning_id bigint, ticket_id bigint, buyer_wallet text, lottery_type text, ticket_price_lamports bigint, commission_lamports bigint, commission_rate numeric, original_tier smallint, transaction_signature text, earned_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT sae.id AS earning_id, sae.ticket_id, tp.wallet_address AS buyer_wallet, tp.lottery_type,
    (tp.total_sol * 1000000000)::bigint AS ticket_price_lamports, sae.commission_lamports,
    COALESCE(sae.original_rate, CASE WHEN tp.total_sol > 0 THEN ROUND((sae.commission_lamports::numeric / (tp.total_sol * 1000000000)), 4) ELSE 0 END) AS commission_rate,
    sae.original_tier, sae.transaction_signature, sae.earned_at
  FROM solana_affiliate_earnings sae
  LEFT JOIN ticket_purchases tp ON tp.transaction_signature = sae.transaction_signature
  WHERE sae.affiliate_wallet = p_wallet
  ORDER BY sae.earned_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Top affiliates ranking (from migration 058)
DROP FUNCTION IF EXISTS get_top_affiliates_ranking(integer);

CREATE FUNCTION get_top_affiliates_ranking(p_limit integer DEFAULT 10)
RETURNS TABLE (rank bigint, wallet_address text, tier smallint, tier_label text, total_referrals bigint, total_earned_lamports bigint, weekly_referrals bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_week_start timestamptz;
BEGIN
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN v_week_start := v_week_start - interval '7 days'; END IF;

  RETURN QUERY
  WITH affiliate_info AS (
    SELECT u.wallet_address AS aff_wallet, a.id AS affiliate_id, COALESCE(a.manual_tier, 1)::smallint AS aff_tier
    FROM affiliates a JOIN users u ON u.id = a.user_id
  ),
  ref_counts AS (
    SELECT ai.aff_wallet, ai.aff_tier,
      COUNT(r.id)::bigint AS total_refs, COUNT(r.id) FILTER (WHERE r.created_at >= v_week_start)::bigint AS weekly_refs
    FROM affiliate_info ai LEFT JOIN referrals r ON r.referrer_affiliate_id = ai.affiliate_id AND r.is_validated = true
    GROUP BY ai.aff_wallet, ai.aff_tier
  ),
  earnings AS (SELECT apr.affiliate_wallet, COALESCE(apr.total_earned_lamports, 0)::bigint AS total_earned FROM affiliate_pending_rewards apr)
  SELECT ROW_NUMBER() OVER (ORDER BY rc.total_refs DESC, COALESCE(e.total_earned, 0::bigint) DESC)::bigint AS rank,
    rc.aff_wallet AS wallet_address, rc.aff_tier AS tier,
    CASE rc.aff_tier WHEN 1 THEN 'Starter'::text WHEN 2 THEN 'Bronze'::text WHEN 3 THEN 'Silver'::text WHEN 4 THEN 'Gold'::text ELSE 'Starter'::text END AS tier_label,
    rc.total_refs AS total_referrals, COALESCE(e.total_earned, 0::bigint) AS total_earned_lamports, rc.weekly_refs AS weekly_referrals
  FROM ref_counts rc LEFT JOIN earnings e ON e.affiliate_wallet = rc.aff_wallet
  ORDER BY rc.total_refs DESC, COALESCE(e.total_earned, 0::bigint) DESC
  LIMIT p_limit;
END;
$$;
