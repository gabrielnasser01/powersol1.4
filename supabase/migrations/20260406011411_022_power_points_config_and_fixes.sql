/*
  # Power Points Config & Fixes

  1. New Tables
    - `power_points_config` - Admin-configurable point values
      - `id` (uuid, primary key)
      - `config_key` (text, unique)
      - `points_value` (integer)
      - `description` (text)
      - `is_active` (boolean)
      - `updated_at`, `updated_by`

  2. Changes
    - Improve add_power_points to properly log all transactions
    - Add get_power_points_stats for admin dashboard
    - Add function to get total points in system

  3. Security
    - Only admins can view/edit config
    - Only admins can see global stats
*/

-- Create power_points_config table
CREATE TABLE IF NOT EXISTS power_points_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  points_value integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_pp_config_key ON power_points_config(config_key);

-- Enable RLS
ALTER TABLE power_points_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for power_points_config (admin only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_points_config' AND policyname = 'Admins can view pp config') THEN
    CREATE POLICY "Admins can view pp config"
      ON power_points_config
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.is_admin = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_points_config' AND policyname = 'Admins can update pp config') THEN
    CREATE POLICY "Admins can update pp config"
      ON power_points_config
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.is_admin = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'power_points_config' AND policyname = 'Admins can insert pp config') THEN
    CREATE POLICY "Admins can insert pp config"
      ON power_points_config
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.is_admin = true
        )
      );
  END IF;
END $$;

-- Insert default config values
INSERT INTO power_points_config (config_key, points_value, description) VALUES
  ('daily_login', 10, 'Points earned for daily login'),
  ('donation_base', 50, 'Base points for making a donation'),
  ('ticket_tri_daily', 5, 'Points per tri-daily lottery ticket'),
  ('ticket_weekly', 10, 'Points per weekly lottery ticket'),
  ('ticket_mega', 25, 'Points per mega lottery ticket'),
  ('referral_signup', 100, 'Points when referred user signs up'),
  ('referral_purchase', 50, 'Points when referred user makes first purchase'),
  ('streak_7_days', 50, 'Bonus for 7-day login streak'),
  ('streak_30_days', 200, 'Bonus for 30-day login streak'),
  ('mission_complete', 25, 'Default points for completing a mission')
ON CONFLICT (config_key) DO NOTHING;

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS add_power_points(text, integer, text, text, uuid, text);

-- Recreate add_power_points with proper logging
CREATE OR REPLACE FUNCTION add_power_points(
  p_wallet_address text,
  p_amount integer,
  p_transaction_type text,
  p_description text,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS TABLE(new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Get user id from wallet
  SELECT id, COALESCE(power_points, 0) 
  INTO v_user_id, v_current_balance
  FROM users 
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for wallet: %', p_wallet_address;
  END IF;
  
  -- Calculate new balance (never go below 0)
  v_new_balance := GREATEST(0, v_current_balance + p_amount);
  
  -- Update user balance
  UPDATE users 
  SET power_points = v_new_balance,
      updated_at = now()
  WHERE id = v_user_id;
  
  -- Insert transaction record in ledger
  INSERT INTO power_points_ledger (
    user_id,
    wallet_address,
    amount,
    balance_after,
    transaction_type,
    reference_id,
    reference_type,
    description,
    created_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_amount,
    v_new_balance,
    p_transaction_type,
    p_reference_id,
    p_reference_type,
    p_description,
    now()
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN QUERY SELECT v_new_balance, v_transaction_id;
END;
$$;

-- Drop existing admin adjust function with old signature
DROP FUNCTION IF EXISTS admin_adjust_power_points(text, integer, text);

-- Recreate admin_adjust_power_points
CREATE OR REPLACE FUNCTION admin_adjust_power_points(
  p_wallet_address text,
  p_amount integer,
  p_reason text
)
RETURNS TABLE(new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_user_id uuid;
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM users
  WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can adjust power points';
  END IF;
  
  -- Get user id from wallet
  SELECT id, COALESCE(power_points, 0) 
  INTO v_user_id, v_current_balance
  FROM users 
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for wallet: %', p_wallet_address;
  END IF;
  
  -- Calculate new balance
  v_new_balance := GREATEST(0, v_current_balance + p_amount);
  
  -- Update user balance
  UPDATE users 
  SET power_points = v_new_balance,
      updated_at = now()
  WHERE id = v_user_id;
  
  -- Insert transaction record with admin info
  INSERT INTO power_points_ledger (
    user_id,
    wallet_address,
    amount,
    balance_after,
    transaction_type,
    description,
    admin_id,
    admin_reason,
    created_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_amount,
    v_new_balance,
    'admin_adjustment',
    'Admin adjustment: ' || p_reason,
    v_admin_id,
    p_reason,
    now()
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN QUERY SELECT v_new_balance, v_transaction_id;
END;
$$;

-- Drop existing global stats function
DROP FUNCTION IF EXISTS get_power_points_global_stats();

-- Create admin function to get system-wide stats (ONLY for team)
CREATE OR REPLACE FUNCTION get_power_points_global_stats()
RETURNS TABLE(
  total_points_in_system bigint,
  total_users_with_points bigint,
  total_transactions bigint,
  points_earned_today bigint,
  points_by_type jsonb,
  top_10_users jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin
  FROM users
  WHERE id = v_admin_id;
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can view power points stats';
  END IF;
  
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(power_points) FROM users WHERE power_points > 0), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM users WHERE power_points > 0), 0)::bigint,
    COALESCE((SELECT COUNT(*) FROM power_points_ledger), 0)::bigint,
    COALESCE((
      SELECT SUM(amount) 
      FROM power_points_ledger 
      WHERE amount > 0 
      AND created_at >= CURRENT_DATE
    ), 0)::bigint,
    COALESCE((
      SELECT jsonb_object_agg(transaction_type, total_amount)
      FROM (
        SELECT transaction_type, SUM(amount) as total_amount
        FROM power_points_ledger
        WHERE amount > 0
        GROUP BY transaction_type
      ) t
    ), '{}'::jsonb),
    COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT 
          wallet_address,
          power_points,
          login_streak
        FROM users
        WHERE power_points > 0
        ORDER BY power_points DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb);
END;
$$;

-- Function for daily login points (called when user logs in)
CREATE OR REPLACE FUNCTION claim_daily_login_points(p_wallet_address text)
RETURNS TABLE(points_earned integer, new_balance integer, already_claimed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_last_login date;
  v_today date;
  v_points integer;
  v_current_balance integer;
  v_new_balance integer;
  v_streak integer;
  v_streak_bonus integer;
BEGIN
  v_today := CURRENT_DATE;
  
  -- Get user info
  SELECT id, last_login_date, COALESCE(power_points, 0), COALESCE(login_streak, 0)
  INTO v_user_id, v_last_login, v_current_balance, v_streak
  FROM users 
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if already claimed today
  IF v_last_login = v_today THEN
    RETURN QUERY SELECT 0, v_current_balance, true;
    RETURN;
  END IF;
  
  -- Get points value from config
  SELECT points_value INTO v_points
  FROM power_points_config
  WHERE config_key = 'daily_login' AND is_active = true;
  
  v_points := COALESCE(v_points, 10);
  
  -- Update streak
  IF v_last_login = v_today - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;
  
  -- Check for streak bonus
  v_streak_bonus := 0;
  IF v_streak = 7 THEN
    SELECT points_value INTO v_streak_bonus
    FROM power_points_config
    WHERE config_key = 'streak_7_days' AND is_active = true;
    v_streak_bonus := COALESCE(v_streak_bonus, 50);
  ELSIF v_streak = 30 THEN
    SELECT points_value INTO v_streak_bonus
    FROM power_points_config
    WHERE config_key = 'streak_30_days' AND is_active = true;
    v_streak_bonus := COALESCE(v_streak_bonus, 200);
  END IF;
  
  v_new_balance := v_current_balance + v_points + v_streak_bonus;
  
  -- Update user
  UPDATE users 
  SET power_points = v_new_balance,
      last_login_date = v_today,
      login_streak = v_streak,
      updated_at = now()
  WHERE id = v_user_id;
  
  -- Log daily login transaction
  INSERT INTO power_points_ledger (
    user_id, wallet_address, amount, balance_after, 
    transaction_type, description
  ) VALUES (
    v_user_id, p_wallet_address, v_points, v_new_balance - v_streak_bonus,
    'daily_login', 'Daily login bonus - Day ' || v_streak
  );
  
  -- Log streak bonus if applicable
  IF v_streak_bonus > 0 THEN
    INSERT INTO power_points_ledger (
      user_id, wallet_address, amount, balance_after,
      transaction_type, description
    ) VALUES (
      v_user_id, p_wallet_address, v_streak_bonus, v_new_balance,
      'streak_bonus', v_streak || '-day streak bonus!'
    );
  END IF;
  
  RETURN QUERY SELECT v_points + v_streak_bonus, v_new_balance, false;
END;
$$;

-- Update my history function to use ledger
DROP FUNCTION IF EXISTS get_my_power_points_history(integer);

CREATE OR REPLACE FUNCTION get_my_power_points_history(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  amount integer,
  balance_after integer,
  transaction_type text,
  description text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wallet text;
BEGIN
  -- Get user's wallet
  SELECT wallet_address INTO v_wallet
  FROM users WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    ppl.id,
    ppl.amount,
    ppl.balance_after,
    ppl.transaction_type,
    ppl.description,
    ppl.created_at
  FROM power_points_ledger ppl
  WHERE ppl.wallet_address = v_wallet
  ORDER BY ppl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Comments
COMMENT ON TABLE power_points_config IS 'Admin-configurable point values for different actions';
COMMENT ON FUNCTION claim_daily_login_points IS 'Claim daily login points - call once per day';
COMMENT ON FUNCTION get_power_points_global_stats IS 'Admin-only: Get total points in system and stats';
