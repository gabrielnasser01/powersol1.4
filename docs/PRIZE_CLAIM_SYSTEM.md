# 🏆 Prize Claim System - Solana Devnet Integration

## Overview

Sistema completo de claim de prêmios integrado com Solana blockchain (Devnet). Permite que usuários vejam e façam claim dos seus prêmios ganhos nas loterias.

---

## 📋 Arquitetura Implementada

### 1. **Database (Supabase)**

Tabelas criadas na migration `008_prizes_and_claims`:

#### `prizes`
- `id` - UUID do prêmio
- `draw_id` - ID do sorteio
- `round` - Número do round
- `user_wallet` - Endereço da wallet vencedora
- `ticket_number` - Número do ticket vencedor
- `prize_amount_lamports` - Valor em lamports
- `prize_position` - Posição ("1st Place", "2nd Place", etc)
- `lottery_type` - Tipo da loteria (tri-daily, halloween, jackpot, grand-prize)
- `draw_date` - Data do sorteio
- `claimed` - Boolean se foi claimed
- `claimed_at` - Timestamp do claim
- `claim_signature` - Assinatura da transação Solana

#### `prize_claims`
- `id` - UUID do claim
- `prize_id` - Referência ao prêmio
- `user_wallet` - Wallet que fez o claim
- `amount_lamports` - Valor claimed
- `signature` - Tx signature da Solana
- `status` - pending/completed/failed
- `error_message` - Mensagem de erro se falhou
- `claimed_at` - Timestamp

### 2. **Backend API**

#### Arquivos criados:
- `powersol-backend/src/services/prize-claim.service.ts`
- `powersol-backend/src/controllers/prize.controller.ts`
- `powersol-backend/src/routes/prize.routes.ts`

#### Endpoints disponíveis:

```
GET /api/prizes?wallet={address}
- Lista todos os prêmios de uma wallet

GET /api/prizes/unclaimed?wallet={address}
- Lista apenas prêmios não claimed

GET /api/prizes/:prizeId
- Busca prêmio específico

POST /api/prizes/:prizeId/claim
Body: { "wallet": "address" }
- Inicia e processa o claim de um prêmio

GET /api/prizes/claims?wallet={address}
- Histórico de claims de uma wallet
```

### 3. **Frontend**

#### Arquivos criados/modificados:
- `src/services/prizeService.ts` - Service para chamadas à API
- `src/pages/Profile.tsx` - Atualizado com integração real

#### Funcionalidades:

**Card "Prize Rewards":**
- Mostra total de prêmios em USD
- Mostra número de prêmios unclaimed
- Clicável para abrir modal

**Modal "MY REWARDS":**
- Lista todos os prêmios do usuário
- Mostra detalhes: ticket number, valor em SOL e USD, lottery type, draw date
- Badge visual: "CLAIMED" (verde) ou posição do prêmio
- Botão "CLAIM REWARD" apenas para prêmios não claimed
- Loading states e estados vazios

---

## 🚀 Como Testar

### Passo 1: Adicionar Prêmios de Teste no Supabase

Execute este SQL no Supabase SQL Editor:

```sql
-- Inserir prêmio de teste
INSERT INTO prizes (
  round,
  user_wallet,
  ticket_number,
  prize_amount_lamports,
  prize_position,
  lottery_type,
  draw_date
) VALUES (
  1,
  'YOUR_WALLET_ADDRESS_HERE',  -- Substitua pela sua wallet
  12345,
  500000000,  -- 0.5 SOL
  '1st Place',
  'tri-daily',
  NOW() - INTERVAL '1 day'
);

-- Inserir outro prêmio de teste
INSERT INTO prizes (
  round,
  user_wallet,
  ticket_number,
  prize_amount_lamports,
  prize_position,
  lottery_type,
  draw_date
) VALUES (
  2,
  'YOUR_WALLET_ADDRESS_HERE',  -- Substitua pela sua wallet
  67890,
  1000000000,  -- 1.0 SOL
  '1st Place',
  'jackpot',
  NOW() - INTERVAL '5 days'
);
```

### Passo 2: Configurar Variáveis de Ambiente

Verifique se o `.env` tem:

```env
# Frontend (.env)
VITE_API_URL=http://localhost:3001

# Backend (powersol-backend/.env)
SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_WALLET=<sua_wallet_treasury_devnet>
```

### Passo 3: Iniciar os Servidores

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd powersol-backend
npm run dev
```

### Passo 4: Testar no Browser

1. **Abra o app** → http://localhost:5173
2. **Vá para Profile** → /profile
3. **Conecte sua wallet** (use a mesma do SQL INSERT)
4. **Veja o card "Prize Rewards"**:
   - Deve mostrar o total em USD
   - Deve mostrar número de unclaimed prizes
5. **Clique no card** para abrir o modal
6. **Verifique os prêmios**:
   - Devem aparecer os 2 prêmios inseridos
   - Cada um com seu ticket number, valor, lottery type
   - Badge mostrando "1st Place"
   - Botão "CLAIM REWARD" visível
7. **Clique em "CLAIM REWARD"**:
   - Deve iniciar o processo (botão muda para "CLAIMING...")
   - Deve aparecer alert com sucesso e tx signature
   - Prêmio deve desaparecer ou mostrar badge "CLAIMED"

---

## 🔧 Estrutura do Fluxo de Claim

```
1. User clica "CLAIM REWARD"
   ↓
2. Frontend chama: POST /api/prizes/:prizeId/claim
   ↓
3. Backend valida:
   - Prêmio existe?
   - User é o dono?
   - Já foi claimed?
   ↓
4. Backend cria registro em prize_claims (status: pending)
   ↓
5. Backend cria transação Solana (atualmente simulada)
   ↓
6. Backend atualiza:
   - prize_claims (status: completed, signature)
   - prizes (claimed: true, claimed_at, claim_signature)
   ↓
7. Frontend recebe sucesso e recarrega prizes
   ↓
8. UI atualiza mostrando prêmio como "CLAIMED"
```

---

## 🎯 Próximos Passos (Para Produção)

### 1. Integração Real com Solana

Atualmente o `transferPrize()` está simulado. Para produção:

```typescript
// Em prize-claim.service.ts, substituir:
return 'SIMULATED_TX_' + Date.now();

// Por código real usando keypair da treasury:
const treasuryKeypair = Keypair.fromSecretKey(
  bs58.decode(process.env.TREASURY_PRIVATE_KEY!)
);

transaction.sign(treasuryKeypair);
const signature = await this.connection.sendRawTransaction(
  transaction.serialize()
);
await this.connection.confirmTransaction(signature);

return signature;
```

### 2. Deploy do Programa Anchor

```bash
cd powersol-programs

# Atualizar program ID
anchor build
anchor keys list

# Copiar program ID para lib.rs e Anchor.toml

# Deploy na devnet
anchor deploy --provider.cluster devnet

# Configurar no backend
CLAIM_PROGRAM_ID=<program_id_aqui>
```

### 3. Usar Programa Anchor para Claims

Integrar o programa `powersol-claim` no backend:

```typescript
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { PowersolClaim } from '../types/powersol_claim';

// Criar instrução de claim via programa
const tx = await program.methods
  .claimPrize(tier)
  .accounts({
    claimer: userPubkey,
    lotteryPool: poolPubkey,
    claim: claimPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 4. Notificações

Adicionar notificações quando um prêmio é ganho:
- Email
- Push notification
- Toast no app

### 5. Histórico Detalhado

Página dedicada para histórico completo de:
- Todos os prêmios (claimed e unclaimed)
- Transações de claim
- Filtros por lottery type, data, status

---

## 🐛 Troubleshooting

**Prêmios não aparecem:**
- Verifique se a wallet no SQL é a mesma conectada
- Verifique se o backend está rodando
- Check console do browser para erros de API

**Erro ao fazer claim:**
- Verifique logs do backend
- Confirme que TREASURY_WALLET está configurada
- Para produção: verificar se treasury tem SOL suficiente

**RLS blocking queries:**
- Policies estão configuradas para permitir leitura pública de prizes
- Service role pode inserir/update tudo
- Claims podem ser criados por qualquer um se o prize pertence à wallet

---

## ✅ Checklist de Validação

- [x] Tabelas criadas no Supabase
- [x] RLS configurada corretamente
- [x] Backend service implementado
- [x] API endpoints criados
- [x] Frontend service criado
- [x] Profile.tsx integrado
- [x] Loading states implementados
- [x] Error handling implementado
- [x] UI/UX polida com animações
- [ ] Programa Anchor deployed na devnet
- [ ] Integração real com blockchain
- [ ] Testes end-to-end completos
- [ ] Sistema de notificações

---

## 📝 Notas Importantes

1. **Devnet Only**: Sistema configurado para devnet. Para mainnet, trocar RPC_URL e usar mainnet program IDs.

2. **Simulação de Transfer**: Atualmente não transfere SOL real. Para produção, implementar keypair da treasury e assinatura real.

3. **Treasury Wallet**: Precisa ter SOL suficiente na devnet/mainnet para pagar os prizes.

4. **Gas Fees**: Em produção, considerar quem paga as gas fees (treasury ou user).

5. **Security**: RLS está configurada mas para produção adicionar rate limiting mais agressivo nos endpoints de claim.

---

## 🎉 Sistema Completo e Pronto!

O sistema de prize claims está totalmente integrado e funcional! Só falta:
1. Inserir prizes de teste no Supabase
2. Conectar wallet no app
3. Ver e fazer claim dos prêmios!

Para produção, seguir os "Próximos Passos" acima para integração real com Solana blockchain.
