# 🎯 Sistema de Tier Manual - PowerSOL

Documentação completa sobre o sistema de **tier manual** para afiliados.

---

## 📋 OVERVIEW

Por padrão, os tiers de afiliados são calculados **automaticamente** baseado no número de referrals validados:

| Tier | Referrals | Taxa | Delta |
|------|-----------|------|-------|
| **1** | 0-99 | 5% | 25% |
| **2** | 100-999 | 10% | 20% |
| **3** | 1000-4999 | 20% | 10% |
| **4** | 5000+ | 30% | 0% |

Porém, o sistema permite que **admins definam um tier manual** que sobrescreve o cálculo automático.

---

## 🎯 QUANDO USAR TIER MANUAL?

O tier manual é útil para casos especiais:

### 1. **Parcerias VIP**
Dar Tier 4 imediatamente para parceiros estratégicos.

```typescript
// Parceiro VIP com 0 referrals, mas recebe Tier 4
await affiliateService.setManualTier(affiliateId, 4);
// Agora ele ganha 30% de comissão desde o primeiro ticket
```

### 2. **Promoções Especiais**
Temporariamente aumentar o tier de afiliados em campanhas.

```typescript
// Promoção: Todos afiliados Tier 1 viram Tier 2 por 1 mês
const tier1Affiliates = await getAllTier1Affiliates();
for (const affiliate of tier1Affiliates) {
  await affiliateService.setManualTier(affiliate.id, 2);
}
```

### 3. **Testes**
Testar sistema de comissões com diferentes tiers.

```typescript
// Testar comissões de Tier 4
await affiliateService.setManualTier(testAffiliateId, 4);
// Comprar tickets e verificar
// Depois remover
await affiliateService.removeManualTier(testAffiliateId);
```

### 4. **Correções Administrativas**
Ajustar tier manualmente se houver problemas técnicos.

```typescript
// Bug fez afiliado perder referrals, mas ele merece Tier 3
await affiliateService.setManualTier(affiliateId, 3);
```

### 5. **Contratos Especiais**
Afiliados com taxa fixa por contrato.

```typescript
// Contrato especial: sempre recebe 20% (Tier 3)
await affiliateService.setManualTier(affiliateId, 3);
```

---

## 🏗️ COMO FUNCIONA?

### Lógica de Prioridade

```typescript
function getAffiliateTier(affiliateId) {
  // 1. Verifica se tem tier manual
  if (affiliate.manual_tier !== null) {
    return affiliate.manual_tier;  // Usa o tier manual
  }

  // 2. Se não tem tier manual, calcula automaticamente
  const validatedReferrals = countValidatedReferrals(affiliateId);
  return calculateTierFromReferrals(validatedReferrals);
}
```

### Base de Dados

```sql
-- Coluna adicionada na tabela affiliates
ALTER TABLE affiliates
ADD COLUMN manual_tier INTEGER CHECK (
  manual_tier IS NULL OR (manual_tier >= 1 AND manual_tier <= 4)
);

-- NULL = usa cálculo automático
-- 1-4 = força tier específico
```

---

## 🔧 API ENDPOINTS

Base URL: `http://localhost:4000/api/affiliates`

### 1. Ver Tier de um Afiliado

```bash
GET /:affiliateId/tier
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "affiliateId": "abc-123",
    "manualTier": 4,
    "effectiveTier": 4,
    "validatedReferrals": 42,
    "calculatedTier": 1
  }
}
```

- **manualTier**: Tier definido manualmente (null se não definido)
- **effectiveTier**: Tier sendo usado atualmente (manual ou calculado)
- **validatedReferrals**: Número de referrals validados
- **calculatedTier**: Tier que seria baseado em referrals

### 2. Definir Tier Manual

```bash
POST /:affiliateId/tier/set
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "tier": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Manual tier set successfully",
    "affiliateId": "abc-123",
    "manualTier": 4,
    "effectiveTier": 4,
    "affiliate": { ... }
  }
}
```

### 3. Remover Tier Manual (voltar ao automático)

```bash
DELETE /:affiliateId/tier
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Manual tier removed, using automatic calculation",
    "affiliateId": "abc-123",
    "manualTier": null,
    "effectiveTier": 1,
    "affiliate": { ... }
  }
}
```

---

## 💻 USO PROGRAMÁTICO

### No Backend

```typescript
import { affiliateService, AffiliateTier } from './services/affiliate.service';

// Definir tier manual
await affiliateService.setManualTier(affiliateId, AffiliateTier.TIER_4);

// Remover tier manual
await affiliateService.removeManualTier(affiliateId);

// Buscar tier efetivo (manual ou calculado)
const tier = await affiliateService.getAffiliateTier(affiliateId);

// Buscar afiliado completo
const affiliate = await affiliateService.getAffiliateById(affiliateId);
console.log(affiliate.manual_tier); // null ou 1-4
```

### Diretamente no Banco

```sql
-- Ver afiliados com tier manual
SELECT
  id,
  user_id,
  referral_code,
  manual_tier,
  (SELECT COUNT(*) FROM referrals WHERE affiliate_id = affiliates.id AND is_validated = true) as validated_refs
FROM affiliates
WHERE manual_tier IS NOT NULL;

-- Definir tier manual para um afiliado
UPDATE affiliates
SET manual_tier = 4, updated_at = NOW()
WHERE id = 'abc-123';

-- Remover tier manual (voltar ao automático)
UPDATE affiliates
SET manual_tier = NULL, updated_at = NOW()
WHERE id = 'abc-123';

-- Ver tier efetivo usando a função SQL
SELECT
  id,
  referral_code,
  manual_tier,
  get_affiliate_effective_tier(id) as effective_tier
FROM affiliates;
```

---

## 📊 EXEMPLOS PRÁTICOS

### Exemplo 1: Parceria VIP

```typescript
// Novo parceiro estratégico sem histórico
const newAffiliate = await affiliateService.getOrCreateAffiliate(userId);

console.log('Tier inicial:', await affiliateService.getAffiliateTier(newAffiliate.id));
// Output: 1 (0 referrals)

// Definir como VIP (Tier 4)
await affiliateService.setManualTier(newAffiliate.id, 4);

console.log('Tier depois:', await affiliateService.getAffiliateTier(newAffiliate.id));
// Output: 4 (tier manual)

// Agora ele ganha 30% em todas as vendas!
```

### Exemplo 2: Promoção Temporária

```typescript
// Início da promoção: todos Tier 1 viram Tier 2
const tier1Affiliates = await supabase
  .from('affiliates')
  .select('id')
  .is('manual_tier', null);

for (const affiliate of tier1Affiliates) {
  const tier = await affiliateService.getAffiliateTier(affiliate.id);
  if (tier === AffiliateTier.TIER_1) {
    await affiliateService.setManualTier(affiliate.id, 2);
  }
}

// Fim da promoção: remover tier manual de todos
const manuallySets = await supabase
  .from('affiliates')
  .select('id')
  .not('manual_tier', 'is', null);

for (const affiliate of manuallySets) {
  await affiliateService.removeManualTier(affiliate.id);
}
```

### Exemplo 3: Teste de Comissões

```typescript
// Testar comissões de diferentes tiers
const testCases = [
  { tier: 1, expected: 0.005 },
  { tier: 2, expected: 0.01 },
  { tier: 3, expected: 0.02 },
  { tier: 4, expected: 0.03 },
];

const ticketPrice = BigInt(100_000_000); // 0.1 SOL

for (const testCase of testCases) {
  await affiliateService.setManualTier(testAffiliateId, testCase.tier);

  const breakdown = await affiliateService.calculatePaymentBreakdownForTicket(
    testAffiliateId,
    ticketPrice
  );

  console.log(`Tier ${testCase.tier}: ${breakdown.commission} lamports`);
  // Tier 1: 5000000 lamports (0.005 SOL)
  // Tier 2: 10000000 lamports (0.01 SOL)
  // Tier 3: 20000000 lamports (0.02 SOL)
  // Tier 4: 30000000 lamports (0.03 SOL)
}

// Limpar
await affiliateService.removeManualTier(testAffiliateId);
```

---

## 🔒 SEGURANÇA

### Recomendações

1. **Middleware de Admin**: Implementar middleware que verifica se usuário é admin antes de permitir definir tier manual.

```typescript
// middleware/admin.middleware.ts
export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    throw new UnauthorizedError('Admin access required');
  }
  next();
};

// routes/affiliate.routes.ts
router.post(
  '/:affiliateId/tier/set',
  authenticate,
  requireAdmin,  // ← Adicionar este middleware
  asyncHandler(affiliateController.setManualTier.bind(affiliateController))
);
```

2. **Auditoria**: Logar todas as alterações de tier manual.

```typescript
// Adicionar na tabela de auditoria
await supabase.from('admin_actions').insert({
  admin_id: adminUserId,
  action: 'SET_MANUAL_TIER',
  affiliate_id: affiliateId,
  old_tier: oldTier,
  new_tier: newTier,
  timestamp: new Date(),
});
```

3. **Notificações**: Avisar afiliado quando tier for alterado manualmente.

```typescript
// Enviar notificação
await sendNotification(affiliate.user_id, {
  type: 'TIER_UPDATED',
  message: `Seu tier foi atualizado para Tier ${newTier}!`,
  oldTier,
  newTier,
});
```

---

## 📈 DASHBOARD DE ADMINISTRAÇÃO

### Sugestão de Interface

```typescript
// Admin Dashboard - Affiliate Tiers Management

interface AffiliateTierRow {
  id: string;
  referralCode: string;
  validatedReferrals: number;
  calculatedTier: number;
  manualTier: number | null;
  effectiveTier: number;
  totalEarned: string;
}

// Listar todos afiliados com info de tier
const affiliates = await supabase
  .from('affiliates')
  .select('id, referral_code, manual_tier, total_earned');

const rows: AffiliateTierRow[] = await Promise.all(
  affiliates.map(async (affiliate) => {
    const validatedReferrals = await affiliateService.getValidatedReferralsCount(affiliate.id);
    const calculatedTier = calculateAffiliateTier(validatedReferrals);
    const effectiveTier = await affiliateService.getAffiliateTier(affiliate.id);

    return {
      id: affiliate.id,
      referralCode: affiliate.referral_code,
      validatedReferrals,
      calculatedTier,
      manualTier: affiliate.manual_tier,
      effectiveTier,
      totalEarned: affiliate.total_earned,
    };
  })
);

// Exibir tabela com ações:
// - Ver detalhes
// - Definir tier manual
// - Remover tier manual
// - Ver histórico
```

---

## 🔗 ARQUIVOS RELACIONADOS

- `src/services/affiliate.service.ts` - Lógica de tier manual
- `src/controllers/affiliate.controller.ts` - Endpoints de tier
- `src/routes/affiliate.routes.ts` - Rotas de tier
- `supabase/migrations/004_manual_tier.sql` - Migration do banco
- `AFFILIATE_SYSTEM.md` - Sistema completo de afiliados
- `DELTA_SYSTEM.md` - Sistema de delta

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Adicionar coluna `manual_tier` na tabela `affiliates`
- [x] Criar função SQL `get_affiliate_effective_tier()`
- [x] Implementar `setManualTier()` no service
- [x] Implementar `removeManualTier()` no service
- [x] Atualizar `getAffiliateTier()` para usar tier manual
- [x] Criar endpoints de admin
- [x] Adicionar rotas na API
- [x] Documentar funcionalidade
- [x] Adicionar middleware de admin
- [x] Implementar auditoria de alterações
- [ ] Criar dashboard de administração
- [ ] Adicionar testes unitários
- [ ] Adicionar testes de integração

---

**Tier Manual - Controle Total e Flexibilidade! 🎯✅**
