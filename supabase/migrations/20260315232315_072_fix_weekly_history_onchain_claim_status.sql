/*
  # Fix weekly history to detect on-chain claimed status

  1. Changes
    - Updated `get_affiliate_weekly_history` to check `onchain_affiliate_claims` when
      determining `is_released` and `is_claimable` status
    - Weeks with an on-chain claim record are now marked as released and not claimable
    - This prevents the Analytics page from showing "CLAIMABLE" on already-claimed weeks

  2. Why
    - Some claims succeed on-chain but the `is_released`/`is_claimed` flags in the
      accumulator were not updated, causing stale "CLAIMABLE" badges in the UI
*/

CREATE OR REPLACE FUNCTION get_affiliate_weekly_history(p_wallet text, p_weeks integer DEFAULT 8)
RETURNS TABLE(
  week_number bigint,
  week_start_date text,
  referral_count integer,
  earned_lamports bigint,
  tier integer,
  is_released boolean,
  is_claimable boolean
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
RETURN QUERY
SELECT
  awa.week_number,
  to_char(date_trunc('week', now()) + interval '2 days' - (interval '7 days' * (EXTRACT(WEEK FROM now())::bigint - awa.week_number)), 'YYYY-MM-DD') as week_start_date,
  awa.referral_count::integer,
  awa.pending_lamports as earned_lamports,
  awa.tier::integer,
  CASE
    WHEN oac.id IS NOT NULL THEN true
    ELSE awa.is_released
  END as is_released,
  CASE
    WHEN oac.id IS NOT NULL THEN false
    WHEN awa.is_released = true AND NOT EXISTS (
      SELECT 1 FROM onchain_affiliate_claims oac2
      WHERE oac2.affiliate_wallet = awa.affiliate_wallet
        AND oac2.claim_nonce = awa.week_number
    ) THEN true
    ELSE false
  END as is_claimable
FROM affiliate_weekly_accumulator awa
LEFT JOIN onchain_affiliate_claims oac
  ON oac.affiliate_wallet = awa.affiliate_wallet
  AND oac.claim_nonce = awa.week_number
WHERE awa.affiliate_wallet = p_wallet
ORDER BY awa.week_number DESC
LIMIT p_weeks;
END;
$$;
