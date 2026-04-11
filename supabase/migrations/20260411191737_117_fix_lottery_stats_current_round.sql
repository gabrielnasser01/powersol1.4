/*
  # Fix lottery public stats to include current round ticket count

  1. Changes
    - Updates `get_lottery_public_stats` RPC to include `current_round_tickets` and `current_round_contributors`
    - These fields count only tickets in the currently active (undrawn) lottery round
    - Fixes the issue where all-time ticket counts were displayed as current round counts

  2. Important Notes
    - `total_tickets` still returns all-time count for historical reference
    - New `current_round_tickets` returns tickets for the active round only
    - New `current_round_contributors` returns unique wallets for the active round
*/

CREATE OR REPLACE FUNCTION get_lottery_public_stats(p_lottery_type text)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_contributors INTEGER;
  v_total_tickets INTEGER;
  v_total_sol NUMERIC;
  v_days_left INTEGER;
  v_growth_rate NUMERIC;
  v_prize_pool BIGINT;
  v_current_period_tickets INTEGER;
  v_previous_period_tickets INTEGER;
  v_next_draw BIGINT;
  v_active_round BIGINT;
  v_current_round_tickets INTEGER;
  v_current_round_contributors INTEGER;
BEGIN
  SELECT count(DISTINCT wallet_address)
  INTO v_contributors
  FROM ticket_purchases
  WHERE lottery_type = p_lottery_type;

  SELECT COALESCE(sum(quantity), 0), COALESCE(sum(total_sol), 0)
  INTO v_total_tickets, v_total_sol
  FROM ticket_purchases
  WHERE lottery_type = p_lottery_type;

  SELECT lottery_id, COALESCE(prize_pool, 0)
  INTO v_active_round, v_prize_pool
  FROM blockchain_lotteries
  WHERE lottery_type = p_lottery_type
    AND is_drawn = false
  ORDER BY draw_timestamp ASC
  LIMIT 1;

  IF v_active_round IS NOT NULL THEN
    SELECT COALESCE(sum(quantity), 0), count(DISTINCT wallet_address)
    INTO v_current_round_tickets, v_current_round_contributors
    FROM ticket_purchases
    WHERE lottery_type = p_lottery_type
      AND lottery_round_id = v_active_round;
  ELSE
    v_current_round_tickets := 0;
    v_current_round_contributors := 0;
  END IF;

  SELECT min(draw_timestamp)
  INTO v_next_draw
  FROM blockchain_lotteries
  WHERE lottery_type = p_lottery_type
    AND is_drawn = false
    AND draw_timestamp > EXTRACT(EPOCH FROM now())::BIGINT;

  IF v_next_draw IS NOT NULL THEN
    v_days_left := GREATEST(
      CEIL((v_next_draw - EXTRACT(EPOCH FROM now())::BIGINT) / 86400.0)::INTEGER,
      0
    );
  ELSE
    v_days_left := 0;
  END IF;

  SELECT COALESCE(sum(quantity), 0)
  INTO v_current_period_tickets
  FROM ticket_purchases
  WHERE lottery_type = p_lottery_type
    AND created_at >= now() - interval '30 days';

  SELECT COALESCE(sum(quantity), 0)
  INTO v_previous_period_tickets
  FROM ticket_purchases
  WHERE lottery_type = p_lottery_type
    AND created_at >= now() - interval '60 days'
    AND created_at < now() - interval '30 days';

  IF v_previous_period_tickets > 0 THEN
    v_growth_rate := ROUND(
      ((v_current_period_tickets - v_previous_period_tickets)::NUMERIC / v_previous_period_tickets) * 100,
      1
    );
  ELSIF v_current_period_tickets > 0 THEN
    v_growth_rate := 100.0;
  ELSE
    v_growth_rate := 0.0;
  END IF;

  result := json_build_object(
    'contributors', COALESCE(v_contributors, 0),
    'total_tickets', COALESCE(v_total_tickets, 0),
    'total_sol', COALESCE(v_total_sol, 0),
    'prize_pool_lamports', COALESCE(v_prize_pool, 0),
    'days_left', COALESCE(v_days_left, 0),
    'growth_rate', COALESCE(v_growth_rate, 0),
    'current_round_tickets', COALESCE(v_current_round_tickets, 0),
    'current_round_contributors', COALESCE(v_current_round_contributors, 0),
    'active_round_id', v_active_round
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_lottery_public_stats(text) TO anon;
GRANT EXECUTE ON FUNCTION get_lottery_public_stats(text) TO authenticated;
