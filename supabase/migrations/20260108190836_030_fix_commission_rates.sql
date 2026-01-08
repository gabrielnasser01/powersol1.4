/*
  # Fix Commission Rates

  Updates the affiliate commission rates to the correct values:
  - Starter (Tier 1): 5%
  - Bronze (Tier 2): 10%
  - Silver (Tier 3): 20%
  - Gold (Tier 4): 30%
*/

CREATE OR REPLACE FUNCTION public.get_affiliate_dashboard_stats(p_wallet text)
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
  next_release_timestamp timestamp with time zone,
  time_until_release text,
  referrals_to_next_tier integer,
  next_tier_threshold integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    -- FIXED COMMISSION RATES
    CASE v_tier
      WHEN 1 THEN 0.05  -- Starter: 5%
      WHEN 2 THEN 0.10  -- Bronze: 10%
      WHEN 3 THEN 0.20  -- Silver: 20%
      WHEN 4 THEN 0.30  -- Gold: 30%
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
$function$;