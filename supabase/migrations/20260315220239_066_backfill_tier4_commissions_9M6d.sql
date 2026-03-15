/*
  # Backfill Tier 4 Commission Rates for Affiliate 9M6d7A8R

  1. Problem
    - Affiliate 9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ is tier 4 (Gold, 30% commission)
    - 22 commission records were calculated at lower rates (5%, 10%, 20%) because the manual_tier
      was progressively upgraded from 1 to 4 between purchases
    - Total paid: 0.3705 SOL, correct total: 1.227 SOL, delta: 0.8565 SOL

  2. Corrections Applied
    - Update all 22 `solana_affiliate_earnings` records to correct 30% commission amounts
    - Update `affiliate_pending_rewards` with the delta (856,500,000 lamports) and set tier to 4
    - Update `affiliate_weekly_accumulator` for weeks 2930 (+50M), 2931 (+507.5M), 2932 (+299M)
    - Update `referrals` commission totals for both referrals:
      - Bff2a: 1.330 SOL * 30% = 0.399 SOL
      - E1qK8: 2.760 SOL * 30% = 0.828 SOL
    - Update `affiliates.total_earned` and `pending_earnings`

  3. Important Notes
    - All corrections are additive (no data is deleted)
    - Only lamport amounts change, no structural changes
    - Week 2930 was already swept; the delta for that week adds to pending_rewards only
*/

DO $$
DECLARE
  v_aff_wallet constant text := '9M6d7A8R4grWLsxpJhUPDNgJgd1MRei7nqodWrtzkxLQ';
  v_aff_id constant uuid := 'de759ed6-7b02-49b9-ba21-cd7c637973fc';
  v_ref_bff2a constant uuid := 'ff74602b-205d-43c6-900e-4ef07e245345';
  v_ref_e1qk8 constant uuid := '6ba2bc89-4dbb-4553-8884-687a3bd41b87';
  v_target_rate constant numeric := 0.30;
  v_lam constant bigint := 1000000000;
  v_total_delta bigint := 0;
  r record;
BEGIN

  FOR r IN
    SELECT
      sae.id as earning_id,
      sae.commission_lamports as old_lamports,
      floor(tp.total_sol * v_lam * v_target_rate)::bigint as new_lamports
    FROM solana_affiliate_earnings sae
    JOIN ticket_purchases tp ON tp.transaction_signature = sae.transaction_signature
    WHERE sae.affiliate_wallet = v_aff_wallet
      AND ROUND(sae.commission_lamports::numeric / (tp.total_sol * v_lam), 4) < v_target_rate
  LOOP
    UPDATE solana_affiliate_earnings
    SET commission_lamports = r.new_lamports
    WHERE id = r.earning_id;

    v_total_delta := v_total_delta + (r.new_lamports - r.old_lamports);
  END LOOP;

  UPDATE affiliate_pending_rewards SET
    pending_lamports = pending_lamports + v_total_delta,
    total_earned_lamports = total_earned_lamports + v_total_delta,
    tier = 4,
    last_updated = now()
  WHERE affiliate_wallet = v_aff_wallet;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = pending_lamports + 50000000,
    tier = 4,
    updated_at = now()
  WHERE affiliate_wallet = v_aff_wallet AND week_number = 2930;

  UPDATE affiliate_weekly_accumulator SET
    pending_lamports = pending_lamports + 507500000,
    tier = 4,
    updated_at = now()
  WHERE affiliate_wallet = v_aff_wallet AND week_number = 2931;

  IF EXISTS (SELECT 1 FROM affiliate_weekly_accumulator WHERE affiliate_wallet = v_aff_wallet AND week_number = 2932) THEN
    UPDATE affiliate_weekly_accumulator SET
      pending_lamports = pending_lamports + 299000000,
      tier = 4,
      updated_at = now()
    WHERE affiliate_wallet = v_aff_wallet AND week_number = 2932;
  ELSE
    INSERT INTO affiliate_weekly_accumulator (affiliate_wallet, week_number, pending_lamports, tier, referral_count, is_released)
    VALUES (v_aff_wallet, 2932, 299000000, 4, 0, false);
  END IF;

  UPDATE referrals SET
    total_commission_earned = total_value_sol * v_target_rate,
    updated_at = now()
  WHERE id = v_ref_bff2a;

  UPDATE referrals SET
    total_commission_earned = total_value_sol * v_target_rate,
    updated_at = now()
  WHERE id = v_ref_e1qk8;

  UPDATE affiliates SET
    total_earned = COALESCE(total_earned, 0) + (v_total_delta::numeric / v_lam),
    pending_earnings = COALESCE(pending_earnings, 0) + (v_total_delta::numeric / v_lam),
    updated_at = now()
  WHERE id = v_aff_id;

  RAISE NOTICE 'Backfill complete. Total delta applied: % lamports (% SOL)', v_total_delta, (v_total_delta::numeric / v_lam);
END $$;
