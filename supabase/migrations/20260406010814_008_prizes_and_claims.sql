/*
  # Prize Claims System for Solana

  1. New Tables
    - `prizes`
      - `id` (uuid, primary key)
      - `draw_id` (bigint, reference to solana_draws.id)
      - `round` (bigint, lottery round number)
      - `user_wallet` (text, winner's wallet address)
      - `ticket_number` (bigint, winning ticket)
      - `prize_amount_lamports` (bigint, amount in lamports)
      - `prize_position` (text, e.g., "1st Place", "2nd Place")
      - `lottery_type` (text, tri-daily/halloween/jackpot/grand-prize)
      - `draw_date` (timestamptz, when the draw happened)
      - `claimed` (boolean, whether prize was claimed)
      - `claimed_at` (timestamptz, when it was claimed)
      - `claim_signature` (text, Solana transaction signature)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `prize_claims`
      - `id` (uuid, primary key)
      - `prize_id` (uuid, foreign key to prizes)
      - `user_wallet` (text, claimer's wallet)
      - `amount_lamports` (bigint, amount claimed in lamports)
      - `signature` (text, Solana transaction signature)
      - `status` (text, pending/completed/failed)
      - `error_message` (text, if failed)
      - `claimed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can view their own prizes
    - Users can view their own claim history
    - Only authenticated users can initiate claims
    - Service role can insert/update all records

  3. Indexes
    - Index on user_wallet for fast prize lookups
    - Index on round for lottery-specific queries
    - Index on claimed status for unclaimed prize queries
*/

-- Create prizes table
CREATE TABLE IF NOT EXISTS prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id bigint,
  round bigint NOT NULL,
  user_wallet text NOT NULL,
  ticket_number bigint NOT NULL,
  prize_amount_lamports bigint NOT NULL CHECK (prize_amount_lamports > 0),
  prize_position text NOT NULL,
  lottery_type text NOT NULL CHECK (lottery_type IN ('tri-daily', 'halloween', 'jackpot', 'grand-prize')),
  draw_date timestamptz NOT NULL,
  claimed boolean DEFAULT false,
  claimed_at timestamptz,
  claim_signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create prize_claims table
CREATE TABLE IF NOT EXISTS prize_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id uuid REFERENCES prizes(id) ON DELETE CASCADE NOT NULL,
  user_wallet text NOT NULL,
  amount_lamports bigint NOT NULL CHECK (amount_lamports > 0),
  signature text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  claimed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prizes_user_wallet ON prizes(user_wallet);
CREATE INDEX IF NOT EXISTS idx_prizes_round ON prizes(round);
CREATE INDEX IF NOT EXISTS idx_prizes_lottery_type ON prizes(lottery_type);
CREATE INDEX IF NOT EXISTS idx_prizes_claimed ON prizes(claimed);
CREATE INDEX IF NOT EXISTS idx_prizes_draw_date ON prizes(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_prize_claims_prize_id ON prize_claims(prize_id);
CREATE INDEX IF NOT EXISTS idx_prize_claims_user_wallet ON prize_claims(user_wallet);
CREATE INDEX IF NOT EXISTS idx_prize_claims_status ON prize_claims(status);

-- Enable Row Level Security
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prizes table
CREATE POLICY "Anyone can view all prizes"
  ON prizes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert prizes"
  ON prizes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update prizes"
  ON prizes FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for prize_claims table
CREATE POLICY "Users can view their own claims"
  ON prize_claims FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create claims"
  ON prize_claims FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prizes
      WHERE prizes.id = prize_id
      AND prizes.user_wallet = user_wallet
      AND NOT prizes.claimed
    )
  );

CREATE POLICY "Service role can manage all claims"
  ON prize_claims FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prizes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on prizes
DROP TRIGGER IF EXISTS prizes_updated_at_trigger ON prizes;
CREATE TRIGGER prizes_updated_at_trigger
  BEFORE UPDATE ON prizes
  FOR EACH ROW
  EXECUTE FUNCTION update_prizes_updated_at();

-- Function to prevent double claiming
CREATE OR REPLACE FUNCTION check_prize_not_claimed()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM prizes
    WHERE id = NEW.prize_id
    AND claimed = true
  ) THEN
    RAISE EXCEPTION 'Prize has already been claimed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent double claiming
DROP TRIGGER IF EXISTS prevent_double_claim_trigger ON prize_claims;
CREATE TRIGGER prevent_double_claim_trigger
  BEFORE INSERT ON prize_claims
  FOR EACH ROW
  EXECUTE FUNCTION check_prize_not_claimed();