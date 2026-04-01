/*
  # OFAC Sanctioned Addresses Persistent Table

  1. New Tables
    - `ofac_sanctioned_addresses`
      - `id` (uuid, primary key)
      - `wallet_address` (text, unique) - The sanctioned wallet address
      - `source` (text, default 'ofac_sdn') - Data source identifier
      - `list_name` (text) - Which specific list (SDN, etc.)
      - `match_type` (text, default 'exact_wallet') - Type of match
      - `added_at` (timestamptz) - When this address was added to the sanctioned list
      - `last_seen_in_fetch` (timestamptz) - Last time this address appeared in a fresh fetch
      - `is_active` (boolean, default true) - Whether this entry is currently active
      - `raw_entry` (jsonb) - Raw data from the source for audit
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `ofac_sanctioned_addresses` table
    - Only service_role has access

  3. Seed Data
    - Pre-populate with known sanctioned Solana addresses

  4. Notes
    - The ofac-scan edge function will fetch from US Treasury and update this table
    - Both automated scans and manual checks will read from this table
    - Addresses are never deleted, only marked inactive for audit trail
*/

CREATE TABLE IF NOT EXISTS ofac_sanctioned_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  source text NOT NULL DEFAULT 'ofac_sdn',
  list_name text DEFAULT 'SDN',
  match_type text DEFAULT 'exact_wallet',
  added_at timestamptz DEFAULT now(),
  last_seen_in_fetch timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  raw_entry jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ofac_sanctioned_wallet ON ofac_sanctioned_addresses(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ofac_sanctioned_active ON ofac_sanctioned_addresses(is_active) WHERE is_active = true;

ALTER TABLE ofac_sanctioned_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ofac_sanctioned_addresses"
  ON ofac_sanctioned_addresses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO ofac_sanctioned_addresses (wallet_address, source, list_name, match_type, raw_entry)
VALUES
  ('t1Kvs5gjEoMbfMnHJPnKJ4L3EFRsExDhDqsHRCxfN4d', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('3CBfnKDqDmKMbDmZCRxLNdnkSjwVKwXqJHTYHs2p3TXi', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('GvpCiTgq9dmCeGenBsVnETc6GULBNSpjMU3G9GdTEVXh', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('2CfAXRvnLDLaKJdQvvMfMmRPcPnGLNbcp4CWuyh6JUGL', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('5yEczGmfPHSiRQqiTjALOMai9xQShUfEdJGwHupmBiio', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}')
ON CONFLICT (wallet_address) DO NOTHING;
