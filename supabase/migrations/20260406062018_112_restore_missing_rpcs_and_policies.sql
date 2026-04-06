/*
  # Restore missing RPC functions and policies

  1. Missing Functions
    - `record_donation_with_tiers` - Tiered donation rewards with power points
    - `get_all_rounder_progress` - Returns per-lottery ticket counts for all-rounder mission
    - `check_all_rounder_completion` - Checks if user has >= threshold in all 4 lottery types

  2. Missing RLS Policies
    - `whale_score_history` - Service role full access policy (table had RLS enabled but no policies)

  3. Notes
    - record_donation_with_tiers was defined in migration 044 but not re-applied in the new migration set
    - get_all_rounder_progress and check_all_rounder_completion are new helper functions
      referenced by the missions edge function
    - whale_score_history is admin-only via service role
*/

-- 1. Restore record_donation_with_tiers
CREATE OR REPLACE FUNCTION record_donation_with_tiers(
  p_wallet_address text,
  p_amount_sol numeric,
  p_transaction_signature text
)
RETURNS TABLE(points_earned integer, new_balance integer, tier_matched numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_points integer;
  v_tier numeric;
  v_user_id uuid;
  v_result record;
BEGIN
  IF p_amount_sol < 0.05 THEN
    RAISE EXCEPTION 'Minimum donation is 0.05 SOL';
  END IF;

  IF p_transaction_signature IS NULL OR length(p_transaction_signature) < 10 THEN
    RAISE EXCEPTION 'Invalid transaction signature';
  END IF;

  SELECT id INTO v_user_id
  FROM users
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    INSERT INTO users (wallet_address)
    VALUES (p_wallet_address)
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING id INTO v_user_id;

    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM users WHERE wallet_address = p_wallet_address;
    END IF;
  END IF;

  IF p_amount_sol >= 1.0 THEN
    v_points := 800;
    v_tier := 1.0;
  ELSIF p_amount_sol >= 0.5 THEN
    v_points := 350;
    v_tier := 0.5;
  ELSIF p_amount_sol >= 0.25 THEN
    v_points := 150;
    v_tier := 0.25;
  ELSE
    v_points := 50;
    v_tier := 0.05;
  END IF;

  INSERT INTO donations (user_id, amount_sol, transaction_signature, power_points_earned)
  VALUES (v_user_id, p_amount_sol, p_transaction_signature, v_points);

  SELECT r.new_balance INTO v_result
  FROM add_power_points(
    p_wallet_address,
    v_points,
    'donation',
    'Donation of ' || p_amount_sol || ' SOL (tier ' || v_tier || ' SOL) - tx: ' || left(p_transaction_signature, 8) || '...'
  ) r;

  RETURN QUERY SELECT v_points, v_result.new_balance, v_tier;
END;
$$;

-- 2. Create get_all_rounder_progress
CREATE OR REPLACE FUNCTION get_all_rounder_progress(wallet_param text)
RETURNS TABLE(lottery_type text, ticket_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT lt.lottery_type, COALESCE(SUM(tp.quantity), 0)::bigint AS ticket_count
  FROM unnest(ARRAY['tri_daily', 'jackpot', 'special_event', 'grand_prize']) AS lt(lottery_type)
  LEFT JOIN ticket_purchases tp
    ON tp.lottery_type = lt.lottery_type
    AND tp.wallet_address = wallet_param
  GROUP BY lt.lottery_type
  ORDER BY lt.lottery_type;
END;
$$;

-- 3. Create check_all_rounder_completion
CREATE OR REPLACE FUNCTION check_all_rounder_completion(wallet_param text, threshold integer DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  min_tickets integer;
BEGIN
  SELECT COALESCE(MIN(lottery_total), 0) INTO min_tickets
  FROM (
    SELECT COALESCE(SUM(tp.quantity), 0) AS lottery_total
    FROM unnest(ARRAY['tri_daily', 'jackpot', 'special_event', 'grand_prize']) AS lt(lottery_type)
    LEFT JOIN ticket_purchases tp
      ON tp.lottery_type = lt.lottery_type
      AND tp.wallet_address = wallet_param
    GROUP BY lt.lottery_type
  ) sub;

  RETURN min_tickets >= threshold;
END;
$$;

-- 4. Add service role policy for whale_score_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whale_score_history'
    AND policyname = 'Service role full access on whale_score_history'
  ) THEN
    CREATE POLICY "Service role full access on whale_score_history"
      ON whale_score_history
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
