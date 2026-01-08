/*
  # Weekly Affiliate Release System

  1. New Tables
    - `affiliate_weekly_accumulator`
      - Tracks weekly earnings per affiliate
      - Resets each week, releases on Wednesday 23:59:59 GMT
      
    - `affiliate_release_schedule`
      - Tracks weekly release windows
      - Records when claims become available
      
  2. Functions
    - `calculate_week_number` - Get current week number from epoch
    - `is_claim_available` - Check if Wednesday 23:59:59 GMT has passed
    - `get_next_release_timestamp` - Get next Wednesday 23:59:59 GMT
    - `accumulate_affiliate_earning` - Add earnings during the week
    - `get_claimable_affiliate_balance` - Get available balance after release
    - `process_affiliate_claim` - Process claim after release time

  3. Security
    - Enable RLS on all tables
    - Users can only view their own accumulator
*/

CREATE TABLE IF NOT EXISTS affiliate_weekly_accumulator (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_wallet text NOT NULL,
  week_number bigint NOT NULL,
  pending_lamports bigint NOT NULL DEFAULT 0,
  tier smallint NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 4),
  referral_count integer NOT NULL DEFAULT 0,
  is_released boolean NOT NULL DEFAULT false,
  released_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(affiliate_wallet, week_number)
);

CREATE TABLE IF NOT EXISTS affiliate_release_schedule (
  week_number bigint PRIMARY KEY,
  release_timestamp timestamptz NOT NULL,
  is_released boolean NOT NULL DEFAULT false,
  total_to_release bigint NOT NULL DEFAULT 0,
  total_claimed bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_acc_wallet ON affiliate_weekly_accumulator(affiliate_wallet);
CREATE INDEX IF NOT EXISTS idx_weekly_acc_week ON affiliate_weekly_accumulator(week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_acc_released ON affiliate_weekly_accumulator(is_released) WHERE is_released = false;

ALTER TABLE affiliate_weekly_accumulator ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_release_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly accumulator"
  ON affiliate_weekly_accumulator FOR SELECT
  TO authenticated
  USING (affiliate_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Service can manage weekly accumulator"
  ON affiliate_weekly_accumulator FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view release schedule"
  ON affiliate_release_schedule FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Service can manage release schedule"
  ON affiliate_release_schedule FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION calculate_week_number(ts timestamptz DEFAULT now())
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  epoch_start bigint := 345600;
  seconds_per_week bigint := 604800;
  unix_ts bigint;
BEGIN
  unix_ts := EXTRACT(EPOCH FROM ts)::bigint;
  RETURN (unix_ts - epoch_start) / seconds_per_week;
END;
$$;

CREATE OR REPLACE FUNCTION get_wednesday_release_timestamp(week_num bigint)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  epoch_start bigint := 345600;
  seconds_per_week bigint := 604800;
  wednesday_offset bigint := 259199;
BEGIN
  RETURN to_timestamp(epoch_start + (week_num * seconds_per_week) + wednesday_offset);
END;
$$;

CREATE OR REPLACE FUNCTION is_affiliate_claim_available(week_num bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  current_week bigint;
  release_ts timestamptz;
BEGIN
  current_week := calculate_week_number(now());
  
  IF week_num < current_week THEN
    RETURN true;
  END IF;
  
  IF week_num = current_week THEN
    release_ts := get_wednesday_release_timestamp(week_num);
    RETURN now() >= release_ts;
  END IF;
  
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION accumulate_affiliate_earning_v2(
  p_affiliate_wallet text,
  p_ticket_amount_lamports bigint,
  p_affiliate_tier smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  commission_rate numeric;
  earning_lamports bigint;
  current_week bigint;
  release_ts timestamptz;
BEGIN
  commission_rate := CASE p_affiliate_tier
    WHEN 1 THEN 0.05
    WHEN 2 THEN 0.10
    WHEN 3 THEN 0.20
    WHEN 4 THEN 0.30
    ELSE 0.05
  END;
  
  earning_lamports := (p_ticket_amount_lamports * commission_rate)::bigint;
  current_week := calculate_week_number(now());
  release_ts := get_wednesday_release_timestamp(current_week);
  
  INSERT INTO affiliate_weekly_accumulator (
    affiliate_wallet, 
    week_number,
    pending_lamports, 
    tier, 
    referral_count
  )
  VALUES (
    p_affiliate_wallet, 
    current_week,
    earning_lamports, 
    p_affiliate_tier, 
    1
  )
  ON CONFLICT (affiliate_wallet, week_number) DO UPDATE SET
    pending_lamports = affiliate_weekly_accumulator.pending_lamports + earning_lamports,
    tier = GREATEST(affiliate_weekly_accumulator.tier, p_affiliate_tier),
    referral_count = affiliate_weekly_accumulator.referral_count + 1,
    updated_at = now();
    
  INSERT INTO affiliate_release_schedule (week_number, release_timestamp, total_to_release)
  VALUES (current_week, release_ts, earning_lamports)
  ON CONFLICT (week_number) DO UPDATE SET
    total_to_release = affiliate_release_schedule.total_to_release + earning_lamports;
    
  UPDATE pool_balances
  SET total_deposited = total_deposited + earning_lamports,
      last_synced = now()
  WHERE pool_type = 'affiliate_pool';
END;
$$;

CREATE OR REPLACE FUNCTION get_claimable_affiliate_balance_v2(p_wallet text)
RETURNS TABLE (
  week_number bigint,
  pending_lamports bigint,
  tier smallint,
  referral_count integer,
  release_timestamp timestamptz,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    awa.week_number,
    awa.pending_lamports,
    awa.tier,
    awa.referral_count,
    get_wednesday_release_timestamp(awa.week_number) as release_timestamp,
    is_affiliate_claim_available(awa.week_number) as is_available
  FROM affiliate_weekly_accumulator awa
  WHERE awa.affiliate_wallet = p_wallet
    AND awa.is_released = false
    AND awa.pending_lamports > 0
  ORDER BY awa.week_number ASC;
END;
$$;

CREATE OR REPLACE FUNCTION process_affiliate_claim_v2(
  p_wallet text,
  p_week_number bigint,
  p_tx_signature text
)
RETURNS TABLE (
  success boolean,
  amount_claimed bigint,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount bigint;
  v_tier smallint;
  v_ref_count integer;
BEGIN
  IF NOT is_affiliate_claim_available(p_week_number) THEN
    RETURN QUERY SELECT false, 0::bigint, 'Claim not yet available - wait until Wednesday 23:59:59 GMT'::text;
    RETURN;
  END IF;
  
  SELECT pending_lamports, tier, referral_count
  INTO v_amount, v_tier, v_ref_count
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet
    AND week_number = p_week_number
    AND is_released = false
  FOR UPDATE;
  
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN QUERY SELECT false, 0::bigint, 'No pending rewards for this week'::text;
    RETURN;
  END IF;
  
  UPDATE affiliate_weekly_accumulator
  SET is_released = true,
      released_at = now(),
      updated_at = now()
  WHERE affiliate_wallet = p_wallet
    AND week_number = p_week_number;
  
  INSERT INTO onchain_affiliate_claims (
    affiliate_wallet,
    amount_lamports,
    tier,
    referral_count,
    claim_nonce,
    tx_signature
  ) VALUES (
    p_wallet,
    v_amount,
    v_tier,
    v_ref_count,
    p_week_number,
    p_tx_signature
  );
  
  UPDATE affiliate_release_schedule
  SET total_claimed = total_claimed + v_amount,
      is_released = true
  WHERE week_number = p_week_number;
  
  UPDATE pool_balances
  SET total_claimed = total_claimed + v_amount,
      last_synced = now()
  WHERE pool_type = 'affiliate_pool';
  
  RETURN QUERY SELECT true, v_amount, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION get_next_affiliate_release()
RETURNS TABLE (
  next_release_timestamp timestamptz,
  current_week bigint,
  time_until_release interval
)
LANGUAGE plpgsql
AS $$
DECLARE
  curr_week bigint;
  release_ts timestamptz;
BEGIN
  curr_week := calculate_week_number(now());
  release_ts := get_wednesday_release_timestamp(curr_week);
  
  IF now() >= release_ts THEN
    curr_week := curr_week + 1;
    release_ts := get_wednesday_release_timestamp(curr_week);
  END IF;
  
  RETURN QUERY SELECT 
    release_ts,
    curr_week,
    release_ts - now();
END;
$$;
