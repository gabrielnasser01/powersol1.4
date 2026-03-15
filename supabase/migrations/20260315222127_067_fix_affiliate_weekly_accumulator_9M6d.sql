/*
  # Fix Affiliate Weekly Accumulator for 9M6d

  1. Problem
    - Migration 066 backfilled tier 4 commission rates but distributed the delta
      into an erroneous week 2932 (which doesn't start until March 16)
    - Week 2930 and 2931 show as "claimed" in the dashboard, but the on-chain claims
      were for much smaller amounts (50M and 56.5M lamports at tier 1)
    - The user cannot see or claim the unclaimed difference

  2. Root Cause
    - Migration 066 created week 2932 row with 299M lamports for earnings that
      actually belong to week 2931 (March 15 falls in week 2931)
    - Weeks 2930/2931 are marked is_released=true, making them show as "claimed"
      even though on-chain claims were only 106.5M total vs 923M in accumulator

  3. Fix Applied
    - Delete erroneous week 2932 row
    - Set week 2930 pending_lamports to match on-chain claim (50M) since it was swept
    - Set week 2931 to its on-chain claimed amount (56.5M), keep released status
    - Create new current-week row (2931) with is_released=false containing the
      unclaimed balance: total_earned - on-chain_claimed - week2930_swept
    - Since week 2931 already exists, we use a separate approach: update week 2931
      to reflect only unclaimed earnings, and mark it unreleased for current period
    - Update affiliate_pending_rewards and affiliates tables for consistency

  4. Calculations
    - Total earned (from solana_affiliate_earnings): 1,227,000,000 lamports
    - Already claimed on-chain: 106,500,000 lamports (50M + 56.5M)
    - Week 2930 was swept to delta, keeping its 50M claimed value
    - Remaining unclaimed: 1,227,000,000 - 106,500,000 = 1,120,500,000 lamports
    - Week 2930 stays at actual claimed amount
    - Week 2931 gets the full unclaimed balance as a fresh unreleased week
*/

DO $$
DECLARE
  v_wallet constant text := '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ';
  v_total_earned constant bigint := 1227000000;
  v_claimed_onchain constant bigint := 106500000;
  v_week_2930_claimed constant bigint := 50000000;
  v_week_2931_claimed constant bigint := 56500000;
  v_unclaimed bigint;
BEGIN
  v_unclaimed := v_total_earned - v_claimed_onchain;

  DELETE FROM affiliate_weekly_accumulator
  WHERE affiliate_wallet = v_wallet AND week_number = 2932;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week_2930_claimed,
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2930;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_unclaimed,
    is_released = false,
    is_claimed = false,
    released_at = NULL,
    claimed_at = NULL,
    is_swept_to_delta = false,
    swept_at = NULL,
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2931;

  UPDATE affiliate_pending_rewards SET
    pending_lamports = v_unclaimed,
    total_earned_lamports = v_total_earned,
    total_claimed_lamports = v_claimed_onchain,
    last_updated = now()
  WHERE affiliate_wallet = v_wallet;

  UPDATE affiliates SET
    total_earned = v_total_earned::numeric / 1000000000,
    pending_earnings = v_unclaimed::numeric / 1000000000,
    total_claimed_sol = v_claimed_onchain::numeric / 1000000000,
    updated_at = now()
  WHERE id = 'de759ed6-7b02-49b9-ba21-cd7c637973fc';

  RAISE NOTICE 'Fix applied. Unclaimed balance: % lamports (% SOL)', v_unclaimed, v_unclaimed::numeric / 1000000000;
END $$;
