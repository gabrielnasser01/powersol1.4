/*
  # Affiliate Claim History RPC

  1. New Function
    - `get_affiliate_claim_history(p_wallet, p_limit)` returns a unified view of all
      affiliate reward weeks: claimed, expired/forfeited, and pending

  2. Data Sources
    - `affiliate_weekly_accumulator` for all weeks with earnings
    - `onchain_affiliate_claims` for transaction signatures of successful claims
    - `delta_transfers` for forfeited/swept weeks

  3. Return Columns
    - `week_number` (bigint)
    - `week_date` (timestamptz) - the Wednesday release date for this week
    - `amount_lamports` (bigint)
    - `tier` (smallint)
    - `status` (text) - 'claimed', 'expired', 'pending', 'claimable'
    - `tx_signature` (text) - Solana transaction hash (for claimed items)
    - `action_at` (timestamptz) - when claimed or swept
*/

DROP FUNCTION IF EXISTS get_affiliate_claim_history(text, integer);

CREATE OR REPLACE FUNCTION get_affiliate_claim_history(
  p_wallet text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  week_number bigint,
  week_date timestamptz,
  amount_lamports bigint,
  tier smallint,
  status text,
  tx_signature text,
  action_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    awa.week_number,
    get_wednesday_release_timestamp(awa.week_number) as week_date,
    awa.pending_lamports as amount_lamports,
    awa.tier,
    CASE
      WHEN awa.is_released = true OR awa.is_claimed = true THEN 'claimed'
      WHEN COALESCE(awa.is_swept_to_delta, false) = true THEN 'expired'
      WHEN is_affiliate_claim_available(awa.week_number) = true
           AND awa.pending_lamports > 0 THEN 'claimable'
      ELSE 'pending'
    END as status,
    oac.tx_signature,
    CASE
      WHEN awa.is_released = true OR awa.is_claimed = true THEN COALESCE(awa.released_at, awa.claimed_at, oac.claimed_at)
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