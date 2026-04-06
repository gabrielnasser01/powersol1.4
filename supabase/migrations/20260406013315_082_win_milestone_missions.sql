/*
  # Win Milestone Missions

  1. New Missions
    - `activity_3_wins` - Win 3 lottery prizes (any lottery), 600 power points
    - `activity_5_wins` - Win 5 lottery prizes (any lottery), 700 power points
    - `activity_10_wins` - Win 10 lottery prizes (any lottery), 800 power points

  2. RPC Helper
    - `get_user_total_wins_by_wallet` - Counts total lottery wins for a given wallet across all lottery types

  3. Notes
    - These are activity-type missions (one-time, never reset)
    - Wins count across all 4 lottery types (tri-daily, jackpot, special-event, grand-prize)
    - Works alongside existing `activity_first_win` mission
*/

INSERT INTO missions (mission_type, mission_key, name, description, power_points, icon, requirements, is_active)
VALUES
  ('activity', 'activity_3_wins', '3 Wins', 'Win 3 lottery prizes', 600, 'Trophy', '{"type": "milestone", "wins": 3}', true),
  ('activity', 'activity_5_wins', '5 Wins', 'Win 5 lottery prizes', 700, 'Trophy', '{"type": "milestone", "wins": 5}', true),
  ('activity', 'activity_10_wins', '10 Wins', 'Win 10 lottery prizes', 800, 'Trophy', '{"type": "milestone", "wins": 10}', true)
ON CONFLICT DO NOTHING;

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
  WHERE winner_wallet = wallet_param;

  RETURN COALESCE(total, 0);
END;
$$;