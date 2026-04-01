/*
  # Compliance Center - Core Tables

  1. New Tables
    - `age_verifications`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null) - User's wallet address
      - `signature` (text, not null) - Wallet signature proving consent
      - `message_signed` (text, not null) - The exact message that was signed
      - `verified_at` (timestamptz) - When the verification was recorded
      - `ip_address` (text, nullable) - IP at time of verification
      - `user_agent` (text, nullable) - Browser user agent
      - `created_at` (timestamptz, default now())

    - `ofac_checks`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null) - Wallet checked
      - `check_type` (text, not null) - 'manual' or 'automated'
      - `is_flagged` (boolean, default false) - Whether the wallet was flagged
      - `match_details` (jsonb, nullable) - Details of any matches found
      - `checked_by` (text, nullable) - Admin wallet who ran the check
      - `data_source` (text, default 'ofac_sdn') - Which list was checked
      - `created_at` (timestamptz, default now())

    - `compliance_warnings`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null) - User being warned
      - `warning_type` (text, not null) - Category of warning
      - `severity` (text, not null) - 'low', 'medium', 'high', 'critical'
      - `description` (text, not null) - Details of the warning
      - `issued_by` (text, not null) - Admin wallet who issued it
      - `acknowledged` (boolean, default false) - Whether the user acknowledged
      - `acknowledged_at` (timestamptz, nullable)
      - `resolved` (boolean, default false) - Whether the issue was resolved
      - `resolved_at` (timestamptz, nullable)
      - `resolved_by` (text, nullable) - Admin who resolved it
      - `created_at` (timestamptz, default now())

    - `compliance_reports`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null) - User in the report
      - `report_type` (text, not null) - Category of report
      - `title` (text, not null) - Short title
      - `details` (text, not null) - Full report content
      - `evidence` (jsonb, nullable) - Links, screenshots, data
      - `status` (text, default 'open') - 'open', 'investigating', 'resolved', 'dismissed'
      - `priority` (text, default 'medium') - 'low', 'medium', 'high', 'critical'
      - `created_by` (text, not null) - Admin who created it
      - `assigned_to` (text, nullable) - Admin handling it
      - `resolution_notes` (text, nullable)
      - `resolved_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - RLS enabled on all tables
    - Only service role can read/write (admin access via edge functions only)

  3. Indexes
    - wallet_address indexes on all tables for fast lookups
    - created_at indexes for chronological queries
    - status/severity indexes for filtering
*/

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

CREATE POLICY "Service role full access on age_verifications"
  ON age_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_age_verifications_wallet ON age_verifications (wallet_address);
CREATE INDEX IF NOT EXISTS idx_age_verifications_created ON age_verifications (created_at DESC);

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

CREATE POLICY "Service role full access on ofac_checks"
  ON ofac_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ofac_checks_wallet ON ofac_checks (wallet_address);
CREATE INDEX IF NOT EXISTS idx_ofac_checks_flagged ON ofac_checks (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_ofac_checks_created ON ofac_checks (created_at DESC);

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

CREATE POLICY "Service role full access on compliance_warnings"
  ON compliance_warnings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_compliance_warnings_wallet ON compliance_warnings (wallet_address);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_severity ON compliance_warnings (severity);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_resolved ON compliance_warnings (resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_warnings_created ON compliance_warnings (created_at DESC);

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

CREATE POLICY "Service role full access on compliance_reports"
  ON compliance_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_wallet ON compliance_reports (wallet_address);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports (status);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_priority ON compliance_reports (priority);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_created ON compliance_reports (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'compliance_status'
  ) THEN
    ALTER TABLE users ADD COLUMN compliance_status text NOT NULL DEFAULT 'clear' CHECK (compliance_status IN ('clear', 'warning', 'flagged', 'banned', 'under_review'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'age_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN age_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ofac_checked'
  ) THEN
    ALTER TABLE users ADD COLUMN ofac_checked boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ofac_flagged'
  ) THEN
    ALTER TABLE users ADD COLUMN ofac_flagged boolean NOT NULL DEFAULT false;
  END IF;
END $$;
