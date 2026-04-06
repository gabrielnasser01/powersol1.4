/*
  # Admin Ban System

  1. Changes to `users` table
    - `is_banned` (boolean) - whether user is banned from the platform
    - `banned_at` (timestamptz) - when the ban was applied
    - `banned_reason` (text) - reason for the ban

  2. New Tables
    - `admin_ban_log` - immutable audit log of all ban/unban actions
      - `id` (uuid, primary key)
      - `admin_wallet` (text) - wallet of admin who performed action
      - `target_wallet` (text) - wallet of affected user
      - `action` (text) - 'ban' or 'unban'
      - `reason` (text) - reason for action
      - `created_at` (timestamptz)

  3. Security
    - RLS enabled on admin_ban_log
    - Only service role can insert/read ban logs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE users ADD COLUMN is_banned boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banned_at'
  ) THEN
    ALTER TABLE users ADD COLUMN banned_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banned_reason'
  ) THEN
    ALTER TABLE users ADD COLUMN banned_reason text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_ban_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_wallet text NOT NULL,
  target_wallet text NOT NULL,
  action text NOT NULL CHECK (action IN ('ban', 'unban')),
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_ban_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ban logs"
  ON admin_ban_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);