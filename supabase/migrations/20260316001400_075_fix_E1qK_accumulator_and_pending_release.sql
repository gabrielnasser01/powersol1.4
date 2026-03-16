/*
  # Fix E1qK Accumulator and Pending Release Display

  1. Problem
    - Week 2929: accumulator=25M, on-chain claimed=25M -- correct but total_claimed_lamports=0 in pending_rewards
    - Week 2930: accumulator=61.5M, on-chain claimed=61.5M -- correct values
    - Week 2931: accumulator=385.5M (inflated by backfill), on-chain claimed=136.5M, 249M stuck
    - No week 2932 exists despite 360.5M in earnings for that week
    - affiliate_pending_rewards.total_claimed_lamports=0 (should be 223M)
    - Dashboard shows 0 SOL pending_release instead of actual unclaimed balance

  2. Calculations
    - Total earned: 447,000,000 lamports
    - On-chain claimed: 25M + 61.5M + 136.5M = 223,000,000 lamports
    - True unclaimed: 447M - 223M = 224,000,000 lamports (0.224 SOL)
    - Week 2931 stuck: 385.5M - 136.5M = 249M
    - Week 2932 missing earnings: 360.5M (but 360.5M - 249M from 2931 overage + earnings that went to 2931)
    
  3. Fix Applied
    - Week 2929: mark is_claimed=true (already released, matches on-chain)
    - Week 2930: mark is_claimed=true (already released, matches on-chain)
    - Week 2931: set pending_lamports to actual on-chain claim (136.5M), mark is_claimed=true
    - Create week 2932 with the full unclaimed balance (224M)
    - Fix affiliate_pending_rewards to reflect correct claimed amounts
*/

DO $$
DECLARE
  v_wallet constant text := 'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7';
  v_affiliate_id constant uuid := 'b75e6e06-dfca-4c10-b1d7-fdc8356e5157';
  v_total_earned constant bigint := 447000000;
  v_total_claimed constant bigint := 223000000;
  v_week2929_claimed constant bigint := 25000000;
  v_week2930_claimed constant bigint := 61500000;
  v_week2931_claimed constant bigint := 136500000;
  v_total_unclaimed bigint;
BEGIN
  v_total_unclaimed := v_total_earned - v_total_claimed;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2929_claimed,
    is_claimed = true,
    claimed_at = '2026-03-11 05:49:56.089266+00',
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2929;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2930_claimed,
    is_claimed = true,
    claimed_at = '2026-03-08 22:17:29.439813+00',
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2930;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2931_claimed,
    is_claimed = true,
    claimed_at = '2026-03-12 03:59:13.174001+00',
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2931;

  INSERT INTO affiliate_weekly_accumulator (
    affiliate_wallet, week_number, pending_lamports, tier, referral_count,
    is_released, is_claimed, is_swept_to_delta, created_at, updated_at
  ) VALUES (
    v_wallet, 2932, v_total_unclaimed, 4, 0,
    false, false, false, now(), now()
  )
  ON CONFLICT (affiliate_wallet, week_number) DO UPDATE SET
    pending_lamports = EXCLUDED.pending_lamports,
    is_released = false,
    is_claimed = false,
    is_swept_to_delta = false,
    updated_at = now();

  UPDATE affiliate_pending_rewards SET
    pending_lamports = v_total_unclaimed,
    total_earned_lamports = v_total_earned,
    total_claimed_lamports = v_total_claimed,
    last_updated = now()
  WHERE affiliate_wallet = v_wallet;

  UPDATE affiliates SET
    total_earned = v_total_earned::numeric / 1000000000,
    pending_earnings = v_total_unclaimed::numeric / 1000000000,
    total_claimed_sol = v_total_claimed::numeric / 1000000000,
    updated_at = now()
  WHERE id = v_affiliate_id;

  RAISE NOTICE 'E1qK fix applied. Unclaimed: % lamports (% SOL)',
    v_total_unclaimed, v_total_unclaimed::numeric / 1000000000;
END $$;
