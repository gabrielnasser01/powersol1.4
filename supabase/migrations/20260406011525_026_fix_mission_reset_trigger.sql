/*
  # Fix Mission Reset Trigger
  
  1. Changes
    - Fix `check_mission_reset` function to use correct column names
    - `last_reset_date` -> `last_reset`
    - `current_progress` -> `progress`
    - Adjust logic to work with timestamptz instead of date
*/

CREATE OR REPLACE FUNCTION check_mission_reset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset IS NOT NULL AND NEW.last_reset::date < CURRENT_DATE THEN
    NEW.progress = '{}'::jsonb;
    NEW.completed = false;
    NEW.last_reset = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
