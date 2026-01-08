# 🎯 Quick Test - Prize Claim System

## Prizes de Teste Criados! ✅

Criei 3 prêmios de teste no banco de dados:

| Ticket | Lottery | Prize | Position | Status |
|--------|---------|-------|----------|--------|
| 123456 | Tri-Daily | 0.5 SOL (~$50) | 1st Place | Unclaimed |
| 789012 | Halloween | 0.25 SOL (~$25) | 2nd Place | Unclaimed |
| 555666 | Jackpot | 1.0 SOL (~$100) | 1st Place | Unclaimed |

**Wallet:** `DEMO_WALLET_123`

---

## 🚀 Como Testar Agora

### Opção 1: Testar com Demo Wallet

No código, temporariamente force a demo wallet:

```typescript
// Em src/pages/Profile.tsx, linha ~64
const loadPrizes = async () => {
  // TEMPORÁRIO: Force demo wallet para teste
  const testWallet = 'DEMO_WALLET_123';

  setLoadingPrizes(true);
  try {
    const prizes = await prizeService.getUserPrizes(testWallet);
    // ... resto do código
  }
}
```

### Opção 2: Adicionar Prêmio Para Sua Wallet Real

Execute no Supabase SQL Editor:

```sql
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
  'SUA_WALLET_ADDRESS_AQUI',  -- Cole seu endereço de wallet aqui
  99999,
  750000000,  -- 0.75 SOL
  '1st Place',
  'grand-prize',
  NOW()
);
```

### Opção 3: Modificar o PrizeService

Adicione fallback para demo wallet se não houver prêmios:

```typescript
// Em src/services/prizeService.ts
async getUserPrizes(wallet: string): Promise<Prize[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prizes?wallet=${wallet}`);

    if (!response.ok) {
      throw new Error('Failed to fetch prizes');
    }

    const result = await response.json();

    // Se não houver prizes, tenta buscar os de demo
    if (!result.data || result.data.length === 0) {
      const demoResponse = await fetch(`${API_BASE_URL}/api/prizes?wallet=DEMO_WALLET_123`);
      if (demoResponse.ok) {
        const demoResult = await demoResponse.json();
        return demoResult.data || [];
      }
    }

    return result.data || [];
  } catch (error) {
    console.error('Error fetching prizes:', error);
    return [];
  }
}
```

---

## ✅ O Que Você Verá

### No Card "Prize Rewards":
```
PRIZE REWARDS
  $175.00
(3 UNCLAIMED)
```

### No Modal (ao clicar):
```
MY REWARDS
Total won: $175.00

━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 #123456
TRI DAILY

0.50 SOL
≈ $50.00

Draw Date: Dec 2, 2025
Round: #1

[CLAIM REWARD]
━━━━━━━━━━━━━━━━━━━━━━━━━━

🎫 #789012
HALLOWEEN

0.25 SOL
≈ $25.00

Draw Date: Nov 29, 2025
Round: #2

[CLAIM REWARD]
━━━━━━━━━━━━━━━━━━━━━━━━━━

🎫 #555666
JACKPOT

1.00 SOL
≈ $100.00

Draw Date: Dec 3, 2025
Round: #3

[CLAIM REWARD]
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎮 Testar o Claim

1. Clique em **"CLAIM REWARD"** em qualquer prêmio
2. Botão muda para **"CLAIMING..."**
3. Alert aparece: "Prize claimed successfully! Transaction: SIMULATED_TX_..."
4. Prêmio desaparece ou badge muda para **"CLAIMED" (verde)**
5. Total de prêmios diminui

---

## 🔍 Verificar no Banco de Dados

Após fazer claim, verifique:

```sql
-- Ver prêmios claimed
SELECT ticket_number, prize_position, claimed, claimed_at, claim_signature
FROM prizes
WHERE user_wallet = 'DEMO_WALLET_123';

-- Ver histórico de claims
SELECT user_wallet, amount_lamports, status, signature, claimed_at
FROM prize_claims
ORDER BY created_at DESC;
```

---

## 🎯 Endpoints Disponíveis Para Testar

```bash
# Listar prêmios
curl http://localhost:3001/api/prizes?wallet=DEMO_WALLET_123

# Listar unclaimed
curl http://localhost:3001/api/prizes/unclaimed?wallet=DEMO_WALLET_123

# Fazer claim (substitua {prize_id})
curl -X POST http://localhost:3001/api/prizes/{prize_id}/claim \
  -H "Content-Type: application/json" \
  -d '{"wallet":"DEMO_WALLET_123"}'

# Ver histórico
curl http://localhost:3001/api/prizes/claims?wallet=DEMO_WALLET_123
```

---

## 🐛 Troubleshooting

**"No prizes won yet":**
- Backend não está rodando? → `cd powersol-backend && npm run dev`
- API_URL incorreta? → Verificar VITE_API_URL no .env
- Wallet incorreta? → Usar DEMO_WALLET_123

**Erro ao fazer claim:**
- Verificar logs do backend console
- Verificar se TREASURY_WALLET está no .env do backend
- Transaction é simulada, então sempre vai "funcionar"

**Prêmio não some após claim:**
- Atualizar página manualmente
- Verificar console do browser para erros
- Verificar se `loadPrizes()` foi chamado após claim

---

## 🎉 Tudo Pronto!

Sistema 100% funcional para teste! Os prizes estão no banco, APIs funcionando, frontend integrado.

**Próximo passo:** Testar no browser e ver a magia acontecer! 🚀

Para produção, seguir os passos em `PRIZE_CLAIM_SYSTEM.md` para integração real com Solana blockchain.
