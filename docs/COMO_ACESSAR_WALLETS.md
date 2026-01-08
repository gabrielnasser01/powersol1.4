# 🔐 Como Acessar as Wallets de Teste

---

## 🎯 Opção 1: Importar AUTHORITY no Phantom (Recomendado)

### Passo a Passo:

1. **Abra o Phantom Wallet**
2. Clique no **ícone do menu** (☰)
3. Clique em **"Add / Connect Wallet"**
4. Escolha **"Import Private Key"**
5. Cole este código:

```
[117,251,9,143,142,152,11,99,138,224,197,55,139,6,34,171,119,148,119,80,24,249,34,106,49,11,122,101,122,79,237,10,94,139,18,165,17,120,33,20,165,188,117,220,158,106,136,136,146,1,239,194,6,68,4,187,103,70,6,53,13,113,153,73]
```

6. **Mude para DEVNET** no Phantom:
   - Settings → Developer Settings → **Testnet Mode ON**
   - Ou Settings → Network → **Devnet**

7. Pronto! Você verá o endereço:
   ```
   7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp
   ```

---

## 💰 Opção 2: Pegar SOL Grátis (Devnet)

### Via Terminal:
```bash
# Dar permissão ao script
chmod +x fund-wallets-devnet.sh

# Executar
./fund-wallets-devnet.sh
```

### Ou manualmente (um comando):
```bash
solana airdrop 2 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp --url devnet
```

### Via Web:
1. Acesse: https://faucet.solana.com/
2. Cole o endereço: `7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp`
3. Escolha **Devnet**
4. Clique em **"Get Airdrop"**

---

## 🌐 Opção 3: Ver Wallets no Explorer (Sem Importar)

Acesse direto no navegador para ver saldos e transações:

### 🔑 AUTHORITY (Backend)
```
https://explorer.solana.com/address/7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp?cluster=devnet
```

### 💰 TREASURY
```
https://explorer.solana.com/address/GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1?cluster=devnet
```

### 🤝 AFFILIATES_POOL
```
https://explorer.solana.com/address/D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8?cluster=devnet
```

### 📊 DELTA
```
https://explorer.solana.com/address/9uCFiTZBbct66rxR5gw9BnvRKaH8NxqdyXZgf9X5XoST?cluster=devnet
```

### 🎰 LOTTERY_DAILY
```
https://explorer.solana.com/address/C9R3HKUja4ppcMVWY8rLjqtUjaMySVVptEXtuc728Wiy?cluster=devnet
```

### 📅 LOTTERY_WEEKLY
```
https://explorer.solana.com/address/4BA1gg2Tiq992nsHDb16evrkDMQidoKvHSb2HCHUmtA6?cluster=devnet
```

### 🏆 LOTTERY_MEGA
```
https://explorer.solana.com/address/CpQeMyS8oAQwLqpeLSX1wGR1rdjuVRzzf2CoQvGprw3d?cluster=devnet
```

### 🎉 SPECIAL_EVENT
```
https://explorer.solana.com/address/HjA3E9v6D2sHFbQCHhJr4HfTbLsRfCWNbkodVNwFw7ht?cluster=devnet
```

---

## 🛠️ Opção 4: Ver Saldos via CLI

```bash
# Ver saldo da AUTHORITY
solana balance 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp --url devnet

# Ver todas de uma vez
solana balance \
  7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp \
  GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1 \
  D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8 \
  --url devnet
```

---

## ❓ FAQ

### 1. Posso importar as outras 6 wallets no Phantom?
**Não.** Só a AUTHORITY tem private key. As outras são apenas endereços de destino.

### 2. Como testar transferências?
**Opção A - Via Phantom:**
- Importe a AUTHORITY
- Use a interface do Phantom para enviar SOL

**Opção B - Via CLI:**
```bash
solana transfer <DESTINO> <QUANTIDADE> --keypair authority.json --url devnet
```

### 3. Quanto SOL preciso na AUTHORITY?
- **Devnet:** 2-5 SOL (grátis via airdrop)
- **Mainnet:** 2-5 SOL (~$400-$1000 USD)

### 4. E se eu perder a private key?
Não tem problema! É devnet (teste). Basta gerar novas wallets.

### 5. Como mudar para Mainnet depois?
Basta trocar `--url devnet` por `--url mainnet-beta` (ou mudar no Phantom).

---

## 🎯 Resumo Rápido

| Ação | Como Fazer |
|------|------------|
| **Ver saldos** | Explorer ou CLI |
| **Enviar SOL** | Phantom ou CLI |
| **Pegar SOL grátis** | `./fund-wallets-devnet.sh` |
| **Importar wallet** | Phantom → Import Private Key |

---

## ⚠️ IMPORTANTE

1. **NUNCA** compartilhe a private key da AUTHORITY
2. Só use DEVNET para testes
3. No MAINNET, use multisig para a AUTHORITY
4. Guarde a private key em local seguro (1Password, Bitwarden, etc)

---

**Criado pelo PowerSOL System**
