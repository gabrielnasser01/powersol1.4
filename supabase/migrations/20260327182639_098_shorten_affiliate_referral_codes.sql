/*
  # Shorten affiliate referral codes

  1. Changes
    - Updates existing affiliates' `referral_code` from full wallet address to first5+last5 format
    - Affiliate E1qK...8Qx7 -> E1qK88Qx7 (but 5+5 = E1qK8+8Qx7 = E1qK88Qx7)
    - Affiliate 9M6d7...kxLQ -> 9M6d7tkxLQ (but 5+5)
  
  2. Important Notes
    - The processReferral function in the edge function already handles both shortened codes 
      and full wallet addresses as fallback
    - Old referral links with full wallet addresses will still work via the SOLANA_ADDR_RE fallback
*/

UPDATE affiliates
SET referral_code = LEFT(
  (SELECT wallet_address FROM users WHERE users.id = affiliates.user_id),
  5
) || RIGHT(
  (SELECT wallet_address FROM users WHERE users.id = affiliates.user_id),
  5
)
WHERE LENGTH(referral_code) > 10;