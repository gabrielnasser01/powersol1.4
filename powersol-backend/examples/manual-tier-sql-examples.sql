/*
  🎯 Exemplos SQL - Tier Manual de Afiliados

  Exemplos práticos de como gerenciar tiers manualmente diretamente no banco de dados.
*/

-- ============================================================================
-- 1. VER STATUS DE TIERS
-- ============================================================================

-- Ver todos afiliados com suas informações de tier
SELECT
  a.id,
  a.referral_code,
  a.manual_tier,
  a.total_earned,
  a.pending_earnings,
  COUNT(r.id) FILTER (WHERE r.is_validated = true) as validated_referrals,
  get_affiliate_effective_tier(a.id) as effective_tier
FROM affiliates a
LEFT JOIN referrals r ON r.affiliate_id = a.id
GROUP BY a.id, a.referral_code, a.manual_tier, a.total_earned, a.pending_earnings
ORDER BY a.created_at DESC;

-- Ver apenas afiliados com tier manual definido
SELECT
  a.id,
  a.referral_code,
  a.manual_tier,
  COUNT(r.id) FILTER (WHERE r.is_validated = true) as actual_referrals,
  get_affiliate_effective_tier(a.id) as effective_tier
FROM affiliates a
LEFT JOIN referrals r ON r.affiliate_id = a.id
WHERE a.manual_tier IS NOT NULL
GROUP BY a.id, a.referral_code, a.manual_tier
ORDER BY a.manual_tier DESC;

-- Comparar tier calculado vs tier efetivo
SELECT
  a.id,
  a.referral_code,
  COUNT(r.id) FILTER (WHERE r.is_validated = true) as validated_refs,
  a.manual_tier,
  get_affiliate_effective_tier(a.id) as effective_tier,
  CASE
    WHEN a.manual_tier IS NOT NULL THEN '🔧 Manual'
    ELSE '⚙️ Automático'
  END as tier_type
FROM affiliates a
LEFT JOIN referrals r ON r.affiliate_id = a.id
GROUP BY a.id, a.referral_code, a.manual_tier
ORDER BY effective_tier DESC, validated_refs DESC;

-- ============================================================================
-- 2. DEFINIR TIER MANUAL
-- ============================================================================

-- Definir Tier 4 (Gold) para um afiliado específico
-- Útil para: Parcerias VIP, contratos especiais
UPDATE affiliates
SET
  manual_tier = 4,
  updated_at = NOW()
WHERE referral_code = 'VIP2024';

-- Definir Tier 3 (Silver) para múltiplos afiliados
-- Útil para: Promoções em grupo
UPDATE affiliates
SET
  manual_tier = 3,
  updated_at = NOW()
WHERE id IN (
  'abc-123',
  'def-456',
  'ghi-789'
);

-- Promover todos afiliados Tier 1 para Tier 2 durante promoção
-- Útil para: Campanhas de incentivo
UPDATE affiliates a
SET
  manual_tier = 2,
  updated_at = NOW()
WHERE
  a.manual_tier IS NULL
  AND get_affiliate_effective_tier(a.id) = 1;

-- ============================================================================
-- 3. REMOVER TIER MANUAL (VOLTAR AO AUTOMÁTICO)
-- ============================================================================

-- Remover tier manual de um afiliado específico
UPDATE affiliates
SET
  manual_tier = NULL,
  updated_at = NOW()
WHERE referral_code = 'VIP2024';

-- Remover tier manual de todos (fim de promoção)
UPDATE affiliates
SET
  manual_tier = NULL,
  updated_at = NOW()
WHERE manual_tier IS NOT NULL;

-- Remover tier manual apenas de afiliados que já atingiram tier natural
-- (não penalizar quem cresceu durante a promoção)
UPDATE affiliates a
SET
  manual_tier = NULL,
  updated_at = NOW()
WHERE
  a.manual_tier IS NOT NULL
  AND get_affiliate_effective_tier(a.id) <= (
    SELECT
      CASE
        WHEN COUNT(*) FILTER (WHERE is_validated = true) >= 5000 THEN 4
        WHEN COUNT(*) FILTER (WHERE is_validated = true) >= 1000 THEN 3
        WHEN COUNT(*) FILTER (WHERE is_validated = true) >= 100 THEN 2
        ELSE 1
      END
    FROM referrals
    WHERE affiliate_id = a.id
  );

-- ============================================================================
-- 4. RELATÓRIOS E ANÁLISES
-- ============================================================================

-- Estatísticas de uso de tier manual
SELECT
  CASE
    WHEN manual_tier IS NULL THEN 'Automático'
    ELSE 'Manual (Tier ' || manual_tier || ')'
  END as tier_type,
  COUNT(*) as affiliate_count,
  SUM(total_earned) as total_earned,
  SUM(pending_earnings) as total_pending
FROM affiliates
GROUP BY manual_tier
ORDER BY manual_tier DESC NULLS LAST;

-- Top afiliados com tier manual
SELECT
  a.referral_code,
  a.manual_tier,
  COUNT(r.id) FILTER (WHERE r.is_validated = true) as validated_refs,
  a.total_earned,
  a.pending_earnings,
  a.created_at
FROM affiliates a
LEFT JOIN referrals r ON r.affiliate_id = a.id
WHERE a.manual_tier IS NOT NULL
GROUP BY a.id, a.referral_code, a.manual_tier, a.total_earned, a.pending_earnings, a.created_at
ORDER BY a.total_earned DESC
LIMIT 20;

-- Afiliados que têm tier manual maior que o calculado (beneficiados)
SELECT
  a.referral_code,
  a.manual_tier as tier_manual,
  COUNT(r.id) FILTER (WHERE r.is_validated = true) as validated_refs,
  CASE
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 5000 THEN 4
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 1000 THEN 3
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 100 THEN 2
    ELSE 1
  END as tier_calculado,
  a.manual_tier - CASE
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 5000 THEN 4
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 1000 THEN 3
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 100 THEN 2
    ELSE 1
  END as tier_bonus
FROM affiliates a
LEFT JOIN referrals r ON r.affiliate_id = a.id
WHERE a.manual_tier IS NOT NULL
GROUP BY a.id, a.referral_code, a.manual_tier
HAVING a.manual_tier > CASE
  WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 5000 THEN 4
  WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 1000 THEN 3
  WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 100 THEN 2
  ELSE 1
END
ORDER BY tier_bonus DESC;

-- ============================================================================
-- 5. CASOS DE USO AVANÇADOS
-- ============================================================================

-- Promoção: Duplicar tier para top 10 afiliados por 1 mês
WITH top_affiliates AS (
  SELECT a.id, get_affiliate_effective_tier(a.id) as current_tier
  FROM affiliates a
  ORDER BY a.total_earned DESC
  LIMIT 10
)
UPDATE affiliates a
SET
  manual_tier = LEAST(4, (SELECT current_tier FROM top_affiliates WHERE id = a.id) + 1),
  updated_at = NOW()
FROM top_affiliates t
WHERE a.id = t.id;

-- Corrigir tiers para afiliados que deveriam estar em tier superior
-- (útil após bugs ou migrações)
UPDATE affiliates a
SET
  manual_tier = CASE
    WHEN (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND is_validated = true) >= 5000 THEN 4
    WHEN (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND is_validated = true) >= 1000 THEN 3
    WHEN (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND is_validated = true) >= 100 THEN 2
    ELSE 1
  END,
  updated_at = NOW()
WHERE a.manual_tier IS NULL
  AND get_affiliate_effective_tier(a.id) < CASE
    WHEN (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND is_validated = true) >= 5000 THEN 4
    WHEN (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND is_validated = true) >= 1000 THEN 3
    WHEN (SELECT COUNT(*) FROM referrals WHERE affiliate_id = a.id AND is_validated = true) >= 100 THEN 2
    ELSE 1
  END;

-- Criar programa VIP automático: afiliados com 1M+ SOL em vendas viram Tier 4
UPDATE affiliates
SET
  manual_tier = 4,
  updated_at = NOW()
WHERE
  total_earned >= 1000000000000  -- 1M SOL em lamports
  AND (manual_tier IS NULL OR manual_tier < 4);

-- ============================================================================
-- 6. AUDITORIA E LOGS
-- ============================================================================

-- Ver histórico de alterações (requer tabela de auditoria)
-- Criar tabela de auditoria primeiro:
/*
CREATE TABLE IF NOT EXISTS affiliate_tier_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,  -- 'SET_MANUAL_TIER', 'REMOVE_MANUAL_TIER'
  old_tier INTEGER,
  new_tier INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- Registrar mudança de tier manualmente
INSERT INTO affiliate_tier_audit (affiliate_id, action, old_tier, new_tier, reason)
SELECT
  id,
  'SET_MANUAL_TIER',
  get_affiliate_effective_tier(id),
  4,
  'VIP Partnership Program 2024'
FROM affiliates
WHERE referral_code = 'VIP2024';

-- Ver histórico de um afiliado
SELECT
  ata.created_at,
  ata.action,
  ata.old_tier,
  ata.new_tier,
  ata.reason,
  u.wallet as admin_wallet
FROM affiliate_tier_audit ata
LEFT JOIN users u ON u.id = ata.admin_id
WHERE ata.affiliate_id = (SELECT id FROM affiliates WHERE referral_code = 'VIP2024')
ORDER BY ata.created_at DESC;

-- ============================================================================
-- 7. TESTES E VALIDAÇÃO
-- ============================================================================

-- Testar função get_affiliate_effective_tier
SELECT
  a.referral_code,
  a.manual_tier,
  COUNT(r.id) FILTER (WHERE r.is_validated = true) as refs,
  get_affiliate_effective_tier(a.id) as effective,
  CASE
    WHEN a.manual_tier IS NOT NULL THEN 'OK - Manual'
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 5000 AND get_affiliate_effective_tier(a.id) = 4 THEN 'OK - Auto Tier 4'
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 1000 AND get_affiliate_effective_tier(a.id) = 3 THEN 'OK - Auto Tier 3'
    WHEN COUNT(r.id) FILTER (WHERE r.is_validated = true) >= 100 AND get_affiliate_effective_tier(a.id) = 2 THEN 'OK - Auto Tier 2'
    WHEN get_affiliate_effective_tier(a.id) = 1 THEN 'OK - Auto Tier 1'
    ELSE '❌ ERRO'
  END as validation
FROM affiliates a
LEFT JOIN referrals r ON r.affiliate_id = a.id
GROUP BY a.id, a.referral_code, a.manual_tier
ORDER BY a.created_at DESC;

-- Verificar consistência de dados
SELECT
  COUNT(*) as total_affiliates,
  COUNT(*) FILTER (WHERE manual_tier IS NOT NULL) as with_manual_tier,
  COUNT(*) FILTER (WHERE manual_tier IS NULL) as with_auto_tier,
  COUNT(*) FILTER (WHERE manual_tier < 1 OR manual_tier > 4) as invalid_tiers
FROM affiliates;

-- ============================================================================
-- DICAS DE USO
-- ============================================================================

/*
1. SEMPRE registre o motivo ao definir tier manual (em um sistema de auditoria)

2. Considere criar uma view para facilitar consultas:
   CREATE VIEW affiliate_tier_view AS
   SELECT
     a.*,
     get_affiliate_effective_tier(a.id) as effective_tier,
     COUNT(r.id) FILTER (WHERE r.is_validated = true) as validated_refs
   FROM affiliates a
   LEFT JOIN referrals r ON r.affiliate_id = a.id
   GROUP BY a.id;

3. Use transações ao fazer alterações em massa:
   BEGIN;
   UPDATE affiliates SET manual_tier = 3 WHERE ...;
   -- Verificar resultados
   SELECT * FROM affiliates WHERE manual_tier = 3;
   COMMIT;  -- ou ROLLBACK se algo estiver errado

4. Monitore o impacto financeiro:
   SELECT
     SUM(CASE WHEN manual_tier IS NOT NULL THEN pending_earnings ELSE 0 END) as manual_pending,
     SUM(CASE WHEN manual_tier IS NULL THEN pending_earnings ELSE 0 END) as auto_pending
   FROM affiliates;

5. Documente decisões importantes em comentários no banco:
   COMMENT ON COLUMN affiliates.manual_tier IS
   'Tier manual definido por admin. NULL = automático. Histórico em affiliate_tier_audit.';
*/
