/*
  # Top Referrals by Affiliate RPC
  
  1. New RPC
    - get_affiliate_top_referrals: Returns top users referred by a specific affiliate wallet
      Shows: wallet, tickets bought, SOL spent, commission generated
  
  2. Test Data
    - Creates test referrals linked to demo affiliates
    - Adds ticket purchases for referred users
*/

-- Create RPC to get top referrals for a specific affiliate
CREATE OR REPLACE FUNCTION get_affiliate_top_referrals(p_wallet text, p_limit integer DEFAULT 10)
RETURNS TABLE (
  rank bigint,
  wallet_address text,
  joined_at timestamptz,
  total_tickets bigint,
  total_spent_lamports bigint,
  commission_generated_lamports bigint,
  is_validated boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(r.total_value_sol, 0) DESC, r.created_at ASC) as rank,
    u.wallet_address,
    r.created_at as joined_at,
    COALESCE(r.total_tickets_purchased, 0)::bigint as total_tickets,
    COALESCE((r.total_value_sol * 1000000000)::bigint, 0) as total_spent_lamports,
    COALESCE((r.total_commission_earned * 1000000000)::bigint, 0) as commission_generated_lamports,
    r.is_validated
  FROM referrals r
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  JOIN users aff_user ON aff_user.id = a.user_id
  JOIN users u ON u.id = r.referred_user_id
  WHERE aff_user.wallet_address = p_wallet
  ORDER BY COALESCE(r.total_value_sol, 0) DESC, r.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_affiliate_top_referrals(text, integer) TO anon, authenticated;

-- Insert more demo users as referrals
INSERT INTO users (wallet_address, is_admin, power_points)
VALUES
  ('RefUser1111111111111111111111111111111111111', false, 100),
  ('RefUser2222222222222222222222222222222222222', false, 250),
  ('RefUser3333333333333333333333333333333333333', false, 500),
  ('RefUser4444444444444444444444444444444444444', false, 75),
  ('RefUser5555555555555555555555555555555555555', false, 180),
  ('RefUser6666666666666666666666666666666666666', false, 320),
  ('RefUser7777777777777777777777777777777777777', false, 420),
  ('RefUser8888888888888888888888888888888888888', false, 90),
  ('RefUser9999999999999999999999999999999999999', false, 150),
  ('RefUserAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', false, 280)
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert referrals for DemoWallet3333 (top affiliate)
INSERT INTO referrals (
  referred_user_id,
  referrer_affiliate_id,
  referral_code_used,
  is_validated,
  first_purchase_at,
  total_tickets_purchased,
  total_value_sol,
  total_commission_earned
)
SELECT
  u.id as referred_user_id,
  a.id as referrer_affiliate_id,
  'DEMO3' as referral_code_used,
  true as is_validated,
  now() - (random() * interval '30 days') as first_purchase_at,
  CASE 
    WHEN u.wallet_address LIKE '%1111%' THEN 45
    WHEN u.wallet_address LIKE '%2222%' THEN 120
    WHEN u.wallet_address LIKE '%3333%' THEN 280
    WHEN u.wallet_address LIKE '%4444%' THEN 18
    WHEN u.wallet_address LIKE '%5555%' THEN 65
    ELSE 30
  END as total_tickets_purchased,
  CASE 
    WHEN u.wallet_address LIKE '%1111%' THEN 4.5
    WHEN u.wallet_address LIKE '%2222%' THEN 12.0
    WHEN u.wallet_address LIKE '%3333%' THEN 28.0
    WHEN u.wallet_address LIKE '%4444%' THEN 1.8
    WHEN u.wallet_address LIKE '%5555%' THEN 6.5
    ELSE 3.0
  END as total_value_sol,
  CASE 
    WHEN u.wallet_address LIKE '%1111%' THEN 0.675
    WHEN u.wallet_address LIKE '%2222%' THEN 1.8
    WHEN u.wallet_address LIKE '%3333%' THEN 4.2
    WHEN u.wallet_address LIKE '%4444%' THEN 0.27
    WHEN u.wallet_address LIKE '%5555%' THEN 0.975
    ELSE 0.45
  END as total_commission_earned
FROM users u
CROSS JOIN (
  SELECT a.id FROM affiliates a
  JOIN users au ON au.id = a.user_id
  WHERE au.wallet_address = 'DemoWallet3333333333333333333333333333333333'
  LIMIT 1
) a
WHERE u.wallet_address LIKE 'RefUser%'
AND u.wallet_address IN (
  'RefUser1111111111111111111111111111111111111',
  'RefUser2222222222222222222222222222222222222',
  'RefUser3333333333333333333333333333333333333',
  'RefUser4444444444444444444444444444444444444',
  'RefUser5555555555555555555555555555555555555'
)
ON CONFLICT (referred_user_id) DO NOTHING;

-- Insert referrals for DemoWallet2222 (second affiliate)
INSERT INTO referrals (
  referred_user_id,
  referrer_affiliate_id,
  referral_code_used,
  is_validated,
  first_purchase_at,
  total_tickets_purchased,
  total_value_sol,
  total_commission_earned
)
SELECT
  u.id as referred_user_id,
  a.id as referrer_affiliate_id,
  'DEMO2' as referral_code_used,
  true as is_validated,
  now() - (random() * interval '20 days') as first_purchase_at,
  CASE 
    WHEN u.wallet_address LIKE '%6666%' THEN 85
    WHEN u.wallet_address LIKE '%7777%' THEN 150
    WHEN u.wallet_address LIKE '%8888%' THEN 22
    ELSE 40
  END as total_tickets_purchased,
  CASE 
    WHEN u.wallet_address LIKE '%6666%' THEN 8.5
    WHEN u.wallet_address LIKE '%7777%' THEN 15.0
    WHEN u.wallet_address LIKE '%8888%' THEN 2.2
    ELSE 4.0
  END as total_value_sol,
  CASE 
    WHEN u.wallet_address LIKE '%6666%' THEN 0.85
    WHEN u.wallet_address LIKE '%7777%' THEN 1.5
    WHEN u.wallet_address LIKE '%8888%' THEN 0.22
    ELSE 0.4
  END as total_commission_earned
FROM users u
CROSS JOIN (
  SELECT a.id FROM affiliates a
  JOIN users au ON au.id = a.user_id
  WHERE au.wallet_address = 'DemoWallet2222222222222222222222222222222222'
  LIMIT 1
) a
WHERE u.wallet_address LIKE 'RefUser%'
AND u.wallet_address IN (
  'RefUser6666666666666666666666666666666666666',
  'RefUser7777777777777777777777777777777777777',
  'RefUser8888888888888888888888888888888888888'
)
ON CONFLICT (referred_user_id) DO NOTHING;

-- Insert referrals for DemoWallet1111
INSERT INTO referrals (
  referred_user_id,
  referrer_affiliate_id,
  referral_code_used,
  is_validated,
  first_purchase_at,
  total_tickets_purchased,
  total_value_sol,
  total_commission_earned
)
SELECT
  u.id as referred_user_id,
  a.id as referrer_affiliate_id,
  'DEMO1' as referral_code_used,
  true as is_validated,
  now() - (random() * interval '15 days') as first_purchase_at,
  55 as total_tickets_purchased,
  5.5 as total_value_sol,
  0.275 as total_commission_earned
FROM users u
CROSS JOIN (
  SELECT a.id FROM affiliates a
  JOIN users au ON au.id = a.user_id
  WHERE au.wallet_address = 'DemoWallet1111111111111111111111111111111111'
  LIMIT 1
) a
WHERE u.wallet_address = 'RefUser9999999999999999999999999999999999999'
ON CONFLICT (referred_user_id) DO NOTHING;
