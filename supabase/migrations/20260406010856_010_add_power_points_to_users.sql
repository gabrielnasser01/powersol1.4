/*
  # Add Power Points to Users

  1. Changes
    - Add `power_points` column to `users` table to track mission points
    - Add `login_streak` column to track consecutive daily logins
    - Add `last_login_date` column to track last login for streak calculation
    - Add index for efficient power_points queries (leaderboard)

  2. Security
    - Users can only update their own power_points via RLS
*/

-- Add power_points column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'power_points'
  ) THEN
    ALTER TABLE users ADD COLUMN power_points integer DEFAULT 0;
  END IF;
END $$;

-- Add login_streak column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'login_streak'
  ) THEN
    ALTER TABLE users ADD COLUMN login_streak integer DEFAULT 0;
  END IF;
END $$;

-- Add last_login_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login_date'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login_date date;
  END IF;
END $$;

-- Add index for power_points leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_power_points ON users(power_points DESC);

-- Add comment for documentation
COMMENT ON COLUMN users.power_points IS 'Total Power Points earned from completing missions';
COMMENT ON COLUMN users.login_streak IS 'Current consecutive daily login streak';
COMMENT ON COLUMN users.last_login_date IS 'Last date user logged in (for streak calculation)';