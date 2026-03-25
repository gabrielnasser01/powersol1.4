/*
  # Reverse week 2932 sweep for E1qK wallet

  1. Problem
    - Week 2932 for wallet E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7 was swept to delta on 2026-03-23
    - The claim had not yet expired from the user's perspective
    - 554,000,000 lamports (0.554 SOL) incorrectly marked as expired

  2. Fix
    - Undo the is_swept_to_delta flag on the accumulator row
    - Remove the corresponding delta_transfers record
    - Restore 554,000,000 lamports to affiliate_pending_rewards
*/

UPDATE affiliate_weekly_accumulator
SET is_swept_to_delta = false,
    swept_at = NULL,
    updated_at = now()
WHERE affiliate_wallet = 'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7'
  AND week_number = 2932
  AND COALESCE(is_swept_to_delta, false) = true;

DELETE FROM delta_transfers
WHERE affiliate_wallet = 'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7'
  AND sweep_week_number = 2932
  AND source = 'unclaimed_sweep';

UPDATE affiliate_pending_rewards
SET pending_lamports = pending_lamports + 554000000,
    last_updated = now()
WHERE affiliate_wallet = 'E1qK8XaiZrKP8KRCm1ejTMramwTKCpoyX1e31UbB8Qx7';
