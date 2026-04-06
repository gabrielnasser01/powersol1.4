/*
  # Auto-create user on daily login claim

  1. Changes
    - Modified `claim_daily_login_points` to auto-create user if not found
    - Instead of raising an exception, inserts user into `users` table
    - Modified `add_power_points` to also auto-create user if not found
    - This ensures wallet connections always register the user in the database

  2. Security
    - Functions use SECURITY DEFINER to bypass RLS for user creation
    - Only creates user with wallet_address (minimal data)

  3. Important Notes
    - Previously, users were only created via the affiliates edge function when a referral code was present
    - Now, any wallet connection will auto-register the user on first daily login claim
*/

CREATE OR REPLACE FUNCTION claim_daily_login_points(p_wallet_address text)
RETURNS TABLE(points_earned integer, new_balance integer, already_claimed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
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

  SELECT id, last_login_date, COALESCE(power_points, 0), COALESCE(login_streak, 0)
  INTO v_user_id, v_last_login, v_current_balance, v_streak
  FROM users
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    INSERT INTO users (wallet_address)
    VALUES (p_wallet_address)
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING id, last_login_date, COALESCE(power_points, 0), COALESCE(login_streak, 0)
    INTO v_user_id, v_last_login, v_current_balance, v_streak;

    IF v_user_id IS NULL THEN
      SELECT id, last_login_date, COALESCE(power_points, 0), COALESCE(login_streak, 0)
      INTO v_user_id, v_last_login, v_current_balance, v_streak
      FROM users
      WHERE wallet_address = p_wallet_address;
    END IF;
  END IF;

  IF v_last_login = v_today THEN
    RETURN QUERY SELECT 0, v_current_balance, true;
    RETURN;
  END IF;

  SELECT points_value INTO v_points
  FROM power_points_config
  WHERE config_key = 'daily_login' AND is_active = true;

  v_points := COALESCE(v_points, 10);

  IF v_last_login = v_today - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

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

  UPDATE users
  SET power_points = v_new_balance,
      last_login_date = v_today,
      login_streak = v_streak,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO power_points_ledger (
    user_id, wallet_address, amount, balance_after,
    transaction_type, description
  ) VALUES (
    v_user_id, p_wallet_address, v_points, v_new_balance - v_streak_bonus,
    'daily_login', 'Daily login bonus - Day ' || v_streak
  );

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

CREATE OR REPLACE FUNCTION add_power_points(
  p_wallet_address text,
  p_amount integer,
  p_transaction_type text,
  p_description text,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS TABLE(new_balance integer, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  SELECT id, COALESCE(power_points, 0)
  INTO v_user_id, v_current_balance
  FROM users
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    INSERT INTO users (wallet_address)
    VALUES (p_wallet_address)
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING id, COALESCE(power_points, 0)
    INTO v_user_id, v_current_balance;

    IF v_user_id IS NULL THEN
      SELECT id, COALESCE(power_points, 0)
      INTO v_user_id, v_current_balance
      FROM users
      WHERE wallet_address = p_wallet_address;
    END IF;
  END IF;

  v_new_balance := GREATEST(0, v_current_balance + p_amount);

  UPDATE users
  SET power_points = v_new_balance,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO power_points_ledger (
    user_id, wallet_address, amount, balance_after,
    transaction_type, reference_id, reference_type,
    description, created_at
  ) VALUES (
    v_user_id, p_wallet_address, p_amount, v_new_balance,
    p_transaction_type, p_reference_id, p_reference_type,
    p_description, now()
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_new_balance, v_transaction_id;
END;
$$;
