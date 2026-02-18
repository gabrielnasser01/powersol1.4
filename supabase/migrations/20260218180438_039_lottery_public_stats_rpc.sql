/*
  # Lottery Public Stats RPC Function

  1. New Functions
    - `get_lottery_public_stats(p_lottery_type text)` - Returns aggregated lottery statistics
      - `prize_pool_lamports` (bigint) - Current prize pool from blockchain_lotteries
      - `contributors` (integer) - Unique wallet addresses that purchased tickets for this type
      - `total_tickets_sold` (integer) - Total tickets sold for this type
      - `days_left` (integer) - Days until the next draw
      - `growth_rate` (numeric) - Percentage growth in ticket sales (current period vs previous)
      - `total_sol_collected` (numeric) - Total SOL from ticket purchases

  2. Security
    - Function is accessible to anon role (public stats pages)
    - Only reads aggregate data, no PII exposed

  3. Notes
    - Works for 'jackpot', 'grand-prize', 'tri-daily' etc.
    - Growth rate compares last 30 days vs prior 30 days of ticket purchases
    - Days left computed from nearest future draw_timestamp in blockchain_lotteries
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
BEGIN
  SELECT count(DISTINCT wallet_address)
  INTO v_contributors
  FROM ticket_purchases
  WHERE lottery_type = p_lottery_type;

  SELECT COALESCE(sum(quantity), 0), COALESCE(sum(total_sol), 0)
  INTO v_total_tickets, v_total_sol
  FROM ticket_purchases
  WHERE lottery_type = p_lottery_type;

  SELECT COALESCE(max(prize_pool), 0)
  INTO v_prize_pool
  FROM blockchain_lotteries
  WHERE lottery_type = p_lottery_type
    AND is_drawn = false;

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
    'growth_rate', COALESCE(v_growth_rate, 0)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_lottery_public_stats(text) TO anon;
GRANT EXECUTE ON FUNCTION get_lottery_public_stats(text) TO authenticated;
