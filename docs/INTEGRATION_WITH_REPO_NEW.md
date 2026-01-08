# 🔗 Como Integrar com Seu Repositório GitHub

Este guia mostra como integrar os programas Anchor e backend com seu repositório existente em:
`https://github.com/gabrielnasser01/powersol.git`

---

## 📦 Estrutura do Seu Repositório

Baseado no `Anchor.toml` que você tem, seu repo provavelmente tem esta estrutura:

```
powersol/
├── programs/
│   ├── powersol_core/
│   └── powersol_claim/
├── tests/
├── migrations/
├── app/
├── Anchor.toml
├── Cargo.toml
└── package.json
```

---

## 🎯 O Que Você Tem Agora

### Program IDs (do seu Anchor.toml)

**Localnet:**
- Core: `9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7`
- Claim: `6P6jVWeNseyX2VVaodui6Tn6Pvx93w9u5GAbQHVq2PAS`

**Devnet:**
- Core: `2hGiqYuw2sxu7P5AnbcW2CYwiVdcgGqzGwdrDam6DCrZ`
- Claim: `4Qa4fA1NVuMcZV8K4D4x3Efr2E1V9AqMfCVxYvByBPjE`

---

## 🚀 Passo a Passo de Integração

### 1. Clone Seu Repositório

```bash
# Se ainda não clonou
git clone https://github.com/gabrielnasser01/powersol.git
cd powersol
```

### 2. Adicionar Programas Anchor (se não existirem)

Se seu repo não tem os programas Rust ainda:

```bash
# Copiar programas deste projeto
cp -r /path/to/este/projeto/programs/powersol_core ./programs/
cp -r /path/to/este/projeto/programs/powersol_claim ./programs/
```

### 3. Atualizar Anchor.toml

Seu `Anchor.toml` já deve estar assim (mantenha como está):

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
powersol_core = "9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7"
powersol_claim = "6P6jVWeNseyX2VVaodui6Tn6Pvx93w9u5GAbQHVq2PAS"

[programs.devnet]
powersol_core = "2hGiqYuw2sxu7P5AnbcW2CYwiVdcgGqzGwdrDam6DCrZ"
powersol_claim = "4Qa4fA1NVuMcZV8K4D4x3Efr2E1V9AqMfCVxYvByBPjE"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 4. Build e Deploy Programs

```bash
# Build
anchor build

# Deploy para devnet
anchor deploy --provider.cluster devnet

# Ou deploy para localnet (precisa ter validador local rodando)
solana-test-validator  # Em outro terminal
anchor deploy --provider.cluster localnet
```

### 5. Criar Estrutura Backend

No seu repo, adicione a pasta `backend/`:

```bash
mkdir -p backend/src/{config,routes,controllers,services,middleware,jobs,queues,lib,utils,types}
cd backend
```

### 6. Inicializar Backend

```bash
# Dentro de backend/
npm init -y

# Instalar dependências (copiar do CHATGPT_PROMPT.md)
npm install express @supabase/supabase-js @solana/web3.js @coral-xyz/anchor
npm install bullmq ioredis node-cron jose tweetnacl bs58 zod pino cors helmet dotenv
npm install -D typescript tsx @types/node @types/express @types/cors
```

### 7. Copiar Código do ChatGPT

Depois que o ChatGPT gerar todo o código:

```bash
# Estrutura backend/
backend/
├── src/
│   ├── index.ts                    # Entry point
│   ├── app.ts                      # Express app
│   ├── config/
│   │   ├── env.ts
│   │   ├── supabase.ts
│   │   ├── solana.ts
│   │   └── redis.ts
│   ├── routes/                     # Todas as rotas
│   ├── controllers/                # Todos controllers
│   ├── services/                   # Todos services
│   ├── middleware/                 # Middlewares
│   ├── jobs/                       # Cron jobs
│   └── queues/                     # BullMQ
├── package.json
├── tsconfig.json
└── .env
```

### 8. Configurar .env

```bash
# backend/.env
cp .env.example .env
nano .env
```

Adicione suas credenciais:

```env
# API
PORT=4000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_KEY=sua-service-key

# Solana (use devnet)
RPC_URL=https://api.devnet.solana.com
CLUSTER=devnet

# Program IDs (do seu Anchor.toml)
POWERSOL_CORE_PROGRAM_ID=2hGiqYuw2sxu7P5AnbcW2CYwiVdcgGqzGwdrDam6DCrZ
POWERSOL_CLAIM_PROGRAM_ID=4Qa4fA1NVuMcZV8K4D4x3Efr2E1V9AqMfCVxYvByBPjE

# Authority Wallet (gerar novo)
AUTHORITY_WALLET_SECRET=sua-secret-key-base58
TREASURY_WALLET=sua-public-key

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=gerar-secret-aleatorio-32-chars
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=*
```

### 9. Setup Supabase

```bash
# Ir para https://supabase.com
# Criar projeto
# Copiar URL e Keys

# No SQL Editor do Supabase, executar:
# 1. 001_initial_schema.sql
# 2. 002_rls_policies.sql
# 3. 003_functions.sql
```

(SQL está no CHATGPT_PROMPT.md)

### 10. Testar Backend

```bash
# Dentro de backend/
npm run dev

# Em outro terminal, testar:
curl http://localhost:4000/api/health
# Deve retornar: {"status":"ok","timestamp":"..."}
```

### 11. Integrar com Frontend

No frontend (este projeto React):

```bash
# Atualizar .env
echo "VITE_API_URL=http://localhost:4000" >> .env

# Criar src/lib/api-client.ts
# (código está em FRONTEND_BACKEND_INTEGRATION.md)
```

---

## 📁 Estrutura Final do Repositório

```
powersol/  (seu repo GitHub)
├── programs/                        # Anchor programs (Rust)
│   ├── powersol_core/
│   │   ├── src/
│   │   │   └── lib.rs
│   │   └── Cargo.toml
│   └── powersol_claim/
│       ├── src/
│       │   └── lib.rs
│       └── Cargo.toml
│
├── backend/                         # Backend API (Node.js)
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── jobs/
│   │   ├── queues/
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── app/                             # Frontend (React)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
│
├── tests/                           # Testes Anchor
├── migrations/                      # Migrações (se usar)
├── target/                          # Build artifacts
│   ├── deploy/
│   └── idl/
│       ├── powersol_core.json
│       └── powersol_claim.json
│
├── Anchor.toml
├── Cargo.toml
└── README.md
```

---

## 🔧 Scripts Úteis

Adicione ao `package.json` raiz:

```json
{
  "name": "powersol",
  "scripts": {
    "anchor:build": "anchor build",
    "anchor:deploy": "anchor deploy",
    "anchor:deploy:devnet": "anchor deploy --provider.cluster devnet",
    "anchor:test": "anchor test",

    "backend:dev": "cd backend && npm run dev",
    "backend:build": "cd backend && npm run build",
    "backend:start": "cd backend && npm start",

    "frontend:dev": "cd app && npm run dev",
    "frontend:build": "cd app && npm run build",

    "dev": "concurrently \"npm run backend:dev\" \"npm run frontend:dev\"",

    "test": "anchor test"
  }
}
```

---

## 🎯 Ordem de Execução

### Desenvolvimento Local

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd app
npm run dev
```

**Terminal 3 - Redis (se necessário):**
```bash
redis-server
```

**Terminal 4 - Solana Validator (se usar localnet):**
```bash
solana-test-validator
```

### Build de Produção

```bash
# 1. Build programs
anchor build
anchor deploy --provider.cluster devnet

# 2. Build backend
cd backend
npm run build

# 3. Build frontend
cd ../app
npm run build
```

---

## 🔑 Gerar Keypairs

Para gerar authority wallet:

```bash
# Criar keypair
solana-keygen new -o authority.json

# Ver public key
solana-keygen pubkey authority.json

# Converter secret para base58 (para .env)
node -e "
const fs = require('fs');
const bs58 = require('bs58');
const keypair = JSON.parse(fs.readFileSync('authority.json'));
console.log('Secret (base58):', bs58.encode(Buffer.from(keypair)));
"
```

Adicione ao `.env`:
```env
AUTHORITY_WALLET_SECRET=base58_secret_aqui
TREASURY_WALLET=public_key_aqui
```

---

## 🌐 Deploy Produção

### Backend (Railway/Render/Fly.io)

1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Build command: `cd backend && npm run build`
4. Start command: `cd backend && npm start`
5. Adicionar Redis como add-on

### Frontend (Vercel/Netlify)

1. Conectar repositório GitHub
2. Build command: `cd app && npm run build`
3. Output directory: `app/dist`
4. Configurar env vars (`VITE_API_URL`, etc)

### Programs (Mainnet)

```bash
# Switch para mainnet
solana config set --url mainnet-beta

# Verificar saldo
solana balance

# Deploy (custa ~2-3 SOL por programa)
anchor deploy --provider.cluster mainnet-beta
```

---

## 🐛 Troubleshooting

### Erro: Program ID mismatch

Se após deploy os IDs mudarem:

1. Atualizar `Anchor.toml` com novos IDs
2. Atualizar `.env` do backend
3. Atualizar `.env` do frontend
4. Rebuild tudo: `anchor build`

### Erro: Insufficient funds

```bash
# Devnet
solana airdrop 5

# Mainnet
# Comprar SOL em exchange
```

### Erro: Can't connect to Supabase

1. Verificar URL e keys no `.env`
2. Testar: `curl https://seu-projeto.supabase.co/rest/v1/`
3. Verificar se IP está na allowlist (se tiver)

### Erro: Redis connection failed

```bash
# Mac
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

---

## ✅ Checklist Final

Antes de considerar a integração completa:

**Anchor Programs:**
- [ ] Programs compilam sem erros
- [ ] Deploy bem sucedido (localnet/devnet)
- [ ] IDLs gerados em `target/idl/`
- [ ] Program IDs atualizados no Anchor.toml

**Backend:**
- [ ] Todas dependências instaladas
- [ ] .env configurado
- [ ] Supabase conectado
- [ ] Redis rodando
- [ ] Server inicia sem erros
- [ ] Endpoints respondem

**Frontend:**
- [ ] .env configurado com API_URL
- [ ] API client implementado
- [ ] Wallet conecta
- [ ] Login funciona
- [ ] Compra de ticket funciona

**Integração:**
- [ ] Frontend → Backend (HTTP)
- [ ] Backend → Supabase (Database)
- [ ] Backend → Solana (Blockchain)
- [ ] VRF funcionando
- [ ] Cron jobs rodando
- [ ] Logs sem erros

---

## 📚 Documentação de Referência

Todos os detalhes estão em:

1. **CHATGPT_PROMPT.md** - Prompt completo para o ChatGPT
2. **CHATGPT_CODE_EXAMPLES.md** - Exemplos de código
3. **BACKEND_COMPLETE_GUIDE.md** - Guia completo do backend
4. **BACKEND_QUICK_START.md** - Setup rápido
5. **FRONTEND_BACKEND_INTEGRATION.md** - Como integrar frontend

---

## 🆘 Suporte

Se algo não funcionar:

1. Verifique logs do backend
2. Verifique DevTools do frontend
3. Teste endpoints com `curl` ou Postman
4. Confirme que program IDs estão corretos
5. Verifique que todas env vars estão setadas
6. Teste transações no Solana Explorer

---

**Boa sorte com a integração! 🚀**
