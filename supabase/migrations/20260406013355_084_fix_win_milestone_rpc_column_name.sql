/*
  # Fix win milestone RPC column name

  1. Problem
    - `get_user_total_wins_by_wallet` references `winner_wallet` column which does not exist
    - The correct column in the `prizes` table is `user_wallet`
    - This caused the RPC to always error/return 0, so win milestone missions (3 wins, 5 wins, 10 wins) were never marked eligible

  2. Fix
    - Recreate the function using the correct `user_wallet` column name

  3. Affected missions
    - `activity_first_win` (partially worked via different code path)
    - `activity_3_wins`
    - `activity_5_wins`
    - `activity_10_wins`
*/

CREATE OR REPLACE FUNCTION get_user_total_wins_by_wallet(wallet_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total integer;
BEGIN
  SELECT COUNT(*)::integer INTO total
  FROM prizes
  WHERE user_wallet = wallet_param;

  RETURN COALESCE(total, 0);
END;
$$;