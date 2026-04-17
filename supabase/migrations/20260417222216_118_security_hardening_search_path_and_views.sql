/*
  # Security Hardening: Views, Function search_path, RLS Policies

  1. Views (SECURITY DEFINER -> security_invoker)
    - `affiliate_tier_audit_stats` now uses `security_invoker = true`
    - `admin_activity_summary` now uses `security_invoker = true`
    This ensures the querying user's permissions are applied instead of the
    view owner's, preventing privilege escalation.

  2. Function search_path Hardening
    All listed public functions get an immutable `search_path = public, pg_temp`
    via `ALTER FUNCTION`. This prevents search_path-based SQL injection through
    schema takeover attacks.

  3. RLS Policy Tightening
    Replaces `WITH CHECK (true)` INSERT policies with real validation:
      - `affiliate_applications`: validate wallet, email, full_name
      - `blockchain_lotteries`: admin-only inserts
      - `compliance_age_verifications`: validate wallet + signature
      - `ticket_purchases`: validate wallet and quantity
      - `users`: validate wallet and deny elevated/banned creation
    Drops redundant "anyone can" INSERT policies on tables where only the
    service role should write (it bypasses RLS anyway):
      - `affiliate_tier_audit`
      - `power_points_ledger`
      - `solana_affiliate_earnings`
      - `solana_tickets`

  4. Policies for tables with RLS but no policies
    - `dev_treasury_transfers`: admin-only SELECT
    - `whale_score_history`: admin-only SELECT
    (Writes continue via service role which bypasses RLS.)

  5. Important Notes
    1. No destructive changes to data
    2. Service role inserts continue to work (service role bypasses RLS)
    3. View definitions themselves are unchanged; only security mode flipped
*/

-- ============================================================
-- 1. VIEWS: switch to security_invoker
-- ============================================================
ALTER VIEW IF EXISTS public.affiliate_tier_audit_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.admin_activity_summary SET (security_invoker = true);

-- ============================================================
-- 2. FUNCTIONS: pin search_path
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_admin','get_affiliate_tier_audit_history','get_ticket_price_lamports',
        'sync_ticket_drawn_status','get_tier_for_referral_count',
        'get_user_weekly_unique_lotteries_by_wallet','get_next_tier',
        'update_affiliate_tiers_timestamp','get_user_weekly_tickets_by_wallet',
        'increment_power_points_by_wallet','get_user_total_tickets_by_wallet',
        'get_recent_admin_actions','get_user_unique_lottery_types_by_wallet',
        'get_unclaimed_prizes','record_affiliate_earning',
        'get_claimable_affiliate_rewards','mark_affiliate_claim_complete',
        'sweep_expired_prizes','get_affiliate_per_ticket_commissions',
        'calculate_week_number','get_wednesday_release_timestamp',
        'is_affiliate_claim_available','get_claimable_affiliate_balance_v2',
        'get_affiliate_weekly_history','execute_ofac_scan',
        'get_next_affiliate_release','update_lottery_prize_pool',
        'get_tier_from_referrals','get_tier_label','get_commission_rate',
        'get_current_week_number','get_next_wednesday',
        'get_user_tickets_per_lottery_by_wallet','accumulate_affiliate_earning_v2',
        'get_user_referral_info','manual_lottery_draw','execute_lottery_draw',
        'get_affiliate_public_stats','get_affiliate_stats',
        'get_affiliate_recent_referrals','link_social_account',
        'get_affiliate_claim_history','mark_prize_claimed',
        'record_dev_treasury_on_purchase','get_next_lottery_timestamp',
        'generate_next_lottery','ensure_active_lotteries',
        'get_user_total_tickets','get_affiliate_top_referrals',
        'increment_power_points','get_user_unique_lottery_types',
        'get_user_weekly_tickets','get_user_weekly_unique_lotteries',
        'get_lottery_stats','check_mission_reset','claim_affiliate_earnings',
        'process_affiliate_commission_on_purchase','get_affiliate_by_code',
        'get_lottery_public_stats','track_referral_visit',
        'process_affiliate_commission','get_affiliate_dashboard_stats',
        'process_affiliate_claim_v2'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.schema_name, r.func_name, r.args
    );
  END LOOP;
END $$;

-- ============================================================
-- 3. RLS POLICY TIGHTENING
-- ============================================================

-- affiliate_applications
DROP POLICY IF EXISTS "Anyone can submit one affiliate application" ON public.affiliate_applications;
CREATE POLICY "Public can submit affiliate application with validation"
  ON public.affiliate_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    wallet_address IS NOT NULL
    AND length(wallet_address) BETWEEN 32 AND 44
    AND email IS NOT NULL
    AND email LIKE '%_@_%.__%'
    AND full_name IS NOT NULL
    AND length(trim(full_name)) > 0
  );

-- affiliate_tier_audit: service role bypasses RLS, drop permissive policy
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.affiliate_tier_audit;

-- blockchain_lotteries: restrict to admins (service role still bypasses RLS)
DROP POLICY IF EXISTS "System can create lotteries" ON public.blockchain_lotteries;
CREATE POLICY "Admins can insert lotteries"
  ON public.blockchain_lotteries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- compliance_age_verifications
DROP POLICY IF EXISTS "Anon can insert age verifications" ON public.compliance_age_verifications;
CREATE POLICY "Public can insert age verification with validation"
  ON public.compliance_age_verifications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    wallet_address IS NOT NULL
    AND length(wallet_address) BETWEEN 32 AND 44
    AND signature IS NOT NULL
    AND length(signature) > 0
    AND message_signed IS NOT NULL
    AND length(message_signed) > 0
    AND is_valid = true
  );

-- power_points_ledger: service role only (drop permissive)
DROP POLICY IF EXISTS "System can insert power points records" ON public.power_points_ledger;

-- solana_affiliate_earnings: service role only (drop permissive)
DROP POLICY IF EXISTS "Anyone can insert earnings" ON public.solana_affiliate_earnings;

-- solana_tickets: service role only (drop permissive)
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.solana_tickets;

-- ticket_purchases
DROP POLICY IF EXISTS "Anonymous can insert purchases" ON public.ticket_purchases;
CREATE POLICY "Public can insert ticket purchase with validation"
  ON public.ticket_purchases
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    wallet_address IS NOT NULL
    AND length(wallet_address) BETWEEN 32 AND 44
    AND lottery_type IS NOT NULL
    AND length(lottery_type) > 0
    AND quantity > 0
    AND quantity <= 1000
    AND total_sol > 0
  );

-- users
DROP POLICY IF EXISTS "Anonymous can insert users" ON public.users;
CREATE POLICY "Public can insert user with validation"
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    wallet_address IS NOT NULL
    AND length(wallet_address) BETWEEN 32 AND 44
    AND is_admin = false
    AND (is_banned IS NULL OR is_banned = false)
  );

-- ============================================================
-- 4. POLICIES FOR TABLES WITH RLS BUT NO POLICIES
-- ============================================================

-- dev_treasury_transfers: admin-only SELECT
DROP POLICY IF EXISTS "Admins can view dev treasury transfers" ON public.dev_treasury_transfers;
CREATE POLICY "Admins can view dev treasury transfers"
  ON public.dev_treasury_transfers
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- whale_score_history: admin-only SELECT
DROP POLICY IF EXISTS "Admins can view whale score history" ON public.whale_score_history;
CREATE POLICY "Admins can view whale score history"
  ON public.whale_score_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
