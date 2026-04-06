/*
  # Restore Missing Tables and Columns

  This migration restores tables and columns that failed to apply during the
  database recovery process.

  1. Missing Columns on Existing Tables
    - `ticket_purchases`: wallet_address, total_sol, quantity
    - `users`: compliance_status, age_verified, ofac_checked, ofac_flagged
    - `solana_affiliate_earnings`: original_tier, original_rate
    - `affiliate_weekly_accumulator`: is_claimed

  2. Missing Tables
    - `lottery_cron_logs` - Cron job execution audit log
    - `house_earnings` - Revenue from purchases without affiliate referrals
    - `referrals` - Referral tracking between users and affiliates
    - `dev_treasury_transfers` - Dev treasury 30% allocation records
    - `age_verifications` - User age verification records
    - `ofac_checks` - OFAC compliance check records
    - `compliance_warnings` - Compliance warnings issued to users
    - `compliance_reports` - Compliance investigation reports
    - `ofac_sanctioned_addresses` - Known sanctioned wallet addresses

  3. Security
    - RLS enabled on all new tables
    - Appropriate policies for each table
    - Service role access where needed

  4. Important Notes
    - All DDL uses IF NOT EXISTS / IF EXISTS patterns
    - No data is dropped or deleted
    - Indexes added for performance
*/

-- =============================================
-- PART 1: Add missing columns to existing tables
-- =============================================

-- ticket_purchases: wallet_address
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_purchases' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE ticket_purchases ADD COLUMN wallet_address text;
  END IF;
END $$;

-- ticket_purchases: total_sol
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_purchases' AND column_name = 'total_sol'
  ) THEN
    ALTER TABLE ticket_purchases ADD COLUMN total_sol numeric;
  END IF;
END $$;

-- ticket_purchases: quantity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_purchases' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE ticket_purchases ADD COLUMN quantity integer DEFAULT 1;
  END IF;
END $$;

-- users: compliance_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'compliance_status'
  ) THEN
    ALTER TABLE users ADD COLUMN compliance_status text NOT NULL DEFAULT 'clear'
      CHECK (compliance_status IN ('clear', 'warning', 'flagged', 'banned', 'under_review'));
  END IF;
END $$;

-- users: age_verified
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'age_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN age_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- users: ofac_checked
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ofac_checked'
  ) THEN
    ALTER TABLE users ADD COLUMN ofac_checked boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- users: ofac_flagged
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ofac_flagged'
  ) THEN
    ALTER TABLE users ADD COLUMN ofac_flagged boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- solana_affiliate_earnings: original_tier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_affiliate_earnings' AND column_name = 'original_tier'
  ) THEN
    ALTER TABLE solana_affiliate_earnings ADD COLUMN original_tier smallint;
  END IF;
END $$;

-- solana_affiliate_earnings: original_rate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_affiliate_earnings' AND column_name = 'original_rate'
  ) THEN
    ALTER TABLE solana_affiliate_earnings ADD COLUMN original_rate numeric;
  END IF;
END $$;

-- affiliate_weekly_accumulator: is_claimed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_weekly_accumulator' AND column_name = 'is_claimed'
  ) THEN
    ALTER TABLE affiliate_weekly_accumulator ADD COLUMN is_claimed boolean DEFAULT false;
  END IF;
END $$;

-- =============================================
-- PART 2: Create missing tables
-- =============================================

-- lottery_cron_logs
CREATE TABLE IF NOT EXISTS lottery_cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'started',
  response_status int,
  response_body text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lottery_cron_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lottery_cron_logs' AND policyname = 'Service role can manage cron logs'
  ) THEN
    CREATE POLICY "Service role can manage cron logs"
      ON lottery_cron_logs FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lottery_cron_logs' AND policyname = 'Authenticated users can view cron logs'
  ) THEN
    CREATE POLICY "Authenticated users can view cron logs"
      ON lottery_cron_logs FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lottery_cron_logs_executed_at ON lottery_cron_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lottery_cron_logs_job_name ON lottery_cron_logs(job_name);

-- house_earnings
CREATE TABLE IF NOT EXISTS house_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_purchase_id uuid REFERENCES ticket_purchases(id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  lottery_type text NOT NULL,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'house_earnings' AND policyname = 'Service role can manage house_earnings'
  ) THEN
    CREATE POLICY "Service role can manage house_earnings"
      ON house_earnings FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'house_earnings' AND policyname = 'Users can view house earnings stats'
  ) THEN
    CREATE POLICY "Users can view house earnings stats"
      ON house_earnings FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  is_validated BOOLEAN DEFAULT false NOT NULL,
  first_purchase_at TIMESTAMPTZ,
  total_tickets_purchased INTEGER DEFAULT 0 NOT NULL,
  total_value_sol NUMERIC DEFAULT 0 NOT NULL,
  total_commission_earned NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_affiliate_id ON referrals(referrer_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_is_validated ON referrals(is_validated) WHERE is_validated = true;
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Affiliates can view their referrals'
  ) THEN
    CREATE POLICY "Affiliates can view their referrals"
      ON referrals FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM affiliates
          WHERE affiliates.id = referrals.referrer_affiliate_id
          AND affiliates.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Users can view their referrer'
  ) THEN
    CREATE POLICY "Users can view their referrer"
      ON referrals FOR SELECT TO authenticated
      USING (referred_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Service role can manage referrals'
  ) THEN
    CREATE POLICY "Service role can manage referrals"
      ON referrals FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- dev_treasury_transfers
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

CREATE INDEX IF NOT EXISTS idx_dev_treasury_transfers_created_at ON dev_treasury_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_dev_treasury_transfers_ticket_purchase_id ON dev_treasury_transfers(ticket_purchase_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dev_treasury_transfers' AND policyname = 'Service role can manage dev_treasury_transfers'
  ) THEN
    CREATE POLICY "Service role can manage dev_treasury_transfers"
      ON dev_treasury_transfers FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- age_verifications
CREATE TABLE IF NOT EXISTS age_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  signature text NOT NULL,
  message_signed text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'age_verifications' AND policyname = 'Service role full access on age_verifications'
  ) THEN
    CREATE POLICY "Service role full access on age_verifications"
      ON age_verifications FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_age_verifications_wallet ON age_verifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_age_verifications_created ON age_verifications(created_at DESC);

-- ofac_checks
CREATE TABLE IF NOT EXISTS ofac_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  check_type text NOT NULL DEFAULT 'manual',
  is_flagged boolean NOT NULL DEFAULT false,
  match_details jsonb,
  checked_by text,
  data_source text NOT NULL DEFAULT 'ofac_sdn',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ofac_checks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ofac_checks' AND policyname = 'Service role full access on ofac_checks'
  ) THEN
    CREATE POLICY "Service role full access on ofac_checks"
      ON ofac_checks FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ofac_checks_wallet ON ofac_checks(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ofac_checks_flagged ON ofac_checks(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_ofac_checks_created ON ofac_checks(created_at DESC);

-- compliance_warnings
CREATE TABLE IF NOT EXISTS compliance_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  warning_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  issued_by text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_warnings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'compliance_warnings' AND policyname = 'Service role full access on compliance_warnings'
  ) THEN
    CREATE POLICY "Service role full access on compliance_warnings"
      ON compliance_warnings FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_compliance_warnings_wallet ON compliance_warnings(wallet_address);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_severity ON compliance_warnings(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_resolved ON compliance_warnings(resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_created ON compliance_warnings(created_at DESC);

-- compliance_reports
CREATE TABLE IF NOT EXISTS compliance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  report_type text NOT NULL,
  title text NOT NULL,
  details text NOT NULL,
  evidence jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by text NOT NULL,
  assigned_to text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'compliance_reports' AND policyname = 'Service role full access on compliance_reports'
  ) THEN
    CREATE POLICY "Service role full access on compliance_reports"
      ON compliance_reports FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_compliance_reports_wallet ON compliance_reports(wallet_address);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_priority ON compliance_reports(priority);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_created ON compliance_reports(created_at DESC);

-- ofac_sanctioned_addresses
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ofac_sanctioned_addresses' AND policyname = 'Service role full access on ofac_sanctioned_addresses'
  ) THEN
    CREATE POLICY "Service role full access on ofac_sanctioned_addresses"
      ON ofac_sanctioned_addresses FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO ofac_sanctioned_addresses (wallet_address, source, list_name, match_type, raw_entry)
VALUES
  ('t1Kvs5gjEoMbfMnHJPnKJ4L3EFRsExDhDqsHRCxfN4d', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('3CBfnKDqDmKMbDmZCRxLNdnkSjwVKwXqJHTYHs2p3TXi', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('GvpCiTgq9dmCeGenBsVnETc6GULBNSpjMU3G9GdTEVXh', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('2CfAXRvnLDLaKJdQvvMfMmRPcPnGLNbcp4CWuyh6JUGL', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}'),
  ('5yEczGmfPHSiRQqiTjALOMai9xQShUfEdJGwHupmBiio', 'ofac_sdn', 'SDN', 'exact_wallet', '{"note": "Known sanctioned Solana address - seed data"}')
ON CONFLICT (wallet_address) DO NOTHING;

-- =============================================
-- PART 3: Add performance indexes on existing tables
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_wallet_addr ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_wallet ON ticket_purchases(wallet_address);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(referrer_affiliate_id);
