# ⚓ PowerSOL Anchor Programs

Smart Contracts Solana completos para o sistema de loterias PowerSOL.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Build](#build)
- [Deploy](#deploy)
- [Programas](#programas)
- [Uso](#uso)

---

## 🎯 Visão Geral

Este repositório contém 2 programas Anchor:

### 1. **powersol-core**
Gerencia as loterias:
- Inicialização de loterias (TRI_DAILY, JACKPOT, GRAND_PRIZE, XMAS)
- Compra de tickets
- Execução de sorteios
- Distribuição automática de fundos (40% prêmios, 30% treasury, 30% afiliados)

### 2. **powersol-claim**
Gerencia reivindicações de prêmios:
- Validação de vencedores
- Transferências seguras de prêmios
- Registro de claims

---

## 🛠️ Pré-requisitos

### 1. Rust e Cargo
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update
```

### 2. Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
```

Verificar instalação:
```bash
solana --version
```

### 3. Anchor CLI
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
```

Verificar instalação:
```bash
anchor --version
```

### 4. Node.js e Yarn
```bash
# Node.js (via nvm recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Yarn
npm install -g yarn
```

---

## 📦 Instalação

### 1. Clone o repositório (se ainda não tiver)
```bash
cd powersol-programs
```

### 2. Criar wallet Solana (se não tiver)
```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

### 3. Configurar cluster
```bash
# Para desenvolvimento (devnet)
solana config set --url devnet

# Para produção (mainnet)
solana config set --url mainnet-beta
```

### 4. Obter SOL de teste (apenas devnet)
```bash
solana airdrop 2
```

Verificar balance:
```bash
solana balance
```

---

## 🔨 Build

### Opção 1: Usando script
```bash
./build.sh
```

### Opção 2: Comando direto
```bash
anchor build
```

Isso vai gerar:
- `target/deploy/powersol_core.so` - Programa compilado
- `target/deploy/powersol_claim.so` - Programa compilado
- `target/idl/powersol_core.json` - IDL (Interface Definition Language)
- `target/idl/powersol_claim.json` - IDL
- Keypairs dos programas em `target/deploy/`

### Ver Program IDs
```bash
solana-keygen pubkey target/deploy/powersol_core-keypair.json
solana-keygen pubkey target/deploy/powersol_claim-keypair.json
```

---

## 🚀 Deploy

### Deploy em Devnet

```bash
./deploy-devnet.sh
```

Ou manualmente:
```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

### Deploy em Mainnet

⚠️ **ATENÇÃO:** Deployment em mainnet custa SOL real!

```bash
./deploy-mainnet.sh
```

Ou manualmente:
```bash
solana config set --url mainnet-beta
anchor build --verifiable
anchor deploy --provider.cluster mainnet
```

### Atualizar Program IDs

Após deploy, pegue os Program IDs:
```bash
solana-keygen pubkey target/deploy/powersol_core-keypair.json
solana-keygen pubkey target/deploy/powersol_claim-keypair.json
```

Atualize em:

**1. Anchor.toml**
```toml
[programs.devnet]
powersol_core = "SEU_PROGRAM_ID_AQUI"
powersol_claim = "SEU_PROGRAM_ID_AQUI"
```

**2. Programs src/lib.rs**
```rust
// powersol-core/src/lib.rs
declare_id!("SEU_PROGRAM_ID_AQUI");

// powersol-claim/src/lib.rs
declare_id!("SEU_PROGRAM_ID_AQUI");
```

**3. Backend .env**
```env
POWERSOL_CORE_PROGRAM_ID=SEU_PROGRAM_ID_AQUI
POWERSOL_CLAIM_PROGRAM_ID=SEU_PROGRAM_ID_AQUI
```

Depois, faça rebuild e redeploy:
```bash
anchor build
anchor deploy --provider.cluster devnet
```

---

## 📚 Programas

### PowerSOL Core

**States:**
- `Lottery` - Dados da loteria (ID, tipo, tickets, prêmios, etc)
- `Ticket` - Ticket individual de um jogador
- `UserTickets` - Lista de tickets de um usuário

**Instructions:**
- `initialize_tri_daily_lottery` - Cria loteria TRI_DAILY
- `initialize_jackpot_lottery` - Cria loteria JACKPOT
- `initialize_grand_prize_lottery` - Cria loteria GRAND_PRIZE
- `initialize_xmas_lottery` - Cria loteria XMAS
- `purchase_ticket` - Compra um ticket
- `execute_draw` - Executa sorteio (apenas authority)
- `close_lottery` - Fecha loteria após sorteio

**PDAs (Program Derived Addresses):**
```
Lottery:     [b"tri_daily", round]
             [b"jackpot", month, year]
             [b"grand_prize", year]
             [b"xmas", year]

Ticket:      [b"ticket", lottery_key, ticket_number]

UserTickets: [b"user_tickets", user_key, lottery_key]
```

### PowerSOL Claim

**States:**
- `Claim` - Registro de claim de prêmio

**Instructions:**
- `claim_prize` - Reivindica prêmio

**PDAs:**
```
Claim: [b"claim", claimer_key, lottery_key]
```

---

## 💻 Uso

### Exemplo: Inicializar Loteria TRI_DAILY

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PowersolCore } from './idl/powersol_core';

const program = anchor.workspace.PowersolCore as Program<PowersolCore>;

const round = 1;
const ticketPrice = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
const maxTickets = 10000;
const drawTimestamp = new anchor.BN(Date.now() / 1000 + 3600); // 1 hora

const [lotteryPDA] = await anchor.web3.PublicKey.findProgramAddress(
  [
    Buffer.from("tri_daily"),
    new anchor.BN(round).toArrayLike(Buffer, "le", 8),
  ],
  program.programId
);

await program.methods
  .initializeTriDailyLottery(
    new anchor.BN(round),
    ticketPrice,
    maxTickets,
    drawTimestamp
  )
  .accounts({
    authority: wallet.publicKey,
    lottery: lotteryPDA,
    treasury: treasuryAddress,
    affiliatesPool: affiliatesPoolAddress,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();
```

### Exemplo: Comprar Ticket

```typescript
const [ticketPDA] = await anchor.web3.PublicKey.findProgramAddress(
  [
    Buffer.from("ticket"),
    lotteryPDA.toBuffer(),
    new anchor.BN(lottery.currentTickets + 1).toArrayLike(Buffer, "le", 4),
  ],
  program.programId
);

const [userTicketsPDA] = await anchor.web3.PublicKey.findProgramAddress(
  [
    Buffer.from("user_tickets"),
    wallet.publicKey.toBuffer(),
    lotteryPDA.toBuffer(),
  ],
  program.programId
);

await program.methods
  .purchaseTicket(null) // ou "affiliate_code"
  .accounts({
    buyer: wallet.publicKey,
    lottery: lotteryPDA,
    ticket: ticketPDA,
    userTickets: userTicketsPDA,
    treasury: treasuryAddress,
    affiliatesPool: affiliatesPoolAddress,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();
```

### Exemplo: Executar Sorteio

```typescript
const winningTickets = [1, 5, 10, 15, 20]; // Números sorteados pelo VRF

await program.methods
  .executeDraw(winningTickets)
  .accounts({
    lottery: lotteryPDA,
    authority: authorityWallet.publicKey,
  })
  .rpc();
```

### Exemplo: Reivindicar Prêmio

```typescript
const claimProgram = anchor.workspace.PowersolClaim as Program<PowersolClaim>;

const [claimPDA] = await anchor.web3.PublicKey.findProgramAddress(
  [
    Buffer.from("claim"),
    winner.publicKey.toBuffer(),
    lotteryPDA.toBuffer(),
  ],
  claimProgram.programId
);

const tier = 1; // Tier do vencedor (1-5)

await claimProgram.methods
  .claimPrize(tier)
  .accounts({
    claimer: winner.publicKey,
    lotteryPool: lotteryPDA,
    claim: claimPDA,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();
```

---

## 🧪 Testes

```bash
./test.sh
```

Ou:
```bash
anchor test
```

---

## 🔍 Debug

### Ver logs do programa
```bash
solana logs <PROGRAM_ID>
```

### Inspecionar account
```bash
solana account <ACCOUNT_ADDRESS>
```

### Ver transação
```bash
solana confirm <TRANSACTION_SIGNATURE> -v
```

---

## 📁 Estrutura de Arquivos

```
powersol-programs/
├── Anchor.toml                    # Configuração Anchor
├── Cargo.toml                     # Workspace Rust
├── build.sh                       # Script de build
├── deploy-devnet.sh              # Deploy para devnet
├── deploy-mainnet.sh             # Deploy para mainnet
├── test.sh                       # Script de testes
└── programs/
    ├── powersol-core/
    │   ├── Cargo.toml
    │   └── src/
    │       ├── lib.rs            # Entry point
    │       ├── errors.rs         # Error codes
    │       ├── state/
    │       │   ├── mod.rs
    │       │   ├── lottery.rs    # Lottery account
    │       │   └── ticket.rs     # Ticket accounts
    │       └── instructions/
    │           ├── mod.rs
    │           ├── initialize.rs # Initialize lotteries
    │           ├── purchase.rs   # Purchase tickets
    │           ├── draw.rs       # Execute draw
    │           └── close.rs      # Close lottery
    └── powersol-claim/
        ├── Cargo.toml
        └── src/
            ├── lib.rs            # Entry point
            ├── errors.rs         # Error codes
            ├── state/
            │   ├── mod.rs
            │   └── claim.rs      # Claim account
            └── instructions/
                ├── mod.rs
                └── claim.rs      # Claim prize
```

---

## 🔐 Segurança

### Principais validações implementadas:

1. **Autorização**: Apenas authority pode executar sorteios
2. **Timing**: Não pode comprar ticket após deadline
3. **Capacidade**: Limite de tickets por loteria
4. **Ownership**: Apenas dono do ticket pode fazer claim
5. **Double-claim**: Impossível fazer claim duas vezes
6. **Prize validation**: Verifica se é ticket vencedor antes de pagar
7. **Fund safety**: Fundos ficam em PDAs sem chave privada
8. **Arithmetic**: Proteção contra overflow em todas operações

---

## 🚨 Problemas Comuns

### Build falha
```bash
# Limpar e rebuildar
cargo clean
anchor clean
anchor build
```

### Deploy falha por falta de SOL
```bash
# Devnet: pedir airdrop
solana airdrop 2

# Mainnet: transferir SOL para wallet
solana transfer <AMOUNT> <YOUR_WALLET>
```

### Program ID não atualiza
```bash
# 1. Atualizar em src/lib.rs
# 2. Atualizar em Anchor.toml
# 3. Rebuild
anchor build
# 4. Redeploy
anchor deploy
```

### Erro "Account not found"
```bash
# Verificar se programa foi deployed
solana program show <PROGRAM_ID>

# Se não, fazer deploy
anchor deploy --provider.cluster devnet
```

---

## 📖 Recursos

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Anchor Examples](https://github.com/coral-xyz/anchor/tree/master/tests)

---

## 📞 Suporte

Problemas com os programas? Verifique:

1. ✅ Rust, Solana CLI e Anchor CLI instalados
2. ✅ Wallet configurada com SOL suficiente
3. ✅ Cluster correto (devnet/mainnet)
4. ✅ Program IDs atualizados em todos os lugares

---

**Smart Contracts completos para o PowerSOL! ⚓🚀**
