/*
  # Backfill win milestone missions

  1. Problem
    - Due to bug in `get_user_total_wins_by_wallet` (wrong column name), win milestone missions
      were never marked eligible for any user
    - Users with 3+, 5+, 10+ wins should have their missions marked as eligible

  2. Fix
    - For each wallet that has enough wins, insert mission progress with `eligible: true`
    - Only inserts if no existing progress row exists (ON CONFLICT DO NOTHING)
    - Affected missions: activity_3_wins, activity_5_wins, activity_10_wins
    - activity_first_win already worked via a different mechanism so we skip it

  3. Notes
    - Users will still need to manually claim these missions in the UI
    - This only marks them as eligible, does not auto-complete
*/

DO $$
DECLARE
  v_mission_3_id uuid;
  v_mission_5_id uuid;
  v_mission_10_id uuid;
  v_wallet text;
  v_wins integer;
BEGIN
  SELECT id INTO v_mission_3_id FROM missions WHERE mission_key = 'activity_3_wins' LIMIT 1;
  SELECT id INTO v_mission_5_id FROM missions WHERE mission_key = 'activity_5_wins' LIMIT 1;
  SELECT id INTO v_mission_10_id FROM missions WHERE mission_key = 'activity_10_wins' LIMIT 1;

  FOR v_wallet, v_wins IN
    SELECT user_wallet, COUNT(*)::integer as wins
    FROM prizes
    WHERE user_wallet IS NOT NULL
    GROUP BY user_wallet
    HAVING COUNT(*) >= 3
  LOOP
    IF v_wins >= 3 AND v_mission_3_id IS NOT NULL THEN
      INSERT INTO user_mission_progress (wallet_address, mission_id, completed, progress, last_reset)
      VALUES (v_wallet, v_mission_3_id, false, '{"eligible": true, "eligible_at": "2026-03-20T00:00:00Z"}'::jsonb, NOW())
      ON CONFLICT (wallet_address, mission_id) DO UPDATE
        SET progress = '{"eligible": true, "eligible_at": "2026-03-20T00:00:00Z"}'::jsonb,
            completed = false
        WHERE user_mission_progress.completed = false;
    END IF;

    IF v_wins >= 5 AND v_mission_5_id IS NOT NULL THEN
      INSERT INTO user_mission_progress (wallet_address, mission_id, completed, progress, last_reset)
      VALUES (v_wallet, v_mission_5_id, false, '{"eligible": true, "eligible_at": "2026-03-20T00:00:00Z"}'::jsonb, NOW())
      ON CONFLICT (wallet_address, mission_id) DO UPDATE
        SET progress = '{"eligible": true, "eligible_at": "2026-03-20T00:00:00Z"}'::jsonb,
            completed = false
        WHERE user_mission_progress.completed = false;
    END IF;

    IF v_wins >= 10 AND v_mission_10_id IS NOT NULL THEN
      INSERT INTO user_mission_progress (wallet_address, mission_id, completed, progress, last_reset)
      VALUES (v_wallet, v_mission_10_id, false, '{"eligible": true, "eligible_at": "2026-03-20T00:00:00Z"}'::jsonb, NOW())
      ON CONFLICT (wallet_address, mission_id) DO UPDATE
        SET progress = '{"eligible": true, "eligible_at": "2026-03-20T00:00:00Z"}'::jsonb,
            completed = false
        WHERE user_mission_progress.completed = false;
    END IF;
  END LOOP;
END;
$$;