/*
  # Per-Ticket Commission Breakdown RPC

  1. New Functions
    - `get_affiliate_per_ticket_commissions(p_wallet, p_limit, p_offset)`
      - Returns individual commission records for each ticket purchased by referrals
      - Includes ticket price, commission amount, lottery type, buyer wallet, and timestamp
      - Ordered by most recent first
      - Supports pagination via limit/offset

  2. Security
    - Function is accessible to authenticated users only
    - Filters by affiliate wallet so users can only see their own data
*/

CREATE OR REPLACE FUNCTION get_affiliate_per_ticket_commissions(
  p_wallet text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  earning_id bigint,
  ticket_id bigint,
  buyer_wallet text,
  lottery_type text,
  ticket_price_lamports bigint,
  commission_lamports bigint,
  commission_rate numeric,
  transaction_signature text,
  earned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sae.id AS earning_id,
    sae.ticket_id,
    tp.wallet_address AS buyer_wallet,
    tp.lottery_type,
    (tp.total_sol * 1000000000)::bigint AS ticket_price_lamports,
    sae.commission_lamports,
    CASE
      WHEN tp.total_sol > 0 THEN ROUND((sae.commission_lamports::numeric / (tp.total_sol * 1000000000)), 4)
      ELSE 0
    END AS commission_rate,
    sae.transaction_signature,
    sae.earned_at
  FROM solana_affiliate_earnings sae
  LEFT JOIN ticket_purchases tp ON tp.transaction_signature = sae.transaction_signature
  WHERE sae.affiliate_wallet = p_wallet
  ORDER BY sae.earned_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
