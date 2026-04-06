/*
  # Restore Dashboard Stats and Claim RPCs (after dropping old signatures)

  1. Functions
    - get_affiliate_dashboard_stats
    - get_affiliate_claim_history
    - get_affiliate_weekly_history
    - process_affiliate_claim_v2
  2. Seed data for missions
  3. Schema fixes
*/

CREATE OR REPLACE FUNCTION get_affiliate_dashboard_stats(p_wallet text)
RETURNS TABLE (
  tier integer, tier_label text, commission_rate numeric,
  total_referrals bigint, weekly_referrals bigint,
  total_tickets bigint, weekly_tickets bigint,
  total_earned_lamports bigint, weekly_earned_lamports bigint,
  pending_claimable_lamports bigint,
  next_release_timestamp timestamptz, time_until_release text,
  referrals_to_next_tier integer, next_tier_threshold integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_affiliate_id uuid; v_tier integer; v_total_refs bigint;
  v_week_start timestamptz; v_next_release timestamptz;
BEGIN
  v_week_start := date_trunc('week', now()) + interval '2 days';
  IF v_week_start > now() THEN v_week_start := v_week_start - interval '7 days'; END IF;
  SELECT nr.next_release_timestamp INTO v_next_release FROM get_next_affiliate_release() nr;
  SELECT a.id, COALESCE(a.manual_tier, 1) INTO v_affiliate_id, v_tier FROM affiliates a JOIN users u ON u.id = a.user_id WHERE u.wallet_address = p_wallet;
  IF v_affiliate_id IS NULL THEN SELECT apr.tier INTO v_tier FROM affiliate_pending_rewards apr WHERE apr.affiliate_wallet = p_wallet; END IF;
  v_tier := COALESCE(v_tier, 1);
  SELECT COUNT(*)::bigint INTO v_total_refs FROM referrals r WHERE r.referrer_affiliate_id = v_affiliate_id AND r.is_validated = true;
  v_total_refs := COALESCE(v_total_refs, 0);
  RETURN QUERY SELECT
    v_tier, CASE v_tier WHEN 1 THEN 'Starter' WHEN 2 THEN 'Bronze' WHEN 3 THEN 'Silver' WHEN 4 THEN 'Gold' ELSE 'Starter' END,
    CASE v_tier WHEN 1 THEN 0.05 WHEN 2 THEN 0.10 WHEN 3 THEN 0.20 WHEN 4 THEN 0.30 ELSE 0.05 END,
    v_total_refs,
    COALESCE((SELECT COUNT(*)::bigint FROM referrals r WHERE r.referrer_affiliate_id = v_affiliate_id AND r.created_at >= v_week_start), 0),
    COALESCE((SELECT SUM(tp.quantity)::bigint FROM ticket_purchases tp JOIN users ru ON ru.wallet_address = tp.wallet_address JOIN referrals r ON r.referred_user_id = ru.id WHERE r.referrer_affiliate_id = v_affiliate_id), 0),
    COALESCE((SELECT SUM(tp.quantity)::bigint FROM ticket_purchases tp JOIN users ru ON ru.wallet_address = tp.wallet_address JOIN referrals r ON r.referred_user_id = ru.id WHERE r.referrer_affiliate_id = v_affiliate_id AND tp.created_at >= v_week_start), 0),
    COALESCE((SELECT apr2.total_earned_lamports FROM affiliate_pending_rewards apr2 WHERE apr2.affiliate_wallet = p_wallet), 0)::bigint,
    COALESCE((SELECT awa.pending_lamports FROM affiliate_weekly_accumulator awa WHERE awa.affiliate_wallet = p_wallet AND awa.is_released = false AND COALESCE(awa.is_swept_to_delta, false) = false ORDER BY awa.week_number DESC LIMIT 1), 0)::bigint,
    COALESCE((SELECT SUM(awa2.pending_lamports) FROM affiliate_weekly_accumulator awa2 WHERE awa2.affiliate_wallet = p_wallet AND awa2.is_released = false AND awa2.pending_lamports > 0 AND COALESCE(awa2.is_swept_to_delta, false) = false AND is_affiliate_claim_available(awa2.week_number) = true AND NOT EXISTS (SELECT 1 FROM onchain_affiliate_claims oac WHERE oac.affiliate_wallet = awa2.affiliate_wallet AND oac.claim_nonce = awa2.week_number)), 0)::bigint,
    v_next_release, 'Wednesday',
    CASE WHEN v_tier >= 4 THEN 0 WHEN v_tier = 3 THEN GREATEST(0, 5000 - v_total_refs)::integer WHEN v_tier = 2 THEN GREATEST(0, 1000 - v_total_refs)::integer ELSE GREATEST(0, 100 - v_total_refs)::integer END,
    CASE WHEN v_tier >= 4 THEN NULL::integer WHEN v_tier = 3 THEN 5000 WHEN v_tier = 2 THEN 1000 ELSE 100 END;
END;
$$;

CREATE OR REPLACE FUNCTION get_affiliate_claim_history(p_wallet text, p_limit integer DEFAULT 20)
RETURNS TABLE(week_number bigint, week_date timestamptz, amount_lamports bigint, tier smallint, status text, tx_signature text, action_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT awa.week_number, get_wednesday_release_timestamp(awa.week_number),
    CASE WHEN oac.amount_lamports IS NOT NULL THEN oac.amount_lamports ELSE awa.pending_lamports END,
    awa.tier,
    CASE WHEN oac.id IS NOT NULL THEN 'claimed' WHEN awa.is_released = true OR awa.is_claimed = true THEN 'claimed' WHEN COALESCE(awa.is_swept_to_delta, false) = true THEN 'expired' WHEN is_affiliate_claim_available(awa.week_number) = true AND awa.pending_lamports > 0 THEN 'claimable' ELSE 'pending' END,
    oac.tx_signature,
    CASE WHEN oac.id IS NOT NULL THEN oac.claimed_at WHEN awa.is_released = true OR awa.is_claimed = true THEN COALESCE(awa.released_at, awa.claimed_at) WHEN COALESCE(awa.is_swept_to_delta, false) = true THEN awa.swept_at ELSE NULL END
  FROM affiliate_weekly_accumulator awa
  LEFT JOIN onchain_affiliate_claims oac ON oac.affiliate_wallet = awa.affiliate_wallet AND oac.claim_nonce = awa.week_number
  WHERE awa.affiliate_wallet = p_wallet AND awa.pending_lamports > 0
  ORDER BY awa.week_number DESC LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_affiliate_weekly_history(p_wallet text, p_weeks integer DEFAULT 8)
RETURNS TABLE(week_number bigint, week_start_date text, referral_count integer, earned_lamports bigint, tier integer, is_released boolean, is_claimable boolean)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT awa.week_number, to_char(to_timestamp(awa.week_number * 7 * 24 * 60 * 60), 'YYYY-MM-DD'),
    awa.referral_count::integer, awa.pending_lamports, awa.tier::integer,
    CASE WHEN oac.id IS NOT NULL THEN true ELSE awa.is_released END,
    CASE WHEN oac.id IS NOT NULL THEN false WHEN awa.is_released = true AND NOT EXISTS (SELECT 1 FROM onchain_affiliate_claims oac2 WHERE oac2.affiliate_wallet = awa.affiliate_wallet AND oac2.claim_nonce = awa.week_number) THEN true ELSE false END
  FROM affiliate_weekly_accumulator awa
  LEFT JOIN onchain_affiliate_claims oac ON oac.affiliate_wallet = awa.affiliate_wallet AND oac.claim_nonce = awa.week_number
  WHERE awa.affiliate_wallet = p_wallet ORDER BY awa.week_number DESC LIMIT p_weeks;
END;
$$;

DROP FUNCTION IF EXISTS process_affiliate_claim_v2(text, bigint, text);
CREATE FUNCTION process_affiliate_claim_v2(p_wallet text, p_week_number bigint, p_tx_signature text)
RETURNS TABLE (success boolean, amount bigint, error_message text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_amount bigint; v_tier smallint; v_ref_count integer; v_is_swept boolean;
BEGIN
  IF NOT is_affiliate_claim_available(p_week_number) THEN
    RETURN QUERY SELECT false, 0::bigint, 'Claim not yet available'::text; RETURN;
  END IF;
  SELECT pending_lamports, tier, referral_count, COALESCE(is_swept_to_delta, false) INTO v_amount, v_tier, v_ref_count, v_is_swept
  FROM affiliate_weekly_accumulator WHERE affiliate_wallet = p_wallet AND week_number = p_week_number AND is_released = false FOR UPDATE;
  IF v_amount IS NULL OR v_amount <= 0 THEN RETURN QUERY SELECT false, 0::bigint, 'No pending rewards'::text; RETURN; END IF;
  IF v_is_swept THEN RETURN QUERY SELECT false, 0::bigint, 'Rewards expired'::text; RETURN; END IF;
  UPDATE affiliate_weekly_accumulator SET is_released = true, released_at = now(), updated_at = now() WHERE affiliate_wallet = p_wallet AND week_number = p_week_number;
  INSERT INTO onchain_affiliate_claims (affiliate_wallet, amount_lamports, tier, referral_count, claim_nonce, tx_signature) VALUES (p_wallet, v_amount, v_tier, v_ref_count, p_week_number, p_tx_signature);
  UPDATE affiliate_release_schedule SET total_claimed = total_claimed + v_amount, is_released = true WHERE week_number = p_week_number;
  UPDATE pool_balances SET total_claimed = total_claimed + v_amount, last_synced = now() WHERE pool_type = 'affiliate_pool';
  RETURN QUERY SELECT true, v_amount, NULL::text;
END;
$$;

INSERT INTO missions (mission_type, mission_key, name, description, power_points, icon, requirements, is_active)
VALUES
  ('weekly', 'weekly_buy_special_event', 'Special Event Ticket', 'Buy at least 1 Special Event lottery ticket this week', 30, 'ShoppingCart', '{}', true),
  ('weekly', 'weekly_buy_jackpot', 'Jackpot Ticket', 'Buy at least 1 Jackpot lottery ticket this week', 30, 'ShoppingCart', '{}', true),
  ('weekly', 'weekly_buy_grand_prize', 'Grand Prize Ticket', 'Buy at least 1 Grand Prize lottery ticket this week', 30, 'ShoppingCart', '{}', true),
  ('activity', 'activity_10_each_lottery', 'All-Rounder', 'Buy 10 tickets from each of the 4 lotteries', 200, 'ShoppingBag', '{"type": "milestone", "tickets_per_lottery": 10, "lottery_types": ["tri_daily", "jackpot", "special_event", "grand_prize"]}'::jsonb, true)
ON CONFLICT (mission_key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, power_points = EXCLUDED.power_points, icon = EXCLUDED.icon, is_active = true;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_mission_progress' AND column_name = 'user_id' AND is_nullable = 'NO') THEN
    ALTER TABLE user_mission_progress ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliate_apps_wallet ON affiliate_applications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_mission_progress_wallet ON user_mission_progress(wallet_address);
CREATE INDEX IF NOT EXISTS idx_prizes_user_wallet ON prizes(user_wallet);
