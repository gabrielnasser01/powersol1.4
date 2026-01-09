# PowerSOL - Blockchain Setup Guide

## Pre-requisitos

1. **Rust** - https://rustup.rs/
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Solana CLI** - https://docs.solana.com/cli/install-solana-cli-tools
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
```

3. **Anchor CLI** - https://www.anchor-lang.com/docs/installation
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

## Setup Inicial

### 1. Configurar Solana para Devnet
```bash
solana config set --url devnet
```

### 2. Criar Wallet (se nao tiver)
```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

### 3. Pegar SOL de teste
```bash
solana airdrop 2
```

## Deploy dos Programas

### 1. Build
```bash
cd powersol-programs
anchor build
```

### 2. Deploy na Devnet
```bash
./deploy-devnet.sh
```

### 3. Deploy na Mainnet (CUIDADO!)
```bash
./deploy-mainnet.sh
```

## IDs dos Programas

Apos o deploy, anote os Program IDs:

| Programa | Devnet ID |
|----------|-----------|
| powersol-core | GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW |
| powersol-claim | DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK |

## Configurar Backend

Adicione no `.env` do backend:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
CORE_PROGRAM_ID=GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW
CLAIM_PROGRAM_ID=DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK
AUTHORITY_PRIVATE_KEY=[sua_private_key_array]
TREASURY_ADDRESS=55zv671N9QUBv9UCke6BTu1mM21dRKhvWcZDxiYLSXm1
AFFILIATES_POOL_ADDRESS=8KWvsj1QzCzKnDEViSnza1PJhEg3CyHPVS3nLU8CG3yf
```

## Configurar Frontend

Adicione no `.env` do frontend:

```env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW
```

## Inicializar Loterias On-Chain

Apos deploy, inicialize as loterias:

```typescript
// Exemplo - executar via script ou backend
import { solanaService } from './services/solana.service';

// Tri-Daily (round 1)
await solanaService.initializeTriDailyLottery(
  1,                          // round
  BigInt(100000000),          // 0.1 SOL em lamports
  1000,                       // max tickets
  Math.floor(Date.now() / 1000) + 28800  // draw em 8 horas
);

// Jackpot (Janeiro 2026)
await solanaService.initializeJackpotLottery(
  1,                          // mes
  2026,                       // ano
  BigInt(200000000),          // 0.2 SOL
  10000,                      // max tickets
  Math.floor(Date.now() / 1000) + 2592000  // draw em 30 dias
);
```

## Arquitetura On-Chain

```
┌─────────────────────────────────────────────────────────────┐
│                      powersol-core                          │
├─────────────────────────────────────────────────────────────┤
│  - initializeTriDailyLottery()                              │
│  - initializeJackpotLottery()                               │
│  - initializeGrandPrizeLottery()                            │
│  - initializeXmasLottery()                                  │
│  - purchaseTicket()                                         │
│  - executeDraw()                                            │
│  - closeLottery()                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      powersol-claim                         │
├─────────────────────────────────────────────────────────────┤
│  - initializePrizePool()                                    │
│  - initializeAffiliatePool()                                │
│  - initializeAccumulator()                                  │
│  - depositToPrizePool()                                     │
│  - depositToAffiliatePool()                                 │
│  - claimLotteryPrize()                                      │
│  - claimAffiliateRewards()                                  │
└─────────────────────────────────────────────────────────────┘
```

## Distribuicao de Tickets

Cada compra de ticket distribui:
- **40%** → Prize Pool (para premios)
- **30%** → Treasury (operacional)
- **30%** → Affiliates Pool (comissoes)

## Verificar Deploy

```bash
# Ver programa no explorer
https://explorer.solana.com/address/GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW?cluster=devnet

# Ver transacoes
solana confirm -v <SIGNATURE>
```

## Troubleshooting

### Erro: "Program not found"
- Verifique se fez deploy na rede correta
- Confirme que o Program ID esta correto

### Erro: "Insufficient funds"
- Peca mais airdrop: `solana airdrop 2`

### Erro: "Account not found"
- A loteria precisa ser inicializada primeiro
- Execute `initializeTriDailyLottery()` antes de comprar tickets
