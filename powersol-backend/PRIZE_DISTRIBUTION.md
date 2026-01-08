# 💰 Sistema de Distribuição de Prêmios - PowerSOL

Guia completo sobre o sistema de múltiplos vencedores e distribuição de prêmios no PowerSOL.

---

## 🎯 OVERVIEW

O PowerSOL implementa um **sistema inovador de múltiplos vencedores** onde cada loteria tem uma estrutura única de premiação. Ao contrário de loterias tradicionais com apenas 1 vencedor, nosso sistema distribui prêmios entre diversos participantes através de **tiers de premiação**.

---

## 📊 ESTRUTURA GERAL

**TODAS as loterias seguem a mesma distribuição de receita:**

```
40% → Prize Pool (cada loteria)
30% → Treasury (endereço central)
30% → Affiliates (endereço central)
```

Cada bilhete vendido é dividido em 3 partes:

1. **Prize Pool (40%)** - Pool de prêmios da loteria específica
2. **Treasury (30%)** - Tesouro do projeto (desenvolvimento, operações, marketing)
3. **Affiliates (30%)** - Sistema de afiliados multi-level (3 níveis)

---

## 🎰 TRI-DAILY (A cada 3 dias)

### Configuração Básica
- **Preço do Ticket:** 0.1 SOL
- **Max Tickets:** 1,000
- **Frequência:** A cada 3 dias

### Distribuição da Receita
```
Por cada 0.1 SOL de bilhete vendido:
├─ 40% → Prize Pool (0.04 SOL)
├─ 30% → Treasury (0.03 SOL)
└─ 30% → Affiliates (0.03 SOL)
```

### Sistema de Múltiplos Vencedores

**10% do total de bilhetes vendidos são sorteados como vencedores!**

#### Exemplo com 1000 tickets vendidos:

```
Total de tickets: 1000
Vencedores: 10% = 100 tickets sorteados

Total arrecadado: 1000 × 0.1 SOL = 100 SOL
Prize Pool: 100 × 40% = 40 SOL
```

### Distribuição em 5 Tiers

Os 100 vencedores (10% dos 1000 tickets) são distribuídos em 5 tiers:

| Tier | % dos Sorteados | Quantidade | % do Prize Pool | Valor Total | Prêmio/Pessoa |
|------|----------------|------------|-----------------|-------------|---------------|
| **Tier 1** | 1% | 1 ticket | 20% | 8 SOL | **8 SOL** |
| **Tier 2** | 2% | 2 tickets | 10% | 4 SOL | **2 SOL** |
| **Tier 3** | 6% | 6 tickets | 12.5% | 5 SOL | **0.833 SOL** |
| **Tier 4** | 36% | 36 tickets | 27.5% | 11 SOL | **0.305 SOL** |
| **Tier 5** | 55% | 55 tickets | 30% | 12 SOL | **0.218 SOL** |
| **TOTAL** | **100%** | **100 tickets** | **100%** | **40 SOL** | - |

### Como Funciona o Sorteio?

1. **VRF sorteia múltiplos números aleatórios** para selecionar 100 tickets vencedores
2. Os vencedores são **distribuídos sequencialmente** nos tiers:
   - 1º sorteado → Tier 1 (8 SOL)
   - 2º-3º sorteados → Tier 2 (2 SOL cada)
   - 4º-9º sorteados → Tier 3 (0.833 SOL cada)
   - 10º-45º sorteados → Tier 4 (0.305 SOL cada)
   - 46º-100º sorteados → Tier 5 (0.218 SOL cada)

---

## 🎄 XMAS (Natal 2024)

### Configuração Básica
- **Preço do Ticket:** 0.2 SOL
- **Max Tickets:** 7,500
- **Data:** 25 de Dezembro, 2024

### Distribuição da Receita
```
Por cada 0.2 SOL de bilhete vendido:
├─ 40% → Prize Pool (0.08 SOL)
├─ 30% → Treasury (0.06 SOL)
└─ 30% → Affiliates (0.06 SOL)
```

### Sistema de Múltiplos Vencedores

**Exatamente igual ao TRI-DAILY: 10% dos bilhetes são sorteados!**

#### Exemplo com 7500 tickets vendidos:

```
Total de tickets: 7500
Vencedores: 10% = 750 tickets sorteados

Total arrecadado: 7500 × 0.2 SOL = 1500 SOL
Prize Pool: 1500 × 40% = 600 SOL
```

### Distribuição em 5 Tiers

| Tier | % dos Sorteados | Quantidade | % do Prize Pool | Valor Total | Prêmio/Pessoa |
|------|----------------|------------|-----------------|-------------|---------------|
| **Tier 1** | 1% | 7-8 tickets | 20% | 120 SOL | **~16 SOL** |
| **Tier 2** | 2% | 15 tickets | 10% | 60 SOL | **~4 SOL** |
| **Tier 3** | 6% | 45 tickets | 12.5% | 75 SOL | **~1.67 SOL** |
| **Tier 4** | 36% | 270 tickets | 27.5% | 165 SOL | **~0.61 SOL** |
| **Tier 5** | 55% | 412 tickets | 30% | 180 SOL | **~0.44 SOL** |
| **TOTAL** | **100%** | **750 tickets** | **100%** | **600 SOL** | - |

---

## �� JACKPOT (Mensal)

### Configuração Básica
- **Preço do Ticket:** 0.2 SOL
- **Max Tickets:** 5,000
- **Frequência:** Último dia de cada mês

### Distribuição da Receita
```
Por cada 0.2 SOL de bilhete vendido:
├─ 40% → Prize Pool (0.08 SOL)
├─ 30% → Treasury (0.06 SOL)
└─ 30% → Affiliates (0.06 SOL)
```

### Sistema de 100 Vencedores FIXOS

**Sempre sorteia exatamente 100 ganhadores, independente do total de tickets!**

#### Exemplo com 5000 tickets vendidos:

```
Total de tickets: 5000
Vencedores: 100 (fixo)

Total arrecadado: 5000 × 0.2 SOL = 1000 SOL
Prize Pool: 1000 × 40% = 400 SOL
```

### Distribuição em 5 Tiers

| Tier | Posição | Quantidade | % do Prize Pool | Valor Total | Prêmio/Pessoa |
|------|---------|------------|-----------------|-------------|---------------|
| **Tier 1** | 🥇 1º | 1 | 20% | 80 SOL | **80 SOL** |
| **Tier 2** | 🥈 2º-3º | 2 | 10% | 40 SOL | **20 SOL** |
| **Tier 3** | 🥉 4º-9º | 6 | 12.5% | 50 SOL | **8.33 SOL** |
| **Tier 4** | 🎖️ 10º-45º | 36 | 27.5% | 110 SOL | **3.06 SOL** |
| **Tier 5** | 🎗️ 46º-100º | 55 | 30% | 120 SOL | **2.18 SOL** |
| **TOTAL** | - | **100** | **100%** | **400 SOL** | - |

### Como Funciona o Sorteio?

1. **VRF sorteia 100 números aleatórios únicos**
2. Cada número sorteado corresponde a um ticket vencedor
3. A **ordem do sorteio determina a posição**:
   - 1º sorteado = Tier 1 (Campeão) → 80 SOL
   - 2º-3º sorteados = Tier 2 → 20 SOL cada
   - 4º-9º sorteados = Tier 3 → 8.33 SOL cada
   - E assim por diante...

---

## 🎁 GRAND PRIZE (Ano Novo)

### Configuração Básica
- **Preço do Ticket:** 0.33 SOL
- **Max Tickets:** 10,000
- **Data:** 1º de Janeiro

### Distribuição da Receita
```
Por cada 0.33 SOL de bilhete vendido:
├─ 40% → Prize Pool (0.132 SOL)
├─ 30% → Treasury (0.099 SOL)
└─ 30% → Affiliates (0.099 SOL)
```

### Sistema de Top 3 Vencedores

**Apenas 3 vencedores - 1º, 2º e 3º lugar!**

#### Exemplo com 10000 tickets vendidos:

```
Total de tickets: 10000
Vencedores: 3 (fixo)

Total arrecadado: 10000 × 0.33 SOL = 3300 SOL
Prize Pool: 3300 × 40% = 1320 SOL
```

### Distribuição em 3 Tiers

| Tier | Posição | Quantidade | % do Prize Pool | Prêmio |
|------|---------|------------|-----------------|--------|
| **Tier 1** | 🥇 1º Lugar | 1 | 50% | **660 SOL** |
| **Tier 2** | 🥈 2º Lugar | 1 | 30% | **396 SOL** |
| **Tier 3** | 🥉 3º Lugar | 1 | 20% | **264 SOL** |
| **TOTAL** | - | **3** | **100%** | **1320 SOL** |

### Como Funciona o Sorteio?

1. **VRF sorteia 3 números aleatórios únicos**
2. A **ordem do sorteio determina o lugar**:
   - 1º número sorteado = 1º Lugar → 660 SOL
   - 2º número sorteado = 2º Lugar → 396 SOL
   - 3º número sorteado = 3º Lugar → 264 SOL

---

## 🔐 FLUXO TÉCNICO ON-CHAIN

### 1. Compra de Ticket

```typescript
// Usuário compra ticket
SystemProgram.transfer({
  from: buyer,
  to: treasuryPDA,
  lamports: ticketPrice
})

// Backend registra
await supabase.from('tickets').insert({
  lottery_id,
  ticket_number,
  buyer_wallet,
  // ...
})
```

**SOL vai direto para Treasury PDA on-chain!**

---

### 2. Momento do Sorteio

```typescript
// 1. Sistema detecta loteria pronta
const lottery = await getLotteryReadyForDraw();

// 2. Calcula quantos vencedores sortear
const config = getLotteryConfig(lottery.type);
const totalWinners = getTotalWinnersForLottery(config, totalTickets);

// Exemplo TRI-DAILY: totalWinners = 1000 × 10% = 100
// Exemplo JACKPOT: totalWinners = 100 (fixo)
// Exemplo GRAND_PRIZE: totalWinners = 3 (fixo)

// 3. Solicita múltiplos números aleatórios ao VRF
const vrfRequest = await vrfService.requestMultipleRandomNumbers(
  lotteryId,
  totalWinners
);

// 4. VRF retorna array de números verificáveis
const randomNumbers = await vrfService.getRandomNumbers(vrfRequestId);

// 5. Seleciona tickets vencedores
const winningTickets = randomNumbers.map(rnd => (rnd % totalTickets) + 1);

// 6. Distribui em tiers
const tierAllocations = allocateWinnersToTiers(config, winningTickets);

// Exemplo TRI-DAILY:
// tierAllocations = [
//   { tier: 1, tickets: [543], amount: 14 SOL },
//   { tier: 2, tickets: [128, 892], amount: 3.5 SOL each },
//   { tier: 3, tickets: [45, 234, ...], amount: 1.458 SOL each },
//   ...
// ]
```

---

### 3. Reivindicação (Claim)

```typescript
// Usuário verifica se ganhou
const ticket = await getTicketById(ticketId);

if (ticket.is_winner) {
  // Calcula prêmio baseado no tier
  const tier = ticket.winning_tier;
  const prizeAmount = calculatePrizeForTier(lottery, tier);

  // Transfere da Treasury PDA para o vencedor
  await claimProgram.methods
    .claimPrize(tier)
    .accounts({
      claimer: winner,
      lottery: lotteryPDA,
      ticket: ticketPDA,
      treasury: treasuryPDA,
    })
    .rpc();
}
```

---

## 💸 DISTRIBUIÇÃO DE AFILIADOS

Afiliados recebem **até 30% do preço de cada ticket** vendido por seus referrals, baseado em **performance**:

### Sistema de 4 Tiers (Baseado em Referrals Validados)

```typescript
// Exemplo: Compra de 1 ticket TRI-DAILY (0.1 SOL) por um referral

// Comissão é calculada DIRETAMENTE sobre o preço do ticket:

Tier 1 (0-99 refs):      5% do ticket = 0.1 × 0.05 = 0.005 SOL
Tier 2 (100-999 refs):   10% do ticket = 0.1 × 0.10 = 0.01 SOL
Tier 3 (1000-4999 refs): 20% do ticket = 0.1 × 0.20 = 0.02 SOL
Tier 4 (5000+ refs):     30% do ticket = 0.1 × 0.30 = 0.03 SOL (máximo)
```

### Tabela de Comissões por Tier

| Tier | Refs Validados | Comissão | TRI-DAILY (0.1 SOL) | JACKPOT (0.2 SOL) | GRAND_PRIZE (0.33 SOL) |
|------|----------------|----------|---------------------|-------------------|------------------------|
| **1** | 0-99 | 5% | 0.005 SOL | 0.01 SOL | 0.0165 SOL |
| **2** | 100-999 | 10% | 0.01 SOL | 0.02 SOL | 0.033 SOL |
| **3** | 1000-4999 | 20% | 0.02 SOL | 0.04 SOL | 0.066 SOL |
| **4** | 5000+ | 30% | 0.03 SOL | 0.06 SOL | 0.099 SOL |

### Como Progredir nos Tiers?

```
Início (0 refs) → Tier 1 (5% do ticket)
    ↓ +100 refs validados
Tier 2 (10% do ticket) - 2x mais comissão!
    ↓ +900 refs validados (total 1000)
Tier 3 (20% do ticket) - 4x mais comissão!
    ↓ +4000 refs validados (total 5000)
Tier 4 (30% do ticket) - 6x mais comissão!
```

### Exemplo Real de Ganhos

**Afiliado Tier 4 com 10,000 referrals validados:**

```
Cenário: 1000 de seus referrals compram 1 ticket TRI-DAILY cada

Receita gerada pelos referrals: 1000 × 0.1 SOL = 100 SOL
Comissão Tier 4 (30%): 100 × 0.30 = 30 SOL

Ganho do afiliado: 30 SOL
```

**TODAS as loterias seguem essa mesma estrutura de comissão baseada em tiers!**

---

## 📈 COMPARAÇÃO ENTRE LOTERIAS

| Loteria | Ticket | Max Tickets | Vencedores | Tipo | Prize Pool % | Maior Prêmio |
|---------|--------|-------------|------------|------|--------------|--------------|
| **TRI-DAILY** | 0.1 SOL | 1,000 | 10% | % | 40% | ~8 SOL |
| **XMAS** | 0.2 SOL | 7,500 | 10% | % | 40% | ~16 SOL |
| **JACKPOT** | 0.2 SOL | 5,000 | 100 | Fixo | 40% | 80 SOL |
| **GRAND PRIZE** | 0.33 SOL | 10,000 | 3 | Fixo | 40% | 660 SOL |

**Todas as loterias: 40% Prize Pool | 30% Treasury | 30% Affiliates**

---

## 🎲 ALGORITMO VRF

### Como Garantir Aleatoriedade?

Usamos **Switchboard VRF** (Verifiable Random Function):

1. **Requestamos** números aleatórios
2. **VRF gera** números verificáveis on-chain
3. **Proof criptográfico** garante que não foram manipulados
4. **Qualquer um** pode verificar a aleatoriedade on-chain

```typescript
// Pseudocódigo
function selectWinners(lotteryType, totalTickets):
  config = getLotteryConfig(lotteryType)
  totalWinners = getTotalWinners(config, totalTickets)

  // Solicita VRF
  vrfNumbers = await switchboardVRF.request(totalWinners)

  // Converte em tickets
  winningTickets = []
  for (i = 0; i < vrfNumbers.length; i++):
    ticketNumber = (vrfNumbers[i] % totalTickets) + 1

    // Garante que não há duplicatas
    if (ticketNumber not in winningTickets):
      winningTickets.push(ticketNumber)

  // Aloca em tiers baseado na ordem
  return allocateToTiers(config, winningTickets)
```

---

## ❓ FAQs

### Q: Por que múltiplos vencedores ao invés de apenas 1?
**R:** Para aumentar as chances de ganhar e tornar o jogo mais justo e divertido! Em vez de 1 pessoa ganhar tudo, distribuímos entre vários participantes.

### Q: Como sei em qual tier fiquei?
**R:** A ordem do sorteio determina o tier. O primeiro sorteado fica no Tier 1 (melhor prêmio), e assim por diante.

### Q: E se venderem poucos tickets?
**R:** Em loterias com % (TRI-DAILY, XMAS), sempre 10% são sorteados. Em loterias fixas (JACKPOT, GRAND PRIZE), o número de vencedores é sempre o mesmo.

### Q: O backend pode fraudar o sorteio?
**R:** NÃO! O VRF da Switchboard gera números verificáveis on-chain. Qualquer um pode verificar que os números são legítimos.

### Q: Quando posso sacar meu prêmio?
**R:** Imediatamente após o sorteio! Basta fazer claim do seu prêmio on-chain.

### Q: E se não houver vencedores suficientes no JACKPOT?
**R:** Se venderem menos de 100 tickets, apenas os tickets vendidos podem ganhar. Se venderem 50, haverá apenas 50 vencedores.

---

## 🔗 ARQUIVOS RELACIONADOS

- `src/config/lotteries.ts` - Configurações e cálculos
- `src/services/solana-lottery.service.ts` - Lógica de sorteio
- `src/services/vrf.service.ts` - Integração VRF
- `src/services/claim.service.ts` - Reivindicação de prêmios

---

**Sistema de Múltiplos Vencedores - Justo, Verificável e Divertido! 🎰💰✅**
