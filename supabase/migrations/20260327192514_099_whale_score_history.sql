/*
  # Whale Score History Tracking

  1. New Tables
    - `whale_score_history`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null) - the user wallet
      - `whale_score` (integer, not null) - computed whale score at snapshot time
      - `overall_concentration` (numeric) - overall ticket concentration percentage
      - `global_ticket_share` (numeric) - share of all tickets globally
      - `win_rate` (numeric) - win rate percentage
      - `total_current_tickets` (integer) - tickets in active rounds at snapshot
      - `total_all_time_tickets` (integer) - all-time tickets at snapshot
      - `prizes_won` (integer) - prizes won at snapshot
      - `prizes_won_lamports` (bigint) - total prize lamports at snapshot
      - `concentration_data` (jsonb) - per-lottery concentration breakdown
      - `snapshot_date` (date, not null) - the date of the snapshot
      - `created_at` (timestamptz) - record creation timestamp

  2. Security
    - Enable RLS on `whale_score_history`
    - No public access -- only service role can read/write (admin edge function)

  3. Indexes
    - Composite index on (wallet_address, snapshot_date) for fast lookups
    - Index on snapshot_date for date range queries
    - Index on whale_score for ranking queries

  4. Notes
    - Unique constraint on (wallet_address, snapshot_date) to prevent duplicate snapshots per day
    - Designed for admin-only access via edge functions using service role key
*/

CREATE TABLE IF NOT EXISTS whale_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  whale_score integer NOT NULL DEFAULT 0,
  overall_concentration numeric(6,2) DEFAULT 0,
  global_ticket_share numeric(6,2) DEFAULT 0,
  win_rate numeric(6,2) DEFAULT 0,
  total_current_tickets integer DEFAULT 0,
  total_all_time_tickets integer DEFAULT 0,
  prizes_won integer DEFAULT 0,
  prizes_won_lamports bigint DEFAULT 0,
  concentration_data jsonb DEFAULT '{}',
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT whale_score_history_unique_wallet_date UNIQUE (wallet_address, snapshot_date)
);

ALTER TABLE whale_score_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_whale_score_history_wallet_date
  ON whale_score_history (wallet_address, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_whale_score_history_date
  ON whale_score_history (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_whale_score_history_score
  ON whale_score_history (whale_score DESC);
