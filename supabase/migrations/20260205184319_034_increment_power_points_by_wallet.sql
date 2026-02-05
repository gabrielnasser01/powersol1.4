/*
  # Add power points increment by wallet address

  1. New Functions
    - `increment_power_points_by_wallet` - Increment power points using wallet address
    - `get_user_total_tickets_by_wallet` - Get total tickets by wallet
    - `get_user_unique_lottery_types_by_wallet` - Get unique lottery types by wallet
    - `get_user_weekly_tickets_by_wallet` - Get weekly tickets by wallet
    - `get_user_weekly_unique_lotteries_by_wallet` - Get weekly unique lotteries by wallet

  2. Purpose
    - Allow missions system to work with wallet addresses instead of user IDs
*/

CREATE OR REPLACE FUNCTION increment_power_points_by_wallet(
  wallet_param TEXT,
  points_param INTEGER
)
RETURNS void AS $$
BEGIN
  IF points_param < 0 THEN
    RAISE EXCEPTION 'Points cannot be negative';
  END IF;

  UPDATE users 
  SET power_points = COALESCE(power_points, 0) + points_param,
      updated_at = NOW()
  WHERE wallet_address = wallet_param;
  
  IF NOT FOUND THEN
    INSERT INTO users (wallet_address, power_points, created_at, updated_at)
    VALUES (wallet_param, points_param, NOW(), NOW())
    ON CONFLICT (wallet_address) DO UPDATE
    SET power_points = COALESCE(users.power_points, 0) + points_param,
        updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_total_tickets_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO total
  FROM ticket_purchases
  WHERE wallet_address = wallet_param;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_unique_lottery_types_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT lottery_type) INTO count
  FROM ticket_purchases
  WHERE wallet_address = wallet_param;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_weekly_tickets_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO total
  FROM ticket_purchases
  WHERE wallet_address = wallet_param
    AND created_at >= NOW() - INTERVAL '7 days';
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_weekly_unique_lotteries_by_wallet(wallet_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT lottery_type) INTO count
  FROM ticket_purchases
  WHERE wallet_address = wallet_param
    AND created_at >= NOW() - INTERVAL '7 days';
  
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
