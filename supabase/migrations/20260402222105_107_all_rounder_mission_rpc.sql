/*
  # Add RPC function for All-Rounder mission tracking

  1. New Functions
    - `get_user_tickets_per_lottery_by_wallet` - Returns the minimum ticket count
      across all 4 lottery types for a given wallet address
    - Used by the missions system to check if a user has bought at least 10 tickets
      from each of the 4 lotteries (tri_daily, jackpot, special_event, grand_prize)

  2. How it works
    - Queries ticket_purchases grouped by lottery_type
    - Returns the MINIMUM quantity across all 4 types
    - If any lottery type has 0 purchases, returns 0
    - A return value >= 10 means the All-Rounder mission is complete
*/

CREATE OR REPLACE FUNCTION get_user_tickets_per_lottery_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  min_tickets INTEGER;
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

  RETURN min_tickets;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
