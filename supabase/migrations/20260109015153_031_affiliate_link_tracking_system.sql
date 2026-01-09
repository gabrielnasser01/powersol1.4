/*
  # Sistema de Tracking de Links de Afiliados
  
  1. Novas RPCs
    - track_referral_visit: Registra quando usuario acessa com link de afiliado
    - process_affiliate_commission: Processa comissao na compra de ticket
    - get_affiliate_by_code: Busca afiliado pelo codigo
  
  2. Funcionalidades
    - Tracking automatico de referrals
    - Calculo de comissao baseado no tier
    - Acumulacao semanal de ganhos
    - Validacao apos primeira compra
  
  3. Seguranca
    - RPCs com SECURITY DEFINER
    - Validacao de inputs
*/

-- Funcao para buscar afiliado pelo codigo de referral
CREATE OR REPLACE FUNCTION get_affiliate_by_code(p_referral_code text)
RETURNS TABLE (
  affiliate_id uuid,
  user_id uuid,
  wallet_address text,
  tier integer,
  commission_rate numeric,
  is_active boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as affiliate_id,
    a.user_id,
    u.wallet_address,
    COALESCE(a.manual_tier, 
      CASE 
        WHEN (SELECT COUNT(*) FROM referrals r WHERE r.referrer_affiliate_id = a.id AND r.is_validated = true) >= 100 THEN 4
        WHEN (SELECT COUNT(*) FROM referrals r WHERE r.referrer_affiliate_id = a.id AND r.is_validated = true) >= 50 THEN 3
        WHEN (SELECT COUNT(*) FROM referrals r WHERE r.referrer_affiliate_id = a.id AND r.is_validated = true) >= 10 THEN 2
        ELSE 1
      END
    ) as tier,
    CASE 
      WHEN COALESCE(a.manual_tier, 1) = 4 THEN 0.15
      WHEN COALESCE(a.manual_tier, 1) = 3 THEN 0.10
      WHEN COALESCE(a.manual_tier, 1) = 2 THEN 0.07
      ELSE 0.05
    END as commission_rate,
    COALESCE(
      (SELECT aa.is_active FROM affiliates aa WHERE aa.id = a.id), 
      true
    ) as is_active
  FROM affiliates a
  JOIN users u ON u.id = a.user_id
  WHERE UPPER(a.referral_code) = UPPER(p_referral_code)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_affiliate_by_code(text) TO anon, authenticated;

-- Funcao para registrar visita/referral de usuario
CREATE OR REPLACE FUNCTION track_referral_visit(
  p_referred_wallet text,
  p_referral_code text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referred_user_id uuid;
  v_affiliate_id uuid;
  v_affiliate_user_id uuid;
  v_existing_referral_id uuid;
  v_result jsonb;
BEGIN
  IF p_referred_wallet IS NULL OR p_referral_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing required parameters');
  END IF;

  SELECT affiliate_id, user_id INTO v_affiliate_id, v_affiliate_user_id
  FROM get_affiliate_by_code(p_referral_code);

  IF v_affiliate_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  SELECT id INTO v_referred_user_id
  FROM users
  WHERE wallet_address = p_referred_wallet;

  IF v_referred_user_id IS NULL THEN
    INSERT INTO users (wallet_address, is_admin, power_points)
    VALUES (p_referred_wallet, false, 0)
    RETURNING id INTO v_referred_user_id;
  END IF;

  IF v_referred_user_id = v_affiliate_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  SELECT id INTO v_existing_referral_id
  FROM referrals
  WHERE referred_user_id = v_referred_user_id;

  IF v_existing_referral_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'User already has a referrer',
      'referral_id', v_existing_referral_id
    );
  END IF;

  INSERT INTO referrals (
    referred_user_id,
    referrer_affiliate_id,
    referral_code_used,
    is_validated,
    total_tickets_purchased,
    total_value_sol,
    total_commission_earned
  ) VALUES (
    v_referred_user_id,
    v_affiliate_id,
    UPPER(p_referral_code),
    false,
    0,
    0,
    0
  )
  RETURNING id INTO v_existing_referral_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral tracked successfully',
    'referral_id', v_existing_referral_id,
    'affiliate_id', v_affiliate_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION track_referral_visit(text, text) TO anon, authenticated;

-- Funcao para processar comissao de afiliado na compra de ticket
CREATE OR REPLACE FUNCTION process_affiliate_commission(
  p_buyer_wallet text,
  p_ticket_price_lamports bigint,
  p_lottery_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_buyer_user_id uuid;
  v_referral record;
  v_affiliate record;
  v_commission_lamports bigint;
  v_commission_sol numeric;
  v_ticket_price_sol numeric;
  v_week_start timestamptz;
  v_accumulator_id uuid;
BEGIN
  IF p_buyer_wallet IS NULL OR p_ticket_price_lamports IS NULL OR p_ticket_price_lamports <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  SELECT id INTO v_buyer_user_id
  FROM users
  WHERE wallet_address = p_buyer_wallet;

  IF v_buyer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found', 'has_referral', false);
  END IF;

  SELECT r.*, a.id as aff_id, a.user_id as aff_user_id, u.wallet_address as aff_wallet
  INTO v_referral
  FROM referrals r
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  JOIN users u ON u.id = a.user_id
  WHERE r.referred_user_id = v_buyer_user_id;

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', true, 'has_referral', false, 'message', 'No referral found for user');
  END IF;

  SELECT * INTO v_affiliate
  FROM get_affiliate_by_code(v_referral.referral_code_used);

  IF v_affiliate IS NULL OR NOT v_affiliate.is_active THEN
    RETURN jsonb_build_object('success', false, 'has_referral', true, 'error', 'Affiliate inactive');
  END IF;

  v_ticket_price_sol := p_ticket_price_lamports::numeric / 1000000000;
  v_commission_sol := v_ticket_price_sol * v_affiliate.commission_rate;
  v_commission_lamports := (v_commission_sol * 1000000000)::bigint;

  IF NOT v_referral.is_validated THEN
    UPDATE referrals
    SET 
      is_validated = true,
      first_purchase_at = NOW(),
      total_tickets_purchased = total_tickets_purchased + 1,
      total_value_sol = total_value_sol + v_ticket_price_sol,
      total_commission_earned = total_commission_earned + v_commission_sol,
      updated_at = NOW()
    WHERE id = v_referral.id;
  ELSE
    UPDATE referrals
    SET 
      total_tickets_purchased = total_tickets_purchased + 1,
      total_value_sol = total_value_sol + v_ticket_price_sol,
      total_commission_earned = total_commission_earned + v_commission_sol,
      updated_at = NOW()
    WHERE id = v_referral.id;
  END IF;

  v_week_start := date_trunc('week', NOW());

  SELECT id INTO v_accumulator_id
  FROM affiliate_weekly_accumulator
  WHERE affiliate_id = v_affiliate.affiliate_id
  AND week_start = v_week_start;

  IF v_accumulator_id IS NULL THEN
    INSERT INTO affiliate_weekly_accumulator (
      affiliate_id,
      week_start,
      referral_count,
      tickets_from_referrals,
      total_volume_lamports,
      earned_commission_lamports,
      tier_at_time,
      is_released,
      is_claimed
    ) VALUES (
      v_affiliate.affiliate_id,
      v_week_start,
      CASE WHEN NOT v_referral.is_validated THEN 1 ELSE 0 END,
      1,
      p_ticket_price_lamports,
      v_commission_lamports,
      v_affiliate.tier,
      false,
      false
    )
    RETURNING id INTO v_accumulator_id;
  ELSE
    UPDATE affiliate_weekly_accumulator
    SET
      referral_count = referral_count + CASE WHEN NOT v_referral.is_validated THEN 1 ELSE 0 END,
      tickets_from_referrals = tickets_from_referrals + 1,
      total_volume_lamports = total_volume_lamports + p_ticket_price_lamports,
      earned_commission_lamports = earned_commission_lamports + v_commission_lamports,
      tier_at_time = v_affiliate.tier,
      updated_at = NOW()
    WHERE id = v_accumulator_id;
  END IF;

  UPDATE affiliates
  SET
    total_earned = total_earned + v_commission_sol,
    pending_earnings = pending_earnings + v_commission_sol,
    updated_at = NOW()
  WHERE id = v_affiliate.affiliate_id;

  RETURN jsonb_build_object(
    'success', true,
    'has_referral', true,
    'affiliate_wallet', v_referral.aff_wallet,
    'affiliate_tier', v_affiliate.tier,
    'commission_rate', v_affiliate.commission_rate,
    'commission_lamports', v_commission_lamports,
    'commission_sol', v_commission_sol,
    'was_first_purchase', NOT v_referral.is_validated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION process_affiliate_commission(text, bigint, uuid) TO anon, authenticated;

-- Funcao para verificar se usuario tem referral ativo
CREATE OR REPLACE FUNCTION get_user_referral_info(p_wallet text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_referral record;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE wallet_address = p_wallet;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('has_referral', false);
  END IF;

  SELECT 
    r.*,
    a.referral_code,
    u.wallet_address as affiliate_wallet
  INTO v_referral
  FROM referrals r
  JOIN affiliates a ON a.id = r.referrer_affiliate_id
  JOIN users u ON u.id = a.user_id
  WHERE r.referred_user_id = v_user_id;

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('has_referral', false);
  END IF;

  RETURN jsonb_build_object(
    'has_referral', true,
    'referral_code', v_referral.referral_code,
    'affiliate_wallet', v_referral.affiliate_wallet,
    'is_validated', v_referral.is_validated,
    'total_tickets', v_referral.total_tickets_purchased,
    'joined_at', v_referral.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_referral_info(text) TO anon, authenticated;
