# 🚀 Deploy Completo do Sistema PowerSOL

Guia passo a passo para fazer o deploy completo de todo o sistema de loterias.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado:

1. **Node.js 20+** (`node --version`)
2. **Rust** (`rustc --version`)
3. **Solana CLI** (`solana --version`)
4. **Anchor CLI** (`anchor --version`)

### Instalar Ferramentas (se necessário)

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI v1.17.0+
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor CLI v0.29.0
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

---

## 🎯 OPÇÃO RÁPIDA: Script Automatizado

Execute um único comando que faz TUDO:

```bash
./deploy-all.sh
```

Esse script vai:
1. ✅ Criar wallet Solana (se não existir)
2. ✅ Configurar devnet
3. ✅ Solicitar airdrop
4. ✅ Build dos programas Anchor
5. ✅ Deploy em devnet
6. ✅ Atualizar IDs automaticamente
7. ✅ Copiar IDLs para backend
8. ✅ Configurar backend .env
9. ✅ Instalar dependências do backend
10. ✅ Testar conexões

**Tempo estimado: 5-10 minutos**

---

## 🔧 OPÇÃO MANUAL: Passo a Passo

Se preferir fazer manualmente:

### **PASSO 1: Setup Solana Wallet**

```bash
# Criar wallet (se não tiver)
solana-keygen new --outfile ~/.config/solana/id.json

# Configurar devnet
solana config set --url devnet

# Pegar SOL de teste
solana airdrop 2

# Verificar saldo
solana balance
```

---

### **PASSO 2: Build e Deploy Programas Anchor**

```bash
cd powersol-programs

# Build
./build.sh

# Deploy em devnet
./deploy-devnet.sh
```

**Salve os Program IDs que aparecem no final!**

Exemplo:
```
powersol-core: GqfdkAjpFJMZnzRaLrgeoBCr7exvSfqSib1wSJM49BxW
powersol-claim: DX1rjpefmrBR8hASnExE3qCBpjpFEkUY4JEoTLmuU2JK
```

---

### **PASSO 3: Atualizar Program IDs**

#### 3.1. Atualizar `programs/powersol-core/src/lib.rs`:
```rust
declare_id!("SEU_PROGRAM_ID_CORE_AQUI");
```

#### 3.2. Atualizar `programs/powersol-claim/src/lib.rs`:
```rust
declare_id!("SEU_PROGRAM_ID_CLAIM_AQUI");
```

#### 3.3. Atualizar `Anchor.toml`:
```toml
[programs.devnet]
powersol_core = "SEU_PROGRAM_ID_CORE_AQUI"
powersol_claim = "SEU_PROGRAM_ID_CLAIM_AQUI"
```

#### 3.4. Rebuild e Redeploy:
```bash
./build.sh
./deploy-devnet.sh
```

---

### **PASSO 4: Copiar IDLs para Backend**

```bash
# Criar pasta de IDLs no backend
mkdir -p ../powersol-backend/src/lib/idl

# Copiar IDLs
cp target/idl/powersol_core.json ../powersol-backend/src/lib/idl/
cp target/idl/powersol_claim.json ../powersol-backend/src/lib/idl/
```

---

### **PASSO 5: Configurar Backend**

```bash
cd ../powersol-backend

# Instalar dependências
npm install

# Copiar .env.example
cp .env.example .env
```

#### 5.1. Editar `.env`:

```env
# Supabase (já deve estar configurado)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_key

# Solana - Atualizar esses valores!
RPC_URL=https://api.devnet.solana.com
POWERSOL_CORE_PROGRAM_ID=SEU_PROGRAM_ID_CORE_AQUI
POWERSOL_CLAIM_PROGRAM_ID=SEU_PROGRAM_ID_CLAIM_AQUI

# Gerar Authority Wallet
# Execute: npm run generate-keypair
AUTHORITY_WALLET_SECRET=base58_secret_gerado

# Wallets (devnet para teste)
TREASURY_WALLET=sua_wallet_address
```

#### 5.2. Gerar Authority Keypair:

```bash
npm run generate-keypair
```

Copie o **secret** gerado para `AUTHORITY_WALLET_SECRET` no `.env`.

---

### **PASSO 6: Testar Conexões**

```bash
npm run test-connection
```

Deve mostrar:
```
✅ Supabase connected
✅ Solana devnet connected
✅ Authority wallet valid
✅ Program IDs valid
```

---

### **PASSO 7: Iniciar Backend**

```bash
npm run dev
```

Backend rodando em `http://localhost:4000` 🎉

---

### **PASSO 8: Seed de Loterias (Opcional)**

```bash
npm run seed
```

Cria as 4 loterias de teste no database.

---

## 🧪 TESTES

### Testar Programas Anchor

```bash
cd powersol-programs
./test.sh
```

### Testar Backend

```bash
cd powersol-backend

# Testar endpoints
curl http://localhost:4000/api/lotteries
curl http://localhost:4000/api/lotteries/active
```

---

## 🔄 INTEGRAÇÃO FRONTEND

### Atualizar Frontend .env

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_key
VITE_BACKEND_URL=http://localhost:4000
VITE_POWERSOL_CORE_PROGRAM_ID=SEU_PROGRAM_ID_CORE_AQUI
VITE_POWERSOL_CLAIM_PROGRAM_ID=SEU_PROGRAM_ID_CLAIM_AQUI
VITE_RPC_URL=https://api.devnet.solana.com
```

### Testar Frontend

```bash
npm run dev
```

Abrir `http://localhost:5173` e testar:
1. Conectar wallet
2. Ver loterias ativas
3. Comprar tickets
4. Ver transparência

---

## 📊 CHECKLIST COMPLETO

### Blockchain
- [ ] Rust instalado
- [ ] Solana CLI instalado
- [ ] Anchor CLI instalado
- [ ] Wallet criada
- [ ] SOL na wallet (devnet)
- [ ] Programas compilados
- [ ] Programas deployados em devnet
- [ ] Program IDs atualizados no código
- [ ] IDLs copiados para backend

### Backend
- [ ] Dependências instaladas
- [ ] .env configurado
- [ ] Program IDs corretos
- [ ] Authority keypair gerado
- [ ] Conexões testadas
- [ ] Backend rodando
- [ ] Loterias seedadas

### Frontend
- [ ] .env atualizado
- [ ] Program IDs corretos
- [ ] Frontend rodando
- [ ] Wallet conectando
- [ ] Compra de tickets funcionando

---

## 🎯 PRÓXIMOS PASSOS

Após tudo funcionando em devnet:

1. **Testes Extensivos**
   - Comprar tickets
   - Processar sorteios
   - Reivindicar prêmios
   - Testar afiliados
   - Testar missões

2. **Auditoria de Segurança**
   - Revisar todos os programas
   - Verificar PDAs
   - Validar distribuição de fundos
   - Testar edge cases

3. **Deploy Mainnet** (quando estiver 100% testado)
   ```bash
   cd powersol-programs
   ./deploy-mainnet.sh
   ```

---

## 💡 DICAS

### Ver Logs de Programas
```bash
solana logs <PROGRAM_ID>
```

### Ver Account Data
```bash
solana account <ACCOUNT_ADDRESS>
```

### Atualizar Programa Existente
```bash
anchor upgrade target/deploy/powersol_core.so --program-id <PROGRAM_ID>
```

### Verificar no Explorer
- **Devnet:** https://explorer.solana.com/?cluster=devnet
- **Mainnet:** https://explorer.solana.com/

---

## 🆘 TROUBLESHOOTING

### Erro: "Insufficient funds"
```bash
solana airdrop 2
```

### Erro: "Program ID mismatch"
Certifique-se de que os Program IDs em:
- `src/lib.rs` (declare_id!)
- `Anchor.toml`
- Backend `.env`

São TODOS iguais!

### Erro: "Account not found"
O programa ainda não foi deployado. Execute:
```bash
./deploy-devnet.sh
```

### Erro: "Build failed"
Verifique versões:
```bash
rustc --version  # 1.70.0+
anchor --version # 0.29.0
```

---

## 📞 SUPORTE

Se precisar de ajuda:

1. Verifique a documentação em `powersol-programs/README.md`
2. Verifique logs: `solana logs`
3. Revise os exemplos em `powersol-backend/examples/`

---

**Sistema completo pronto para deploy! 🚀🎰**
