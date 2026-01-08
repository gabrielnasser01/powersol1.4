# 🤖 Prompt Completo para ChatGPT - Backend PowerSOL

Copie e cole este prompt no ChatGPT para criar o backend completo.

---

# PROMPT PARA O CHATGPT

```
Preciso que você me ajude a criar um backend Node.js + TypeScript completo para uma plataforma de loteria on-chain na Solana chamada PowerSOL.

## 🎯 CONTEXTO

Já tenho o frontend React pronto. Preciso do backend que se conecte perfeitamente com ele.

O frontend possui estas páginas:
- Home (landing page)
- Lottery (loterias ativas - TRI_DAILY, JACKPOT, GRAND_PRIZE)
- Missions (missões diárias para ganhar tickets)
- Affiliates (programa de afiliados multi-level)
- Transparency (histórico de sorteios e stats)
- Profile (dados do usuário e tickets)
- FAQ, Terms, Privacy

## 📋 REQUISITOS TÉCNICOS

### Stack Obrigatória:
- Node.js 20+ com TypeScript 5+
- Express.js 4.x (API REST)
- Supabase (PostgreSQL) como database
- @solana/web3.js 1.95+ para blockchain
- @coral-xyz/anchor 0.29+ para smart contracts
- BullMQ + Redis para background jobs
- node-cron para schedulers
- Jose/JWT para autenticação
- Pino para logging

### Estrutura de Pastas Necessária:
```
powersol-backend/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── supabase.ts
│   │   ├── solana.ts
│   │   └── redis.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── lottery.routes.ts
│   │   ├── ticket.routes.ts
│   │   ├── claim.routes.ts
│   │   ├── mission.routes.ts
│   │   ├── affiliate.routes.ts
│   │   ├── transparency.routes.ts
│   │   └── webhook.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── lottery.controller.ts
│   │   ├── ticket.controller.ts
│   │   ├── claim.controller.ts
│   │   ├── mission.controller.ts
│   │   ├── affiliate.controller.ts
│   │   └── transparency.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── lottery.service.ts
│   │   ├── ticket.service.ts
│   │   ├── claim.service.ts
│   │   ├── mission.service.ts
│   │   ├── affiliate.service.ts
│   │   ├── solana.service.ts
│   │   ├── vrf.service.ts
│   │   └── sync.service.ts
│   ├── lib/
│   │   ├── anchor/
│   │   │   ├── programs.ts
│   │   │   ├── pdas.ts
│   │   │   └── instructions.ts
│   │   ├── wallet.ts
│   │   ├── transaction.ts
│   │   └── crypto.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts
│   ├── jobs/
│   │   ├── drawScheduler.job.ts
│   │   ├── syncBlockchain.job.ts
│   │   └── cleanupExpired.job.ts
│   ├── queues/
│   │   ├── worker.ts
│   │   └── processors/
│   │       ├── ticketPurchase.processor.ts
│   │       ├── drawLottery.processor.ts
│   │       ├── claimPrize.processor.ts
│   │       └── affiliateReward.processor.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── lottery.types.ts
│   │   └── solana.types.ts
│   └── utils/
│       ├── logger.ts
│       ├── errors.ts
│       └── validators.ts
├── programs/
│   ├── powersol-core/
│   │   └── src/lib.rs
│   └── powersol-claim/
│       └── src/lib.rs
├── scripts/
│   ├── generate-keypair.ts
│   ├── test-connection.ts
│   └── seed-lotteries.ts
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_functions.sql
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🗄️ SCHEMA SUPABASE

Preciso destas 11 tabelas:

### 1. users
- id (uuid, primary key)
- wallet_address (text, unique, não nulo)
- nonce (text, não nulo) - para auth
- created_at (timestamptz)
- last_login (timestamptz)

### 2. lotteries
- id (uuid, primary key)
- lottery_id (integer, unique) - ID on-chain
- type (text) - TRI_DAILY, JACKPOT, GRAND_PRIZE
- ticket_price (bigint)
- max_tickets (integer)
- current_tickets (integer, default 0)
- draw_timestamp (timestamptz)
- is_drawn (boolean, default false)
- winning_ticket (integer, nullable)
- prize_pool (bigint, default 0)
- vrf_request_id (text, nullable)
- tx_signature (text, nullable)
- on_chain_address (text, nullable)
- created_at (timestamptz)
- drawn_at (timestamptz, nullable)

### 3. tickets
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- lottery_id (uuid, foreign key → lotteries)
- ticket_number (integer)
- quantity (integer, default 1)
- purchase_price (bigint)
- is_winner (boolean, default false)
- tx_signature (text, não nulo)
- on_chain_address (text, nullable)
- created_at (timestamptz)
- UNIQUE(lottery_id, ticket_number)

### 4. draws
- id (uuid, primary key)
- lottery_id (uuid, foreign key → lotteries)
- winning_ticket (integer)
- vrf_proof (jsonb)
- randomness (text)
- tx_signature (text)
- drawn_at (timestamptz)

### 5. claims
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- ticket_id (uuid, unique, foreign key → tickets)
- amount (bigint)
- claim_type (text) - PRIZE, AFFILIATE, MISSION
- is_claimed (boolean, default false)
- tx_signature (text, nullable)
- claimed_at (timestamptz, nullable)
- created_at (timestamptz)

### 6. missions
- id (uuid, primary key)
- title (text)
- description (text)
- type (text) - SOCIAL, ON_CHAIN, DAILY
- requirement (jsonb)
- reward_type (text) - TICKETS, SOL, POINTS
- reward_amount (integer)
- is_active (boolean, default true)
- created_at (timestamptz)

### 7. user_missions
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- mission_id (uuid, foreign key → missions)
- progress (integer, default 0)
- is_completed (boolean, default false)
- completed_at (timestamptz, nullable)
- created_at (timestamptz)
- UNIQUE(user_id, mission_id)

### 8. affiliates
- id (uuid, primary key)
- user_id (uuid, unique, foreign key → users)
- referral_code (text, unique)
- tier (integer, default 1)
- total_earned (bigint, default 0)
- pending_earnings (bigint, default 0)
- referred_by (uuid, nullable, foreign key → affiliates)
- created_at (timestamptz)

### 9. referrals
- id (uuid, primary key)
- affiliate_id (uuid, foreign key → affiliates)
- referred_user_id (uuid, foreign key → users)
- tickets_bought (integer, default 0)
- commission_earned (bigint, default 0)
- created_at (timestamptz)
- UNIQUE(affiliate_id, referred_user_id)

### 10. affiliate_withdrawals
- id (uuid, primary key)
- affiliate_id (uuid, foreign key → affiliates)
- amount (bigint)
- status (text, default 'PENDING') - PENDING, PROCESSING, COMPLETED, FAILED
- tx_signature (text, nullable)
- requested_at (timestamptz)
- processed_at (timestamptz, nullable)

### 11. transaction_logs
- id (uuid, primary key)
- user_id (uuid, nullable, foreign key → users)
- type (text) - PURCHASE, CLAIM, WITHDRAW, DRAW
- tx_signature (text, unique)
- amount (bigint, nullable)
- status (text) - PENDING, SUCCESS, FAILED
- error (text, nullable)
- metadata (jsonb, nullable)
- created_at (timestamptz)

**IMPORTANTE:**
- Todas tabelas precisam de RLS (Row Level Security) habilitado
- Criar policies RESTRITIVAS (usuários só veem seus próprios dados)
- Criar indexes para queries frequentes
- Criar triggers para atualizar current_tickets e prize_pool automaticamente

## 🛣️ ENDPOINTS DA API

### AUTH (3 endpoints)
```
GET  /api/auth/nonce?wallet=<address>
     Response: { nonce: string }

POST /api/auth/wallet
     Body: { walletAddress: string, signature: string }
     Response: { success: true, data: { token: string, user: object } }

GET  /api/auth/me (protected)
     Headers: Authorization: Bearer <token>
     Response: { success: true, data: { user: object } }
```

### LOTTERIES (6 endpoints)
```
GET  /api/lotteries
     Response: { success: true, data: Lottery[] }

GET  /api/lotteries/active
     Response: { success: true, data: Lottery[] }

GET  /api/lotteries/:id
     Response: { success: true, data: Lottery }

GET  /api/lotteries/:id/stats
     Response: { success: true, data: { totalTickets, uniquePlayers, prizePool, timeUntilDraw } }

GET  /api/lotteries/:id/winners
     Response: { success: true, data: Winner[] }

POST /api/lotteries/:id/draw (admin/cron only)
     Response: { success: true, data: { winningTicket, txSignature } }
```

### TICKETS (4 endpoints)
```
POST /api/tickets/purchase (protected)
     Body: { lotteryId: string, quantity: number }
     Response: { success: true, data: { transaction: string, ticketNumber: number } }

GET  /api/tickets/my-tickets (protected)
     Response: { success: true, data: Ticket[] }

GET  /api/tickets/:id
     Response: { success: true, data: Ticket }

POST /api/tickets/:id/verify
     Response: { success: true, data: { isValid: boolean, onChainData: object } }
```

### CLAIMS (3 endpoints)
```
POST /api/claims/prize (protected)
     Body: { ticketId: string }
     Response: { success: true, data: { txSignature: string } }

GET  /api/claims/my-claims (protected)
     Response: { success: true, data: Claim[] }

GET  /api/claims/:id/status
     Response: { success: true, data: { status: string, txSignature?: string } }
```

### MISSIONS (4 endpoints)
```
GET  /api/missions
     Response: { success: true, data: Mission[] }

GET  /api/missions/daily
     Response: { success: true, data: Mission[] }

GET  /api/missions/my-progress (protected)
     Response: { success: true, data: UserMission[] }

POST /api/missions/:id/complete (protected)
     Response: { success: true, data: { reward: object } }
```

### AFFILIATES (5 endpoints)
```
GET  /api/affiliates/dashboard (protected)
     Response: { success: true, data: { stats, referralCode, tier, earnings } }

GET  /api/affiliates/referrals (protected)
     Response: { success: true, data: Referral[] }

GET  /api/affiliates/earnings (protected)
     Response: { success: true, data: { totalEarned, pendingEarnings } }

POST /api/affiliates/withdraw (protected)
     Body: { amount: number }
     Response: { success: true, data: { txSignature: string } }

GET  /api/affiliates/stats (protected)
     Response: { success: true, data: Stats }
```

### TRANSPARENCY (5 endpoints)
```
GET  /api/transparency/draws
     Response: { success: true, data: Draw[] }

GET  /api/transparency/draws/:id
     Response: { success: true, data: Draw }

GET  /api/transparency/vrf
     Response: { success: true, data: { queuePubkey, oraclePubkey } }

GET  /api/transparency/stats
     Response: { success: true, data: { totalLotteries, totalTickets, totalPrizePool, totalWinners } }

GET  /api/transparency/on-chain/:address
     Response: { success: true, data: { onChainData } }
```

### WEBHOOKS (2 endpoints)
```
POST /api/webhooks/switchboard
     Body: VRF callback data
     Response: { success: true }

POST /api/webhooks/helius (optional)
     Body: Blockchain event
     Response: { success: true }
```

## 🔐 AUTENTICAÇÃO WALLET-BASED

### Flow:
1. Frontend pede nonce: `GET /api/auth/nonce?wallet=ABC123`
2. Backend gera nonce aleatório, salva no DB, retorna
3. Frontend assina mensagem: `"Sign this message to authenticate: {nonce}"`
4. Frontend envia assinatura: `POST /api/auth/wallet`
5. Backend verifica assinatura usando `tweetnacl`:
   - Decodifica signature (bs58)
   - Verifica com publicKey da wallet
   - Se válido, gera JWT token
6. Frontend usa token em requests: `Authorization: Bearer <token>`

### Implementação:
- Usar biblioteca `jose` para JWT
- Usar `tweetnacl` para verificar assinatura
- Usar `bs58` para encoding/decoding
- JWT deve conter: `{ userId, wallet, iat, exp }`
- Expiração: 7 dias

## ⛓️ INTEGRAÇÃO SOLANA + ANCHOR

### Anchor Programs:

**powersol-core** (Loteria principal):
```rust
pub struct Lottery {
    pub authority: Pubkey,
    pub lottery_id: u32,
    pub ticket_price: u64,
    pub max_tickets: u32,
    pub current_tickets: u32,
    pub draw_timestamp: i64,
    pub is_drawn: bool,
    pub winning_ticket: Option<u32>,
    pub treasury: Pubkey,
    pub prize_pool: u64,
}

pub struct Ticket {
    pub owner: Pubkey,
    pub lottery: Pubkey,
    pub ticket_number: u32,
    pub purchased_at: i64,
}

Instructions:
- initialize_lottery
- purchase_ticket
- draw_lottery
```

**powersol-claim** (Sistema de claims):
```rust
pub struct ClaimPool {
    pub authority: Pubkey,
    pub pool_id: u32,
    pub total_claims: u64,
}

pub struct Claim {
    pub claimer: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub is_claimed: bool,
    pub claimed_at: Option<i64>,
}

Instructions:
- initialize_pool
- create_claim
- process_claim
```

### PDAs (Program Derived Addresses):
```typescript
// Lottery PDA
const [lotteryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("lottery"), Buffer.from([lotteryId])],
  programId
);

// Ticket PDA
const [ticketPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("ticket"),
    Buffer.from([lotteryId]),
    Buffer.from([ticketNumber])
  ],
  programId
);

// Claim PDA
const [claimPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("claim"),
    Buffer.from([poolId]),
    Buffer.from([claimNumber])
  ],
  claimProgramId
);
```

### Solana Service:
Preciso de:
- `initializeProgram(idl, programId)` - Inicializar Anchor program
- `buildPurchaseTransaction(wallet, lotteryId, quantity)` - Criar tx de compra
- `executeDraw(lotteryId, winningTicket)` - Executar sorteio
- `buildClaimTransaction(wallet, ticketId)` - Criar tx de claim
- `getLotteryData(lotteryId)` - Buscar dados on-chain
- `getTicketData(lotteryId, ticketNumber)` - Buscar ticket on-chain
- `verifyTransaction(signature)` - Verificar tx confirmada

## 🎲 VRF (SWITCHBOARD)

### Implementação:
1. Quando é hora de sortear:
   - Cron job detecta lottery com `draw_timestamp <= now()`
   - Chama `VRFService.requestRandomness(lotteryId)`

2. Request VRF:
   - Cria request no Switchboard Oracle
   - Salva `vrf_request_id` na lottery
   - Aguarda callback

3. Callback VRF:
   - Webhook `POST /api/webhooks/switchboard`
   - Recebe `{ requestId, randomness }`
   - Calcula winning ticket: `randomness % current_tickets + 1`
   - Executa draw on-chain
   - Atualiza database

### VRF Service:
```typescript
class VRFService {
  async requestRandomness(lotteryId: string): Promise<string>
  async processVRFCallback(requestId: string, randomness: Buffer): Promise<void>
  async selectWinningTicket(lotteryId: string, randomness: Buffer): Promise<number>
}
```

## ⏰ BACKGROUND JOBS

### Cron Jobs (node-cron):

**drawScheduler.job.ts** (a cada 5 minutos):
```typescript
cron.schedule('*/5 * * * *', async () => {
  // Buscar loterias que precisam sortear
  const lotteries = await supabase
    .from('lotteries')
    .select('*')
    .eq('is_drawn', false)
    .lte('draw_timestamp', new Date());

  // Solicitar VRF para cada uma
  for (const lottery of lotteries) {
    await vrfService.requestRandomness(lottery.id);
  }
});
```

**syncBlockchain.job.ts** (a cada 1 minuto):
```typescript
cron.schedule('* * * * *', async () => {
  // Sincronizar dados on-chain com database
  const lotteries = await supabase
    .from('lotteries')
    .select('*')
    .eq('is_drawn', false);

  for (const lottery of lotteries) {
    const onChainData = await solana.getLotteryData(lottery.lottery_id);

    // Atualizar se houver diferenças
    await supabase
      .from('lotteries')
      .update({
        current_tickets: onChainData.ticketCount,
        prize_pool: onChainData.prizePool,
      })
      .eq('id', lottery.id);
  }
});
```

### BullMQ Queues:

**ticketPurchase.processor.ts**:
```typescript
{
  name: 'ticket:purchase',
  handler: async (job) => {
    const { userId, lotteryId, quantity, txSignature } = job.data;

    // 1. Verificar tx on-chain
    await solana.verifyTransaction(txSignature);

    // 2. Atualizar ticket no DB
    await supabase
      .from('tickets')
      .update({ tx_signature: txSignature })
      .eq('id', job.data.ticketId);

    // 3. Atualizar prize pool
    await lottery.updatePrizePool(lotteryId);
  }
}
```

**drawLottery.processor.ts**:
```typescript
{
  name: 'lottery:draw',
  handler: async (job) => {
    const { lotteryId, winningTicket } = job.data;

    // 1. Executar draw on-chain
    const txSignature = await solana.executeDraw(lotteryId, winningTicket);

    // 2. Atualizar lottery
    await supabase
      .from('lotteries')
      .update({
        is_drawn: true,
        winning_ticket: winningTicket,
        tx_signature: txSignature,
        drawn_at: new Date(),
      })
      .eq('id', lotteryId);

    // 3. Marcar ticket vencedor
    await supabase
      .from('tickets')
      .update({ is_winner: true })
      .eq('lottery_id', lotteryId)
      .eq('ticket_number', winningTicket);
  }
}
```

## 📦 package.json

Preciso deste package.json EXATO:

```json
{
  "name": "powersol-backend",
  "version": "1.0.0",
  "description": "PowerSOL Backend API - Solana Lottery Platform",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "worker": "tsx src/queues/worker.ts",
    "jobs": "tsx src/jobs/index.ts",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.29.0",
    "@supabase/supabase-js": "^2.39.0",
    "@solana/web3.js": "^1.95.4",
    "@solana/spl-token": "^0.3.11",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "bullmq": "^5.1.0",
    "ioredis": "^5.3.2",
    "node-cron": "^3.0.3",
    "jose": "^5.2.0",
    "tweetnacl": "^1.0.3",
    "bs58": "^5.0.0",
    "zod": "^3.22.4",
    "pino": "^8.17.2",
    "pino-pretty": "^10.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/cors": "^2.8.17",
    "@types/node-cron": "^3.0.11",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "tsc-alias": "^1.8.8",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 🔧 VARIÁVEIS DE AMBIENTE

Arquivo `.env.example`:

```env
# API
NODE_ENV=development
PORT=4000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Solana
RPC_URL=https://api.devnet.solana.com
RPC_COMMITMENT=confirmed
CLUSTER=devnet

# Wallets (GERAR NOVAS KEYS!)
AUTHORITY_WALLET_SECRET=base58_secret_key
TREASURY_WALLET=public_key

# Program IDs (após deploy)
POWERSOL_CORE_PROGRAM_ID=xxx
POWERSOL_CLAIM_PROGRAM_ID=xxx

# VRF
VRF_QUEUE_PUBKEY=xxx

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_32_chars_min
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=*
```

## 🎯 O QUE PRECISO QUE VOCÊ FAÇA

Por favor, me ajude a criar este backend COMPLETO seguindo EXATAMENTE esta estrutura.

Quero que você:

1. **Crie o código completo** de TODOS os arquivos mencionados
2. **Implemente TODOS os endpoints** da API
3. **Crie as migrations SQL** para Supabase (schema + RLS + functions)
4. **Implemente a autenticação** wallet-based completa
5. **Integre com Solana** (Anchor programs, PDAs, transactions)
6. **Implemente VRF** (Switchboard)
7. **Configure background jobs** (BullMQ + Cron)
8. **Adicione error handling** robusto em tudo
9. **Implemente logging** com Pino
10. **Crie scripts úteis** (generate-keypair, seed, test)

## 📝 FORMATO DE RESPOSTA

Por favor, organize sua resposta assim:

**Parte 1: Setup e Configuração**
- package.json
- tsconfig.json
- .env.example
- src/config/* (todos os arquivos)

**Parte 2: Database (Supabase)**
- 001_initial_schema.sql (completo)
- 002_rls_policies.sql (completo)
- 003_functions.sql (completo)

**Parte 3: Core (Routes + Controllers)**
- src/routes/index.ts
- src/routes/*.routes.ts (todos)
- src/controllers/*.controller.ts (todos)

**Parte 4: Services (Lógica de Negócio)**
- src/services/*.service.ts (todos)
- ESPECIALMENTE: solana.service.ts e vrf.service.ts

**Parte 5: Middleware e Utils**
- src/middleware/*.middleware.ts (todos)
- src/utils/*.ts (todos)

**Parte 6: Background Jobs**
- src/jobs/*.job.ts (todos)
- src/queues/worker.ts
- src/queues/processors/*.processor.ts (todos)

**Parte 7: Scripts**
- scripts/*.ts (todos)

**Parte 8: Entry Points**
- src/index.ts (completo)
- src/app.ts (completo)

## ⚠️ IMPORTANTES

- Use TypeScript STRICT mode
- Todos os endpoints devem retornar `{ success: boolean, data?: any, error?: string }`
- RLS deve ser RESTRITIVO (users só veem próprios dados)
- NUNCA expor service key do Supabase no frontend
- Validar TODOS os inputs com Zod
- Rate limiting em todas rotas
- Logging de TODAS operações importantes
- Error handling em TODOS try/catch
- Comentários explicativos no código
- Código limpo e organizado

## 🚀 PRIORIDADE

Se não conseguir fazer tudo de uma vez, comece nesta ordem:

**MVP (Essencial):**
1. Setup + Config + Database schema
2. Auth (wallet login)
3. Lotteries (listar, stats)
4. Tickets (comprar)
5. Claims (reivindicar)

**Importante:**
6. VRF (sorteios justos)
7. Cron jobs (automação)
8. Sync blockchain

**Extra:**
9. Missões
10. Afiliados
11. Background queues

---

Por favor, comece pela Parte 1 e vá avançando. Me avise quando completar cada parte para eu revisar antes de prosseguir.

Está claro tudo que preciso? Pode começar! 🚀
```

---

# COMO USAR ESTE PROMPT

1. **Copie** todo o texto entre as ``` acima
2. **Cole** no ChatGPT (de preferência GPT-4)
3. **Aguarde** ele criar a primeira parte
4. **Revise** cada parte antes de pedir a próxima
5. **Salve** todos os arquivos que ele criar

## 💡 DICAS

- Use o GPT-4 (melhor para código complexo)
- Peça uma parte por vez para revisar
- Se algum código não funcionar, peça correção
- Salve tudo em arquivos locais conforme ele for gerando
- Teste cada parte antes de prosseguir

## 🎯 RESULTADO ESPERADO

Ao final você terá:
- ✅ 40+ arquivos de código TypeScript
- ✅ 30+ endpoints funcionando
- ✅ Database completo (11 tabelas)
- ✅ Integração blockchain
- ✅ VRF para sorteios
- ✅ Background jobs
- ✅ Auth wallet-based
- ✅ Tudo pronto para rodar!

**Boa sorte! 🚀**
