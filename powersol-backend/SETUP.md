# 🚀 PowerSOL Backend - Setup Completo

Backend COMPLETO para a plataforma PowerSOL! Todos os arquivos foram criados.

## ✅ O QUE FOI CRIADO

### 📁 Estrutura Completa

```
powersol-backend/
├── src/
│   ├── config/           ✅ Configurações (Supabase, Solana, Redis)
│   ├── types/            ✅ TypeScript types completos
│   ├── utils/            ✅ Utilities (logger, errors, validators, crypto)
│   ├── lib/anchor/       ✅ Anchor helpers (PDAs, programs)
│   ├── middleware/       ✅ Auth, validation, rate limit, error handling
│   ├── services/         ✅ Toda lógica de negócio
│   ├── controllers/      ✅ Todos os endpoint handlers
│   ├── routes/           ✅ Todas as rotas da API
│   ├── app.ts            ✅ Express app
│   └── index.ts          ✅ Server bootstrap
├── supabase/
│   └── migrations/       ✅ 3 migrations SQL prontas
├── scripts/              ✅ Scripts úteis
├── package.json          ✅
├── tsconfig.json         ✅
└── .env.example          ✅
```

### 🗄️ Database (Supabase)

**3 Migrations SQL Criadas:**

1. **001_initial_schema.sql** - 11 tabelas completas
   - users, lotteries, tickets, draws, claims
   - missions, user_missions, affiliates, referrals
   - affiliate_withdrawals, transaction_logs

2. **002_rls_policies.sql** - Security
   - RLS habilitado em TODAS as tabelas
   - Policies restritivas (users só veem próprios dados)
   - Service role com permissões admin

3. **003_functions.sql** - Functions & Triggers
   - update_updated_at_column()
   - generate_referral_code()
   - calculate_affiliate_commission()
   - get_lottery_stats()
   - get_user_tickets_count()
   - get_active_lotteries()
   - process_affiliate_commission()
   - get_transparency_stats()

### 🛣️ API Endpoints (TODOS implementados!)

#### **Auth** (3 endpoints)
- `GET  /api/auth/nonce?wallet=<address>`
- `POST /api/auth/wallet`
- `GET  /api/auth/me` (protected)

#### **Lotteries** (6 endpoints)
- `GET  /api/lotteries`
- `GET  /api/lotteries/active`
- `GET  /api/lotteries/:id`
- `GET  /api/lotteries/:id/stats`
- `GET  /api/lotteries/:id/winners`
- `POST /api/lotteries/:id/draw`

#### **Tickets** (4 endpoints)
- `POST /api/tickets/purchase` (protected)
- `GET  /api/tickets/my-tickets` (protected)
- `GET  /api/tickets/:id`
- `POST /api/tickets/:id/verify`

#### **Claims** (3 endpoints)
- `POST /api/claims/prize` (protected)
- `GET  /api/claims/my-claims` (protected)
- `GET  /api/claims/:id/status`

#### **Missions** (4 endpoints)
- `GET  /api/missions`
- `GET  /api/missions/daily`
- `GET  /api/missions/my-progress` (protected)
- `POST /api/missions/:id/complete` (protected)

#### **Affiliates** (5 endpoints)
- `GET  /api/affiliates/dashboard` (protected)
- `GET  /api/affiliates/referrals` (protected)
- `GET  /api/affiliates/earnings` (protected)
- `POST /api/affiliates/withdraw` (protected)
- `GET  /api/affiliates/stats` (protected)

#### **Transparency** (5 endpoints)
- `GET  /api/transparency/draws`
- `GET  /api/transparency/draws/:id`
- `GET  /api/transparency/vrf`
- `GET  /api/transparency/stats`
- `GET  /api/transparency/on-chain/:address`

#### **Webhooks** (2 endpoints)
- `POST /api/webhooks/switchboard`
- `POST /api/webhooks/helius`

**Total: 35 endpoints** 🎯

### 🔧 Services Implementados

- ✅ **AuthService** - Wallet-based authentication
- ✅ **LotteryService** - Loterias e stats
- ✅ **TicketService** - Compra e gestão de tickets
- ✅ **ClaimService** - Reivindicação de prêmios
- ✅ **MissionService** - Sistema de missões
- ✅ **AffiliateService** - Programa de afiliados multi-level
- ✅ **SolanaService** - Integração blockchain completa
- ✅ **VRFService** - Switchboard VRF para sorteios justos
- ✅ **SyncService** - Sincronização on-chain

### 🛡️ Security & Middleware

- ✅ **Authentication** - JWT tokens + wallet signatures
- ✅ **Validation** - Zod schemas em todos inputs
- ✅ **Rate Limiting** - Proteção contra abuse
- ✅ **Error Handling** - Global error handler
- ✅ **CORS** - Configurado corretamente
- ✅ **Helmet** - Security headers

### 📜 Scripts Disponíveis

```bash
npm run dev              # Desenvolvimento
npm run build            # Build production
npm start                # Start production server
npm run generate-keypair # Gerar novo keypair Solana
npm run test-connection  # Testar conexões
npm run seed             # Seed loterias
```

## 🚀 COMO USAR

### 1. Instalar Dependências

```bash
cd powersol-backend
npm install
```

### 2. Configurar .env

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

**IMPORTANTE:** Gere um novo keypair:
```bash
npm run generate-keypair
```

### 3. Setup Supabase

Acesse seu projeto Supabase e execute as migrations em ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_functions.sql`

### 4. Testar Conexões

```bash
npm run test-connection
```

Deve mostrar:
```
✅ Supabase: Connected
✅ Solana: Connected
✅ Redis: Connected
```

### 5. Seed Database (Opcional)

```bash
npm run seed
```

Cria 3 loterias de teste (TRI_DAILY, JACKPOT, GRAND_PRIZE).

### 6. Iniciar Backend

**Desenvolvimento:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## 📡 Endpoints Disponíveis

Backend roda em: `http://localhost:4000`

### Health Check
```bash
curl http://localhost:4000/health
```

### Get Nonce (Auth Step 1)
```bash
curl "http://localhost:4000/api/auth/nonce?wallet=YOUR_WALLET_ADDRESS"
```

### Authenticate (Auth Step 2)
```bash
curl -X POST http://localhost:4000/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET",
    "signature": "SIGNATURE_FROM_WALLET"
  }'
```

### Get Active Lotteries
```bash
curl http://localhost:4000/api/lotteries/active
```

### Purchase Ticket (Protected)
```bash
curl -X POST http://localhost:4000/api/tickets/purchase \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lotteryId": "uuid",
    "quantity": 1
  }'
```

## 🔐 Autenticação

O backend usa **wallet-based authentication**:

1. Frontend pede nonce: `GET /api/auth/nonce?wallet=ABC`
2. Backend retorna nonce
3. Frontend assina mensagem com wallet
4. Frontend envia: `POST /api/auth/wallet` com signature
5. Backend verifica e retorna JWT token
6. Frontend usa token: `Authorization: Bearer <token>`

## 🎲 VRF (Sorteios Justos)

Integração com Switchboard VRF:

1. Cron job detecta loteria pronta para sortear
2. Backend solicita randomness do Switchboard
3. VRF Oracle retorna número aleatório verificável
4. Backend calcula ticket vencedor
5. Executa transação on-chain
6. Atualiza database

## 📊 Monitoramento

Logs com Pino:
- Todas operações importantes são logadas
- Contextos separados (auth, lottery, solana, vrf, etc)
- Development mode: pretty print
- Production mode: JSON format

## 🐛 Troubleshooting

### "Cannot find module @config/..."

Verifique se os path aliases estão configurados no tsconfig.json.

### "Supabase connection failed"

Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.

### "Solana connection failed"

Verifique RPC_URL. Para devnet:
```
RPC_URL=https://api.devnet.solana.com
```

### "Redis connection failed"

Instale Redis localmente ou use Redis Cloud:
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

## 📝 Variáveis de Ambiente Necessárias

```env
# API
PORT=4000
NODE_ENV=development

# Supabase (OBRIGATÓRIO)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_key

# Solana (OBRIGATÓRIO)
RPC_URL=https://api.devnet.solana.com
AUTHORITY_WALLET_SECRET=base58_secret
TREASURY_WALLET=public_key
POWERSOL_CORE_PROGRAM_ID=program_id
POWERSOL_CLAIM_PROGRAM_ID=program_id
VRF_QUEUE_PUBKEY=vrf_queue

# Redis (OBRIGATÓRIO)
REDIS_URL=redis://localhost:6379

# JWT (OBRIGATÓRIO)
JWT_SECRET=min_32_chars_secret
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=*
```

## 🎉 TUDO PRONTO!

O backend PowerSOL está 100% completo e pronto para integrar com seu frontend React!

**Próximos passos:**
1. Configure as variáveis de ambiente
2. Execute as migrations no Supabase
3. Inicie o backend
4. Conecte seu frontend aos endpoints
5. Deploy dos smart contracts Anchor
6. Configure Switchboard VRF
7. Deploy em produção!

---

**Criado com ❤️  para PowerSOL**
