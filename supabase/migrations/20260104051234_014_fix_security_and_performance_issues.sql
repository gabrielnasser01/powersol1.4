/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes on foreign keys
    - Optimize RLS policies with `(select auth.uid())` pattern
    - Remove unused indexes
    - Remove duplicate indexes
    
  2. Security Improvements
    - Consolidate duplicate RLS policies
    - Fix function search_path to be immutable
    
  3. Changes by Category
    
    ## Missing Foreign Key Indexes
    - Add index on `house_earnings.ticket_purchase_id`
    - Add index on `solana_affiliate_earnings.ticket_id`
    
    ## RLS Policy Optimization
    - Update all policies to use `(select auth.uid())` instead of `auth.uid()`
    - Affected tables: users, ticket_purchases, affiliates, affiliate_tier_audit, blockchain_users, blockchain_tickets, blockchain_claims, user_mission_progress, donations, referrals
    
    ## Duplicate Policies Removal
    - Remove duplicate INSERT/SELECT policies on ticket_purchases
    - Remove duplicate SELECT policies on referrals
    
    ## Unused Indexes Cleanup
    - Remove all unused indexes to reduce storage and maintenance overhead
    
  4. Important Notes
    - All changes are backwards compatible
    - Performance improvements are immediate
    - No data loss or downtime expected
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Add index for house_earnings foreign key
CREATE INDEX IF NOT EXISTS idx_house_earnings_ticket_purchase_id 
  ON public.house_earnings(ticket_purchase_id);

-- Add index for solana_affiliate_earnings foreign key
CREATE INDEX IF NOT EXISTS idx_solana_affiliate_earnings_ticket_id 
  ON public.solana_affiliate_earnings(ticket_id);

-- =====================================================
-- 2. REMOVE DUPLICATE INDEXES
-- =====================================================

-- Drop duplicate index (keeping idx_ticket_purchases_user_id)
DROP INDEX IF EXISTS public.idx_purchases_user_id;

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================

-- ticket_purchases unused indexes
DROP INDEX IF EXISTS public.idx_purchases_lottery_type;

-- users unused indexes
DROP INDEX IF EXISTS public.idx_users_power_points;
DROP INDEX IF EXISTS public.idx_users_wallet;
DROP INDEX IF EXISTS public.idx_users_is_admin;

-- affiliates unused indexes
DROP INDEX IF EXISTS public.idx_affiliates_user_id;
DROP INDEX IF EXISTS public.idx_affiliates_referral_code;

-- affiliate_tier_audit unused indexes
DROP INDEX IF EXISTS public.idx_affiliate_tier_audit_affiliate_id;
DROP INDEX IF EXISTS public.idx_affiliate_tier_audit_admin_id;
DROP INDEX IF EXISTS public.idx_affiliate_tier_audit_created_at;
DROP INDEX IF EXISTS public.idx_affiliate_tier_audit_action;

-- blockchain tables unused indexes
DROP INDEX IF EXISTS public.idx_blockchain_users_wallet;
DROP INDEX IF EXISTS public.idx_blockchain_tickets_user;
DROP INDEX IF EXISTS public.idx_blockchain_tickets_signature;
DROP INDEX IF EXISTS public.idx_blockchain_claims_user;
DROP INDEX IF EXISTS public.idx_blockchain_claims_signature;

-- missions unused indexes
DROP INDEX IF EXISTS public.idx_missions_type;
DROP INDEX IF EXISTS public.idx_missions_key;
DROP INDEX IF EXISTS public.idx_user_mission_progress_user_id;
DROP INDEX IF EXISTS public.idx_user_mission_progress_mission_id;

-- donations unused indexes
DROP INDEX IF EXISTS public.idx_donations_user_id;

-- solana tables unused indexes
DROP INDEX IF EXISTS public.idx_solana_tickets_user_wallet;
DROP INDEX IF EXISTS public.idx_solana_tickets_round;
DROP INDEX IF EXISTS public.idx_solana_tickets_tx_sig;
DROP INDEX IF EXISTS public.idx_solana_draws_round;
DROP INDEX IF EXISTS public.idx_solana_affiliate_wallet;

-- prizes unused indexes
DROP INDEX IF EXISTS public.idx_prizes_user_wallet;
DROP INDEX IF EXISTS public.idx_prizes_round;
DROP INDEX IF EXISTS public.idx_prizes_lottery_type;
DROP INDEX IF EXISTS public.idx_prizes_claimed;
DROP INDEX IF EXISTS public.idx_prizes_draw_date;
DROP INDEX IF EXISTS public.idx_prize_claims_prize_id;
DROP INDEX IF EXISTS public.idx_prize_claims_user_wallet;
DROP INDEX IF EXISTS public.idx_prize_claims_status;

-- affiliate_applications unused indexes
DROP INDEX IF EXISTS public.idx_affiliate_applications_wallet;
DROP INDEX IF EXISTS public.idx_affiliate_applications_email;
DROP INDEX IF EXISTS public.idx_affiliate_applications_status;
DROP INDEX IF EXISTS public.idx_affiliate_applications_created_at;

-- house_earnings unused indexes
DROP INDEX IF EXISTS public.idx_house_earnings_wallet;
DROP INDEX IF EXISTS public.idx_house_earnings_processed;
DROP INDEX IF EXISTS public.idx_house_earnings_lottery_type;

-- lottery_cron_logs unused indexes
DROP INDEX IF EXISTS public.idx_lottery_cron_logs_executed_at;
DROP INDEX IF EXISTS public.idx_lottery_cron_logs_job_name;

-- referrals unused indexes
DROP INDEX IF EXISTS public.idx_referrals_referred_user_id;
DROP INDEX IF EXISTS public.idx_referrals_referrer_affiliate_id;
DROP INDEX IF EXISTS public.idx_referrals_is_validated;
DROP INDEX IF EXISTS public.idx_referrals_created_at;
DROP INDEX IF EXISTS public.idx_referrals_referral_code;

-- =====================================================
-- 4. CONSOLIDATE DUPLICATE RLS POLICIES
-- =====================================================

-- Remove duplicate policies on ticket_purchases
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.ticket_purchases;
DROP POLICY IF EXISTS "Users can read own purchases" ON public.ticket_purchases;

-- Remove duplicate policies on referrals (keep the most descriptive ones)
DROP POLICY IF EXISTS "Affiliates can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their referrer" ON public.referrals;
DROP POLICY IF EXISTS "Service role can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service role can update referrals" ON public.referrals;

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- USERS table policies
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  TO authenticated
  USING (wallet_address = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (wallet_address = (select auth.uid()::text))
  WITH CHECK (wallet_address = (select auth.uid()::text));

-- TICKET_PURCHASES table policies
DROP POLICY IF EXISTS "Users can insert own ticket purchases" ON public.ticket_purchases;
CREATE POLICY "Users can insert own ticket purchases"
  ON public.ticket_purchases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own ticket purchases" ON public.ticket_purchases;
CREATE POLICY "Users can view own ticket purchases"
  ON public.ticket_purchases FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- AFFILIATES table policies
DROP POLICY IF EXISTS "Users can insert own affiliate data" ON public.affiliates;
CREATE POLICY "Users can insert own affiliate data"
  ON public.affiliates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own affiliate data" ON public.affiliates;
CREATE POLICY "Users can update own affiliate data"
  ON public.affiliates FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own affiliate data" ON public.affiliates;
CREATE POLICY "Users can view own affiliate data"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- AFFILIATE_TIER_AUDIT table policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.affiliate_tier_audit;
CREATE POLICY "Admins can view all audit logs"
  ON public.affiliate_tier_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid())
      AND users.is_admin = true
    )
  );

-- BLOCKCHAIN_USERS table policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.blockchain_users;
CREATE POLICY "Users can update own profile"
  ON public.blockchain_users FOR UPDATE
  TO authenticated
  USING (wallet_address = (select auth.uid()::text))
  WITH CHECK (wallet_address = (select auth.uid()::text));

DROP POLICY IF EXISTS "Users can view own profile" ON public.blockchain_users;
CREATE POLICY "Users can view own profile"
  ON public.blockchain_users FOR SELECT
  TO authenticated
  USING (wallet_address = (select auth.uid()::text));

-- BLOCKCHAIN_TICKETS table policies
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.blockchain_tickets;
CREATE POLICY "Users can insert own tickets"
  ON public.blockchain_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = (select auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "Users can view own tickets" ON public.blockchain_tickets;
CREATE POLICY "Users can view own tickets"
  ON public.blockchain_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = (select auth.uid()::text)
    )
  );

-- BLOCKCHAIN_CLAIMS table policies
DROP POLICY IF EXISTS "Users can insert own claims" ON public.blockchain_claims;
CREATE POLICY "Users can insert own claims"
  ON public.blockchain_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = (select auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "Users can view own claims" ON public.blockchain_claims;
CREATE POLICY "Users can view own claims"
  ON public.blockchain_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blockchain_users
      WHERE blockchain_users.id = user_id
      AND blockchain_users.wallet_address = (select auth.uid()::text)
    )
  );

-- USER_MISSION_PROGRESS table policies
DROP POLICY IF EXISTS "Users can insert own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can insert own mission progress"
  ON public.user_mission_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can update own mission progress"
  ON public.user_mission_progress FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own mission progress" ON public.user_mission_progress;
CREATE POLICY "Users can view own mission progress"
  ON public.user_mission_progress FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- DONATIONS table policies
DROP POLICY IF EXISTS "Users can insert own donations" ON public.donations;
CREATE POLICY "Users can insert own donations"
  ON public.donations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;
CREATE POLICY "Users can view own donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- REFERRALS table policies - consolidate and optimize
DROP POLICY IF EXISTS "Affiliates can view their referrals" ON public.referrals;
CREATE POLICY "Affiliates can view their referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (
    referrer_affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = (select auth.uid())
    )
    OR referred_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can view who referred them" ON public.referrals;
CREATE POLICY "Users can view who referred them"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (referred_user_id = (select auth.uid()));

-- =====================================================
-- 6. FIX FUNCTION SEARCH PATHS (SECURITY ISSUE)
-- =====================================================

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_wallet text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE wallet_address = user_wallet 
    AND is_admin = true
  );
END;
$$;

-- Fix update_affiliate_applications_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_affiliate_applications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix check_mission_reset function
CREATE OR REPLACE FUNCTION public.check_mission_reset()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.current_progress = 0;
    NEW.completed = false;
    NEW.last_reset_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix get_ticket_power_points function
CREATE OR REPLACE FUNCTION public.get_ticket_power_points(ticket_lottery_type text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN CASE 
    WHEN ticket_lottery_type = 'daily' THEN 1
    WHEN ticket_lottery_type = 'weekly' THEN 7
    WHEN ticket_lottery_type = 'monthly' THEN 30
    WHEN ticket_lottery_type = 'grand' THEN 365
    ELSE 0
  END;
END;
$$;

-- Fix update_prizes_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_prizes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix check_prize_not_claimed function
CREATE OR REPLACE FUNCTION public.check_prize_not_claimed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM prize_claims 
    WHERE prize_id = NEW.prize_id 
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Prize has already been claimed';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_referrals_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_referrals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;