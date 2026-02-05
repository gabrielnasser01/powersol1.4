/*
  # Add wallet_address to user_mission_progress

  1. Changes
    - Add wallet_address column to user_mission_progress
    - Create unique constraint on wallet_address + mission_id
    - Create index for faster lookups

  2. Purpose
    - Allow tracking mission progress by wallet address
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_mission_progress' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE user_mission_progress ADD COLUMN wallet_address TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_mission_progress_wallet 
ON user_mission_progress(wallet_address);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_mission_progress_wallet_mission_unique'
  ) THEN
    ALTER TABLE user_mission_progress 
    ADD CONSTRAINT user_mission_progress_wallet_mission_unique 
    UNIQUE (wallet_address, mission_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
