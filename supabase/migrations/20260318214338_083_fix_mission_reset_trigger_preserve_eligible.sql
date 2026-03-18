/*
  # Fix mission reset trigger to preserve eligible progress

  1. Problem
    - The `check_mission_reset` trigger fires on every INSERT/UPDATE on `user_mission_progress`
    - When a daily mission from a previous day is updated (e.g., marking eligible after ticket purchase),
      the trigger detects `last_reset::date < CURRENT_DATE` and wipes `progress` to `'{}'`
    - This destroys the `eligible: true` flag that was just set by the edge function
    - Result: daily missions appear stuck in PENDING even after completing the action

  2. Fix
    - Only reset progress if the row was previously `completed = true` (OLD.completed)
    - When the edge function sets `completed = false` with new progress, the trigger should not interfere
    - On INSERT (no OLD row), only reset if completed is true in the NEW row
    - This preserves the eligible flag when the edge function re-marks a mission as eligible for a new day
*/

CREATE OR REPLACE FUNCTION check_mission_reset()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_type text;
BEGIN
  SELECT mission_type INTO v_mission_type
  FROM missions
  WHERE id = NEW.mission_id;

  IF v_mission_type = 'daily' AND NEW.last_reset IS NOT NULL AND NEW.last_reset::date < CURRENT_DATE THEN
    IF TG_OP = 'UPDATE' AND OLD.completed = true THEN
      NEW.progress = '{}'::jsonb;
      NEW.completed = false;
      NEW.last_reset = NOW();
    ELSIF TG_OP = 'INSERT' AND NEW.completed = true THEN
      NEW.progress = '{}'::jsonb;
      NEW.completed = false;
      NEW.last_reset = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
