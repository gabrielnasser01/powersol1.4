# 🚀 Como Fazer Deploy do Sistema Completo PowerSOL

Guia SUPER SIMPLIFICADO para você fazer tudo funcionar!

---

## 🎯 TL;DR - 1 ÚNICO COMANDO

```bash
./deploy-all.sh
```

Esse comando faz **TUDO automaticamente**! 🎉

---

## ✅ O QUE EU FIZ PRA VOCÊ

Preparei o sistema completo com:

1. ✅ **Programas Anchor** (powersol-core e powersol-claim)
2. ✅ **Backend PowerSOL** completo com 35 endpoints
3. ✅ **Scripts automatizados** de deploy
4. ✅ **Documentação completa**
5. ✅ **Integração automática** entre todos componentes

---

## 📝 VOCÊ PRECISA TER INSTALADO

Antes de rodar o deploy, instale:

### 1. Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### 3. Anchor CLI
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### Verificar instalações:
```bash
rustc --version   # deve mostrar 1.70.0+
solana --version  # deve mostrar 1.17.0+
anchor --version  # deve mostrar 0.29.0
```

---

## 🚀 DEPLOY AUTOMÁTICO

### Passo 1: Execute o script
```bash
cd /caminho/para/projeto
chmod +x deploy-all.sh
./deploy-all.sh
```

### O que o script faz:
1. ✅ Cria wallet Solana (se não existir)
2. ✅ Configura devnet
3. ✅ Solicita airdrop de SOL
4. ✅ Compila programas Anchor
5. ✅ Faz deploy em devnet
6. ✅ Atualiza Program IDs automaticamente
7. ✅ Copia IDLs para backend
8. ✅ Configura .env do backend
9. ✅ Configura .env do frontend
10. ✅ Mostra os Program IDs

**Tempo: 5-10 minutos** ⏱️

---

## ⚙️ DEPOIS DO DEPLOY

### Passo 2: Configurar Authority Wallet

```bash
cd powersol-backend
npm install
npm run generate-keypair
```

Vai mostrar algo assim:
```
🔑 Novo Keypair Gerado!

Public Key: ABC123...
Secret (Base58): XYZ789...

📝 Copie o Secret e adicione ao .env:
AUTHORITY_WALLET_SECRET=XYZ789...
```

Cole o **Secret** no arquivo `powersol-backend/.env`

### Passo 3: Iniciar Backend

```bash
cd powersol-backend
npm run dev
```

Deve aparecer:
```
✅ Backend rodando em http://localhost:4000
✅ Supabase conectado
✅ Solana devnet conectado
```

### Passo 4: Iniciar Frontend

Em outro terminal:
```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🧪 TESTAR TUDO

### 1. Testar Backend
```bash
# Em outro terminal
curl http://localhost:4000/api/lotteries/active
```

Deve retornar JSON com as loterias!

### 2. Testar Frontend
1. Abra http://localhost:5173
2. Clique em "Connect Wallet"
3. Conecte com Phantom/Solflare
4. Navegue pelas páginas
5. Tente comprar um ticket

### 3. Ver Programs na Blockchain
Acesse o Explorer:
- https://explorer.solana.com/?cluster=devnet

Cole os Program IDs que o script mostrou!

---

## 📊 O QUE FOI DEPLOYADO

### Blockchain (Solana Devnet)
- ✅ **powersol-core** - Gerencia loterias e compra de tickets
- ✅ **powersol-claim** - Gerencia reivindicação de prêmios

### Backend (Node.js + TypeScript)
- ✅ 35 endpoints API REST
- ✅ 4 tipos de loterias configuradas
- ✅ Sistema de afiliados com Delta
- ✅ Sistema de missões
- ✅ Integração blockchain completa

### Frontend (React + Vite)
- ✅ Conectado ao backend
- ✅ Conectado aos programas Anchor
- ✅ Wallet integration
- ✅ UI completa

---

## 📁 ESTRUTURA FINAL

```
seu-projeto/
├── deploy-all.sh                    ← Script mágico!
├── DEPLOY_COMPLETE_SYSTEM.md        ← Documentação detalhada
├── COMO_FAZER_DEPLOY.md            ← Este arquivo
│
├── powersol-programs/
│   ├── programs/
│   │   ├── powersol-core/          ← Program 1
│   │   └── powersol-claim/         ← Program 2
│   ├── build.sh
│   ├── deploy-devnet.sh
│   └── target/
│       ├── deploy/                  ← .so files
│       └── idl/                     ← JSON files
│
├── powersol-backend/
│   ├── src/                         ← Código backend
│   ├── package.json                 ← Criado!
│   ├── tsconfig.json                ← Criado!
│   ├── .env                         ← Configure este!
│   └── .env.example                 ← Template
│
└── src/                             ← Frontend
    └── ...
```

---

## 🔑 INFORMAÇÕES IMPORTANTES

### Program IDs
Depois do deploy, você terá 2 Program IDs:

```
powersol-core:  GqfdkAjpFJ...
powersol-claim: DX1rjpefmr...
```

Eles serão atualizados automaticamente em:
- ✅ `powersol-programs/Anchor.toml`
- ✅ `powersol-backend/.env`
- ✅ `.env` (frontend)

### Wallets Necessárias

1. **Development Wallet** (criada automaticamente)
   - Localização: `~/.config/solana/id.json`
   - Usa para: Deploy dos programs

2. **Authority Wallet** (você gera)
   - Gerar com: `npm run generate-keypair`
   - Usa para: Gerenciar loterias no backend

3. **Treasury Wallet** (sua wallet)
   - Usa para: Receber 30% das vendas

---

## 🆘 PROBLEMAS COMUNS

### "anchor: command not found"
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### "insufficient funds"
```bash
solana config set --url devnet
solana airdrop 2
```

### "build failed"
Verifique versões:
```bash
rustc --version  # mínimo 1.70
anchor --version # 0.29.0
```

### "connection refused" no backend
1. Verifique se o Supabase está configurado em `.env`
2. Verifique se tem Redis rodando (ou desabilite)
3. Verifique os Program IDs em `.env`

---

## 📞 ARQUIVOS DE AJUDA

Eu criei vários guias para você:

1. **DEPLOY_COMPLETE_SYSTEM.md** - Guia passo a passo detalhado
2. **powersol-programs/QUICKSTART.md** - Específico para Anchor
3. **powersol-programs/README.md** - Documentação dos programs
4. **powersol-backend/README.md** - Documentação do backend
5. **powersol-backend/SETUP.md** - Setup do backend
6. **STATUS.md** - Status geral do projeto

---

## ✅ CHECKLIST FINAL

Marque conforme você for fazendo:

### Pre-Deploy
- [ ] Rust instalado
- [ ] Solana CLI instalado
- [ ] Anchor CLI instalado
- [ ] Node.js instalado

### Deploy
- [ ] Executei `./deploy-all.sh`
- [ ] Vi os Program IDs no final
- [ ] Verifiquei que os IDs foram atualizados

### Backend
- [ ] Executei `npm install` no powersol-backend
- [ ] Gerei Authority Keypair
- [ ] Colei o Secret no `.env`
- [ ] Iniciei backend com `npm run dev`
- [ ] Backend está rodando na porta 4000

### Frontend
- [ ] Iniciei frontend com `npm run dev`
- [ ] Abri http://localhost:5173
- [ ] Conectei minha wallet
- [ ] Testei navegar nas páginas

### Testes
- [ ] Testei endpoint: `curl http://localhost:4000/api/lotteries`
- [ ] Testei comprar um ticket no frontend
- [ ] Verifiquei Programs no Explorer

---

## 🎉 SUCESSO!

Se tudo funcionou:

1. ✅ Programs deployados em devnet
2. ✅ Backend rodando
3. ✅ Frontend conectado
4. ✅ Você pode comprar tickets!

### Próximos Passos:

1. **Testar todas as features**
   - Comprar tickets
   - Processar sorteios
   - Reivindicar prêmios
   - Sistema de afiliados
   - Missões

2. **Preparar para Mainnet**
   - Auditar código
   - Testar exaustivamente
   - Deploy mainnet

---

## 🤝 PRECISA DE AJUDA?

Verifique os logs:
```bash
# Logs do backend
cd powersol-backend
npm run dev

# Logs dos programs na blockchain
solana logs <PROGRAM_ID>
```

Abra os arquivos de documentação que eu criei!

---

**Boa sorte com o deploy! 🚀🎰**

*Sistema completo pronto para uso!*
