/*
  # Get Affiliate Tier for Buyer RPC

  1. New Functions
    - `get_affiliate_tier_for_buyer(buyer_wallet text)` - SECURITY DEFINER function
      - Looks up the buyer's user ID by wallet address
      - Finds the referral record linking the buyer to an affiliate
      - Returns the affiliate's manual_tier (integer)
      - Returns 0 if no referral or affiliate found
  
  2. Security
    - Uses SECURITY DEFINER to bypass RLS (needed because the buyer
      cannot read the affiliate's row in the affiliates table due to RLS)
    - Only returns the tier integer, no sensitive data exposed
*/

CREATE OR REPLACE FUNCTION get_affiliate_tier_for_buyer(buyer_wallet text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tier integer;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE wallet_address = buyer_wallet
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(a.manual_tier, 1) INTO v_tier
  FROM referrals r
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  WHERE r.referred_user_id = v_user_id
  LIMIT 1;

  RETURN COALESCE(v_tier, 0);
END;
$$;
