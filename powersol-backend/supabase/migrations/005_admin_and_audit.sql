/*
  # Admin Role and Audit System

  1. Changes to Users Table
    - Add `is_admin` column to `users` table
    - Defaults to `false` for security
    - Only admins can modify affiliate tiers

  2. New Tables
    - `affiliate_tier_audit` - Logs all manual tier changes

  3. Security
    - Enable RLS on audit table
    - Only admins can view audit logs
    - All tier changes are automatically logged

  4. Notes
    - First user registered can be manually set as admin via SQL
    - All subsequent admins must be set by existing admins
    - Audit logs are immutable (no updates/deletes)
*/

-- ============================================================================
-- 1. ADD ADMIN ROLE TO USERS
-- ============================================================================

-- Add is_admin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_admin
ON users(is_admin)
WHERE is_admin = true;

-- Add comment for documentation
COMMENT ON COLUMN users.is_admin IS
'Admin flag. Only admins can manage affiliate tiers and view audit logs. Default: false';

-- ============================================================================
-- 2. CREATE AUDIT TABLE
-- ============================================================================

-- Create affiliate_tier_audit table
CREATE TABLE IF NOT EXISTS affiliate_tier_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('SET_MANUAL_TIER', 'REMOVE_MANUAL_TIER')),
  old_tier INTEGER CHECK (old_tier IS NULL OR (old_tier >= 1 AND old_tier <= 4)),
  new_tier INTEGER CHECK (new_tier IS NULL OR (new_tier >= 1 AND new_tier <= 4)),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_affiliate_tier_audit_affiliate_id
ON affiliate_tier_audit(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_tier_audit_admin_id
ON affiliate_tier_audit(admin_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_tier_audit_created_at
ON affiliate_tier_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_tier_audit_action
ON affiliate_tier_audit(action);

-- Add comments
COMMENT ON TABLE affiliate_tier_audit IS
'Immutable audit log of all manual tier changes. Tracks who changed what, when, and why.';

COMMENT ON COLUMN affiliate_tier_audit.action IS
'Action performed: SET_MANUAL_TIER or REMOVE_MANUAL_TIER';

COMMENT ON COLUMN affiliate_tier_audit.old_tier IS
'Tier before change (effective tier, not just manual_tier value)';

COMMENT ON COLUMN affiliate_tier_audit.new_tier IS
'Tier after change (new manual tier value)';

COMMENT ON COLUMN affiliate_tier_audit.reason IS
'Admin-provided reason for the change';

COMMENT ON COLUMN affiliate_tier_audit.ip_address IS
'IP address of admin who made the change';

COMMENT ON COLUMN affiliate_tier_audit.user_agent IS
'User agent of admin who made the change';

-- ============================================================================
-- 3. ENABLE RLS ON AUDIT TABLE
-- ============================================================================

ALTER TABLE affiliate_tier_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON affiliate_tier_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policy: System can insert audit logs (via service role)
CREATE POLICY "Service role can insert audit logs"
  ON affiliate_tier_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: No updates allowed (immutable audit log)
CREATE POLICY "No updates allowed on audit logs"
  ON affiliate_tier_audit
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: No deletes allowed (immutable audit log)
CREATE POLICY "No deletes allowed on audit logs"
  ON affiliate_tier_audit
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM users
  WHERE id = user_id;

  RETURN COALESCE(admin_status, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS
'Checks if a user has admin privileges. Returns false if user not found.';

-- Function to get audit history for an affiliate
CREATE OR REPLACE FUNCTION get_affiliate_tier_audit_history(
  p_affiliate_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  admin_wallet TEXT,
  action TEXT,
  old_tier INTEGER,
  new_tier INTEGER,
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ata.id,
    u.wallet as admin_wallet,
    ata.action,
    ata.old_tier,
    ata.new_tier,
    ata.reason,
    ata.ip_address,
    ata.created_at
  FROM affiliate_tier_audit ata
  LEFT JOIN users u ON u.id = ata.admin_id
  WHERE ata.affiliate_id = p_affiliate_id
  ORDER BY ata.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_affiliate_tier_audit_history IS
'Returns audit history for a specific affiliate, including admin wallet address.';

-- Function to get recent admin actions
CREATE OR REPLACE FUNCTION get_recent_admin_actions(
  p_admin_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  affiliate_code TEXT,
  admin_wallet TEXT,
  action TEXT,
  old_tier INTEGER,
  new_tier INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ata.id,
    a.referral_code as affiliate_code,
    u.wallet as admin_wallet,
    ata.action,
    ata.old_tier,
    ata.new_tier,
    ata.reason,
    ata.created_at
  FROM affiliate_tier_audit ata
  LEFT JOIN affiliates a ON a.id = ata.affiliate_id
  LEFT JOIN users u ON u.id = ata.admin_id
  WHERE p_admin_id IS NULL OR ata.admin_id = p_admin_id
  ORDER BY ata.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_recent_admin_actions IS
'Returns recent admin actions. Can filter by admin_id or show all actions.';

-- ============================================================================
-- 5. EXAMPLE: SET FIRST ADMIN
-- ============================================================================

-- To set the first admin, run this SQL manually (replace wallet address):
-- UPDATE users SET is_admin = true WHERE wallet = 'YOUR_ADMIN_WALLET_ADDRESS';

-- Or set first user as admin:
-- UPDATE users SET is_admin = true WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

-- ============================================================================
-- 6. STATISTICS VIEWS
-- ============================================================================

-- View: Audit statistics
CREATE OR REPLACE VIEW affiliate_tier_audit_stats AS
SELECT
  COUNT(*) as total_changes,
  COUNT(DISTINCT affiliate_id) as affiliates_affected,
  COUNT(DISTINCT admin_id) as admins_involved,
  COUNT(*) FILTER (WHERE action = 'SET_MANUAL_TIER') as tiers_set,
  COUNT(*) FILTER (WHERE action = 'REMOVE_MANUAL_TIER') as tiers_removed,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as changes_last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as changes_last_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as changes_last_30d
FROM affiliate_tier_audit;

COMMENT ON VIEW affiliate_tier_audit_stats IS
'Statistics about tier changes: total, by action type, and by time period.';

-- View: Admin activity summary
CREATE OR REPLACE VIEW admin_activity_summary AS
SELECT
  u.id as admin_id,
  u.wallet as admin_wallet,
  COUNT(ata.id) as total_actions,
  COUNT(*) FILTER (WHERE ata.action = 'SET_MANUAL_TIER') as tiers_set,
  COUNT(*) FILTER (WHERE ata.action = 'REMOVE_MANUAL_TIER') as tiers_removed,
  MIN(ata.created_at) as first_action,
  MAX(ata.created_at) as last_action
FROM users u
INNER JOIN affiliate_tier_audit ata ON ata.admin_id = u.id
WHERE u.is_admin = true
GROUP BY u.id, u.wallet
ORDER BY total_actions DESC;

COMMENT ON VIEW admin_activity_summary IS
'Summary of actions performed by each admin.';
