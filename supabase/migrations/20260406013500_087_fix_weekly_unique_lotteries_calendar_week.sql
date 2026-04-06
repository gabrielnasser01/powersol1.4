/*
  # Fix weekly unique lotteries RPC to use calendar week

  1. Changes
    - `get_user_weekly_unique_lotteries_by_wallet` now uses Monday-start calendar week
      instead of a rolling 7-day window
    - `get_user_weekly_tickets_by_wallet` also aligned to calendar week for consistency

  2. Bug Fixed
    - The mission "Buy 2 Different Lotteries" was incorrectly marking users as eligible
      because the rolling 7-day window could include purchases from the previous calendar
      week, causing false positives when the mission resets on Monday
*/

CREATE OR REPLACE FUNCTION get_user_weekly_unique_lotteries_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
  week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', NOW());

  SELECT COUNT(DISTINCT lottery_type) INTO result
  FROM ticket_purchases
  WHERE wallet_address = wallet_param
    AND created_at >= week_start;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_weekly_tickets_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
  week_start TIMESTAMPTZ;
BEGIN
  week_start := date_trunc('week', NOW());

  SELECT COALESCE(SUM(quantity), 0) INTO total
  FROM ticket_purchases
  WHERE wallet_address = wallet_param
    AND created_at >= week_start;

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;