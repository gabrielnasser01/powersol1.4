/*
  # Fix Total Commissions Paid stat in affiliate public stats

  1. Changes
    - Updated `get_affiliate_public_stats()` to use `total_earned_lamports` instead of `total_claimed_lamports`
    - This shows the total commissions generated (not just claimed) which is the real value affiliates earned

  2. Notes
    - Previously the card showed $0 because no affiliate had claimed yet
    - Now it correctly reflects the total commissions earned by all affiliates
*/

CREATE OR REPLACE FUNCTION get_affiliate_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_active_affiliates INTEGER;
  v_total_commissions_paid BIGINT;
  v_avg_monthly_earnings BIGINT;
  v_top_affiliate_earnings BIGINT;
  v_months_active NUMERIC;
BEGIN
  SELECT count(*)
  INTO v_active_affiliates
  FROM affiliates;

  SELECT COALESCE(sum(total_earned_lamports), 0)
  INTO v_total_commissions_paid
  FROM affiliate_pending_rewards;

  SELECT COALESCE(max(total_earned_lamports), 0)
  INTO v_top_affiliate_earnings
  FROM affiliate_pending_rewards;

  SELECT GREATEST(
    EXTRACT(EPOCH FROM (now() - min(created_at))) / (30.0 * 86400),
    1
  )
  INTO v_months_active
  FROM affiliate_pending_rewards
  WHERE total_earned_lamports > 0;

  IF v_months_active IS NULL THEN
    v_months_active := 1;
  END IF;

  SELECT COALESCE(
    (sum(total_earned_lamports) / GREATEST(count(*), 1))::BIGINT / v_months_active::BIGINT,
    0
  )
  INTO v_avg_monthly_earnings
  FROM affiliate_pending_rewards
  WHERE total_earned_lamports > 0;

  result := json_build_object(
    'active_affiliates', v_active_affiliates,
    'total_commissions_paid_lamports', v_total_commissions_paid,
    'avg_monthly_earnings_lamports', COALESCE(v_avg_monthly_earnings, 0),
    'top_affiliate_earnings_lamports', v_top_affiliate_earnings
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_affiliate_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_affiliate_public_stats() TO authenticated;
