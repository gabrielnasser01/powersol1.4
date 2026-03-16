/*
  # Fix 9M6d Accumulator and Pending Release Display

  1. Problem
    - Week 2930: accumulator shows 330M lamports but only 50M was claimed on-chain.
      The 280M difference is stuck (released=true, swept=true, but never claimable).
    - Week 2931: accumulator shows 897M lamports but only 56.5M was claimed on-chain.
      The 840.5M difference is stuck (swept=true, but filtered out of both
      pending_release and claimable calculations by different conditions).
    - Week 2932: only shows 125M (recent purchases), missing the 1,120.5M stuck balance.
    - Dashboard "pending_release" shows 0.1250 SOL instead of the correct unclaimed balance.

  2. Root Cause
    - Migration 066 backfilled commission amounts to 30% tier, inflating accumulator values.
    - Migration 067 attempted to fix but left weeks 2930/2931 with inflated pending_lamports
      that don't match on-chain claimed amounts.
    - The swept delta_transfers captured inflated values, not actual unclaimed amounts.

  3. Fix Applied
    - Week 2930: set pending_lamports to actual on-chain claimed amount (50M), keep released/swept
    - Week 2931: set pending_lamports to actual on-chain claimed amount (56.5M), mark released=true
    - Week 2932: add the stuck 1,120.5M balance to current week (125M + 1,120.5M = 1,245.5M)
    - Update affiliate_pending_rewards.pending_lamports to match unclaimed balance (1,245.5M)
    - Remove the inflated unclaimed_sweep delta_transfer for week 2931 (897M was never truly swept)
    - Update week 2930 unclaimed_sweep delta to actual unclaimed amount (280M, not original 5M)

  4. Calculations
    - Total earned: 1,352,000,000 lamports
    - On-chain claimed: 106,500,000 lamports (50M week 2930 + 56.5M week 2931)
    - True unclaimed: 1,352,000,000 - 106,500,000 = 1,245,500,000 lamports
    - Stuck in old weeks: (330M - 50M) + (897M - 56.5M) = 280M + 840.5M = 1,120,500,000
    - Current week 2932 balance: 125,000,000
    - After fix, week 2932: 125,000,000 + 1,120,500,000 = 1,245,500,000
*/

DO $$
DECLARE
  v_wallet constant text := '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ';
  v_total_earned constant bigint := 1352000000;
  v_onchain_claimed constant bigint := 106500000;
  v_week2930_claimed constant bigint := 50000000;
  v_week2931_claimed constant bigint := 56500000;
  v_week2932_current constant bigint := 125000000;
  v_stuck_from_2930 bigint;
  v_stuck_from_2931 bigint;
  v_total_unclaimed bigint;
BEGIN
  v_total_unclaimed := v_total_earned - v_onchain_claimed;
  v_stuck_from_2930 := 330000000 - v_week2930_claimed;
  v_stuck_from_2931 := 897000000 - v_week2931_claimed;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2930_claimed,
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2930;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2931_claimed,
    is_released = true,
    is_claimed = true,
    released_at = '2026-03-12 01:44:11.63377+00',
    claimed_at = '2026-03-12 01:44:11.63377+00',
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2931;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_total_unclaimed,
    is_swept_to_delta = false,
    swept_at = NULL,
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2932;

  UPDATE affiliate_pending_rewards SET
    pending_lamports = v_total_unclaimed,
    total_earned_lamports = v_total_earned,
    total_claimed_lamports = v_onchain_claimed,
    last_updated = now()
  WHERE affiliate_wallet = v_wallet;

  UPDATE affiliates SET
    total_earned = v_total_earned::numeric / 1000000000,
    pending_earnings = v_total_unclaimed::numeric / 1000000000,
    total_claimed_sol = v_onchain_claimed::numeric / 1000000000,
    updated_at = now()
  WHERE id = 'de759ed6-7b02-49b9-ba21-cd7c637973fc';

  DELETE FROM delta_transfers
  WHERE affiliate_wallet = v_wallet
    AND source = 'unclaimed_sweep'
    AND sweep_week_number = 2931;

  UPDATE delta_transfers SET
    amount_lamports = v_stuck_from_2930
  WHERE affiliate_wallet = v_wallet
    AND source = 'unclaimed_sweep'
    AND sweep_week_number = 2930;

  RAISE NOTICE 'Fix applied. Total unclaimed: % lamports (% SOL). Stuck recovered: % + % = %',
    v_total_unclaimed, v_total_unclaimed::numeric / 1000000000,
    v_stuck_from_2930, v_stuck_from_2931, v_stuck_from_2930 + v_stuck_from_2931;
END $$;
