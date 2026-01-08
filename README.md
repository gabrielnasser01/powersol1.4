# 🎰 PowerSOL - Sistema Completo de Loterias na Solana

Plataforma descentralizada de loterias construída na blockchain Solana.

---

## 📁 ESTRUTURA DO PROJETO

```
powersol/
│
├── 📱 frontend/                   ← ABRA ESTA PASTA NO VSCODE!
│   ├── src/                      ← Código React
│   ├── public/                   ← Assets
│   ├── package.json              ← Dependências
│   ├── vite.config.ts            ← Config Vite
│   └── .env                      ← Variáveis de ambiente
│
├── 🔧 powersol-backend/          ← Backend Node.js + TypeScript
│   ├── src/                      ← Código backend
│   ├── package.json              ← Dependências
│   ├── tsconfig.json             ← Config TypeScript
│   └── .env                      ← Variáveis de ambiente
│
├── ⚓ powersol-programs/         ← Smart Contracts Anchor
│   ├── programs/                 ← Programas Rust
│   │   ├── powersol-core/       ← Loterias
│   │   └── powersol-claim/      ← Claims
│   ├── build.sh                  ← Script de build
│   └── deploy-devnet.sh         ← Deploy devnet
│
├── 📚 docs/                      ← Documentação
│   ├── COMO_FAZER_DEPLOY.md     ← Guia de deploy
│   ├── README_*.md              ← Vários guias
│   └── *.sh                     ← Scripts úteis
│
├── 🚀 deploy-all.sh              ← Deploy automático completo
└── 📖 README.md                  ← Este arquivo
```

---

## 🎯 INÍCIO RÁPIDO

### 1️⃣ Abrir Frontend no VSCode

```bash
# No VSCode, vá em:
# File > Open Folder...
# Selecione a pasta: powersol/frontend/
```

**OU via terminal:**
```bash
code frontend/
```

### 2️⃣ Rodar Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

### 3️⃣ Rodar Backend (em outro terminal)

```bash
cd powersol-backend
npm install
npm run dev
```

Backend: http://localhost:4000

---

## 🚀 DEPLOY COMPLETO

Para fazer deploy de todo o sistema (blockchain + backend + frontend):

```bash
./deploy-all.sh
```

**O que esse script faz:**
- ✅ Configura wallet Solana
- ✅ Compila programas Anchor
- ✅ Faz deploy em devnet
- ✅ Atualiza todos os Program IDs
- ✅ Configura backend e frontend

**Guia detalhado:** `docs/COMO_FAZER_DEPLOY.md`

---

## 📦 O QUE ESTÁ INCLUÍDO

### Frontend (React + TypeScript + Vite)
- ✅ 13 páginas completas
- ✅ Integração com Solana wallet
- ✅ Sistema de compra de tickets
- ✅ Dashboard de afiliados
- ✅ Sistema de missões
- ✅ Transparência blockchain

### Backend (Node.js + TypeScript + Express)
- ✅ 35 endpoints API REST
- ✅ 4 tipos de loterias
- ✅ Sistema de afiliados multi-level
- ✅ Sistema de missões
- ✅ Integração blockchain completa
- ✅ VRF para sorteios justos

### Smart Contracts (Anchor + Rust)
- ✅ powersol-core - Gerencia loterias
- ✅ powersol-claim - Sistema de claims
- ✅ 4 tipos de loteria (TRI-DAILY, JACKPOT, GRAND PRIZE, XMAS)
- ✅ PDAs únicos por tipo
- ✅ Distribuição automática de fundos

### Database (Supabase)
- ✅ 15 tabelas configuradas
- ✅ RLS habilitado
- ✅ 6 migrações aplicadas
- ✅ 19 missões cadastradas

---

## 🛠️ COMANDOS ÚTEIS

### Frontend
```bash
cd frontend
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run preview      # Preview build
```

### Backend
```bash
cd powersol-backend
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm start            # Produção
npm run generate-keypair  # Gerar keypair
```

### Anchor Programs
```bash
cd powersol-programs
./build.sh           # Compilar
./deploy-devnet.sh   # Deploy devnet
./test.sh            # Rodar testes
```

---

## 📚 DOCUMENTAÇÃO

Todos os guias estão em `docs/`:

### Para Começar
- **COMO_FAZER_DEPLOY.md** - Guia simplificado de deploy
- **DEPLOY_COMPLETE_SYSTEM.md** - Guia detalhado completo
- **STATUS.md** - Status atual do projeto

### Backend
- **README_BACKEND_SETUP.md** - Setup do backend
- **BACKEND_QUICK_START.md** - Início rápido
- **BACKEND_COMPLETE_GUIDE.md** - Guia completo

### Blockchain
- **ANCHOR_INTEGRATION.md** - Integração Anchor
- **SOLANA_WALLETS.md** - Sistema de wallets
- **PRIZE_CLAIM_SYSTEM.md** - Sistema de claims

### Integrações
- **FRONTEND_BACKEND_INTEGRATION.md** - Integração FE/BE
- **INTEGRATION_WITH_REPO_NEW.md** - Integração geral
- **TUTORIAL_TWITTER_API.md** - Twitter API

---

## 🔐 VARIÁVEIS DE AMBIENTE

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
VITE_BACKEND_URL=http://localhost:4000
VITE_POWERSOL_CORE_PROGRAM_ID=program_id
VITE_POWERSOL_CLAIM_PROGRAM_ID=program_id
VITE_RPC_URL=https://api.devnet.solana.com
```

### Backend (.env)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_key
RPC_URL=https://api.devnet.solana.com
POWERSOL_CORE_PROGRAM_ID=program_id
POWERSOL_CLAIM_PROGRAM_ID=program_id
AUTHORITY_WALLET_SECRET=base58_secret
```

---

## 🎯 FLUXO DE DESENVOLVIMENTO

### 1. Desenvolvimento Frontend
```bash
cd frontend
npm run dev
```
Edite arquivos em `frontend/src/`

### 2. Desenvolvimento Backend
```bash
cd powersol-backend
npm run dev
```
Edite arquivos em `powersol-backend/src/`

### 3. Modificar Smart Contracts
```bash
cd powersol-programs/programs/powersol-core/src/
# Edite os arquivos .rs
cd ../../..
./build.sh
./deploy-devnet.sh
```

---

## ✅ CHECKLIST

### Desenvolvimento Local
- [ ] Frontend rodando (http://localhost:5173)
- [ ] Backend rodando (http://localhost:4000)
- [ ] Wallet conectando
- [ ] Chamadas API funcionando

### Deploy Blockchain
- [ ] Rust instalado
- [ ] Solana CLI instalado
- [ ] Anchor CLI instalado
- [ ] Wallet com SOL
- [ ] Programs deployados
- [ ] Program IDs atualizados

### Produção
- [ ] Testes completos
- [ ] Auditoria de segurança
- [ ] Deploy mainnet
- [ ] Frontend em produção
- [ ] Backend em produção

---

## 🆘 PROBLEMAS COMUNS

### "Cannot find module"
```bash
cd frontend
npm install
```

### "Backend not responding"
Verifique se o backend está rodando:
```bash
cd powersol-backend
npm run dev
```

### "Wallet not connecting"
1. Verifique RPC URL no `.env`
2. Troque para devnet se estiver testando
3. Verifique se tem SOL na wallet

---

## 📞 ESTRUTURA PARA VSCODE

**Abra 3 instâncias do VSCode:**

1. **Frontend** - `code frontend/`
2. **Backend** - `code powersol-backend/`
3. **Programs** - `code powersol-programs/`

**OU abra a raiz e navegue pelas pastas:**
```bash
code .
```

---

## 🚀 TECNOLOGIAS

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js 20, TypeScript, Express, Supabase
- **Blockchain:** Solana, Anchor, Rust
- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT + Wallet signatures

---

## 📊 PROGRESSO

```
Frontend:           ████████████████████ 100%
Backend:            ████████████████████ 100%
Smart Contracts:    ████████████████████ 100%
Database:           ████████████████████ 100%
Documentação:       ████████████████████ 100%
Deploy Scripts:     ████████████████████ 100%
```

---

## 💬 COMEÇAR AGORA

```bash
# 1. Frontend
cd frontend
npm install
npm run dev

# 2. Backend (outro terminal)
cd powersol-backend
npm install
npm run dev

# 3. Abra o navegador
http://localhost:5173
```

---

**PowerSOL - Decentralized Lotteries on Solana 🎰⚡**

*Built with ❤️ by the PowerSOL Team*
