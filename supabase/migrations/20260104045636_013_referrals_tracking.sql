/*
  # Sistema de Tracking de Referrals

  1. Nova Tabela: referrals
    - Registra quem foi referido e por quem
    - Tracking de compras e comissões
    - Validação após primeira compra

  2. Segurança
    - RLS habilitado
    - Afiliados veem seus referrals
    - Usuários veem quem os referiu
*/

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  is_validated BOOLEAN DEFAULT false NOT NULL,
  first_purchase_at TIMESTAMPTZ,
  total_tickets_purchased INTEGER DEFAULT 0 NOT NULL,
  total_value_sol NUMERIC DEFAULT 0 NOT NULL,
  total_commission_earned NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_affiliate_id ON referrals(referrer_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_is_validated ON referrals(is_validated) WHERE is_validated = true;
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE affiliates.id = referrals.referrer_affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their referrer"
  ON referrals FOR SELECT
  TO authenticated
  USING (referred_user_id = auth.uid());

CREATE POLICY "Service role can manage referrals"
  ON referrals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);