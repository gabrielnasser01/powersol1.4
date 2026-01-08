# Como Testar o Sistema de Afiliados

Sistema completo de tracking de afiliados foi implementado. Agora quando alguém usa seu link de referral, tudo é registrado automaticamente no banco de dados.

## O Que Foi Implementado

### 1. Banco de Dados
- ✅ Tabela `referrals` criada para rastrear quem foi referido
- ✅ Campos: usuário referido, afiliado que referiu, código usado, validação, compras, comissões
- ✅ Funções helper para estatísticas

### 2. Backend
- ✅ Auth registra referral code quando usuário se conecta pela primeira vez
- ✅ Tickets calculam e registram comissão automaticamente
- ✅ Endpoints para buscar estatísticas de afiliados
- ✅ Sistema de tiers baseado em referrals validados

### 3. Frontend
- ✅ Tracking automático de referral code no localStorage (PERMANENTE)
- ✅ Passa referral code ao conectar carteira
- ✅ Dashboard mostra dados reais da API

## Como Testar

### Passo 1: Copiar Seu Link
1. Conecte sua carteira no site
2. Vá em "Afiliados" ou "/affiliate-dashboard"
3. Copie seu link de afiliado (ex: `https://powersol.io?ref=ABC123`)

### Passo 2: Simular Novo Usuário
1. Abra uma **janela anônima** (Ctrl+Shift+N ou Cmd+Shift+N)
2. Cole seu link de afiliado na barra de endereços
3. Acesse o site

### Passo 3: Verificar Tracking no Navegador
Abra o Console do navegador (F12) e digite:
```javascript
localStorage.getItem('powersol_affiliate_ref')
```

Deve aparecer algo como:
```json
{"code":"ABC123","timestamp":1704412800000}
```

### Passo 4: Conectar Nova Carteira
1. Na janela anônima, conecte uma carteira DIFERENTE
2. Isso registrará o referral no banco de dados
3. Neste momento, na tabela `referrals` será criado um registro com:
   - `referred_user_id`: ID do novo usuário
   - `referrer_affiliate_id`: Seu ID de afiliado
   - `referral_code_used`: O código que você usou
   - `is_validated`: false (ainda não comprou)

### Passo 5: Primeira Compra (Validação)
1. Ainda na janela anônima, compre um ticket
2. Quando a compra for confirmada:
   - `is_validated` muda para `true`
   - `first_purchase_at` é preenchido
   - `total_tickets_purchased` incrementa
   - `total_value_sol` é atualizado
   - `total_commission_earned` é calculado baseado no seu tier
   - Sua comissão é adicionada em `affiliates.pending_earnings`

### Passo 6: Ver Resultados
1. Volte para sua conta (janela normal)
2. Vá no Dashboard de Afiliados
3. Você verá:
   - Total de Referrals (1)
   - Referrals Validados (1)
   - Comissões Ganhas
   - Taxa de Conversão
   - Lista de referidos com detalhes

## Como Verificar no Banco de Dados

### Ver Todos os Referrals
```sql
SELECT
  r.id,
  r.referral_code_used,
  r.is_validated,
  r.total_tickets_purchased,
  r.total_value_sol,
  r.total_commission_earned,
  u1.wallet_address as referrer_wallet,
  u2.wallet_address as referred_wallet
FROM referrals r
JOIN affiliates a ON a.id = r.referrer_affiliate_id
JOIN users u1 ON u1.id = a.user_id
JOIN users u2 ON u2.id = r.referred_user_id;
```

### Ver Estatísticas de Um Afiliado
```sql
SELECT * FROM get_affiliate_stats('seu-affiliate-id-aqui');
```

### Ver Seus Ganhos
```sql
SELECT
  total_earned,
  pending_earnings,
  manual_tier
FROM affiliates a
JOIN users u ON u.id = a.user_id
WHERE u.wallet_address = 'sua-carteira-aqui';
```

## Sistema de Tiers

### Tier 1 (Starter) - 5%
- 0 a 99 referrals validados
- Comissão: 5% do valor do ticket

### Tier 2 (Bronze) - 10%
- 100 a 999 referrals validados
- Comissão: 10% do valor do ticket

### Tier 3 (Silver) - 20%
- 1000 a 4999 referrals validados
- Comissão: 20% do valor do ticket

### Tier 4 (Gold) - 30%
- 5000+ referrals validados
- Comissão: 30% do valor do ticket

## Endpoints da API

### GET /affiliates/stats?user_id={userId}
Retorna estatísticas completas do afiliado

### GET /affiliates/referrals?user_id={userId}
Retorna lista de referidos com detalhes

## Fluxo Completo

```
1. Usuário clica no link → ref=ABC123 é salvo no localStorage
2. Usuário conecta carteira → Backend registra na tabela referrals
3. Usuário compra ticket → Sistema:
   - Valida o referral (is_validated = true)
   - Calcula comissão baseada no tier
   - Atualiza estatísticas (tickets, valor, comissão)
   - Adiciona comissão ao afiliado (pending_earnings)
4. Afiliado vê no dashboard → Dados em tempo real da API
```

## Importante

- Um usuário só pode ser referido UMA VEZ (constraint UNIQUE)
- O código fica salvo PERMANENTEMENTE no navegador
- Comissões são calculadas automaticamente na compra
- Sistema detecta e impede auto-referral
- Tier é calculado automaticamente (ou pode ser manual via admin)

## Teste Rápido (Developer)

```bash
# 1. Ver sua affiliate info
curl "http://localhost:3000/affiliates/stats?user_id=YOUR_USER_ID"

# 2. Ver seus referrals
curl "http://localhost:3000/affiliates/referrals?user_id=YOUR_USER_ID"

# 3. Simular compra de ticket
curl -X POST "http://localhost:3000/tickets/purchase" \
  -H "Content-Type: application/json" \
  -d '{"lottery_id":"ID","quantity":1,"tx_signature":"mock_sig"}'
```

Agora o sistema está completo e funcional!
