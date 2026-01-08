# 🔐 Estrutura de Endereços Solana - PowerSOL

Documentação completa sobre os endereços e PDAs (Program Derived Addresses) usados no sistema PowerSOL.

---

## 📋 OVERVIEW

O sistema PowerSOL usa **7 endereços principais** para gerenciar o fluxo de fundos:

1. **1 Endereço Treasury** - Tesouro central do projeto (30% de cada bilhete)
2. **1 Endereço Affiliates Pool** - Pool de comissões de afiliados (até 30% de cada bilhete)
3. **1 Endereço Delta** - Recebe a sobra de comissões não pagas (0-25% de cada bilhete)
4. **4 Endereços de Loterias** - Um para cada loteria (40% de cada bilhete vai para sua respectiva loteria)
   - TRI_DAILY Pool
   - JACKPOT Pool
   - GRAND_PRIZE Pool
   - XMAS Pool

---

## 💰 DISTRIBUIÇÃO DE RECEITA (40/30/30)

**TODAS as loterias seguem a mesma distribuição:**

```
Por cada bilhete vendido:
├─ 40% → Lottery Prize Pool (PDA da loteria específica)
├─ 30% → Treasury (Endereço central do projeto)
└─ 30% → Affiliates Pool (Máximo reservado)
    │
    ├─ 5-30% → Comissão do Afiliado (baseado no tier)
    └─ 0-25% → Delta Address (sobra não distribuída)
```

### Exemplo: TRI-DAILY (0.1 SOL/ticket)

```
Compra de 1 bilhete = 0.1 SOL por afiliado Tier 1 (5%)

Distribuição Inicial:
├─ 0.04 SOL → TRI_DAILY_POOL_PDA (40%)
├─ 0.03 SOL → TREASURY_ADDRESS (30%)
└─ 0.03 SOL → AFFILIATES_POOL_ADDRESS (30% reservado)

Processamento de Comissão:
├─ 0.005 SOL → Afiliado Tier 1 (5%)
└─ 0.025 SOL → DELTA_ADDRESS (25% sobra)
```

### Exemplo: JACKPOT (0.2 SOL/ticket)

```
Compra de 1 bilhete = 0.2 SOL

Distribuição:
├─ 0.08 SOL → JACKPOT_POOL_PDA
├─ 0.06 SOL → TREASURY_ADDRESS
└─ 0.06 SOL → AFFILIATES_ADDRESS
```

### Exemplo: GRAND_PRIZE (0.33 SOL/ticket)

```
Compra de 1 bilhete = 0.33 SOL

Distribuição:
├─ 0.132 SOL → GRAND_PRIZE_POOL_PDA
├─ 0.099 SOL → TREASURY_ADDRESS
└─ 0.099 SOL → AFFILIATES_ADDRESS
```

### Exemplo: XMAS (0.2 SOL/ticket)

```
Compra de 1 bilhete = 0.2 SOL

Distribuição:
├─ 0.08 SOL → XMAS_POOL_PDA
├─ 0.06 SOL → TREASURY_ADDRESS
└─ 0.06 SOL → AFFILIATES_ADDRESS
```

---

## 🏗️ ESTRUTURA DE PDAs

### 1. Treasury Address (Central)

```typescript
// Endereço único e fixo para o tesouro do projeto
const TREASURY_ADDRESS = new PublicKey("Treasury_Wallet_Address_Here");

// Recebe 30% de TODAS as vendas de bilhetes
// Usado para: operações, desenvolvimento, marketing
```

### 2. Affiliates Pool Address (Central)

```typescript
// Endereço único e fixo para pool de afiliados
const AFFILIATES_POOL_ADDRESS = new PublicKey("Affiliates_Pool_Wallet_Address_Here");

// Recebe 30% de TODAS as vendas de bilhetes (máximo reservado)
// Distribuído entre afiliados baseado em performance (tiers)
```

### 3. Delta Address (Central)

```typescript
// Endereço único e fixo para sobras de comissões
const DELTA_ADDRESS = new PublicKey("Delta_Wallet_Address_Here");

// Recebe a diferença entre o máximo reservado (30%) e o pago aos afiliados
// Exemplo: Tier 1 recebe 5%, então Delta = 25%
// Exemplo: Tier 4 recebe 30%, então Delta = 0%
```

### 4. Lottery Pool PDAs (4 endereços)

Cada loteria tem seu próprio PDA para acumular o prize pool:

```typescript
// TRI_DAILY Pool PDA
const [triDailyPoolPDA, triDailyBump] = await PublicKey.findProgramAddress(
  [
    Buffer.from("lottery_pool"),
    Buffer.from("TRI_DAILY"),
    Buffer.from(roundNumber.toString())
  ],
  programId
);

// JACKPOT Pool PDA
const [jackpotPoolPDA, jackpotBump] = await PublicKey.findProgramAddress(
  [
    Buffer.from("lottery_pool"),
    Buffer.from("JACKPOT"),
    Buffer.from(monthYear.toString())
  ],
  programId
);

// GRAND_PRIZE Pool PDA
const [grandPrizePoolPDA, grandPrizeBump] = await PublicKey.findProgramAddress(
  [
    Buffer.from("lottery_pool"),
    Buffer.from("GRAND_PRIZE"),
    Buffer.from(year.toString())
  ],
  programId
);

// XMAS Pool PDA
const [xmasPoolPDA, xmasBump] = await PublicKey.findProgramAddress(
  [
    Buffer.from("lottery_pool"),
    Buffer.from("XMAS"),
    Buffer.from("2024")
  ],
  programId
);
```

---

## 🔄 FLUXO DE FUNDOS

### Momento da Compra (Purchase Flow)

```typescript
// 1. Usuário compra ticket
const ticketPrice = 0.1 SOL; // Exemplo TRI_DAILY

// 2. Sistema calcula splits
const prizePoolAmount = ticketPrice * 0.40; // 0.04 SOL
const treasuryAmount = ticketPrice * 0.30;  // 0.03 SOL
const affiliatesAmount = ticketPrice * 0.30; // 0.03 SOL

// 3. Executa 3 transferências
await SystemProgram.transfer({
  from: buyer,
  to: TRI_DAILY_POOL_PDA,
  lamports: prizePoolAmount
});

await SystemProgram.transfer({
  from: buyer,
  to: TREASURY_ADDRESS,
  lamports: treasuryAmount
});

await SystemProgram.transfer({
  from: buyer,
  to: AFFILIATES_POOL_ADDRESS,
  lamports: affiliatesAmount
});

// 4. Backend registra ticket
await supabase.from('tickets').insert({
  lottery_id,
  ticket_number,
  buyer_wallet,
  // ...
});
```

### Momento do Sorteio (Draw Flow)

```typescript
// 1. Sistema detecta loteria pronta
const lottery = await getLotteryReadyForDraw();

// 2. VRF sorteia vencedores
const winners = await vrfService.selectWinners(lottery);

// 3. Backend marca vencedores no DB
await markTicketsAsWinners(winners);

// 4. Fundos permanecem no PDA da loteria
// Vencedores fazem claim individual
```

### Momento do Claim (Claim Flow)

```typescript
// Vencedor reivindica prêmio
await claimProgram.methods
  .claimPrize(tier)
  .accounts({
    claimer: winner.publicKey,
    lottery: lotteryPDA,
    ticket: ticketPDA,
    lotteryPool: TRI_DAILY_POOL_PDA, // PDA da loteria específica
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Transfere do PDA da loteria para o vencedor
// Exemplo Tier 1: 14 SOL (20% do pool de 70 SOL)
```

---

## 📊 EXEMPLO COMPLETO: TRI-DAILY

Vamos simular uma rodada completa com 1000 tickets vendidos:

### 1. Fase de Vendas

```
1000 tickets × 0.1 SOL = 100 SOL arrecadados

Distribuição automática em cada compra:
├─ TRI_DAILY_POOL_PDA: 1000 × 0.04 = 40 SOL (40%)
├─ TREASURY_ADDRESS: 1000 × 0.03 = 30 SOL (30%)
└─ AFFILIATES_ADDRESS: 1000 × 0.03 = 30 SOL (30%)

TOTAL: 100 SOL ✅
```

### 2. Fase de Sorteio

```
VRF sorteia 10% dos tickets = 100 vencedores

Distribuição do Prize Pool (40 SOL):
├─ Tier 1 (1 vencedor): 20% = 8 SOL
├─ Tier 2 (2 vencedores): 10% = 4 SOL (2 SOL cada)
├─ Tier 3 (6 vencedores): 12.5% = 5 SOL (0.833 SOL cada)
├─ Tier 4 (36 vencedores): 27.5% = 11 SOL (0.305 SOL cada)
└─ Tier 5 (55 vencedores): 30% = 12 SOL (0.218 SOL cada)

TOTAL Prize Pool: 40 SOL ✅
```

### 3. Fase de Claims

```
Cada vencedor faz claim do TRI_DAILY_POOL_PDA:

Vencedor Tier 1: Recebe 8 SOL
Vencedor Tier 2 #1: Recebe 2 SOL
Vencedor Tier 2 #2: Recebe 2 SOL
Vencedor Tier 3 #1: Recebe 0.833 SOL
...e assim por diante

TRI_DAILY_POOL_PDA: 40 SOL → 0 SOL (após todos os claims)
```

---

## 🔐 SEGURANÇA DOS PDAs

### Por que usar PDAs para Prize Pools?

1. **Determinísticos**: Qualquer um pode derivar o endereço
2. **Sem chave privada**: Impossível de ser hackeado
3. **Controlados pelo programa**: Apenas o smart contract pode autorizar transferências
4. **Auditáveis**: Qualquer um pode verificar o saldo on-chain

### Verificação de Integridade

```typescript
// Qualquer um pode verificar se o PDA está correto
const [derivedPDA, bump] = await PublicKey.findProgramAddress(
  [
    Buffer.from("lottery_pool"),
    Buffer.from("TRI_DAILY"),
    Buffer.from("123") // Round number
  ],
  programId
);

// Se derivedPDA === TRI_DAILY_POOL_PDA usado → VÁLIDO ✅
// Se diferente → INVÁLIDO (possível fraude) ❌
```

---

## 💸 DISTRIBUIÇÃO DE AFILIADOS

A comissão de afiliados é calculada **diretamente sobre o preço do ticket**, baseado no **tier do afiliado** (determinado por número de referrals validados):

### Sistema de 4 Tiers (Baseado em Performance)

```typescript
// Compra de 1 ticket TRI_DAILY (0.1 SOL) por um referral

// Tier do afiliado é calculado baseado em seus referrals validados:

// Tier 1: 0-99 referrals validados → 5% do ticket
const tier1Commission = 0.1 SOL * 0.05 = 0.005 SOL

// Tier 2: 100-999 referrals validados → 10% do ticket
const tier2Commission = 0.1 SOL * 0.10 = 0.01 SOL

// Tier 3: 1000-4999 referrals validados → 20% do ticket
const tier3Commission = 0.1 SOL * 0.20 = 0.02 SOL

// Tier 4: 5000+ referrals validados → 30% do ticket
const tier4Commission = 0.1 SOL * 0.30 = 0.03 SOL

// Transferências do AFFILIATES_POOL_ADDRESS
await transfer(AFFILIATES_POOL_ADDRESS → affiliateWallet, commission);
await transfer(AFFILIATES_POOL_ADDRESS → DELTA_ADDRESS, delta);

// Exemplo Tier 1: 0.005 SOL para afiliado + 0.025 SOL para Delta
// Exemplo Tier 4: 0.03 SOL para afiliado + 0 SOL para Delta
```

### Como Funciona?

1. **Comprador usa código de referral** ao comprar ticket
2. **Sistema verifica quantos referrals validados** o afiliado possui
3. **Calcula tier e comissão baseado na tabela**:
   - 0-99 refs → Tier 1 → 5% do ticket
   - 100-999 refs → Tier 2 → 10% do ticket
   - 1000-4999 refs → Tier 3 → 20% do ticket
   - 5000+ refs → Tier 4 → 30% do ticket
4. **Paga comissão** do AFFILIATES_ADDRESS para o afiliado

### Exemplo: Comissões por Loteria (Tier 4)

| Loteria | Preço Ticket | Comissão Tier 4 (30%) |
|---------|--------------|------------------------|
| TRI_DAILY | 0.1 SOL | 0.03 SOL |
| JACKPOT | 0.2 SOL | 0.06 SOL |
| GRAND_PRIZE | 0.33 SOL | 0.099 SOL |
| XMAS | 0.2 SOL | 0.06 SOL |

### O que é um "Referral Validado"?

Um referral é considerado validado quando:
- Usou seu código de afiliado
- Comprou pelo menos 1 ticket
- Transação confirmada on-chain

---

## 🎯 DELTA ADDRESS - SOBRA DE COMISSÕES

O **Delta Address** é um endereço especial que recebe a diferença entre o máximo reservado para afiliados (30%) e o valor realmente pago baseado no tier do afiliado.

### Como Funciona o Delta?

```typescript
// Para cada ticket vendido com código de afiliado:

Reserva Máxima = Preço do Ticket × 30%
Comissão Real = Preço do Ticket × Taxa do Tier (5%, 10%, 20%, ou 30%)
Delta = Reserva Máxima - Comissão Real
```

### Tabela de Delta por Tier

| Tier | Refs | Taxa | TRI-DAILY (0.1 SOL) | Delta (SOL) | Delta (%) |
|------|------|------|---------------------|-------------|-----------|
| **1** | 0-99 | 5% | 0.005 → afiliado | 0.025 | 25% |
| **2** | 100-999 | 10% | 0.01 → afiliado | 0.02 | 20% |
| **3** | 1000-4999 | 20% | 0.02 → afiliado | 0.01 | 10% |
| **4** | 5000+ | 30% | 0.03 → afiliado | 0 | 0% |

### Exemplo Real: 1000 Tickets com Mix de Tiers

```
Cenário: 1000 tickets TRI-DAILY (0.1 SOL cada)

Mix de Afiliados:
- 400 tickets → Tier 1 (5%)
- 300 tickets → Tier 2 (10%)
- 200 tickets → Tier 3 (20%)
- 100 tickets → Tier 4 (30%)

┌────────────────────────────────────────────────────┐
│ RESERVA TOTAL AFILIADOS: 1000 × 0.03 = 30 SOL     │
├────────────────────────────────────────────────────┤
│ Comissões Pagas:                                   │
│ • Tier 1: 400 × 0.005 = 2 SOL                     │
│ • Tier 2: 300 × 0.01 = 3 SOL                      │
│ • Tier 3: 200 × 0.02 = 4 SOL                      │
│ • Tier 4: 100 × 0.03 = 3 SOL                      │
│ ─────────────────────────────                     │
│ TOTAL PAGO: 12 SOL                                 │
│                                                    │
│ Delta por Tier:                                    │
│ • Tier 1: 400 × 0.025 = 10 SOL                    │
│ • Tier 2: 300 × 0.02 = 6 SOL                      │
│ • Tier 3: 200 × 0.01 = 2 SOL                      │
│ • Tier 4: 100 × 0 = 0 SOL                         │
│ ─────────────────────────────                     │
│ 🎯 DELTA TOTAL: 18 SOL → DELTA_ADDRESS            │
└────────────────────────────────────────────────────┘

Verificação: 12 SOL (pagos) + 18 SOL (delta) = 30 SOL ✅
```

### Fluxo Técnico do Delta

```typescript
// 1. Compra com código de afiliado
const ticket = await purchaseTicket(buyer, lotteryId, referralCode);

// 2. Sistema identifica afiliado e tier
const affiliate = await getAffiliateByCode(referralCode);
const tier = await getAffiliateTier(affiliate.id);

// 3. Calcula valores
const reserved = ticketPrice * 0.30;        // 0.03 SOL
const commission = ticketPrice * tierRate;  // 0.005 - 0.03 SOL
const delta = reserved - commission;        // 0 - 0.025 SOL

// 4. Registra no banco
await supabase.from('affiliate_commissions').insert({
  affiliate_id: affiliate.id,
  ticket_id: ticket.id,
  tier: tier,
  commission_amount: commission,
  delta_amount: delta,
});

// 5. Transferências (processadas em batch periodicamente)
await transfer(AFFILIATES_POOL_ADDRESS → affiliate.wallet, commission);
await transfer(AFFILIATES_POOL_ADDRESS → DELTA_ADDRESS, delta);
```

### Uso Recomendado do Delta

O saldo acumulado no **DELTA_ADDRESS** pode ser usado para:

1. **Treasury Adicional** - Aumentar receita do projeto
2. **Marketing & Growth** - Investir em aquisição de usuários
3. **Bônus para Top Performers** - Recompensar afiliados excepcionais
4. **Prize Pool Boost** - Aumentar prêmios ocasionalmente
5. **Desenvolvimento** - Novos recursos e melhorias
6. **Reserva de Emergência** - Fundo de contingência

### Transparência do Delta

O Delta Address é completamente auditável on-chain:

```bash
# Ver saldo atual
solana balance <DELTA_ADDRESS>

# Ver histórico de transações
solana transaction-history <DELTA_ADDRESS>
```

Qualquer um pode verificar:
- Quanto entra no Delta Address
- Quando e para onde o saldo é transferido
- Total acumulado ao longo do tempo

---

## 📈 RESUMO DE ENDEREÇOS

| Tipo | Quantidade | Propósito | % Receita |
|------|------------|-----------|-----------|
| **Treasury** | 1 | Tesouro central | 30% fixo |
| **Affiliates Pool** | 1 | Pool de comissões | 5-30% (tier) |
| **Delta** | 1 | Sobra de comissões | 0-25% |
| **TRI_DAILY Pool** | 1 por round | Prize pool | 40% |
| **JACKPOT Pool** | 1 por mês | Prize pool | 40% |
| **GRAND_PRIZE Pool** | 1 por ano | Prize pool | 40% |
| **XMAS Pool** | 1 (2024) | Prize pool | 40% |

**Total de endereços ativos por vez:**
- 1 Treasury (fixo)
- 1 Affiliates Pool (fixo)
- 1 Delta (fixo)
- ~12 TRI_DAILY rounds ativos por mês
- 1 JACKPOT por mês
- 1 GRAND_PRIZE por ano
- 1 XMAS (apenas 2024)

**Distribuição Real por Ticket:**
```
100% do ticket vendido:
├─ 40% → Prize Pool PDA (vencedores)
├─ 30% → Treasury (operações)
└─ 30% → Affiliates Pool (máximo)
    ├─ 5-30% → Afiliado (baseado no tier)
    └─ 0-25% → Delta (sobra)
```

---

## 🔗 ARQUIVOS RELACIONADOS

- `src/config/lotteries.ts` - Configurações de distribuição
- `src/lib/anchor/pdas.ts` - Derivação de PDAs
- `src/services/solana.service.ts` - Interação com blockchain
- `PRIZE_DISTRIBUTION.md` - Sistema de múltiplos vencedores

---

**Sistema de 7 Endereços com Delta - Simples, Seguro e Auditável! 🔐💰✅**
