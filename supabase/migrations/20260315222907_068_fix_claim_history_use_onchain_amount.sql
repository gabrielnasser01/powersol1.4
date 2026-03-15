/*
  # Fix claim history to show actual on-chain transaction amounts

  1. Changes
    - Updated `get_affiliate_claim_history` RPC to use `oac.amount_lamports` (the actual
      on-chain claimed amount) instead of `awa.pending_lamports` when the claim has been
      completed and an on-chain record exists
    - Falls back to `awa.pending_lamports` for pending/claimable entries that have not
      yet been claimed on-chain

  2. Why
    - The accumulator's `pending_lamports` reflects what was accumulated before claiming,
      but the actual on-chain transfer amount can differ
    - Users should see the real transaction amount that matches Solscan
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
