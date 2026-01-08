/*
  # Affiliate Dashboard Statistics Enhancement
  
  1. New Views and Functions
    - `get_affiliate_dashboard_stats` - Complete dashboard stats for an affiliate
    - `get_top_affiliates_ranking` - Top referrers ranking for analytics
    - `get_affiliate_weekly_stats` - Weekly breakdown of earnings and referrals
    
  2. Updates
    - Add weekly tracking for referrals and tickets
    
  3. Security
    - All functions use SECURITY DEFINER for proper access control
*/

CREATE OR REPLACE FUNCTION get_affiliate_dashboard_stats(p_wallet text)
RETURNS TABLE (
  tier smallint,
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
  time_until_release interval,
  referrals_to_next_tier integer,
  next_tier_threshold integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week bigint;
  v_tier smallint;
  v_total_refs bigint;
  v_weekly_refs bigint;
  v_total_tickets bigint;
  v_weekly_tickets bigint;
  v_total_earned bigint;
  v_weekly_earned bigint;
  v_pending bigint;
  v_next_release timestamptz;
  v_time_until interval;
  v_tier_label text;
  v_commission numeric;
  v_refs_to_next integer;
  v_next_threshold integer;
BEGIN
  current_week := calculate_week_number(now());
  
  SELECT COALESCE(MAX(awa.tier), 1)
  INTO v_tier
  FROM affiliate_weekly_accumulator awa
  WHERE awa.affiliate_wallet = p_wallet;
  
  SELECT COALESCE(SUM(referral_count), 0)
  INTO v_total_refs
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet;
  
  SELECT COALESCE(SUM(referral_count), 0)
  INTO v_weekly_refs
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet
    AND week_number = current_week;
  
  SELECT COALESCE(COUNT(*), 0)
  INTO v_total_tickets
  FROM ticket_purchases tp
  JOIN referrals r ON r.referred_user_id = tp.user_id
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  JOIN users u ON u.id = a.user_id
  WHERE u.wallet_address = p_wallet;
  
  SELECT COALESCE(COUNT(*), 0)
  INTO v_weekly_tickets
  FROM ticket_purchases tp
  JOIN referrals r ON r.referred_user_id = tp.user_id
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  JOIN users u ON u.id = a.user_id
  WHERE u.wallet_address = p_wallet
    AND tp.created_at >= now() - interval '7 days';
  
  SELECT COALESCE(SUM(pending_lamports), 0)
  INTO v_total_earned
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet;
  
  SELECT COALESCE(SUM(pending_lamports), 0)
  INTO v_weekly_earned
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet
    AND week_number = current_week;
  
  SELECT COALESCE(SUM(pending_lamports), 0)
  INTO v_pending
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet
    AND is_released = false
    AND is_affiliate_claim_available(week_number) = true;
  
  SELECT next_release_timestamp, time_until_release
  INTO v_next_release, v_time_until
  FROM get_next_affiliate_release();
  
  v_tier_label := CASE v_tier
    WHEN 1 THEN 'Starter'
    WHEN 2 THEN 'Bronze'
    WHEN 3 THEN 'Silver'
    WHEN 4 THEN 'Gold'
    ELSE 'Starter'
  END;
  
  v_commission := CASE v_tier
    WHEN 1 THEN 0.05
    WHEN 2 THEN 0.10
    WHEN 3 THEN 0.20
    WHEN 4 THEN 0.30
    ELSE 0.05
  END;
  
  v_next_threshold := CASE v_tier
    WHEN 1 THEN 100
    WHEN 2 THEN 1000
    WHEN 3 THEN 5000
    WHEN 4 THEN NULL
    ELSE 100
  END;
  
  IF v_next_threshold IS NOT NULL THEN
    v_refs_to_next := GREATEST(0, v_next_threshold - v_total_refs::integer);
  ELSE
    v_refs_to_next := 0;
  END IF;
  
  RETURN QUERY SELECT
    v_tier,
    v_tier_label,
    v_commission,
    v_total_refs,
    v_weekly_refs,
    v_total_tickets,
    v_weekly_tickets,
    v_total_earned,
    v_weekly_earned,
    v_pending,
    v_next_release,
    v_time_until,
    v_refs_to_next,
    v_next_threshold;
END;
$$;

CREATE OR REPLACE FUNCTION get_top_affiliates_ranking(p_limit integer DEFAULT 10)
RETURNS TABLE (
  rank bigint,
  wallet_address text,
  tier smallint,
  tier_label text,
  total_referrals bigint,
  total_earned_lamports bigint,
  weekly_referrals bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week bigint;
BEGIN
  current_week := calculate_week_number(now());
  
  RETURN QUERY
  WITH affiliate_totals AS (
    SELECT 
      awa.affiliate_wallet,
      MAX(awa.tier) as max_tier,
      SUM(awa.referral_count) as total_refs,
      SUM(awa.pending_lamports) as total_earned,
      SUM(CASE WHEN awa.week_number = current_week THEN awa.referral_count ELSE 0 END) as weekly_refs
    FROM affiliate_weekly_accumulator awa
    GROUP BY awa.affiliate_wallet
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY at.total_refs DESC, at.total_earned DESC) as rank,
    at.affiliate_wallet as wallet_address,
    at.max_tier as tier,
    CASE at.max_tier
      WHEN 1 THEN 'Starter'
      WHEN 2 THEN 'Bronze'
      WHEN 3 THEN 'Silver'
      WHEN 4 THEN 'Gold'
      ELSE 'Starter'
    END as tier_label,
    at.total_refs as total_referrals,
    at.total_earned as total_earned_lamports,
    at.weekly_refs as weekly_referrals
  FROM affiliate_totals at
  ORDER BY at.total_refs DESC, at.total_earned DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_affiliate_weekly_history(p_wallet text, p_weeks integer DEFAULT 8)
RETURNS TABLE (
  week_number bigint,
  week_start_date date,
  referral_count integer,
  earned_lamports bigint,
  tier smallint,
  is_released boolean,
  is_claimable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_week bigint;
BEGIN
  current_week := calculate_week_number(now());
  
  RETURN QUERY
  SELECT 
    awa.week_number,
    (get_wednesday_release_timestamp(awa.week_number) - interval '6 days')::date as week_start_date,
    awa.referral_count,
    awa.pending_lamports as earned_lamports,
    awa.tier,
    awa.is_released,
    is_affiliate_claim_available(awa.week_number) AND NOT awa.is_released as is_claimable
  FROM affiliate_weekly_accumulator awa
  WHERE awa.affiliate_wallet = p_wallet
    AND awa.week_number >= current_week - p_weeks
  ORDER BY awa.week_number DESC;
END;
$$;
