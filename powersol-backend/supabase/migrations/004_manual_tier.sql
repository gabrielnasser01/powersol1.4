/*
  # Add Manual Tier Override for Affiliates

  1. Changes
    - Add `manual_tier` column to `affiliates` table
    - Allows admins to manually set affiliate tier (overrides automatic calculation)
    - NULL = use automatic calculation based on referrals
    - 1-4 = force specific tier

  2. Use Cases
    - VIP partnerships (give Tier 4 immediately)
    - Special promotions
    - Testing
    - Administrative corrections

  3. Notes
    - When `manual_tier` IS NOT NULL, it overrides automatic tier calculation
    - When `manual_tier` IS NULL, system uses standard tier calculation
*/

-- Add manual_tier column to affiliates table
ALTER TABLE affiliates
ADD COLUMN IF NOT EXISTS manual_tier INTEGER;

-- Add check constraint to ensure valid tier values (1-4 or NULL)
ALTER TABLE affiliates
ADD CONSTRAINT valid_manual_tier CHECK (
  manual_tier IS NULL OR (manual_tier >= 1 AND manual_tier <= 4)
);

-- Add comment for documentation
COMMENT ON COLUMN affiliates.manual_tier IS
'Manual tier override (1-4). When set, overrides automatic tier calculation. NULL = use automatic calculation.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_affiliates_manual_tier
ON affiliates(manual_tier)
WHERE manual_tier IS NOT NULL;

-- Function to get effective tier (manual or calculated)
CREATE OR REPLACE FUNCTION get_affiliate_effective_tier(affiliate_id UUID)
RETURNS INTEGER AS $$
DECLARE
  manual_tier_value INTEGER;
  validated_count INTEGER;
  calculated_tier INTEGER;
BEGIN
  -- Get manual tier if set
  SELECT manual_tier INTO manual_tier_value
  FROM affiliates
  WHERE id = affiliate_id;

  -- If manual tier is set, return it
  IF manual_tier_value IS NOT NULL THEN
    RETURN manual_tier_value;
  END IF;

  -- Otherwise, calculate tier based on referrals
  SELECT COUNT(*) INTO validated_count
  FROM referrals
  WHERE affiliate_id = affiliate_id AND is_validated = true;

  -- Calculate tier
  IF validated_count >= 5000 THEN
    calculated_tier := 4;
  ELSIF validated_count >= 1000 THEN
    calculated_tier := 3;
  ELSIF validated_count >= 100 THEN
    calculated_tier := 2;
  ELSE
    calculated_tier := 1;
  END IF;

  RETURN calculated_tier;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_affiliate_effective_tier IS
'Returns the effective tier for an affiliate (manual tier if set, otherwise calculated from referrals)';
