/*
  # Dev Treasury Transfers Table

  1. New Tables
    - `dev_treasury_transfers`
      - `id` (uuid, primary key)
      - `ticket_purchase_id` (uuid, FK to ticket_purchases)
      - `wallet_address` (text, buyer wallet)
      - `lottery_type` (text)
      - `amount_lamports` (bigint, 30% of ticket total)
      - `transaction_signature` (text)
      - `created_at` (timestamptz)

  2. Purpose
    - Records the 30% Dev Treasury allocation from every ticket purchase
    - Previously this was only computed in-memory and never persisted

  3. Security
    - Enable RLS on `dev_treasury_transfers` table
    - Admin-only read access via service role (no public policies needed)
    - The trigger uses SECURITY DEFINER so it can insert regardless of RLS
*/

CREATE TABLE IF NOT EXISTS dev_treasury_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_purchase_id uuid REFERENCES ticket_purchases(id),
  wallet_address text NOT NULL,
  lottery_type text NOT NULL,
  amount_lamports bigint NOT NULL DEFAULT 0,
  transaction_signature text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dev_treasury_transfers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dev_treasury_transfers_created_at 
  ON dev_treasury_transfers(created_at);

CREATE INDEX IF NOT EXISTS idx_dev_treasury_transfers_ticket_purchase_id 
  ON dev_treasury_transfers(ticket_purchase_id);
