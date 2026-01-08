# 🎯 Sistema Delta - PowerSOL

Guia completo sobre o sistema de Delta de comissões de afiliados no PowerSOL.

---

## 📋 O QUE É O DELTA?

O **Delta** é a sobra de comissões de afiliados que não foram distribuídas devido aos afiliados estarem em tiers abaixo do máximo (Tier 4).

```
Reserva Máxima para Afiliados: 30% de cada ticket
Comissão Real Paga: 5% a 30% (baseado no tier)
Delta = Reserva - Comissão Paga
```

---

## 🎯 POR QUE O DELTA EXISTE?

O sistema reserva **30% de cada ticket** para comissões de afiliados, mas nem todos os afiliados são Tier 4:

- **Tier 1** (0-99 refs): Recebe apenas **5%** → Delta de **25%**
- **Tier 2** (100-999 refs): Recebe apenas **10%** → Delta de **20%**
- **Tier 3** (1000-4999 refs): Recebe apenas **20%** → Delta de **10%**
- **Tier 4** (5000+ refs): Recebe **30%** → Delta de **0%**

Essa sobra (Delta) vai para um endereço Solana separado.

---

## 🏗️ ESTRUTURA DE ENDEREÇOS

```
Sistema PowerSOL tem 7 endereços principais:

1. TREASURY_ADDRESS          (30% fixo de cada ticket)
2. AFFILIATES_POOL_ADDRESS   (30% reservado)
3. DELTA_ADDRESS            (0-25% sobra)
4. TRI_DAILY_POOL_PDA       (40% prize pool)
5. JACKPOT_POOL_PDA         (40% prize pool)
6. GRAND_PRIZE_POOL_PDA     (40% prize pool)
7. XMAS_POOL_PDA            (40% prize pool)
```

---

## 💰 FLUXO DE FUNDOS

### 1. Na Compra do Ticket

```typescript
// Usuário compra ticket de 0.1 SOL (TRI-DAILY)

Distribuição Imediata:
├─ 0.04 SOL → TRI_DAILY_POOL_PDA (40%)
├─ 0.03 SOL → TREASURY_ADDRESS (30%)
└─ 0.03 SOL → AFFILIATES_POOL_ADDRESS (30% reservado)
```

### 2. Processamento de Comissão (Backend)

```typescript
// Sistema identifica afiliado e calcula valores

Afiliado = Tier 1 (5%)

Cálculo:
├─ Reservado: 0.03 SOL (30%)
├─ Comissão: 0.005 SOL (5%)
└─ Delta: 0.025 SOL (25%)

Transferências do AFFILIATES_POOL_ADDRESS:
├─ 0.005 SOL → Carteira do Afiliado
└─ 0.025 SOL → DELTA_ADDRESS
```

---

## 📊 TABELA DE DELTA POR TIER

| Tier | Refs | Taxa | TRI-DAILY (0.1 SOL) | JACKPOT (0.2 SOL) | GRAND_PRIZE (0.33 SOL) |
|------|------|------|---------------------|-------------------|------------------------|
| **1** | 0-99 | 5% | Delta: 0.025 SOL | Delta: 0.05 SOL | Delta: 0.0825 SOL |
| **2** | 100-999 | 10% | Delta: 0.02 SOL | Delta: 0.04 SOL | Delta: 0.066 SOL |
| **3** | 1000-4999 | 20% | Delta: 0.01 SOL | Delta: 0.02 SOL | Delta: 0.033 SOL |
| **4** | 5000+ | 30% | Delta: 0 SOL | Delta: 0 SOL | Delta: 0 SOL |

---

## 🔄 EXEMPLO COMPLETO

### Cenário: 1000 Tickets TRI-DAILY

```
Mix de Afiliados:
- 400 tickets vendidos por afiliados Tier 1 (5%)
- 300 tickets vendidos por afiliados Tier 2 (10%)
- 200 tickets vendidos por afiliados Tier 3 (20%)
- 100 tickets vendidos por afiliados Tier 4 (30%)

┌────────────────────────────────────────────────────┐
│ RECEITA TOTAL: 1000 × 0.1 = 100 SOL               │
├────────────────────────────────────────────────────┤
│ Distribuição:                                      │
│ • Prize Pool: 40 SOL (40%)                         │
│ • Treasury: 30 SOL (30%)                           │
│ • Affiliates Pool: 30 SOL (30%)                    │
└────────────────────────────────────────────────────┘

Processamento de Comissões (dos 30 SOL):

┌────────────────────────────────────────────────────┐
│ Comissões Pagas aos Afiliados:                     │
│ • Tier 1: 400 × 0.005 = 2 SOL                     │
│ • Tier 2: 300 × 0.01 = 3 SOL                      │
│ • Tier 3: 200 × 0.02 = 4 SOL                      │
│ • Tier 4: 100 × 0.03 = 3 SOL                      │
│ ─────────────────────────────                     │
│ TOTAL PAGO: 12 SOL                                 │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Delta Enviado para DELTA_ADDRESS:                  │
│ • Tier 1: 400 × 0.025 = 10 SOL                    │
│ • Tier 2: 300 × 0.02 = 6 SOL                      │
│ • Tier 3: 200 × 0.01 = 2 SOL                      │
│ • Tier 4: 100 × 0 = 0 SOL                         │
│ ─────────────────────────────                     │
│ 🎯 DELTA TOTAL: 18 SOL                            │
└────────────────────────────────────────────────────┘

✅ Verificação: 12 SOL + 18 SOL = 30 SOL (100%)
```

---

## 💻 IMPLEMENTAÇÃO TÉCNICA

### Configuração (src/config/solana.ts)

```typescript
export const SOLANA_ADDRESSES = {
  TREASURY: process.env.TREASURY_ADDRESS || '',
  AFFILIATES_POOL: process.env.AFFILIATES_POOL_ADDRESS || '',
  DELTA: process.env.DELTA_ADDRESS || '',
};

export function calculateAffiliateAmounts(
  ticketPrice: bigint,
  tierCommissionRate: number
): {
  reserved: bigint;
  commission: bigint;
  delta: bigint;
} {
  const reserved = (ticketPrice * BigInt(30)) / BigInt(100);
  const commission = (ticketPrice * BigInt(Math.floor(tierCommissionRate * 100))) / BigInt(100);
  const delta = reserved - commission;

  return { reserved, commission, delta };
}
```

### Serviço de Afiliados (src/services/affiliate.service.ts)

```typescript
export interface AffiliatePaymentBreakdown {
  reserved: bigint;
  commission: bigint;
  delta: bigint;
  tier: AffiliateTier;
  commissionRate: number;
}

export function calculateAffiliatePaymentBreakdown(
  ticketPrice: bigint,
  tier: AffiliateTier
): AffiliatePaymentBreakdown {
  const commissionRate = getCommissionRate(tier);
  const reserved = (ticketPrice * BigInt(30)) / BigInt(100);
  const commission = (ticketPrice * BigInt(Math.floor(commissionRate * 10000))) / BigInt(10000);
  const delta = reserved - commission;

  return { reserved, commission, delta, tier, commissionRate };
}
```

### Uso no Código

```typescript
// 1. Na compra de ticket com afiliado
const affiliate = await affiliateService.getAffiliateByCode(referralCode);
const breakdown = await affiliateService.calculatePaymentBreakdownForTicket(
  affiliate.id,
  ticketPrice
);

console.log({
  reserved: breakdown.reserved,      // 0.03 SOL (30%)
  commission: breakdown.commission,  // 0.005-0.03 SOL (tier)
  delta: breakdown.delta,           // 0-0.025 SOL (sobra)
});

// 2. Registrar no banco
await supabase.from('affiliate_commissions').insert({
  affiliate_id: affiliate.id,
  ticket_id: ticket.id,
  tier: breakdown.tier,
  commission_amount: breakdown.commission.toString(),
  delta_amount: breakdown.delta.toString(),
});

// 3. Processar transferências (batch job)
await transfer(AFFILIATES_POOL_ADDRESS, affiliate.wallet, breakdown.commission);
await transfer(AFFILIATES_POOL_ADDRESS, DELTA_ADDRESS, breakdown.delta);
```

---

## 🎁 USO RECOMENDADO DO DELTA

O saldo acumulado no **DELTA_ADDRESS** pode ser usado estrategicamente:

### 1. Treasury Adicional
Aumentar o capital de operação do projeto.

### 2. Marketing & Growth
Investir em aquisição de novos usuários e campanhas.

### 3. Bônus para Top Performers
Criar programas de incentivo para afiliados excepcionais.

### 4. Prize Pool Boost
Aumentar prêmios em ocasiões especiais.

### 5. Desenvolvimento
Financiar novos recursos e melhorias.

### 6. Reserva de Emergência
Manter um fundo de contingência para imprevistos.

---

## 🔍 TRANSPARÊNCIA E AUDITABILIDADE

Tudo é verificável on-chain:

```bash
# Ver saldo atual do Delta
solana balance <DELTA_ADDRESS>

# Ver histórico de transações
solana transaction-history <DELTA_ADDRESS>

# Ver saldo do Affiliates Pool
solana balance <AFFILIATES_POOL_ADDRESS>

# Ver saldo do Treasury
solana balance <TREASURY_ADDRESS>
```

### Dashboard de Transparência

O frontend pode mostrar em tempo real:

```typescript
// Buscar saldos on-chain
const treasuryBalance = await connection.getBalance(TREASURY_ADDRESS);
const affiliatesPoolBalance = await connection.getBalance(AFFILIATES_POOL_ADDRESS);
const deltaBalance = await connection.getBalance(DELTA_ADDRESS);

// Exibir percentuais reais
const totalAffiliate = affiliatesPoolBalance + deltaBalance;
const affiliatePaidPercent = (affiliatesPoolBalance / totalAffiliate) * 100;
const deltaPercent = (deltaBalance / totalAffiliate) * 100;

console.log(`Afiliados receberam: ${affiliatePaidPercent}%`);
console.log(`Delta acumulado: ${deltaPercent}%`);
```

---

## 📊 ESTATÍSTICAS ESPERADAS

### Distribuição Típica

Baseado em sistemas similares, espera-se:

```
70% dos afiliados: Tier 1-2 (geram 15-20% delta)
25% dos afiliados: Tier 3 (gera 10% delta)
5% dos afiliados: Tier 4 (gera 0% delta)

Delta médio esperado: ~15-18% da reserva de afiliados
```

### Exemplo Anual

```
Se o PowerSOL processar 1M SOL em vendas:
├─ 300k SOL reservados para afiliados (30%)
├─ ~250k SOL pagos aos afiliados (25%)
└─ ~50k SOL acumulados no Delta (5%)

Esses 50k SOL de Delta podem ser usados estrategicamente!
```

---

## ⚙️ CONFIGURAÇÃO .env

```bash
# Endereços Solana
TREASURY_ADDRESS=7x...ABC
AFFILIATES_POOL_ADDRESS=8y...DEF
DELTA_ADDRESS=9z...GHI

# Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## 🔗 ARQUIVOS RELACIONADOS

- `src/config/solana.ts` - Configuração de endereços e cálculos
- `src/services/affiliate.service.ts` - Lógica de comissões e delta
- `SOLANA_ADDRESSES.md` - Documentação completa de endereços
- `AFFILIATE_SYSTEM.md` - Sistema de afiliados
- `.env.example` - Exemplo de configuração

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Criar endereço DELTA_ADDRESS on-chain
- [x] Configurar DELTA_ADDRESS no .env
- [x] Implementar função `calculateAffiliatePaymentBreakdown()`
- [x] Adicionar campo `delta_amount` na tabela de comissões
- [ ] Criar job para processar transferências de delta em batch
- [ ] Adicionar dashboard de transparência no frontend
- [ ] Implementar política de uso do delta (governance)
- [ ] Documentar movimentações do delta

---

**Sistema Delta - Maximizando Receita com Transparência! 🎯💰✅**
