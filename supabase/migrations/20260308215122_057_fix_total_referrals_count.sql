/*
  # Fix total referrals count in affiliate dashboard

  1. Problem
    - `get_affiliate_dashboard_stats` reads `referral_count` from `affiliate_pending_rewards`
    - This field only increments on first purchase per referred user, and misses
      referrals created via the retroactive commission trigger
    - Result: total_referrals shows 0 even when there are validated referrals

  2. Solution
    - Always count actual referrals from the `referrals` table instead of relying
      on the `referral_count` field in `affiliate_pending_rewards`
    - This gives the true count of referred users for an affiliate
*/

CREATE OR REPLACE FUNCTION get_affiliate_dashboard_stats(p_wallet text)
RETURNS TABLE(
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_id uuid;
  v_tier integer;
  v_total_refs bigint;
  v_week_start timestamptz;
BEGIN
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN
    v_week_start := v_week_start - interval '7 days';
  END IF;

  SELECT a.id, COALESCE(a.manual_tier, 1)
  INTO v_affiliate_id, v_tier
  FROM affiliates a
  JOIN users u ON u.id = a.user_id
  WHERE u.wallet_address = p_wallet;

  IF v_affiliate_id IS NULL THEN
    SELECT apr.tier INTO v_tier
    FROM affiliate_pending_rewards apr
    WHERE apr.affiliate_wallet = p_wallet;
  END IF;

  v_tier := COALESCE(v_tier, 1);

  SELECT COUNT(*)::bigint INTO v_total_refs
  FROM referrals r
  WHERE r.referrer_affiliate_id = v_affiliate_id
    AND r.is_validated = true;

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
      WHEN 3 THEN 0.20
      WHEN 4 THEN 0.30
      ELSE 0.05
    END as commission_rate,
    v_total_refs as total_referrals,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM referrals r
      WHERE r.referrer_affiliate_id = v_affiliate_id
        AND r.created_at >= v_week_start
    ), 0) as weekly_referrals,
    COALESCE((
      SELECT SUM(tp.quantity)::bigint
      FROM ticket_purchases tp
      JOIN users referred_u ON referred_u.wallet_address = tp.wallet_address
      JOIN referrals r ON r.referred_user_id = referred_u.id
      WHERE r.referrer_affiliate_id = v_affiliate_id
    ), 0) as total_tickets,
    COALESCE((
      SELECT SUM(tp.quantity)::bigint
      FROM ticket_purchases tp
      JOIN users referred_u ON referred_u.wallet_address = tp.wallet_address
      JOIN referrals r ON r.referred_user_id = referred_u.id
      WHERE r.referrer_affiliate_id = v_affiliate_id
        AND tp.created_at >= v_week_start
    ), 0) as weekly_tickets,
    COALESCE((SELECT apr2.total_earned_lamports FROM affiliate_pending_rewards apr2 WHERE apr2.affiliate_wallet = p_wallet), 0)::bigint as total_earned_lamports,
    COALESCE((
      SELECT awa.pending_lamports
      FROM affiliate_weekly_accumulator awa
      WHERE awa.affiliate_wallet = p_wallet
        AND awa.is_released = false
        AND COALESCE(awa.is_swept_to_delta, false) = false
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
