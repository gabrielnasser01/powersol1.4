/*
  # Backfill First Win mission for all prize winners

  1. Problem
    - The `get_user_total_wins_by_wallet` RPC had a wrong column name (`winner_wallet` instead of `user_wallet`)
    - This caused the `/first-win` endpoint (called automatically after each lottery draw) to always fail
    - Only 1 out of 5 winning users has the First Win mission marked (likely from a manual/older path)
    - 4 users with prizes are missing their First Win mission eligibility

  2. Fix
    - Insert `activity_first_win` mission progress with `eligible: true` for all wallets
      that have at least 1 prize but do NOT already have a completed First Win mission
*/

DO $$
DECLARE
  v_mission_id uuid;
  v_wallet text;
BEGIN
  SELECT id INTO v_mission_id FROM missions WHERE mission_key = 'activity_first_win' LIMIT 1;

  IF v_mission_id IS NULL THEN
    RAISE NOTICE 'activity_first_win mission not found, skipping';
    RETURN;
  END IF;

  FOR v_wallet IN
    SELECT DISTINCT p.user_wallet
    FROM prizes p
    WHERE p.user_wallet IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_mission_progress ump
        WHERE ump.wallet_address = p.user_wallet
          AND ump.mission_id = v_mission_id
          AND ump.completed = true
      )
  LOOP
    INSERT INTO user_mission_progress (wallet_address, mission_id, completed, progress, last_reset)
    VALUES (v_wallet, v_mission_id, false, '{"eligible": true, "eligible_at": "2026-03-21T00:00:00Z"}'::jsonb, NOW())
    ON CONFLICT (wallet_address, mission_id) DO UPDATE
      SET progress = '{"eligible": true, "eligible_at": "2026-03-21T00:00:00Z"}'::jsonb,
          completed = false
      WHERE user_mission_progress.completed = false;
  END LOOP;
END;
$$;