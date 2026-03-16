/*
  # Fix week_start_date calculation in weekly history RPC

  1. Problem
    - The `get_affiliate_weekly_history` function was calculating week_start_date using
      `EXTRACT(WEEK FROM now())` which returns the ISO week-of-year (1-52), not the
      absolute week_number stored in the accumulator (epoch-based, ~2930+).
    - This caused dates to display as year 2082 instead of 2026.

  2. Fix
    - Replace the broken formula with the correct inverse of the week_number calculation:
      `to_timestamp(week_number * 7 * 24 * 60 * 60)` converts the absolute week number
      back to the Unix timestamp of the start of that week.
    - Week 2932 -> 2026-03-12, Week 2931 -> 2026-03-05, Week 2930 -> 2026-02-26
*/

CREATE OR REPLACE FUNCTION get_affiliate_weekly_history(
  p_wallet text,
  p_weeks integer DEFAULT 8
)
RETURNS TABLE(
  week_number bigint,
  week_start_date text,
  referral_count integer,
  earned_lamports bigint,
  tier integer,
  is_released boolean,
  is_claimable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
RETURN QUERY
SELECT
  awa.week_number,
  to_char(to_timestamp(awa.week_number * 7 * 24 * 60 * 60), 'YYYY-MM-DD') as week_start_date,
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
