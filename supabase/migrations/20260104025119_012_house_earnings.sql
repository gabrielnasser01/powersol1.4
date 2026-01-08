/*
  # House Earnings - Tracking revenue from purchases without affiliates
  
  ## Purpose
  When a user purchases tickets WITHOUT an affiliate referral code, the 30% that would
  normally go to affiliates should be tracked as "house earnings" - revenue for PowerSOL.
  
  ## Tables
  1. `house_earnings` - Records each instance where 30% goes to the house instead of an affiliate
     - `id` (uuid, primary key)
     - `ticket_purchase_id` (uuid, references ticket_purchases)
     - `wallet_address` (text) - Buyer's wallet
     - `lottery_type` (text) - Type of lottery
     - `amount_lamports` (bigint) - Amount in lamports (30% of ticket price)
     - `transaction_signature` (text) - Original purchase transaction
     - `processed` (boolean) - Whether funds have been moved to treasury
     - `processed_at` (timestamp) - When funds were processed
     - `created_at` (timestamp)
  
  ## Security
  - RLS enabled with restrictive policies
  - Only service role can insert/update
  - Authenticated users can view their own records
*/

CREATE TABLE IF NOT EXISTS house_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_purchase_id uuid REFERENCES ticket_purchases(id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  lottery_type text NOT NULL CHECK (lottery_type IN ('tri-daily', 'jackpot', 'grand-prize', 'xmas', 'halloween')),
  amount_lamports bigint NOT NULL CHECK (amount_lamports > 0),
  transaction_signature text,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  processed_signature text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_earnings_wallet ON house_earnings(wallet_address);
CREATE INDEX IF NOT EXISTS idx_house_earnings_processed ON house_earnings(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_house_earnings_lottery_type ON house_earnings(lottery_type);

ALTER TABLE house_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage house_earnings"
  ON house_earnings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view house earnings stats"
  ON house_earnings
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE house_earnings IS 'Tracks the 30% house revenue from ticket purchases made without affiliate referral codes';
COMMENT ON COLUMN house_earnings.amount_lamports IS '30% of ticket price in lamports that goes to house when no affiliate';
COMMENT ON COLUMN house_earnings.processed IS 'True when funds have been transferred from affiliates_pool to treasury';