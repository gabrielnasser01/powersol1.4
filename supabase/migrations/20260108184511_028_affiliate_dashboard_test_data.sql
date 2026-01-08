/*
  # Affiliate Dashboard Test Data and RPCs
  
  1. RPCs Created
    - get_affiliate_dashboard_stats: Returns dashboard stats for a wallet
    - get_top_affiliates_ranking: Returns top affiliates leaderboard
    - get_affiliate_weekly_history: Returns weekly history for an affiliate
  
  2. Test Data
    - 5 test users with wallets
    - 5 test affiliates with varying tiers
    - 15 test referrals
    - Affiliate pending rewards data
    - Weekly accumulator data
*/

-- Create or replace the dashboard stats RPC
CREATE OR REPLACE FUNCTION get_affiliate_dashboard_stats(p_wallet text)
RETURNS TABLE (
  tier integer,
  tier_label text,
  commission_rate numeric,
  total_referrals bigint,
  weekly_referrals bigint,
  total_tickets bigint,
  weekly_tickets bigint,
  total_earned_lamports bigint,
  weekly_earned_lamports bigint,
  pending_claimable_lamports bigint,
  next_release_timestamp timestamptz,
  time_until_release text,
  referrals_to_next_tier integer,
  next_tier_threshold integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_affiliate_id uuid;
  v_tier integer;
  v_total_refs bigint;
  v_week_start timestamptz;
BEGIN
  -- Get current week start (Wednesday)
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN
    v_week_start := v_week_start - interval '7 days';
  END IF;

  -- Get affiliate from pending rewards
  SELECT apr.tier, apr.referral_count
  INTO v_tier, v_total_refs
  FROM affiliate_pending_rewards apr
  WHERE apr.affiliate_wallet = p_wallet;

  -- If not found in pending_rewards, check affiliates table
  IF v_tier IS NULL THEN
    SELECT 
      COALESCE(a.manual_tier, 1),
      (SELECT COUNT(*) FROM referrals r WHERE r.referrer_affiliate_id = a.id)
    INTO v_tier, v_total_refs
    FROM affiliates a
    JOIN users u ON u.id = a.user_id
    WHERE u.wallet_address = p_wallet;
  END IF;

  -- Default values if not found
  v_tier := COALESCE(v_tier, 1);
  v_total_refs := COALESCE(v_total_refs, 0);

  RETURN QUERY
  SELECT
    v_tier as tier,
    CASE v_tier
      WHEN 1 THEN 'Starter'
      WHEN 2 THEN 'Bronze'
      WHEN 3 THEN 'Silver'
      WHEN 4 THEN 'Gold'
      ELSE 'Starter'
    END as tier_label,
    CASE v_tier
      WHEN 1 THEN 0.05
      WHEN 2 THEN 0.10
      WHEN 3 THEN 0.15
      WHEN 4 THEN 0.20
      ELSE 0.05
    END as commission_rate,
    v_total_refs as total_referrals,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM referrals r
      JOIN affiliates a ON a.id = r.referrer_affiliate_id
      JOIN users u ON u.id = a.user_id
      WHERE u.wallet_address = p_wallet
      AND r.created_at >= v_week_start
    ), 0) as weekly_referrals,
    COALESCE((
      SELECT SUM(tp.quantity)::bigint
      FROM ticket_purchases tp
      JOIN referrals r ON r.referred_user_id = tp.user_id
      JOIN affiliates a ON a.id = r.referrer_affiliate_id
      JOIN users u ON u.id = a.user_id
      WHERE u.wallet_address = p_wallet
    ), 0) as total_tickets,
    COALESCE((
      SELECT SUM(tp.quantity)::bigint
      FROM ticket_purchases tp
      JOIN referrals r ON r.referred_user_id = tp.user_id
      JOIN affiliates a ON a.id = r.referrer_affiliate_id
      JOIN users u ON u.id = a.user_id
      WHERE u.wallet_address = p_wallet
      AND tp.created_at >= v_week_start
    ), 0) as weekly_tickets,
    COALESCE((SELECT apr2.total_earned_lamports FROM affiliate_pending_rewards apr2 WHERE apr2.affiliate_wallet = p_wallet), 0)::bigint as total_earned_lamports,
    COALESCE((
      SELECT awa.pending_lamports
      FROM affiliate_weekly_accumulator awa
      WHERE awa.affiliate_wallet = p_wallet
      AND awa.is_released = false
      ORDER BY awa.week_number DESC
      LIMIT 1
    ), 0)::bigint as weekly_earned_lamports,
    COALESCE((SELECT apr3.pending_lamports FROM affiliate_pending_rewards apr3 WHERE apr3.affiliate_wallet = p_wallet), 0)::bigint as pending_claimable_lamports,
    (v_week_start + interval '7 days')::timestamptz as next_release_timestamp,
    'Wednesday' as time_until_release,
    CASE 
      WHEN v_tier >= 4 THEN 0
      WHEN v_tier = 3 THEN GREATEST(0, 5000 - v_total_refs)::integer
      WHEN v_tier = 2 THEN GREATEST(0, 1000 - v_total_refs)::integer
      ELSE GREATEST(0, 100 - v_total_refs)::integer
    END as referrals_to_next_tier,
    CASE
      WHEN v_tier >= 4 THEN NULL::integer
      WHEN v_tier = 3 THEN 5000
      WHEN v_tier = 2 THEN 1000
      ELSE 100
    END as next_tier_threshold;
END;
$$;

-- Create top affiliates ranking RPC
CREATE OR REPLACE FUNCTION get_top_affiliates_ranking(p_limit integer DEFAULT 10)
RETURNS TABLE (
  rank bigint,
  wallet_address text,
  tier integer,
  tier_label text,
  total_referrals bigint,
  total_earned_lamports bigint,
  weekly_referrals bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_week_start timestamptz;
BEGIN
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN
    v_week_start := v_week_start - interval '7 days';
  END IF;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY apr.total_earned_lamports DESC, apr.referral_count DESC) as rank,
    apr.affiliate_wallet as wallet_address,
    apr.tier::integer as tier,
    CASE apr.tier
      WHEN 1 THEN 'Starter'
      WHEN 2 THEN 'Bronze'
      WHEN 3 THEN 'Silver'
      WHEN 4 THEN 'Gold'
      ELSE 'Starter'
    END as tier_label,
    apr.referral_count::bigint as total_referrals,
    apr.total_earned_lamports::bigint as total_earned_lamports,
    COALESCE((
      SELECT awa.referral_count::bigint
      FROM affiliate_weekly_accumulator awa
      WHERE awa.affiliate_wallet = apr.affiliate_wallet
      AND awa.is_released = false
      ORDER BY awa.week_number DESC
      LIMIT 1
    ), 0)::bigint as weekly_referrals
  FROM affiliate_pending_rewards apr
  WHERE apr.total_earned_lamports > 0 OR apr.referral_count > 0
  ORDER BY apr.total_earned_lamports DESC, apr.referral_count DESC
  LIMIT p_limit;
END;
$$;

-- Create weekly history RPC
CREATE OR REPLACE FUNCTION get_affiliate_weekly_history(p_wallet text, p_weeks integer DEFAULT 8)
RETURNS TABLE (
  week_number bigint,
  week_start_date text,
  referral_count integer,
  earned_lamports bigint,
  tier integer,
  is_released boolean,
  is_claimable boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    awa.week_number,
    to_char(date_trunc('week', now()) + interval '2 days' - (interval '7 days' * (EXTRACT(WEEK FROM now())::bigint - awa.week_number)), 'YYYY-MM-DD') as week_start_date,
    awa.referral_count::integer,
    awa.pending_lamports as earned_lamports,
    awa.tier::integer,
    awa.is_released,
    awa.is_released as is_claimable
  FROM affiliate_weekly_accumulator awa
  WHERE awa.affiliate_wallet = p_wallet
  ORDER BY awa.week_number DESC
  LIMIT p_weeks;
END;
$$;

-- Insert test data for demo purposes
-- First, create test users
INSERT INTO users (wallet_address, is_admin, power_points)
VALUES
  ('DemoWallet1111111111111111111111111111111111', false, 500),
  ('DemoWallet2222222222222222222222222222222222', false, 1200),
  ('DemoWallet3333333333333333333333333333333333', false, 3500),
  ('DemoWallet4444444444444444444444444444444444', false, 800),
  ('DemoWallet5555555555555555555555555555555555', false, 150)
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert test affiliates
INSERT INTO affiliates (user_id, referral_code, total_earned, pending_earnings, manual_tier)
SELECT 
  u.id,
  'DEMO' || ROW_NUMBER() OVER (ORDER BY u.wallet_address),
  CASE 
    WHEN u.wallet_address LIKE '%1111%' THEN 5.5
    WHEN u.wallet_address LIKE '%2222%' THEN 12.8
    WHEN u.wallet_address LIKE '%3333%' THEN 45.2
    WHEN u.wallet_address LIKE '%4444%' THEN 8.1
    ELSE 2.3
  END,
  CASE 
    WHEN u.wallet_address LIKE '%1111%' THEN 1.2
    WHEN u.wallet_address LIKE '%2222%' THEN 3.5
    WHEN u.wallet_address LIKE '%3333%' THEN 8.9
    WHEN u.wallet_address LIKE '%4444%' THEN 2.1
    ELSE 0.5
  END,
  CASE 
    WHEN u.wallet_address LIKE '%3333%' THEN 3
    WHEN u.wallet_address LIKE '%2222%' THEN 2
    ELSE NULL
  END
FROM users u
WHERE u.wallet_address LIKE 'DemoWallet%'
ON CONFLICT DO NOTHING;

-- Insert affiliate pending rewards for the dashboard
INSERT INTO affiliate_pending_rewards (
  affiliate_wallet,
  pending_lamports,
  tier,
  referral_count,
  total_earned_lamports,
  total_claimed_lamports,
  next_claim_nonce
)
VALUES
  ('DemoWallet1111111111111111111111111111111111', 1200000000, 1, 45, 5500000000, 4300000000, 5),
  ('DemoWallet2222222222222222222222222222222222', 3500000000, 2, 250, 12800000000, 9300000000, 12),
  ('DemoWallet3333333333333333333333333333333333', 8900000000, 3, 1500, 45200000000, 36300000000, 28),
  ('DemoWallet4444444444444444444444444444444444', 2100000000, 1, 78, 8100000000, 6000000000, 8),
  ('DemoWallet5555555555555555555555555555555555', 500000000, 1, 12, 2300000000, 1800000000, 3)
ON CONFLICT (affiliate_wallet) DO UPDATE SET
  pending_lamports = EXCLUDED.pending_lamports,
  tier = EXCLUDED.tier,
  referral_count = EXCLUDED.referral_count,
  total_earned_lamports = EXCLUDED.total_earned_lamports;

-- Insert weekly accumulator data
INSERT INTO affiliate_weekly_accumulator (
  affiliate_wallet,
  week_number,
  pending_lamports,
  tier,
  referral_count,
  is_released
)
VALUES
  ('DemoWallet3333333333333333333333333333333333', EXTRACT(WEEK FROM now())::bigint, 2500000000, 3, 35, false),
  ('DemoWallet3333333333333333333333333333333333', EXTRACT(WEEK FROM now())::bigint - 1, 1800000000, 3, 28, true),
  ('DemoWallet2222222222222222222222222222222222', EXTRACT(WEEK FROM now())::bigint, 1200000000, 2, 18, false),
  ('DemoWallet2222222222222222222222222222222222', EXTRACT(WEEK FROM now())::bigint - 1, 900000000, 2, 12, true),
  ('DemoWallet1111111111111111111111111111111111', EXTRACT(WEEK FROM now())::bigint, 450000000, 1, 8, false)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_affiliate_dashboard_stats(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_affiliates_ranking(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_affiliate_weekly_history(text, integer) TO anon, authenticated;
