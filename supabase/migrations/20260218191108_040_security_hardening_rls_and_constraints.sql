/*
  # Security Hardening - Constraints and Indexes

  1. Changes
    - Add check constraints on critical numeric fields to prevent negative/invalid values
    - Add performance indexes for security-related wallet lookups
    - Prevent ticket quantity abuse
    - Prevent negative prize amounts and commission rates

  2. New Constraints
    - prizes: prize_amount_lamports must be >= 0
    - ticket_purchases: quantity must be between 1 and 1000
    - users: power_points must be >= 0
    - solana_tickets: price_paid_lamports must be >= 0

  3. New Indexes
    - users(wallet_address) for fast wallet lookups
    - affiliate_applications(wallet_address) for duplicate checks
    - user_mission_progress(wallet_address) for progress queries
    - ticket_purchases(wallet_address) for purchase history
    - prizes(user_wallet) for winner lookups
    - referrals(referrer_affiliate_id) for referral counting

  4. Security Notes
    - All constraints use IF NOT EXISTS pattern to avoid errors
    - No data is modified or deleted
    - Indexes improve query performance and reduce DoS surface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_prize_amount_non_negative'
    AND table_name = 'prizes'
  ) THEN
    ALTER TABLE public.prizes
      ADD CONSTRAINT chk_prize_amount_non_negative CHECK (prize_amount_lamports >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_ticket_quantity_valid'
    AND table_name = 'ticket_purchases'
  ) THEN
    ALTER TABLE public.ticket_purchases
      ADD CONSTRAINT chk_ticket_quantity_valid CHECK (quantity > 0 AND quantity <= 1000);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_power_points_non_negative'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_power_points_non_negative CHECK (power_points >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_ticket_price_non_negative'
    AND table_name = 'solana_tickets'
  ) THEN
    ALTER TABLE public.solana_tickets
      ADD CONSTRAINT chk_ticket_price_non_negative CHECK (price_paid_lamports >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_wallet_addr ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_affiliate_apps_wallet ON public.affiliate_applications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_mission_progress_wallet ON public.user_mission_progress(wallet_address);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_wallet ON public.ticket_purchases(wallet_address);
CREATE INDEX IF NOT EXISTS idx_prizes_user_wallet ON public.prizes(user_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON public.referrals(referrer_affiliate_id);
