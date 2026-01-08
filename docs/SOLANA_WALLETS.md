# 🔐 PowerSOL - Wallets Solana

> **Data:** 04/12/2024
> **Status:** Wallets geradas e configuradas

---

## 📋 Resumo das 7 Wallets

| # | Nome | Tipo | Função | Precisa Private Key? |
|---|------|------|--------|---------------------|
| 1 | **AUTHORITY** | Backend | Assina transações | ✅ SIM |
| 2 | **TREASURY** | Pool | 30% dos tickets | ❌ Não |
| 3 | **AFFILIATES_POOL** | Pool | Até 30% (afiliados) | ❌ Não |
| 4 | **DELTA** | Pool | Diferença restante | ❌ Não |
| 5 | **LOTTERY_DAILY** | Prize Pool | Prêmios Diários | ❌ Não |
| 6 | **LOTTERY_WEEKLY** | Prize Pool | Prêmios Semanais | ❌ Não |
| 7 | **LOTTERY_MEGA** | Prize Pool | Prêmios Mega | ❌ Não |

---

## 🎯 Wallets Geradas

### 1. AUTHORITY (Backend)
```
Public:  7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp
Private: [Ver .env - NUNCA compartilhar!]
```
**Função:** Assina todas as transações do backend

### 2. TREASURY
```
Address: GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1
```
**Função:** Recebe 30% do valor de cada ticket vendido

### 3. AFFILIATES_POOL
```
Address: D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8
```
**Função:** Pool para distribuição de comissões de afiliados (até 30%)

### 4. DELTA
```
Address: 9uCFiTZBbct66rxR5gw9BnvRKaH8NxqdyXZgf9X5XoST
```
**Função:** Recebe a diferença quando afiliados < 30%

### 5. LOTTERY_DAILY
```
Address: C9R3HKUja4ppcMVWY8rLjqtUjaMySVVptEXtuc728Wiy
```
**Função:** Prize Pool da loteria diária

### 6. LOTTERY_WEEKLY
```
Address: 4BA1gg2Tiq992nsHDb16evrkDMQidoKvHSb2HCHUmtA6
```
**Função:** Prize Pool da loteria semanal

### 7. LOTTERY_MEGA
```
Address: CpQeMyS8oAQwLqpeLSX1wGR1rdjuVRzzf2CoQvGprw3d
```
**Função:** Prize Pool da loteria mega

---

## 🔥 Exemplo de Distribuição

**Ticket vendido por 1 SOL:**

```
Total Ticket: 1.000 SOL

1. Treasury:         0.300 SOL (30%)
2. Affiliates:       0.200 SOL (20% - exemplo)
3. Delta:            0.100 SOL (10% - diferença para 30%)
4. Prize Pool:       0.400 SOL (40% - vai para LOTTERY_DAILY/WEEKLY/MEGA)
```

---

## ⚠️ SEGURANÇA

### ✅ Pode Compartilhar:
- Todos os endereços públicos
- Documentação deste arquivo

### ❌ NUNCA Compartilhe:
- Private Key da AUTHORITY
- Conteúdo do `.env`
- Arrays de bytes da private key

---

## 🚀 Próximos Passos

### 1. Financiar a AUTHORITY
```bash
# DEVNET (teste)
solana airdrop 2 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp --url devnet

# MAINNET (produção)
# Transferir manualmente 2-5 SOL para gas fees
```

### 2. Verificar Saldos
```bash
# Ver saldo AUTHORITY
solana balance 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp --url devnet

# Ver saldo TREASURY
solana balance GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1 --url devnet

# Ver todas
solana balance 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8 --url devnet
```

### 3. Integrar no Backend
- ✅ Wallets já estão no `.env`
- 🔄 Próximo: Criar serviço de distribuição
- 🔄 Próximo: Implementar lógica de split

---

## 📝 Notas Importantes

1. **AUTHORITY** é a única wallet que precisa de private key
2. Todas as outras são apenas endereços de destino
3. O backend usa AUTHORITY para assinar e enviar SOL para os outros pools
4. Em produção, considere usar um multisig para AUTHORITY

---

## 🔗 Links Úteis

- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)
- [Solana Explorer (Mainnet)](https://explorer.solana.com/)
- [Solana CLI Docs](https://docs.solana.com/cli)

---

**Gerado automaticamente pelo sistema PowerSOL**
