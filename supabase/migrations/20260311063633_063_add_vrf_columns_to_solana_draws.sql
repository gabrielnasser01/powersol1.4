/*
  # Add VRF (Verifiable Random Function) columns to solana_draws

  1. Modified Tables
    - `solana_draws`
      - `commit_hash` (text, nullable) - Cryptographic commit hash used before the draw
      - `seed_hash` (text, nullable) - VRF seed hash used to generate randomness
      - `participants_count` (integer, default 0) - Number of participants in the draw
      - `lottery_type` (text, nullable) - Type of lottery (tri-daily, jackpot, etc.)
      - `winners_json` (jsonb, nullable) - Full winners list with position, wallet, prize

  2. Security
    - No RLS changes needed (table already has RLS enabled)

  3. Notes
    - These columns enable the Transparency page to show real VRF data from each draw
    - commit_hash and seed_hash provide cryptographic proof of fair draws
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'commit_hash'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN commit_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'seed_hash'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN seed_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'participants_count'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN participants_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'lottery_type'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN lottery_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'winners_json'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN winners_json jsonb;
  END IF;
END $$;
