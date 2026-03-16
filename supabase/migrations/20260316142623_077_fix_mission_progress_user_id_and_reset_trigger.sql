/*
  # Fix mission progress table and reset trigger

  1. Problem
    - The `user_id` column on `user_mission_progress` is NOT NULL, but neither the
      frontend nor the edge function provides a user_id (they use wallet_address instead).
      This causes ALL mission completion inserts to fail silently.
    - The `check_mission_reset` trigger resets ALL mission types (including one-time
      social and activity missions) whenever `last_reset` is from a previous day.
      This incorrectly resets permanent achievements.

  2. Changes
    - Make `user_id` nullable so wallet_address-based inserts succeed
    - Update the `check_mission_reset` trigger to only reset daily missions.
      Weekly missions use hour-based cooldown checks in application code.
      Social and activity missions are permanent and must never be reset.

  3. Security
    - No RLS changes needed (policies already exist)
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_mission_progress'
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE user_mission_progress ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION check_mission_reset()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_type text;
BEGIN
  SELECT mission_type INTO v_mission_type
  FROM missions
  WHERE id = NEW.mission_id;

  IF v_mission_type = 'daily' AND NEW.last_reset IS NOT NULL AND NEW.last_reset::date < CURRENT_DATE THEN
    NEW.progress = '{}'::jsonb;
    NEW.completed = false;
    NEW.last_reset = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
