/*
  # Affiliate Tiers System

  1. New Tables
    - `affiliate_tiers`
      - `id` (uuid, primary key)
      - `tier_level` (smallint, 1-4, unique) - Level number for ordering
      - `label` (text) - Display name (Starter, Bronze, Silver, Gold)
      - `threshold` (integer) - Minimum referrals required
      - `commission_rate` (numeric) - Commission percentage (0.05 = 5%)
      - `benefits` (jsonb) - Array of benefit strings
      - `color` (text) - Hex color for UI
      - `icon` (text) - Icon name for frontend
      - `is_active` (boolean) - Whether tier is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `affiliate_tiers` table
    - Public read access (tiers are public info)
    - Only admins can modify tiers

  3. Initial Data
    - Seed with 4 default tiers: Starter, Bronze, Silver, Gold
*/

CREATE TABLE IF NOT EXISTS affiliate_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level smallint NOT NULL UNIQUE CHECK (tier_level >= 1 AND tier_level <= 10),
  label text NOT NULL,
  threshold integer NOT NULL DEFAULT 0 CHECK (threshold >= 0),
  commission_rate numeric(4,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  color text NOT NULL DEFAULT '#3ecbff',
  icon text NOT NULL DEFAULT 'Star',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE affiliate_tiers IS 'Dynamic affiliate tier configuration - controls commission rates and benefits per tier';
COMMENT ON COLUMN affiliate_tiers.tier_level IS 'Tier level (1=lowest, higher=better). Used for ordering and progression';
COMMENT ON COLUMN affiliate_tiers.threshold IS 'Minimum validated referrals required to reach this tier';
COMMENT ON COLUMN affiliate_tiers.commission_rate IS 'Commission rate as decimal (0.05 = 5%, 0.30 = 30%)';
COMMENT ON COLUMN affiliate_tiers.benefits IS 'JSON array of benefit strings to display in UI';

ALTER TABLE affiliate_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tiers"
  ON affiliate_tiers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tiers"
  ON affiliate_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE INDEX idx_affiliate_tiers_level ON affiliate_tiers(tier_level);
CREATE INDEX idx_affiliate_tiers_threshold ON affiliate_tiers(threshold);
CREATE INDEX idx_affiliate_tiers_active ON affiliate_tiers(is_active) WHERE is_active = true;

INSERT INTO affiliate_tiers (tier_level, label, threshold, commission_rate, benefits, color, icon) VALUES
  (1, 'Starter', 0, 0.05, '["5% commission", "Basic analytics", "Email support"]'::jsonb, '#1e40af', 'Star'),
  (2, 'Bronze', 100, 0.10, '["10% commission", "Priority support", "Basic analytics", "Custom referral codes"]'::jsonb, '#ff4ecd', 'TrendingUp'),
  (3, 'Silver', 1000, 0.20, '["20% commission", "Dedicated manager", "Advanced analytics", "Marketing materials"]'::jsonb, '#3ecbff', 'Crown'),
  (4, 'Gold', 5000, 0.30, '["30% commission", "Advanced analytics", "VIP treatment", "Revenue sharing"]'::jsonb, '#b347ff', 'Sparkles')
ON CONFLICT (tier_level) DO NOTHING;

CREATE OR REPLACE FUNCTION get_tier_for_referral_count(ref_count integer)
RETURNS TABLE (
  tier_level smallint,
  label text,
  commission_rate numeric,
  benefits jsonb,
  color text,
  icon text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tier_level,
    t.label,
    t.commission_rate,
    t.benefits,
    t.color,
    t.icon
  FROM affiliate_tiers t
  WHERE t.is_active = true
    AND t.threshold <= ref_count
  ORDER BY t.threshold DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_tier(current_referrals integer)
RETURNS TABLE (
  tier_level smallint,
  label text,
  threshold integer,
  commission_rate numeric,
  referrals_needed integer
) AS $$
DECLARE
  current_tier_level smallint;
BEGIN
  SELECT t.tier_level INTO current_tier_level
  FROM affiliate_tiers t
  WHERE t.is_active = true AND t.threshold <= current_referrals
  ORDER BY t.threshold DESC
  LIMIT 1;

  RETURN QUERY
  SELECT 
    t.tier_level,
    t.label,
    t.threshold,
    t.commission_rate,
    (t.threshold - current_referrals)::integer as referrals_needed
  FROM affiliate_tiers t
  WHERE t.is_active = true
    AND t.tier_level > COALESCE(current_tier_level, 0)
  ORDER BY t.tier_level ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_affiliate_tiers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_affiliate_tiers_timestamp
  BEFORE UPDATE ON affiliate_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_tiers_timestamp();
