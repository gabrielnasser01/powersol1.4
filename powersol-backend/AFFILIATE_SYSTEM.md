# 💼 Sistema de Afiliados - PowerSOL

Documentação completa do sistema de afiliados baseado em performance com 4 tiers.

---

## 🎯 OVERVIEW

O PowerSOL implementa um **sistema de afiliados baseado em performance** onde a comissão aumenta conforme o afiliado cresce sua rede. Quanto mais referrals validados, maior a porcentagem de comissão!

---

## 📊 ESTRUTURA DE 4 TIERS

### Tabela de Tiers

| Tier | Referrals Validados | Comissão | Badge | Objetivo |
|------|---------------------|----------|-------|----------|
| **1** | 0 - 99 | 5% | 🔰 Starter | Começando |
| **2** | 100 - 999 | 10% | 🥉 Bronze | Crescimento |
| **3** | 1000 - 4999 | 20% | 🥈 Silver | Estabelecido |
| **4** | 5000+ | 30% | 🥇 Gold | Elite |

### O que é um Referral Validado?

Um referral é considerado **validado** quando:
1. Usou seu código de afiliado para se registrar
2. Comprou **pelo menos 1 ticket** em qualquer loteria
3. Transação confirmada on-chain na Solana

---

## 💰 CÁLCULO DE COMISSÕES

### Fórmula Base

```typescript
// 1. Buscar tier do afiliado baseado em refs validados
const tier = calculateAffiliateTier(validatedReferralsCount);

// 2. Obter taxa de comissão do tier (5%, 10%, 20% ou 30%)
const commissionRate = getCommissionRate(tier);

// 3. Calcular comissão DIRETAMENTE sobre o preço do ticket
const commission = ticketPrice * commissionRate;
```

### Exemplo Prático: TRI-DAILY (0.1 SOL/ticket)

| Tier | Refs Validados | Taxa | Comissão/Ticket | 100 Tickets | 1000 Tickets |
|------|----------------|------|-----------------|-------------|--------------|
| **1** | 50 | 5% | 0.005 SOL | 0.5 SOL | 5 SOL |
| **2** | 250 | 10% | 0.01 SOL | 1 SOL | 10 SOL |
| **3** | 2000 | 20% | 0.02 SOL | 2 SOL | 20 SOL |
| **4** | 10000 | 30% | 0.03 SOL | 3 SOL | 30 SOL |

**Crescimento de ganhos:** Um afiliado Tier 4 ganha **6x mais** que um Tier 1!

---

## 🚀 PROGRESSÃO DE TIERS

### Jornada do Afiliado

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: 0-99 refs (5%)                                     │
│  ↓ Meta: +100 referrals validados                          │
│  Tier 2: 100-999 refs (10%) → DOBRO da comissão!           │
│  ↓ Meta: +900 referrals validados (total 1000)             │
│  Tier 3: 1000-4999 refs (20%) → QUADRUPLO da comissão!     │
│  ↓ Meta: +4000 referrals validados (total 5000)            │
│  Tier 4: 5000+ refs (30%) → SÊXTUPLO da comissão! 🎉       │
└─────────────────────────────────────────────────────────────┘
```

### Exemplo de Progressão Real

**João - Afiliado em Evolução:**

```
Mês 1: 45 refs validados → Tier 1 (5%)
  Ganhos: 0.67 SOL

Mês 3: 150 refs validados → Tier 2 (10%)
  Ganhos: 2.25 SOL (+235%!)

Mês 8: 1250 refs validados → Tier 3 (20%)
  Ganhos: 7.5 SOL (+233%!)

Mês 18: 6000 refs validados → Tier 4 (30%)
  Ganhos: 16.2 SOL (+116%!)
```

---

## 💸 EXEMPLOS DE GANHOS POR LOTERIA

### Tier 1 (0-99 refs) - 5% de comissão

| Loteria | Ticket | Comissão/Ticket | 100 Refs Ativos | 1000 Refs Ativos |
|---------|--------|-----------------|-----------------|------------------|
| TRI-DAILY | 0.1 SOL | 0.005 SOL | 0.5 SOL | 5 SOL |
| JACKPOT | 0.2 SOL | 0.01 SOL | 1 SOL | 10 SOL |
| GRAND_PRIZE | 0.33 SOL | 0.0165 SOL | 1.65 SOL | 16.5 SOL |
| XMAS | 0.2 SOL | 0.01 SOL | 1 SOL | 10 SOL |

### Tier 2 (100-999 refs) - 10% de comissão

| Loteria | Ticket | Comissão/Ticket | 100 Refs Ativos | 1000 Refs Ativos |
|---------|--------|-----------------|-----------------|------------------|
| TRI-DAILY | 0.1 SOL | 0.01 SOL | 1 SOL | 10 SOL |
| JACKPOT | 0.2 SOL | 0.02 SOL | 2 SOL | 20 SOL |
| GRAND_PRIZE | 0.33 SOL | 0.033 SOL | 3.3 SOL | 33 SOL |
| XMAS | 0.2 SOL | 0.02 SOL | 2 SOL | 20 SOL |

### Tier 3 (1000-4999 refs) - 20% de comissão

| Loteria | Ticket | Comissão/Ticket | 100 Refs Ativos | 1000 Refs Ativos |
|---------|--------|-----------------|-----------------|------------------|
| TRI-DAILY | 0.1 SOL | 0.02 SOL | 2 SOL | 20 SOL |
| JACKPOT | 0.2 SOL | 0.04 SOL | 4 SOL | 40 SOL |
| GRAND_PRIZE | 0.33 SOL | 0.066 SOL | 6.6 SOL | 66 SOL |
| XMAS | 0.2 SOL | 0.04 SOL | 4 SOL | 40 SOL |

### Tier 4 (5000+ refs) - 30% de comissão

| Loteria | Ticket | Comissão/Ticket | 100 Refs Ativos | 1000 Refs Ativos |
|---------|--------|-----------------|-----------------|------------------|
| TRI-DAILY | 0.1 SOL | 0.03 SOL | 3 SOL | 30 SOL |
| JACKPOT | 0.2 SOL | 0.06 SOL | 6 SOL | 60 SOL |
| GRAND_PRIZE | 0.33 SOL | 0.099 SOL | 9.9 SOL | 99 SOL |
| XMAS | 0.2 SOL | 0.06 SOL | 6 SOL | 60 SOL |

---

## 🎮 ESTRATÉGIAS PARA CRESCER

### Para Tier 1 → Tier 2 (100 refs validados)

**Objetivo:** Validar 100 referrals

Estratégias:
- Compartilhar código em redes sociais (Twitter, Discord, Telegram)
- Criar conteúdo educativo sobre PowerSOL
- Focar em comunidades crypto no Brasil
- Oferecer suporte aos seus referrals

**ROI:** Dobrar sua comissão de 5% para 10%!

### Para Tier 2 → Tier 3 (1000 refs validados)

**Objetivo:** Validar 1000 referrals

Estratégias:
- Criar canal/grupo dedicado à PowerSOL
- Produzir tutoriais em vídeo (YouTube, TikTok)
- Parcerias com outros influenciadores
- Webinars e lives educativas

**ROI:** Dobrar novamente de 10% para 20%!

### Para Tier 3 → Tier 4 (5000 refs validados)

**Objetivo:** Validar 5000 referrals

Estratégias:
- Construir comunidade engajada
- Time de suporte dedicado aos referrals
- Campanhas de marketing coordenadas
- Ferramentas e dashboards para seus referrals

**ROI:** Alcançar a comissão máxima de 30%!

---

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### Fluxo de Compra com Afiliado

```typescript
// 1. Usuário compra ticket com código de afiliado
const purchase = {
  buyer: 'BuyerWalletAddress',
  lotteryType: 'TRI_DAILY',
  ticketPrice: 0.1 SOL,
  referralCode: 'AFFILIATE123',
};

// 2. Sistema busca afiliado
const affiliate = await affiliateService.getAffiliateByCode('AFFILIATE123');

// 3. Conta referrals validados
const validatedCount = await affiliateService.getValidatedReferralsCount(affiliate.id);
// validatedCount = 150

// 4. Calcula tier
const tier = calculateAffiliateTier(150);
// tier = AffiliateTier.TIER_2 (100-999 refs)

// 5. Calcula comissão DIRETAMENTE sobre o preço do ticket
const commission = calculateAffiliateCommission(
  BigInt(0.1 * LAMPORTS_PER_SOL), // ticketPrice
  tier // TIER_2
);
// commission = 0.01 SOL (10% de 0.1 SOL)

// 6. Registra comissão
await affiliateService.addEarnings(affiliate.id, commission);

// 7. Marca referral como validado (se primeira compra)
if (isFirstPurchase) {
  await markReferralAsValidated(referral.id);
}
```

### Estrutura de Dados

```typescript
// Affiliate
interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  total_earned: bigint;
  pending_earnings: bigint;
  created_at: Date;
}

// Referral
interface Referral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  is_validated: boolean; // TRUE após primeira compra
  tickets_bought: number;
  commission_earned: bigint;
  created_at: Date;
}
```

---

## 📈 DASHBOARD DO AFILIADO

### Informações Exibidas

```typescript
interface AffiliateDashboard {
  // Tier atual
  currentTier: AffiliateTier; // 1, 2, 3 ou 4
  tierLabel: string; // "Tier 2 - Bronze"
  commissionRate: number; // 0.10 (10%)

  // Estatísticas
  validatedReferrals: number; // 150
  pendingReferrals: number; // 25 (ainda não compraram)
  totalEarned: bigint; // Total histórico
  pendingEarnings: bigint; // Disponível para saque

  // Progressão
  nextTier: AffiliateTier | null; // TIER_3
  refsToNextTier: number; // 850 (1000 - 150)
  progressPercentage: number; // 16.7% (150/900)

  // Performance
  conversionRate: number; // 85.7% (150/175 total refs)
  avgTicketsPerReferral: number; // 2.5
  topReferrals: Referral[]; // Top 10 que mais compraram
}
```

---

## 🎁 BENEFÍCIOS POR TIER

### Tier 1 - Starter (0-99 refs)
- ✅ 5% de comissão
- ✅ Código de afiliado personalizado
- ✅ Dashboard básico
- ✅ Suporte via Discord

### Tier 2 - Bronze (100-999 refs)
- ✅ 10% de comissão (2x Tier 1)
- ✅ Badge Bronze no perfil
- ✅ Dashboard avançado
- ✅ Materiais de marketing exclusivos
- ✅ Suporte prioritário

### Tier 3 - Silver (1000-4999 refs)
- ✅ 20% de comissão (4x Tier 1)
- ✅ Badge Silver no perfil
- ✅ API access para integração
- ✅ Custom landing pages
- ✅ Gerente de conta dedicado
- ✅ Pagamentos semanais

### Tier 4 - Gold (5000+ refs)
- ✅ 30% de comissão (6x Tier 1)
- ✅ Badge Gold no perfil
- ✅ Todas as features anteriores
- ✅ Revenue share adicional
- ✅ Participação em decisões do protocolo
- ✅ NFT exclusivo de afiliado elite
- ✅ Pagamentos diários

---

## 🔐 SEGURANÇA E COMPLIANCE

### Validações

1. **Anti-Fraude:**
   - Sistema detecta contas fake
   - Validação de carteiras Solana reais
   - Monitoramento de padrões suspeitos

2. **KYC para Saques:**
   - Tier 1-2: KYC light (acima de 10 SOL)
   - Tier 3-4: KYC completo obrigatório

3. **Limites de Saque:**
   - Tier 1: Max 5 SOL/dia
   - Tier 2: Max 20 SOL/dia
   - Tier 3: Max 100 SOL/dia
   - Tier 4: Sem limite

---

## 📊 RELATÓRIOS E ANALYTICS

### Métricas Disponíveis

```typescript
interface AffiliateAnalytics {
  // Conversão
  totalReferrals: number; // Total de pessoas que usaram o código
  validatedReferrals: number; // Que compraram pelo menos 1 ticket
  conversionRate: number; // validatedReferrals / totalReferrals

  // Performance
  totalRevenue: bigint; // Receita total gerada pelos referrals
  totalCommission: bigint; // Comissão total recebida
  avgCommissionPerReferral: bigint; // totalCommission / validatedReferrals

  // Por Loteria
  revenueByLottery: {
    TRI_DAILY: bigint;
    JACKPOT: bigint;
    GRAND_PRIZE: bigint;
    XMAS: bigint;
  };

  // Temporal
  dailyStats: DailyAffiliateStats[];
  monthlyStats: MonthlyAffiliateStats[];
}
```

---

## 🚀 ROADMAP DE FEATURES

### Q1 2025
- [ ] Sistema de badges NFT para tiers
- [ ] Dashboard mobile nativo
- [ ] Ferramentas de marketing (banners, vídeos)

### Q2 2025
- [ ] Programa de embaixadores (Tier 5)
- [ ] API pública para afiliados
- [ ] Integrações com redes sociais

### Q3 2025
- [ ] Marketplace de tools para afiliados
- [ ] Competições entre afiliados
- [ ] Bônus por performance excepcional

---

## 📞 SUPORTE

**Para Afiliados:**
- Discord: #affiliate-support
- Email: affiliates@powersol.com
- Telegram: @PowerSOL_Affiliates

**Gerentes de Conta (Tier 3-4):**
- Contato direto via Telegram
- Chamadas mensais de estratégia
- Acesso a materiais exclusivos

---

**Sistema de Afiliados 4 Tiers - Cresça Conosco! 🚀💰**
