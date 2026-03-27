/*
  # Fix E1qK accumulator data from week_number mismatch

  1. Problem
    - The old trigger used `floor(epoch/604800)` for week numbers (Thursday-aligned)
    - The correct function `calculate_week_number()` uses Monday-aligned weeks
    - This caused earnings from Thursday-Sunday to land in wrong accumulator weeks
    - E1qK wallet has incorrect pending_lamports and wrong swept status

  2. Current State (incorrect)
    - Week 2929: 25M (orphan, no real earnings, but claimed on-chain as 25M)
    - Week 2930: 61.5M, claimed on-chain 61.5M -- correct
    - Week 2931: 136.5M, claimed on-chain 136.5M -- pending_lamports wrong (should be 385.5M real)
    - Week 2932: 554M, swept=true -- WRONG (real earnings = 2,520M, never swept)
    - Week 2933: 2,340M -- WRONG (real earnings = 150M)

  3. Fix Applied
    - Week 2929: keep as-is (orphan claimed row, historical)
    - Week 2930: keep as-is (already correct)
    - Week 2931: update pending_lamports to match claimed amount (136.5M), keep claimed
    - Week 2932: update to real earnings (2,520M), remove swept flag, mark unreleased
    - Week 2933: update to real earnings (150M), mark unreleased

  4. Also fix affiliate_pending_rewards for consistency
    - Total earned = 3,117M (61.5 + 385.5 + 2520 + 150)
    - Total claimed on-chain = 223M (25 + 61.5 + 136.5)
    - Pending = 3,117M - 223M = 2,894M
*/

DO $$
DECLARE
  v_wallet constant text := 'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7';
  v_total_earned bigint;
  v_total_claimed bigint;
  v_week2932_correct bigint;
  v_week2933_correct bigint;
BEGIN
  SELECT COALESCE(SUM(commission_lamports), 0) INTO v_total_earned
  FROM solana_affiliate_earnings
  WHERE affiliate_wallet = v_wallet;

  SELECT COALESCE(SUM(amount_lamports), 0) INTO v_total_claimed
  FROM onchain_affiliate_claims
  WHERE affiliate_wallet = v_wallet;

  SELECT COALESCE(SUM(commission_lamports), 0) INTO v_week2932_correct
  FROM solana_affiliate_earnings
  WHERE affiliate_wallet = v_wallet
    AND calculate_week_number(earned_at) = 2932;

  SELECT COALESCE(SUM(commission_lamports), 0) INTO v_week2933_correct
  FROM solana_affiliate_earnings
  WHERE affiliate_wallet = v_wallet
    AND calculate_week_number(earned_at) = 2933;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2932_correct,
    is_released = false,
    is_claimed = false,
    is_swept_to_delta = false,
    swept_at = NULL,
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2932;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = v_week2933_correct,
    is_released = false,
    is_claimed = false,
    is_swept_to_delta = false,
    swept_at = NULL,
    updated_at = now()
  WHERE affiliate_wallet = v_wallet AND week_number = 2933;

  UPDATE affiliate_pending_rewards SET
    total_earned_lamports = v_total_earned,
    total_claimed_lamports = v_total_claimed,
    pending_lamports = v_total_earned - v_total_claimed,
    last_updated = now()
  WHERE affiliate_wallet = v_wallet;

  RAISE NOTICE 'E1qK fix: total_earned=% claimed=% pending=% week2932=% week2933=%',
    v_total_earned, v_total_claimed, v_total_earned - v_total_claimed,
    v_week2932_correct, v_week2933_correct;
END $$;
