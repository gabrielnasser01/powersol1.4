/*
  # Fix RPC Functions Column Names
  
  1. Changes
    - Fix `get_user_total_tickets` to use `quantity` instead of `ticket_count`
    - Fix `get_user_weekly_tickets` to use `quantity` instead of `ticket_count`
*/

CREATE OR REPLACE FUNCTION get_user_total_tickets(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO total
  FROM ticket_purchases
  WHERE user_id = user_id_param;
  
  RETURN total;
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
  
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO weekly_total
  FROM ticket_purchases
  WHERE user_id = user_id_param
    AND created_at >= week_start;
  
  RETURN weekly_total;
END;
$$;
