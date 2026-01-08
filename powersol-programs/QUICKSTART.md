# 🚀 PowerSOL Anchor - Quick Start

Guia rápido para começar com os Smart Contracts Anchor do PowerSOL.

---

## ⚡ Setup Rápido (5 passos)

### 1. Instalar dependências

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

### 2. Criar wallet

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

### 3. Configurar devnet

```bash
solana config set --url devnet
solana airdrop 2
```

### 4. Build

```bash
cd powersol-programs
./build.sh
```

### 5. Deploy

```bash
./deploy-devnet.sh
```

---

## 📋 Depois do Deploy

### 1. Pegar Program IDs

```bash
solana-keygen pubkey target/deploy/powersol_core-keypair.json
solana-keygen pubkey target/deploy/powersol_claim-keypair.json
```

### 2. Atualizar IDs

**Em `programs/powersol-core/src/lib.rs`:**
```rust
declare_id!("SEU_PROGRAM_ID_CORE_AQUI");
```

**Em `programs/powersol-claim/src/lib.rs`:**
```rust
declare_id!("SEU_PROGRAM_ID_CLAIM_AQUI");
```

**Em `Anchor.toml`:**
```toml
[programs.devnet]
powersol_core = "SEU_PROGRAM_ID_CORE_AQUI"
powersol_claim = "SEU_PROGRAM_ID_CLAIM_AQUI"
```

### 3. Rebuild e Redeploy

```bash
./build.sh
./deploy-devnet.sh
```

### 4. Copiar IDLs para Backend

```bash
cp target/idl/powersol_core.json ../powersol-backend/src/lib/idl/
cp target/idl/powersol_claim.json ../powersol-backend/src/lib/idl/
```

### 5. Atualizar Backend .env

```env
POWERSOL_CORE_PROGRAM_ID=seu_program_id_core
POWERSOL_CLAIM_PROGRAM_ID=seu_program_id_claim
```

---

## 🎮 Comandos Úteis

```bash
# Build
./build.sh

# Deploy devnet
./deploy-devnet.sh

# Deploy mainnet (cuidado!)
./deploy-mainnet.sh

# Testes
./test.sh

# Ver logs
solana logs <PROGRAM_ID>

# Ver account
solana account <ACCOUNT_ADDRESS>

# Atualizar programa
anchor upgrade target/deploy/powersol_core.so --program-id <PROGRAM_ID>
```

---

## 🏗️ O Que Foi Criado

### 2 Programas Anchor

**powersol-core:**
- 4 tipos de loterias (TRI_DAILY, JACKPOT, GRAND_PRIZE, XMAS)
- Sistema de compra de tickets
- Distribuição automática de fundos (40/30/30)
- Execução de sorteios com VRF

**powersol-claim:**
- Reivindicação de prêmios
- Sistema de tiers (1-5)
- Transferências seguras
- Validação de vencedores

### Estrutura Completa

```
powersol-programs/
├── programs/
│   ├── powersol-core/
│   │   └── src/
│   │       ├── lib.rs           # Entry point
│   │       ├── errors.rs        # Error codes
│   │       ├── state/           # Accounts
│   │       │   ├── lottery.rs
│   │       │   └── ticket.rs
│   │       └── instructions/    # Instructions
│   │           ├── initialize.rs
│   │           ├── purchase.rs
│   │           ├── draw.rs
│   │           └── close.rs
│   └── powersol-claim/
│       └── src/
│           ├── lib.rs
│           ├── errors.rs
│           ├── state/
│           │   └── claim.rs
│           └── instructions/
│               └── claim.rs
├── Anchor.toml                  # Config
├── Cargo.toml                   # Workspace
├── build.sh                     # Build script
├── deploy-devnet.sh            # Deploy devnet
├── deploy-mainnet.sh           # Deploy mainnet
└── test.sh                     # Tests

Depois do build:
├── target/
│   ├── deploy/
│   │   ├── powersol_core.so
│   │   └── powersol_claim.so
│   └── idl/
│       ├── powersol_core.json   # IDL para backend
│       └── powersol_claim.json  # IDL para backend
```

---

## ✅ Checklist Completo

### Antes do Deploy

- [ ] Rust instalado (`rustc --version`)
- [ ] Solana CLI instalado (`solana --version`)
- [ ] Anchor CLI instalado (`anchor --version`)
- [ ] Wallet criada (`solana-keygen new`)
- [ ] SOL na wallet (`solana balance`)
- [ ] Cluster configurado (`solana config get`)

### Deploy

- [ ] Build completo (`./build.sh`)
- [ ] Deploy em devnet (`./deploy-devnet.sh`)
- [ ] Program IDs copiados
- [ ] IDs atualizados em `src/lib.rs`
- [ ] IDs atualizados em `Anchor.toml`
- [ ] Rebuild com novos IDs
- [ ] Redeploy para confirmar

### Integração Backend

- [ ] IDLs copiados para backend
- [ ] Program IDs em backend `.env`
- [ ] Backend testado com programas

### Deploy Mainnet (quando pronto)

- [ ] Auditoria de segurança completa
- [ ] Testes extensivos em devnet
- [ ] SOL suficiente na wallet (5+ SOL)
- [ ] Deploy mainnet (`./deploy-mainnet.sh`)
- [ ] Verificação no Solana Explorer
- [ ] Atualização de docs com endereços mainnet

---

## 🔥 Features Principais

### Segurança
- PDAs sem chave privada
- Validações de ownership
- Proteção contra overflow
- Timelock em sorteios
- Autorização por authority

### Distribuição Automática
Cada ticket vendido distribui automaticamente:
- 40% → Prize Pool (PDA da loteria)
- 30% → Treasury
- 30% → Affiliates Pool

### Multi-Lottery
Suporta 4 tipos de loteria simultâneas:
- TRI_DAILY (3x por dia)
- JACKPOT (mensal)
- GRAND_PRIZE (anual)
- XMAS (especial)

### Sistema de Tiers
5 tiers de vencedores com percentuais diferentes:
- Tier 1: 20% (1 vencedor)
- Tier 2: 10% (2 vencedores)
- Tier 3: 12.5% (6 vencedores)
- Tier 4: 27.5% (36 vencedores)
- Tier 5: 30% (55 vencedores)

---

## 🎯 Próximos Passos

1. **Deploy em devnet** e testar completamente
2. **Integrar com backend** TypeScript/Node.js
3. **Criar frontend** para interagir com programas
4. **Fazer auditoria** de segurança
5. **Deploy em mainnet** quando pronto

---

## 📖 Recursos

- **README.md** - Documentação completa
- **ANCHOR_INTEGRATION.md** - Guia de integração (na pasta principal)
- **Anchor Docs** - https://www.anchor-lang.com/
- **Solana Docs** - https://docs.solana.com/

---

**Programas Anchor prontos para uso! 🎰⚓🚀**
