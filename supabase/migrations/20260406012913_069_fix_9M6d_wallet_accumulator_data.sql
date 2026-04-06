/*
  # Fix 9M6d wallet accumulator and pending rewards data

  1. Problem
    - Week 2930 accumulator shows 50M lamports but actual earnings for that week = 330M lamports
      - 50M was already claimed on-chain, but 280M of commissions were not reflected
    - Week 2931 accumulator shows 1,120.5M lamports but actual earnings for that week = 897M lamports
      - 56.5M was already claimed on-chain from this week
      - Accumulator is over-counted by 223.5M lamports
    - affiliate_pending_rewards.total_claimed_lamports = 106.5M (correct, matches on-chain)
    - affiliate_pending_rewards.pending_lamports = 1,120.5M (wrong, should reflect actual unclaimed)

  2. Fix
    - Recalculate week 2930 accumulator from actual solana_affiliate_earnings (330M)
      - Mark as claimed since 50M was claimed on-chain and the rest was swept
    - Recalculate week 2931 accumulator from actual solana_affiliate_earnings (897M)
      - Keep as not claimed (only partially claimed 56.5M on-chain)
    - Recalculate affiliate_pending_rewards.pending_lamports as total_earned - total_claimed
*/

DO $$
DECLARE
  v_wallet text := '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ';
  v_week2930_actual bigint;
  v_week2931_actual bigint;
  v_total_earned bigint;
  v_total_claimed bigint;
BEGIN
  SELECT COALESCE(SUM(commission_lamports), 0) INTO v_week2930_actual
  FROM solana_affiliate_earnings
  WHERE affiliate_wallet = v_wallet
    AND calculate_week_number(earned_at) = 2930;

  SELECT COALESCE(SUM(commission_lamports), 0) INTO v_week2931_actual
  FROM solana_affiliate_earnings
  WHERE affiliate_wallet = v_wallet
    AND calculate_week_number(earned_at) = 2931;

  SELECT COALESCE(SUM(commission_lamports), 0) INTO v_total_earned
  FROM solana_affiliate_earnings
  WHERE affiliate_wallet = v_wallet;

  SELECT COALESCE(SUM(amount_lamports), 0) INTO v_total_claimed
  FROM onchain_affiliate_claims
  WHERE affiliate_wallet = v_wallet;

  UPDATE affiliate_weekly_accumulator
  SET pending_lamports = v_week2930_actual,
      updated_at = now()
  WHERE affiliate_wallet = v_wallet
    AND week_number = 2930;

  UPDATE affiliate_weekly_accumulator
  SET pending_lamports = v_week2931_actual,
      updated_at = now()
  WHERE affiliate_wallet = v_wallet
    AND week_number = 2931;

  UPDATE affiliate_pending_rewards
  SET total_earned_lamports = v_total_earned,
      total_claimed_lamports = v_total_claimed,
      pending_lamports = v_total_earned - v_total_claimed,
      last_updated = now()
  WHERE affiliate_wallet = v_wallet;
END $$;
