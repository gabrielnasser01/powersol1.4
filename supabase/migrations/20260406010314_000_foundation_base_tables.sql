/*
  # Foundation - Reconstruct Base Tables (001-004)

  Recreating the base tables that were in the original migrations 001-004
  which are no longer available as files. These tables are required by
  all subsequent migrations (005+).

  1. New Tables
    - `users` - Core user table with wallet-based authentication
    - `blockchain_lotteries` - On-chain lottery state tracking
    - `blockchain_users` - Blockchain user profiles
    - `blockchain_tickets` - On-chain ticket records
    - `blockchain_claims` - On-chain prize claim records
    - `solana_draws` - Draw results and history
    - `solana_tickets` - Solana ticket purchases
    - `solana_affiliate_earnings` - Per-transaction affiliate commission records
    - `affiliate_pending_rewards` - Aggregate affiliate pending balances
    - `onchain_affiliate_claims` - Claimed affiliate rewards on-chain
    - `pool_balances` - Pool balance tracking
    - `lotteries` - Backend lottery management table

  2. Views
    - `solana_lottery_state` - View over blockchain_lotteries for API compatibility

  3. Security
    - RLS enabled on all tables
    - Wallet-based access control for user data
    - Service role access for system operations
*/

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  nonce text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = auth.uid()::text);

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (wallet_address = auth.uid()::text);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (wallet_address = auth.uid()::text)
  WITH CHECK (wallet_address = auth.uid()::text);

-- ============================================================================
-- 2. BLOCKCHAIN_LOTTERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_lotteries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lottery_id integer NOT NULL,
  lottery_type text NOT NULL,
  ticket_price bigint NOT NULL DEFAULT 0,
  max_tickets integer NOT NULL DEFAULT 1000,
  draw_timestamp bigint NOT NULL,
  is_drawn boolean DEFAULT false,
  winning_ticket integer,
  prize_pool bigint DEFAULT 0,
  transaction_signature text,
  on_chain_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_lotteries_type ON blockchain_lotteries(lottery_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_lotteries_drawn ON blockchain_lotteries(is_drawn);
CREATE INDEX IF NOT EXISTS idx_blockchain_lotteries_draw_ts ON blockchain_lotteries(draw_timestamp);

ALTER TABLE blockchain_lotteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view blockchain lotteries"
  ON blockchain_lotteries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service can manage blockchain lotteries"
  ON blockchain_lotteries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. BLOCKCHAIN_USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_users_wallet ON blockchain_users(wallet_address);

ALTER TABLE blockchain_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON blockchain_users FOR SELECT
  TO authenticated
  USING (wallet_address = auth.uid()::text);

CREATE POLICY "Users can update own profile"
  ON blockchain_users FOR UPDATE
  TO authenticated
  USING (wallet_address = auth.uid()::text)
  WITH CHECK (wallet_address = auth.uid()::text);

CREATE POLICY "Service can manage blockchain users"
  ON blockchain_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. BLOCKCHAIN_TICKETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES blockchain_users(id) ON DELETE CASCADE,
  lottery_id integer NOT NULL,
  ticket_number integer NOT NULL,
  is_winner boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tickets_user ON blockchain_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_tickets_lottery ON blockchain_tickets(lottery_id);

ALTER TABLE blockchain_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON blockchain_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own tickets"
  ON blockchain_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = auth.uid()::text
    )
  );

CREATE POLICY "Service can manage blockchain tickets"
  ON blockchain_tickets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. BLOCKCHAIN_CLAIMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES blockchain_users(id) ON DELETE CASCADE,
  prize_id uuid,
  amount_lamports bigint,
  transaction_signature text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_claims_user ON blockchain_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_claims_signature ON blockchain_claims(transaction_signature);

ALTER TABLE blockchain_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims"
  ON blockchain_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own claims"
  ON blockchain_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = auth.uid()::text
    )
  );

CREATE POLICY "Service can manage blockchain claims"
  ON blockchain_claims FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. SOLANA_DRAWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS solana_draws (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round bigint NOT NULL,
  draw_account text,
  winning_number integer,
  winner_wallet text,
  prize_lamports bigint DEFAULT 0,
  transaction_signature text,
  draw_timestamp timestamptz,
  drawn_at timestamptz DEFAULT now(),
  is_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solana_draws_round ON solana_draws(round);

ALTER TABLE solana_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view draws"
  ON solana_draws FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service can manage draws"
  ON solana_draws FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. SOLANA_TICKETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS solana_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lottery_id integer NOT NULL,
  ticket_number integer NOT NULL,
  quantity integer DEFAULT 1,
  purchase_price bigint DEFAULT 0,
  price_paid_lamports bigint DEFAULT 0,
  tx_signature text,
  user_wallet text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solana_tickets_user_wallet ON solana_tickets(user_wallet);
CREATE INDEX IF NOT EXISTS idx_solana_tickets_round ON solana_tickets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_solana_tickets_tx_sig ON solana_tickets(tx_signature);

ALTER TABLE solana_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solana tickets"
  ON solana_tickets FOR SELECT
  TO authenticated
  USING (user_wallet = auth.uid()::text OR user_id = auth.uid());

CREATE POLICY "Service can manage solana tickets"
  ON solana_tickets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. SOLANA_AFFILIATE_EARNINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS solana_affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_wallet text NOT NULL,
  commission_lamports bigint NOT NULL DEFAULT 0,
  transaction_signature text,
  ticket_id uuid,
  earned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solana_affiliate_wallet ON solana_affiliate_earnings(affiliate_wallet);

ALTER TABLE solana_affiliate_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate earnings"
  ON solana_affiliate_earnings FOR SELECT
  TO authenticated
  USING (affiliate_wallet = auth.uid()::text);

CREATE POLICY "Service can manage affiliate earnings"
  ON solana_affiliate_earnings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. AFFILIATE_PENDING_REWARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_pending_rewards (
  affiliate_wallet text PRIMARY KEY,
  pending_lamports bigint NOT NULL DEFAULT 0,
  tier smallint NOT NULL DEFAULT 1,
  referral_count integer NOT NULL DEFAULT 0,
  total_earned_lamports bigint NOT NULL DEFAULT 0,
  total_claimed_lamports bigint NOT NULL DEFAULT 0,
  next_claim_nonce bigint NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_pending_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending rewards"
  ON affiliate_pending_rewards FOR SELECT
  TO authenticated
  USING (affiliate_wallet = auth.uid()::text);

CREATE POLICY "Service can manage pending rewards"
  ON affiliate_pending_rewards FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. ONCHAIN_AFFILIATE_CLAIMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS onchain_affiliate_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_wallet text NOT NULL,
  amount_lamports bigint NOT NULL DEFAULT 0,
  tier smallint,
  referral_count integer,
  claim_nonce bigint,
  tx_signature text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onchain_claims_wallet ON onchain_affiliate_claims(affiliate_wallet);

ALTER TABLE onchain_affiliate_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onchain claims"
  ON onchain_affiliate_claims FOR SELECT
  TO authenticated
  USING (affiliate_wallet = auth.uid()::text);

CREATE POLICY "Service can manage onchain claims"
  ON onchain_affiliate_claims FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 11. POOL_BALANCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pool_balances (
  pool_type text PRIMARY KEY,
  total_deposited bigint NOT NULL DEFAULT 0,
  total_claimed bigint NOT NULL DEFAULT 0,
  last_synced timestamptz DEFAULT now()
);

INSERT INTO pool_balances (pool_type, total_deposited, total_claimed)
VALUES ('affiliate_pool', 0, 0)
ON CONFLICT (pool_type) DO NOTHING;

ALTER TABLE pool_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view pool balances"
  ON pool_balances FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service can manage pool balances"
  ON pool_balances FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 12. LOTTERIES TABLE (Backend)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lotteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id integer NOT NULL,
  type text NOT NULL,
  ticket_price text,
  max_tickets integer DEFAULT 1000,
  current_tickets integer DEFAULT 0,
  prize_pool text DEFAULT '0',
  is_drawn boolean DEFAULT false,
  winning_ticket integer,
  draw_tx_signature text,
  tx_signature text,
  draw_timestamp timestamptz,
  drawn_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lotteries_type ON lotteries(type);
CREATE INDEX IF NOT EXISTS idx_lotteries_drawn ON lotteries(is_drawn);

ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view lotteries"
  ON lotteries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service can manage lotteries"
  ON lotteries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 13. SOLANA_LOTTERY_STATE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW solana_lottery_state AS
SELECT
  id,
  lottery_id,
  lottery_type,
  ticket_price,
  max_tickets,
  draw_timestamp,
  is_drawn,
  winning_ticket,
  prize_pool,
  transaction_signature,
  on_chain_address,
  created_at
FROM blockchain_lotteries;

-- ============================================================================
-- 14. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER lotteries_updated_at
  BEFORE UPDATE ON lotteries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();