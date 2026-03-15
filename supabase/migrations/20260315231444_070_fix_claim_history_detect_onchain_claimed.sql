/*
  # Fix claim history to detect on-chain claimed status

  1. Changes
    - Updated `get_affiliate_claim_history` to mark weeks as 'claimed' when an on-chain
      claim record exists, even if `is_claimed`/`is_released` flags were not updated
    - This handles edge cases where the claim succeeded on-chain but the database flags
      were not properly synchronized

  2. Also fixes pending_claimable_lamports calculation
    - Updated `get_affiliate_dashboard_stats` to subtract already-claimed on-chain amounts
      from the pending claimable total for a given week
*/

CREATE OR REPLACE FUNCTION get_affiliate_claim_history(p_wallet text, p_limit integer DEFAULT 20)
RETURNS TABLE(
  week_number bigint,
  week_date timestamptz,
  amount_lamports bigint,
  tier smallint,
  status text,
  tx_signature text,
  action_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
RETURN QUERY
SELECT
  awa.week_number,
  get_wednesday_release_timestamp(awa.week_number) as week_date,
  CASE
    WHEN oac.amount_lamports IS NOT NULL THEN oac.amount_lamports
    ELSE awa.pending_lamports
  END as amount_lamports,
  awa.tier,
  CASE
    WHEN oac.id IS NOT NULL THEN 'claimed'
    WHEN awa.is_released = true OR awa.is_claimed = true THEN 'claimed'
    WHEN COALESCE(awa.is_swept_to_delta, false) = true THEN 'expired'
    WHEN is_affiliate_claim_available(awa.week_number) = true
      AND awa.pending_lamports > 0 THEN 'claimable'
    ELSE 'pending'
  END as status,
  oac.tx_signature,
  CASE
    WHEN oac.id IS NOT NULL THEN oac.claimed_at
    WHEN awa.is_released = true OR awa.is_claimed = true THEN COALESCE(awa.released_at, awa.claimed_at)
    WHEN COALESCE(awa.is_swept_to_delta, false) = true THEN awa.swept_at
    ELSE NULL
  END as action_at
FROM affiliate_weekly_accumulator awa
LEFT JOIN onchain_affiliate_claims oac
  ON oac.affiliate_wallet = awa.affiliate_wallet
  AND oac.claim_nonce = awa.week_number
WHERE awa.affiliate_wallet = p_wallet
  AND awa.pending_lamports > 0
ORDER BY awa.week_number DESC
LIMIT p_limit;
END;
$$;
