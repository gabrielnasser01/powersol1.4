# 🎰 PowerSOL Lotteries - Guia Completo

Guia técnico sobre as **4 loterias** do PowerSOL e seus **PDAs específicos**.

## 🎯 AS 4 LOTERIAS

### 1. TRI-DAILY (A cada 3 dias)

**Características:**
- Frequência: **1 sorteio a cada 3 dias** (00h UTC)
- Ticket: **0.1 SOL**
- Max Tickets: **1,000**
- Prêmio: 70% do pool

**PDA Seed:**
```rust
["tri_daily", round_number]
```

**Exemplo:**
- Round 1: PDA = `["tri_daily", 1]`
- Round 2: PDA = `["tri_daily", 2]`
- Round atual é calculado desde 01/01/2024

**Cálculo do Round:**
```typescript
const startDate = new Date('2024-01-01T00:00:00Z');
const now = new Date();
const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
const currentRound = Math.floor(daysSinceStart / 3) + 1;
```

**Horário do Sorteio:**
- A cada 3 dias às 00:00 UTC
- Exemplo: 01/01, 04/01, 07/01, 10/01, etc.

---

### 2. JACKPOT (Mensal)

**Características:**
- Frequência: **1x por mês** (último dia às 00h UTC)
- Ticket: **0.2 SOL**
- Max Tickets: **5,000**
- Prêmio: 75% do pool

**PDA Seed:**
```rust
["jackpot", month (u16), year (u32)]
```

**Exemplos:**
- Janeiro 2024: PDA = `["jackpot", 1, 2024]`
- Dezembro 2024: PDA = `["jackpot", 12, 2024]`
- Fevereiro 2025: PDA = `["jackpot", 2, 2025]`

**Horário do Sorteio:**
- Último dia do mês às 00:00 UTC

---

### 3. GRAND PRIZE (Ano Novo)

**Características:**
- Frequência: **1x por ano** (01/01 às 00h UTC)
- Ticket: **0.33 SOL**
- Max Tickets: **10,000**
- Prêmio: 80% do pool (maior prêmio!)

**PDA Seed:**
```rust
["grand_prize", year (u32)]
```

**Exemplos:**
- 2025: PDA = `["grand_prize", 2025]`
- 2026: PDA = `["grand_prize", 2026]`

**Horário do Sorteio:**
- 01 de Janeiro às 00:00 UTC (virada do ano!)

**Features Especiais:**
- Maior prêmio do PowerSOL
- NFT especial para o vencedor
- Comemoração de Ano Novo

---

### 4. XMAS (Natal 2024)

**Características:**
- Frequência: **Especial único** (25/12/2024 às 00h UTC)
- Ticket: **0.2 SOL**
- Max Tickets: **7,500**
- Prêmio: 78% do pool

**PDA Seed:**
```rust
["xmas", year (u32)]
```

**Exemplo:**
- 2024: PDA = `["xmas", 2024]`

**Horário do Sorteio:**
- 25 de Dezembro de 2024 às 00:00 UTC

**Features Especiais:**
- Evento único de Natal 2024
- Tema natalino
- NFT especial de Natal para vencedor

---

## 🏗️ ARQUITETURA DE PDAs

### Lottery PDAs

Cada tipo de loteria tem seu próprio esquema de PDA:

```typescript
// TRI-DAILY
findTriDailyLotteryPDA(round: number, programId: PublicKey)
// Seed: ["tri_daily", round (u64)]

// JACKPOT
findJackpotLotteryPDA(month: number, year: number, programId: PublicKey)
// Seed: ["jackpot", month (u16), year (u32)]

// GRAND PRIZE
findGrandPrizeLotteryPDA(year: number, programId: PublicKey)
// Seed: ["grand_prize", year (u32)]

// XMAS
findXmasLotteryPDA(year: number, programId: PublicKey)
// Seed: ["xmas", year (u32)]
```

### Ticket PDAs

Todos os tickets usam o mesmo esquema independente do tipo de loteria:

```typescript
findTicketPDA(lotteryId: number, ticketNumber: number, programId: PublicKey)
// Seed: ["ticket", lottery_id (u64), ticket_number (u32)]
```

### User Tickets PDA

Rastreia todos tickets de um usuário em uma loteria:

```typescript
findUserTicketsPDA(userPubkey: PublicKey, lotteryId: number, programId: PublicKey)
// Seed: ["user_tickets", user_pubkey, lottery_id (u64)]
```

### Claim PDA

Para reivindicar prêmios:

```typescript
findClaimPDA(userPubkey: PublicKey, lotteryId: number, programId: PublicKey)
// Seed: ["claim", user_pubkey, lottery_id (u64)]
```

---

## 📊 DISTRIBUIÇÃO DE PRÊMIOS

### TRI-DAILY
- **Vencedor:** 70%
- **Treasury:** 20%
- **Afiliados:** 10%

### JACKPOT
- **Vencedor:** 75%
- **Treasury:** 15%
- **Afiliados:** 10%

### GRAND PRIZE
- **Vencedor:** 80%
- **Treasury:** 12%
- **Afiliados:** 8%

### XMAS
- **Vencedor:** 78%
- **Treasury:** 13%
- **Afiliados:** 9%

---

## 🤖 AUTOMAÇÃO (Cron Jobs)

### Lottery Manager

Cria automaticamente novas loterias:

**TRI-DAILY:**
```typescript
// Cron: '0 7,15,23 * * *' (1h antes de cada sorteio)
// Cria a próxima loteria TRI-DAILY com round+1
```

**JACKPOT:**
```typescript
// Cron: '0 0 28-31 * *' (dias 28-31 de cada mês)
// Cria a loteria JACKPOT do próximo mês
```

**SPECIAL (XMAS & GRAND PRIZE):**
```typescript
// Cron: '0 0 * * *' (diariamente)
// Verifica se as loterias especiais existem e cria se necessário
```

### Draw Processor

Processa sorteios automaticamente:

```typescript
// Cron: '*/5 * * * *' (a cada 5 minutos)
// Verifica loterias prontas para sorteio e inicia VRF
```

---

## 🔧 USO NO CÓDIGO

### Obter PDA correto para cada tipo

```typescript
import { getLotteryPDAForType, LotteryType } from './lib/anchor/pdas';
import { PROGRAM_IDS } from './config/solana';

// TRI-DAILY
const triDailyPDA = getLotteryPDAForType(
  LotteryType.TRI_DAILY,
  { round: 123 },
  PROGRAM_IDS.CORE
);

// JACKPOT
const jackpotPDA = getLotteryPDAForType(
  LotteryType.JACKPOT,
  { month: 12, year: 2024 },
  PROGRAM_IDS.CORE
);

// GRAND PRIZE
const grandPrizePDA = getLotteryPDAForType(
  LotteryType.GRAND_PRIZE,
  { year: 2025 },
  PROGRAM_IDS.CORE
);

// XMAS
const xmasPDA = getLotteryPDAForType(
  LotteryType.XMAS,
  { year: 2024 },
  PROGRAM_IDS.CORE
);
```

### Obter configuração de cada loteria

```typescript
import { getLotteryConfig, LotteryType } from './config/lotteries';

const triDailyConfig = getLotteryConfig(LotteryType.TRI_DAILY);
console.log(triDailyConfig.ticketPrice); // 0.1 SOL em lamports
console.log(triDailyConfig.maxTickets);  // 1000
console.log(triDailyConfig.prizeDistribution); // { winner: 70, treasury: 20, affiliates: 10 }
```

### Comprar ticket

```typescript
import { solanaLotteryService } from './services/solana-lottery.service';
import { PublicKey } from '@solana/web3.js';
import { LotteryType } from './lib/anchor/pdas';

const buyerPubkey = new PublicKey('...');
const transaction = await solanaLotteryService.buildPurchaseTransaction(
  buyerPubkey,
  LotteryType.TRI_DAILY,
  42 // ticket number
);

// User assina e envia transaction
```

---

## 📅 CALENDÁRIO DE SORTEIOS

### Diário
- **08:00 UTC** - TRI-DAILY Round X
- **16:00 UTC** - TRI-DAILY Round X+1
- **00:00 UTC** - TRI-DAILY Round X+2

### Mensal
- **Último dia de cada mês às 00:00 UTC** - JACKPOT

### Anual
- **25 de Dezembro às 00:00 UTC** - XMAS 2024
- **01 de Janeiro às 00:00 UTC** - GRAND PRIZE 2025

---

## 🎮 FLUXO DE COMPRA

1. Frontend chama: `GET /api/lotteries/active`
2. Backend retorna as 4 loterias ativas
3. Usuário escolhe uma loteria
4. Frontend chama: `POST /api/tickets/purchase`
   ```json
   {
     "lotteryId": "uuid",
     "quantity": 1
   }
   ```
5. Backend:
   - Identifica tipo da loteria
   - Calcula PDA correto
   - Gera transaction
   - Retorna transaction serializada
6. Frontend assina com Phantom/Solflare
7. Frontend envia signature de volta
8. Backend verifica on-chain
9. Database atualizado

---

## 🔐 SEGURANÇA

Cada tipo de loteria tem:
- ✅ PDA único e determinístico
- ✅ Não há colisões entre tipos
- ✅ VRF para randomness verificável
- ✅ RLS no database
- ✅ Verificação on-chain de todas transações

---

## 📖 EXEMPLOS DE SEEDS

### TRI-DAILY
```
Round 1:    ["tri_daily", 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
Round 100:  ["tri_daily", 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
Round 1000: ["tri_daily", 0xE8, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
```

### JACKPOT
```
Jan/2024:  ["jackpot", 0x01, 0x00, 0xE8, 0x07, 0x00, 0x00]
Dec/2024:  ["jackpot", 0x0C, 0x00, 0xE8, 0x07, 0x00, 0x00]
Jan/2025:  ["jackpot", 0x01, 0x00, 0xE9, 0x07, 0x00, 0x00]
```

### GRAND PRIZE
```
2025: ["grand_prize", 0xE9, 0x07, 0x00, 0x00]
2026: ["grand_prize", 0xEA, 0x07, 0x00, 0x00]
```

### XMAS
```
2024: ["xmas", 0xE8, 0x07, 0x00, 0x00]
2025: ["xmas", 0xE9, 0x07, 0x00, 0x00]
```

---

## 🚀 PRÓXIMOS PASSOS

1. Deploy dos programas Anchor com PDAs corretos
2. Testar cada tipo de loteria em devnet
3. Configurar Switchboard VRF
4. Seed das 4 loterias iniciais
5. Testar cron jobs localmente
6. Deploy em produção

---

**PowerSOL - 4 Loterias, Infinitas Possibilidades! 🎰**
