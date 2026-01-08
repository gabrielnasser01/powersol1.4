# Integração com Repositório PowerSOL Existente

## 🔍 Análise do Seu Repositório

Seu repo em `https://github.com/gabrielnasser01/powersol.git` é um **backend TypeScript** completo com:

### Estrutura Atual
```
powersol/
├── Anchor.toml                    # ✅ Já configurado
├── Cargo.toml                     # ✅ Workspace config
├── programs/
│   ├── powersol-core/            # ⚠️ Precisa do código Rust
│   └── powersol-claim/           # ⚠️ Precisa do código Rust
├── src/                           # ✅ Backend TypeScript
│   ├── server.ts                 # Express API
│   ├── lib/solana.ts            # Helpers Solana
│   ├── jobs/                     # Cron schedulers
│   ├── queues/                   # BullMQ workers
│   └── ...
├── scripts/                       # ✅ Scripts operacionais
│   ├── init.ts
│   ├── buy.ts
│   ├── draw.ts
│   ├── claim.ts
│   └── aff-withdraw.ts
└── prisma/                        # ✅ Database schema
```

### Program IDs (do seu Anchor.toml)

**Localnet:**
- `powersol_core`: `9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7`
- `powersol_claim`: `6P6jVWeNseyX2VVaodui6Tn6Pvx93w9u5GAbQHVq2PAS`

**Devnet:**
- `powersol_core`: `2hGiqYuw2sxu7P5AnbcW2CYwiVdcgGqzGwdrDam6DCrZ`
- `powersol_claim`: `4Qa4fA1NVuMcZV8K4D4x3Efr2E1V9AqMfCVxYvByBPjE`

### Tecnologias Usadas
- ✅ TypeScript backend (não React)
- ✅ Express.js + Prisma ORM
- ✅ BullMQ + Redis para queues
- ✅ PostgreSQL database
- ✅ Anchor 0.29.0
- ✅ Node-cron para schedulers

## 📦 O Que Falta no Seu Repo

### 1. Código Fonte dos Programas Rust ⚠️
Os diretórios `programs/powersol-core/` e `programs/powersol-claim/` estão definidos no `Anchor.toml` mas **não têm código Rust (.rs)**.

### 2. IDLs Gerados ⚠️
Sem código Rust compilado, não há:
- `target/idl/powersol_core.json`
- `target/idl/powersol_claim.json`

### 3. TypeScript Types ⚠️
Os helpers em `src/lib/solana.ts` usam placeholders `111...` para program IDs.

## 🔧 Como Integrar

### Opção 1: Copiar Programas Criados Aqui

```bash
# No seu repo local
cd /path/to/seu/powersol

# Copiar programas Rust
cp -r /tmp/cc-agent/56464174/project/programs/powersol_core ./programs/
cp -r /tmp/cc-agent/56464174/project/programs/powersol_claim ./programs/

# Ajustar nomes (seu repo usa powersol-core com hífen)
mv programs/powersol_core programs/powersol-core
mv programs/powersol_claim programs/powersol-claim
```

### Opção 2: Atualizar Anchor.toml

Seu `Anchor.toml` precisa referenciar os nomes corretos:

```toml
[workspace]
members = [
    "programs/powersol-core",    # Com hífen
    "programs/powersol-claim"
]
```

### Opção 3: Build e Deploy

```bash
# 1. Build dos programas
anchor build

# Isso gera:
# - target/deploy/powersol_core.so
# - target/deploy/powersol_claim.so
# - target/idl/powersol_core.json
# - target/idl/powersol_claim.json

# 2. Deploy localnet
solana-test-validator  # Terminal separado
anchor deploy

# 3. Verificar
solana program show 9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7
```

## 🔄 Atualizar src/lib/solana.ts

Seu arquivo usa placeholders. Substitua pelos IDs corretos:

```typescript
// src/lib/solana.ts

import { PublicKey } from '@solana/web3.js';

// Program IDs from Anchor.toml
const PROGRAM_IDS = {
  localnet: {
    core: new PublicKey('9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7'),
    claim: new PublicKey('6P6jVWeNseyX2VVaodui6Tn6Pvx93w9u5GAbQHVq2PAS'),
  },
  devnet: {
    core: new PublicKey('2hGiqYuw2sxu7P5AnbcW2CYwiVdcgGqzGwdrDam6DCrZ'),
    claim: new PublicKey('4Qa4fA1NVuMcZV8K4D4x3Efr2E1V9AqMfCVxYvByBPjE'),
  },
};

// Detect cluster from RPC_URL
function getCluster(): 'localnet' | 'devnet' {
  const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8899';
  return rpcUrl.includes('devnet') ? 'devnet' : 'localnet';
}

// Export correct IDs based on cluster
const cluster = getCluster();
export const POWERSOL_CORE_PROGRAM_ID = PROGRAM_IDS[cluster].core;
export const POWERSOL_CLAIM_PROGRAM_ID = PROGRAM_IDS[cluster].claim;
```

## 📝 Próximos Passos

### 1. Adicionar Código Rust aos Programas

Crie os arquivos de código:

```bash
# programs/powersol-core/Cargo.toml
[package]
name = "powersol-core"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "powersol_core"

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"

# programs/powersol-core/src/lib.rs
# (copiar do arquivo criado anteriormente)
```

### 2. Atualizar Scripts Operacionais

Seus scripts em `scripts/` já estão prontos:
- ✅ `init.ts` - Inicializar
- ✅ `buy.ts` - Comprar ticket
- ✅ `draw.ts` - Sortear
- ✅ `claim.ts` - Reivindicar

Apenas certifique-se que usam os Program IDs corretos.

### 3. Configurar Prisma Schema

Adicione modelos para sincronizar blockchain:

```prisma
// prisma/schema.prisma

model Lottery {
  id              Int       @id @default(autoincrement())
  lotteryId       Int       @unique
  lotteryType     String
  ticketPrice     BigInt
  maxTickets      Int
  drawTimestamp   DateTime
  isDrawn         Boolean   @default(false)
  winningTicket   Int?
  prizePool       BigInt    @default(0)
  txSignature     String?
  onChainAddress  String?
  createdAt       DateTime  @default(now())

  tickets         Ticket[]
}

model Ticket {
  id              Int       @id @default(autoincrement())
  userId          Int
  lotteryId       Int
  ticketNumber    Int
  quantity        Int       @default(1)
  purchaseTime    DateTime
  isWinner        Boolean   @default(false)
  txSignature     String?
  onChainAddress  String?
  createdAt       DateTime  @default(now())

  lottery         Lottery   @relation(fields: [lotteryId], references: [lotteryId])
  user            User      @relation(fields: [userId], references: [id])
}
```

### 4. Testar End-to-End

```bash
# 1. Iniciar infraestrutura
docker-compose up -d  # PostgreSQL + Redis
solana-test-validator  # Localnet

# 2. Build e deploy
anchor build
anchor deploy

# 3. Migrar database
yarn prisma:migrate

# 4. Seed inicial
yarn seed:all

# 5. Iniciar serviços
yarn dev          # API (porta 4000)
yarn jobs         # Cron schedulers
yarn queue        # BullMQ workers

# 6. Testar compra de ticket
yarn ts-node scripts/buy.ts --wallet <WALLET> --lottery TRI_DAILY --quantity 1

# 7. Testar sorteio
yarn ts-node scripts/draw.ts --lottery TRI_DAILY

# 8. Testar claim
yarn ts-node scripts/claim.ts --ticket <ID> --wallet <WALLET>
```

## 🔐 Variáveis de Ambiente

Seu `.env` precisa:

```env
# RPC
RPC_URL=http://127.0.0.1:8899
# RPC_URL=https://api.devnet.solana.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/powersol

# Redis
REDIS_URL=redis://localhost:6379

# Wallets (NUNCA commitar!)
DEV_WALLET_SECRET=base58_encoded_secret_key
TREASURY_WALLET=wallet_public_key

# VRF (Switchboard)
VRF_QUEUE_PUBKEY=...
VRF_ORACLE_PUBKEY=...
VRF_PERMISSION_PUBKEY=...
VRF_AUTHORITY_PUBKEY=...

# API
PORT=4000
JWT_SECRET=your-secret-key

# Prize Pools (PDAs calculados)
TRI_DAILY_PRIZE_PDA=...
JACKPOT_PRIZE_PDA=...
GRAND_PRIZE_PDA=...
```

## 📚 Diferenças do Seu Repo vs Este Projeto

| Aspecto | Seu Repo | Este Projeto |
|---------|----------|--------------|
| Frontend | ❌ Não tem | ✅ React + Vite |
| Backend | ✅ TypeScript/Express | ✅ Node.js/Express |
| Database | ✅ PostgreSQL + Prisma | ✅ Supabase + SQLite |
| Programas Anchor | ⚠️ Sem código .rs | ✅ Código completo |
| IDLs | ⚠️ Não gerados | ✅ Gerados |
| Scripts | ✅ Completos | ✅ Helpers adicionais |
| Queues | ✅ BullMQ + Redis | ❌ Não tem |
| Cron Jobs | ✅ node-cron | ❌ Não tem |

## 🎯 Recomendação

**Melhor abordagem:**

1. **Manter seu repo** como backend principal
2. **Adicionar código Rust** dos programas criados aqui
3. **Atualizar** `src/lib/solana.ts` com IDs corretos
4. **Manter** sua estrutura Express/Prisma/BullMQ
5. **Usar** seus scripts operacionais existentes

**Arquivos a copiar deste projeto para o seu repo:**

```bash
# Programas Rust
programs/powersol_core/src/lib.rs → programs/powersol-core/src/lib.rs
programs/powersol_claim/src/lib.rs → programs/powersol-claim/src/lib.rs

# Cargo configs
programs/powersol_core/Cargo.toml → programs/powersol-core/Cargo.toml
programs/powersol_claim/Cargo.toml → programs/powersol-claim/Cargo.toml

# IDLs (após build)
target/idl/*.json → seu repo
```

## 🚀 Comando Rápido de Integração

```bash
# Clone este projeto temporariamente
git clone <este-projeto> temp-integration

# No seu repo powersol
cd /path/to/seu/powersol

# Copiar programas Rust
cp -r ../temp-integration/programs/powersol_core/src programs/powersol-core/
cp -r ../temp-integration/programs/powersol_claim/src programs/powersol-claim/
cp ../temp-integration/programs/powersol_core/Cargo.toml programs/powersol-core/
cp ../temp-integration/programs/powersol_claim/Cargo.toml programs/powersol-claim/

# Build
anchor build

# Deploy
anchor deploy

# Verificar
ls -la target/idl/
solana program show 9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7

# Limpar temp
rm -rf ../temp-integration
```

## 📞 Suporte

Se tiver dúvidas sobre integração:
1. Verifique os logs: `solana logs`
2. Teste em localnet primeiro
3. Valide Program IDs: `solana program show <ID>`
4. Revise seu `src/lib/solana.ts`

---

**Seu repositório está bem estruturado! Falta apenas o código Rust dos programas Anchor.** 🚀
