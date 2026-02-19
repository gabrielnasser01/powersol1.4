/*
  # Tiered Donation Rewards RPC

  1. New Function
    - `record_donation_with_tiers(wallet, amount_sol, tx_sig)` 
      - Calculates power points based on donation amount tiers:
        - 0.05 SOL = 50 pts
        - 0.25 SOL = 150 pts
        - 0.50 SOL = 350 pts
        - 1.00 SOL = 800 pts
      - Records donation in `donations` table
      - Awards power points via existing `add_power_points` function
      - Returns points earned and new balance
      - Allows multiple donations per day (each awards tiered points)

  2. Security
    - SECURITY DEFINER with restricted search_path
    - Validates minimum amount (0.05 SOL)
    - Validates transaction signature format
*/

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
    RAISE EXCEPTION 'User not found for wallet: %', p_wallet_address;
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
    'Doacao de ' || p_amount_sol || ' SOL (tier ' || v_tier || ' SOL) - tx: ' || left(p_transaction_signature, 8) || '...'
  ) r;

  RETURN QUERY SELECT v_points, v_result.new_balance, v_tier;
END;
$$;

COMMENT ON FUNCTION record_donation_with_tiers IS 'Record a donation with tiered power point rewards based on SOL amount';
