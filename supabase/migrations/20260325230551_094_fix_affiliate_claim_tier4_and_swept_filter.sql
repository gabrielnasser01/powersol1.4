/*
  # Fix affiliate claim for tier 4 users and swept week display

  1. Changes
    - Widen `onchain_affiliate_claims.tier` check constraint from 1-3 to 1-4
      to support Gold tier affiliates
    - Update `get_affiliate_dashboard_stats` to exclude swept weeks from
      `pending_claimable_lamports` calculation
    - Recreate `process_affiliate_claim_v2` to also reject swept weeks

  2. Bug Details
    - Tier 4 (Gold) affiliates were unable to claim because the INSERT into
      `onchain_affiliate_claims` failed the CHECK constraint `tier >= 1 AND tier <= 3`
    - Swept weeks were showing as claimable in the dashboard stats because the
      `pending_claimable_lamports` subquery didn't filter `is_swept_to_delta`

  3. Impact
    - Affects wallet E1qK... (Gold tier affiliate) who could not claim
    - Dashboard was showing incorrect claimable amount (included expired/swept weeks)
*/

-- 1. Fix the tier check constraint on onchain_affiliate_claims
ALTER TABLE onchain_affiliate_claims
  DROP CONSTRAINT IF EXISTS onchain_affiliate_claims_tier_check;

ALTER TABLE onchain_affiliate_claims
  ADD CONSTRAINT onchain_affiliate_claims_tier_check
  CHECK (tier >= 1 AND tier <= 4);

-- 2. Replace get_affiliate_dashboard_stats to exclude swept weeks from claimable
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
  v_next_release timestamptz;
BEGIN
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN
    v_week_start := v_week_start - interval '7 days';
  END IF;

  SELECT nr.next_release_timestamp INTO v_next_release
  FROM get_next_affiliate_release() nr;

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
    COALESCE((
      SELECT SUM(awa2.pending_lamports)
      FROM affiliate_weekly_accumulator awa2
      WHERE awa2.affiliate_wallet = p_wallet
      AND awa2.is_released = false
      AND awa2.pending_lamports > 0
      AND COALESCE(awa2.is_swept_to_delta, false) = false
      AND is_affiliate_claim_available(awa2.week_number) = true
      AND NOT EXISTS (
        SELECT 1 FROM onchain_affiliate_claims oac
        WHERE oac.affiliate_wallet = awa2.affiliate_wallet
        AND oac.claim_nonce = awa2.week_number
      )
    ), 0)::bigint as pending_claimable_lamports,
    v_next_release as next_release_timestamp,
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

-- 3. Drop and recreate process_affiliate_claim_v2 to also reject swept weeks
DROP FUNCTION IF EXISTS process_affiliate_claim_v2(text, bigint, text);

CREATE FUNCTION process_affiliate_claim_v2(
  p_wallet text,
  p_week_number bigint,
  p_tx_signature text
)
RETURNS TABLE (success boolean, amount bigint, error_message text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_amount bigint;
  v_tier smallint;
  v_ref_count integer;
  v_is_swept boolean;
BEGIN
  IF NOT is_affiliate_claim_available(p_week_number) THEN
    RETURN QUERY SELECT false, 0::bigint, 'Claim not yet available - wait until Wednesday 23:59:59 GMT'::text;
    RETURN;
  END IF;

  SELECT pending_lamports, tier, referral_count, COALESCE(is_swept_to_delta, false)
  INTO v_amount, v_tier, v_ref_count, v_is_swept
  FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = p_wallet
  AND week_number = p_week_number
  AND is_released = false
  FOR UPDATE;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN QUERY SELECT false, 0::bigint, 'No pending rewards for this week'::text;
    RETURN;
  END IF;

  IF v_is_swept THEN
    RETURN QUERY SELECT false, 0::bigint, 'This week''s rewards have expired and were swept to delta'::text;
    RETURN;
  END IF;

  UPDATE affiliate_weekly_accumulator
  SET is_released = true,
      released_at = now(),
      updated_at = now()
  WHERE affiliate_wallet = p_wallet
  AND week_number = p_week_number;

  INSERT INTO onchain_affiliate_claims (
    affiliate_wallet,
    amount_lamports,
    tier,
    referral_count,
    claim_nonce,
    tx_signature
  ) VALUES (
    p_wallet,
    v_amount,
    v_tier,
    v_ref_count,
    p_week_number,
    p_tx_signature
  );

  UPDATE affiliate_release_schedule
  SET total_claimed = total_claimed + v_amount,
      is_released = true
  WHERE week_number = p_week_number;

  UPDATE pool_balances
  SET total_claimed = total_claimed + v_amount,
      last_synced = now()
  WHERE pool_type = 'affiliate_pool';

  RETURN QUERY SELECT true, v_amount, NULL::text;
END;
$$;
