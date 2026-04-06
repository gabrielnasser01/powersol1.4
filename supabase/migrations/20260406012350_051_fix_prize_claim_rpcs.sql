/*
  # Fix prize claim RPC functions

  1. Changes
    - Updated `get_unclaimed_prizes` to query the `prizes` table instead of non-existent `lottery_winners` table
    - Updated `mark_prize_claimed` to update the `prizes` table instead of non-existent `lottery_winners` table
    - Both functions now correctly reference the actual data model

  2. Important Notes
    - The previous functions referenced `lottery_winners` and `blockchain_lotteries` tables that do not exist
    - Prize data is stored in the `prizes` table with columns: id, draw_id, round, user_wallet, ticket_number, prize_amount_lamports, prize_position, lottery_type, draw_date, claimed, claimed_at, claim_signature
*/

CREATE OR REPLACE FUNCTION get_unclaimed_prizes(p_wallet text)
RETURNS TABLE (
  prize_id uuid,
  lottery_type text,
  lottery_round bigint,
  tier smallint,
  amount_lamports bigint,
  won_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as prize_id,
    p.lottery_type,
    p.round as lottery_round,
    CASE
      WHEN p.prize_position = 'Tier 1' THEN 1::smallint
      WHEN p.prize_position = 'Tier 2' THEN 2::smallint
      WHEN p.prize_position = 'Tier 3' THEN 3::smallint
      WHEN p.prize_position = 'Tier 4' THEN 4::smallint
      WHEN p.prize_position = 'Tier 5' THEN 5::smallint
      ELSE 0::smallint
    END as tier,
    p.prize_amount_lamports as amount_lamports,
    p.created_at as won_at
  FROM prizes p
  WHERE p.user_wallet = p_wallet
    AND p.claimed = false
    AND p.prize_amount_lamports > 0;
END;
$$;

CREATE OR REPLACE FUNCTION mark_prize_claimed(p_winner_id uuid, p_tx_signature text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet text;
  v_lottery_type text;
  v_round bigint;
  v_tier smallint;
  v_amount bigint;
BEGIN
  SELECT
    p.user_wallet,
    p.lottery_type,
    p.round,
    CASE
      WHEN p.prize_position = 'Tier 1' THEN 1::smallint
      WHEN p.prize_position = 'Tier 2' THEN 2::smallint
      WHEN p.prize_position = 'Tier 3' THEN 3::smallint
      WHEN p.prize_position = 'Tier 4' THEN 4::smallint
      WHEN p.prize_position = 'Tier 5' THEN 5::smallint
      ELSE 0::smallint
    END,
    p.prize_amount_lamports
  INTO v_wallet, v_lottery_type, v_round, v_tier, v_amount
  FROM prizes p
  WHERE p.id = p_winner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prize not found: %', p_winner_id;
  END IF;

  UPDATE prizes
  SET claimed = true,
      claim_signature = p_tx_signature,
      claimed_at = now(),
      updated_at = now()
  WHERE id = p_winner_id;

  INSERT INTO onchain_prize_claims (
    claimer_wallet,
    lottery_type,
    lottery_round,
    tier,
    amount_lamports,
    tx_signature
  ) VALUES (
    v_wallet,
    v_lottery_type,
    v_round,
    v_tier,
    v_amount,
    p_tx_signature
  );

  UPDATE pool_balances
  SET total_claimed = total_claimed + v_amount,
      last_synced = now()
  WHERE pool_type = 'prize_pool_' || replace(v_lottery_type, '-', '_');
END;
$$;