/*
  # Fix total referrals in ranking

  1. Problem
    - `get_top_affiliates_ranking` uses `referral_count` from `affiliate_weekly_accumulator`
    - This field is not properly incremented when commissions come from retroactive triggers
    - Result: VALID_REFS shows 0 in the global ranking even with validated referrals

  2. Solution
    - Drop and recreate `get_top_affiliates_ranking` to count actual referrals 
      from the `referrals` table instead of the accumulator

  3. Security
    - No changes to RLS policies
*/

DROP FUNCTION IF EXISTS get_top_affiliates_ranking(integer);

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
SET search_path = public
AS $$
DECLARE
  v_week_start timestamptz;
BEGIN
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN
    v_week_start := v_week_start - interval '7 days';
  END IF;

  RETURN QUERY
  WITH affiliate_info AS (
    SELECT
      u.wallet_address AS aff_wallet,
      a.id AS affiliate_id,
      COALESCE(a.manual_tier, 1)::smallint AS aff_tier
    FROM affiliates a
    JOIN users u ON u.id = a.user_id
  ),
  ref_counts AS (
    SELECT
      ai.aff_wallet,
      ai.aff_tier,
      COUNT(r.id)::bigint AS total_refs,
      COUNT(r.id) FILTER (WHERE r.created_at >= v_week_start)::bigint AS weekly_refs
    FROM affiliate_info ai
    LEFT JOIN referrals r ON r.referrer_affiliate_id = ai.affiliate_id AND r.is_validated = true
    GROUP BY ai.aff_wallet, ai.aff_tier
  ),
  earnings AS (
    SELECT
      apr.affiliate_wallet,
      COALESCE(apr.total_earned_lamports, 0)::bigint AS total_earned
    FROM affiliate_pending_rewards apr
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY rc.total_refs DESC, COALESCE(e.total_earned, 0::bigint) DESC)::bigint AS rank,
    rc.aff_wallet AS wallet_address,
    rc.aff_tier AS tier,
    CASE rc.aff_tier
      WHEN 1 THEN 'Starter'::text
      WHEN 2 THEN 'Bronze'::text
      WHEN 3 THEN 'Silver'::text
      WHEN 4 THEN 'Gold'::text
      ELSE 'Starter'::text
    END AS tier_label,
    rc.total_refs AS total_referrals,
    COALESCE(e.total_earned, 0::bigint) AS total_earned_lamports,
    rc.weekly_refs AS weekly_referrals
  FROM ref_counts rc
  LEFT JOIN earnings e ON e.affiliate_wallet = rc.aff_wallet
  ORDER BY rc.total_refs DESC, COALESCE(e.total_earned, 0::bigint) DESC
  LIMIT p_limit;
END;
$$;
