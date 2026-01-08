/*
  # Power Points RPC Function and Mission Helpers
  
  1. New Functions
    - `increment_power_points`: Safely increment user's power points
    - `get_user_total_tickets`: Get total ticket count for a user
    - `get_user_unique_lottery_types`: Get count of unique lottery types purchased
    - `get_user_weekly_tickets`: Get ticket count for current week
    - `get_user_weekly_unique_lotteries`: Get unique lottery types in current week
  
  2. Security
    - Functions use SECURITY DEFINER to run with elevated privileges
    - Input validation to prevent negative points
*/

CREATE OR REPLACE FUNCTION increment_power_points(
  user_id_param UUID,
  points_param INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF points_param < 0 THEN
    RAISE EXCEPTION 'Points cannot be negative';
  END IF;
  
  UPDATE users 
  SET power_points = COALESCE(power_points, 0) + points_param,
      updated_at = NOW()
  WHERE id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_total_tickets(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(ticket_count), 0)::INTEGER INTO total
  FROM ticket_purchases
  WHERE user_id = user_id_param;
  
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_unique_lottery_types(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  unique_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT lottery_type)::INTEGER INTO unique_count
  FROM ticket_purchases
  WHERE user_id = user_id_param;
  
  RETURN unique_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_weekly_tickets(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  weekly_total INTEGER;
  week_start TIMESTAMP;
BEGIN
  week_start := date_trunc('week', NOW());
  
  SELECT COALESCE(SUM(ticket_count), 0)::INTEGER INTO weekly_total
  FROM ticket_purchases
  WHERE user_id = user_id_param
    AND created_at >= week_start;
  
  RETURN weekly_total;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_weekly_unique_lotteries(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  unique_count INTEGER;
  week_start TIMESTAMP;
BEGIN
  week_start := date_trunc('week', NOW());
  
  SELECT COUNT(DISTINCT lottery_type)::INTEGER INTO unique_count
  FROM ticket_purchases
  WHERE user_id = user_id_param
    AND created_at >= week_start;
  
  RETURN unique_count;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_power_points TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_total_tickets TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_unique_lottery_types TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_weekly_tickets TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_weekly_unique_lotteries TO authenticated, service_role;
