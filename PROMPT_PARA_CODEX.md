# 🎯 PROMPT PARA CODEX - PowerSOL Lottery System

## 📋 CONTEXTO DO PROJETO

Você está trabalhando no **PowerSOL**, um sistema de loteria descentralizada na blockchain Solana com 4 tipos de sorteios:

1. **TRI-DAILY** - Sorteios 3x ao dia (8h, 14h, 20h)
2. **JACKPOT** - Sorteio mensal
3. **GRAND_PRIZE** - Sorteio anual (31/12/2025)
4. **XMAS** - Sorteio especial de Natal

### Stack Tecnológica:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Blockchain**: Solana + Anchor Framework
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT com assinatura de wallet Solana

---

## ✅ O QUE JÁ ESTÁ 100% PRONTO

### Frontend ✅
- Site completo com todas as páginas
- 19 missões configuradas
- Sistema de afiliados (3 níveis)
- Build funcionando (sem erros)
- Integração com Supabase configurada

### Database ✅
- 31 migrações aplicadas no Supabase
- 15+ tabelas criadas com RLS
- Sistema de missões funcionando
- Sistema de afiliados com Delta implementado
- Tabelas de auditoria e tracking

### Backend Types ✅
- Todos os arquivos `.types.ts` criados e funcionando
- `lottery.types.ts` - Interfaces de loterias
- `claim.types.ts` - Interfaces de claims/prêmios
- `solana.types.ts` - Interfaces Anchor/blockchain
- `affiliate.types.ts` - Sistema de afiliados
- `user.types.ts` - Auth e usuários

---

## ⚠️ O QUE PRECISA SER FEITO AGORA

### 1. COMPLETAR ANCHOR PROGRAMS (CRÍTICO) 🔴

**Localização**: `/powersol-programs/`

#### Arquivos que existem mas precisam ser completados:

**`programs/powersol-core/src/lib.rs`**
- Implementar as 4 funções de inicialização de loterias:
  - `initialize_tri_daily_lottery()`
  - `initialize_jackpot_lottery()`
  - `initialize_grand_prize_lottery()`
  - `initialize_xmas_lottery()`
- Implementar `purchase_ticket()` - Compra de tickets
- Implementar `execute_draw()` - Executar sorteio com VRF

**`programs/powersol-core/src/state/lottery.rs`**
- Account struct para Lottery:
  ```rust
  pub struct Lottery {
      pub authority: Pubkey,
      pub lottery_id: u32,
      pub ticket_price: u64,
      pub max_tickets: u32,
      pub current_tickets: u32,
      pub draw_timestamp: i64,
      pub is_drawn: bool,
      pub winning_tickets: Vec<u32>,
      pub treasury: Pubkey,
      pub affiliates_pool: Pubkey,
      pub prize_pool: u64,
      pub bump: u8,
  }
  ```

**`programs/powersol-core/src/state/ticket.rs`**
- Account struct para Ticket:
  ```rust
  pub struct Ticket {
      pub owner: Pubkey,
      pub lottery: Pubkey,
      pub ticket_number: u32,
      pub purchased_at: i64,
      pub affiliate_code: Option<String>,
      pub is_winner: bool,
      pub tier: Option<u8>,
      pub claimed: bool,
      pub bump: u8,
  }
  ```

**`programs/powersol-claim/src/lib.rs`**
- Implementar `claim_prize()` - Reivindicar prêmio

#### Seeds dos PDAs (IMPORTANTE):
```rust
// Tri-Daily: ["lottery", "tri_daily", round.to_le_bytes()]
// Jackpot: ["lottery", "jackpot", month, year.to_le_bytes()]
// Grand Prize: ["lottery", "grand_prize", year.to_le_bytes()]
// XMAS: ["lottery", "xmas", year.to_le_bytes()]
// Ticket: ["ticket", lottery_pda, ticket_number.to_le_bytes()]
```

#### Distribuição de Prêmios:
- 40% Prize Pool (winners)
- 30% Treasury (operacional)
- 30% Affiliates Pool (comissões)

---

### 2. BACKEND POWERSOL - AJUSTES FINAIS 🟡

**Localização**: `/powersol-backend/`

#### Arquivos que precisam de pequenos ajustes:

**`src/lib/anchor/pdas.ts`**
- Verificar se todas as funções de PDA estão corretas
- Garantir que seeds batem com o programa Rust
- Exportar `LotteryType` enum

**`src/services/anchor-integration.service.ts`**
- Completar integração com os programas Anchor
- Implementar chamadas para `purchase_ticket()`
- Implementar chamadas para `execute_draw()`

**`src/jobs/lottery-manager.ts`**
- Verificar cron jobs de criação automática de loterias
- Tri-Daily: a cada 6 horas
- Jackpot: todo dia 1º do mês
- XMAS: só uma vez (25/12/2024)

**`src/jobs/draw-processor.ts`**
- Verificar processamento de sorteios
- Integração com VRF (Verifiable Random Function)
- Atualização no banco de dados após sorteio

---

### 3. CONFIGURAÇÕES E DEPLOYS 🟢

#### Supabase Edge Functions (Já existem, verificar):
```bash
supabase/functions/
├── api/              # API principal
├── affiliates/       # Sistema de afiliados
├── lottery-draw/     # Processamento de sorteios
├── missions/         # Verificação de missões
└── affiliate-dashboard/  # Dashboard de afiliados
```

**Ação**: Testar cada edge function individualmente

#### Environment Variables necessárias:

**Backend** (`powersol-backend/.env`):
```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
AUTHORITY_PRIVATE_KEY=
TREASURY_PUBLIC_KEY=
AFFILIATES_POOL_PUBLIC_KEY=

# Anchor Programs
POWERSOL_CORE_PROGRAM_ID=
POWERSOL_CLAIM_PROGRAM_ID=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=7d
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO

### FASE 1 - Anchor Programs (MAIS IMPORTANTE)
1. Completar `powersol-core/src/lib.rs` com todas as instruções
2. Completar structs em `state/lottery.rs` e `state/ticket.rs`
3. Completar `powersol-claim/src/lib.rs`
4. Build: `anchor build`
5. Deploy devnet: `anchor deploy --provider.cluster devnet`
6. Copiar Program IDs para `.env`

### FASE 2 - Backend Integration
1. Atualizar `.env` com Program IDs
2. Testar `anchor-integration.service.ts`
3. Rodar backend: `npm run dev`
4. Testar endpoints:
   - POST `/api/lotteries` - Criar loteria
   - POST `/api/tickets` - Comprar ticket
   - POST `/api/draws` - Executar sorteio

### FASE 3 - Frontend Connection
1. Atualizar `anchorService.ts` se necessário
2. Testar compra de tickets na UI
3. Testar visualização de prêmios
4. Testar claim de prêmios

---

## 📝 INSTRUÇÕES ESPECÍFICAS PARA CODEX

### Para Anchor Programs:

```
"Complete os programas Anchor em powersol-programs/ seguindo esta estrutura:

1. Em programs/powersol-core/src/lib.rs:
   - Implementar initialize_tri_daily_lottery() com PDAs corretos
   - Implementar purchase_ticket() com validações
   - Implementar execute_draw() com distribuição 40/30/30

2. Em programs/powersol-core/src/state/:
   - Adicionar structs completos para Lottery e Ticket
   - Usar #[account] macro do Anchor
   - Incluir todos os campos do arquivo lottery.types.ts do backend

3. Usar as seeds corretas para PDAs (ver acima)

4. Após completar, rodar:
   cd powersol-programs
   anchor build
   anchor test
"
```

### Para Backend Services:

```
"Completar integrações do backend em powersol-backend/:

1. Verificar src/lib/anchor/pdas.ts - seeds devem bater com Rust

2. Completar src/services/anchor-integration.service.ts:
   - Método purchaseTicket() deve chamar programa Anchor
   - Método executeDraw() deve chamar programa Anchor
   - Adicionar tratamento de erros

3. Testar jobs:
   - src/jobs/lottery-manager.ts deve criar loterias automáticas
   - src/jobs/draw-processor.ts deve processar sorteios no horário

4. Rodar npm run dev e verificar logs
"
```

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema: "Cannot find module 'express'"
**Solução**: `cd powersol-backend && npm install`

### Problema: "Anchor IDL not found"
**Solução**: Após `anchor build`, copiar IDLs:
```bash
cp target/idl/*.json ../powersol-backend/idl/
```

### Problema: "Transaction simulation failed"
**Solução**: Verificar se:
1. Wallet tem SOL suficiente (airdrop devnet)
2. Program IDs estão corretos no .env
3. PDAs estão sendo calculados corretamente

---

## 📊 CHECKLIST FINAL

### Antes de considerar completo:

- [ ] `anchor build` sem erros
- [ ] `anchor test` passa todos os testes
- [ ] Backend `npm run build` sem erros
- [ ] Frontend `npm run build` sem erros
- [ ] Consegue criar uma loteria via API
- [ ] Consegue comprar um ticket via frontend
- [ ] Consegue executar um sorteio
- [ ] Consegue fazer claim de prêmio
- [ ] Sistema de afiliados registra comissões
- [ ] Missões são verificadas e recompensadas

---

## 🔗 ARQUIVOS IMPORTANTES PARA REFERÊNCIA

### Types já implementados (usar como referência):
- `powersol-backend/src/types/lottery.types.ts`
- `powersol-backend/src/types/solana.types.ts`
- `powersol-backend/src/types/claim.types.ts`

### Services que chamam Anchor:
- `powersol-backend/src/services/solana.service.ts`
- `powersol-backend/src/services/anchor-integration.service.ts`
- `powersol-backend/src/services/lottery.service.ts`

### Configurações de loteria:
- `powersol-backend/src/config/lotteries.ts` - Configs de cada tipo

---

## 💡 DICAS DE DESENVOLVIMENTO

1. **Comece sempre pelo Rust/Anchor** - O resto depende disso
2. **Use anchor test** - Testa tudo antes de deploy
3. **Deploy em devnet primeiro** - Nunca em mainnet direto
4. **Valide PDAs manualmente** - Use `findProgramAddressSync` no Node
5. **Logs são seus amigos** - Use `msg!()` no Rust e `logger.info()` no Node

---

## 🚀 COMANDOS RÁPIDOS

```bash
# Anchor
cd powersol-programs
anchor build
anchor test
anchor deploy --provider.cluster devnet

# Backend
cd powersol-backend
npm install
npm run build
npm run dev

# Frontend
cd frontend
npm install
npm run build
npm run dev
```

---

## ✅ QUANDO ESTIVER PRONTO

Sistema completo funcionando quando você conseguir:

1. Abrir frontend em localhost
2. Conectar wallet Phantom/Solflare
3. Ver loterias ativas
4. Comprar um ticket
5. Aguardar sorteio (ou simular)
6. Ganhar e fazer claim
7. Ver transação na Solana Explorer

**BOA SORTE! 🎰💰**
