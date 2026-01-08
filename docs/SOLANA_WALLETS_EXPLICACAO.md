# 🔐 Explicação Completa das Wallets PowerSOL

---

## 🤔 Por que temos 8 wallets diferentes?

Pensa assim: **é como ter várias contas bancárias, mas cada uma com uma função específica**.

---

## 🔑 AUTHORITY - A Carteira Mestra

### O que é?
A **única carteira com private key**. É a "conta corrente" do backend.

### Por que ela existe?
O backend precisa **assinar transações automaticamente** quando:
- Usuário compra um ticket
- Backend distribui o dinheiro entre as pools
- Sistema paga prêmios aos vencedores

### Analogia:
```
AUTHORITY = Gerente do banco (pode mover dinheiro entre cofres)
```

### Como funciona na prática?

#### 1. Usuário compra ticket de 1 SOL:
```
User → 1 SOL → AUTHORITY
```

#### 2. Backend redistribui automaticamente:
```
AUTHORITY → 0.30 SOL → TREASURY (30%)
AUTHORITY → 0.20 SOL → AFFILIATES (20%)
AUTHORITY → 0.10 SOL → DELTA (10%)
AUTHORITY → 0.40 SOL → LOTTERY_DAILY (40%)
```

#### 3. Após o sorteio (exemplo: vencedor ganha 10 SOL):
```
AUTHORITY → 10 SOL → Carteira do Vencedor
```

---

## 💰 As Outras 7 Wallets - "Cofres Públicos"

### Por que NÃO têm private key?

#### 1. **Segurança**
- Se hackearem o servidor, só pegam a AUTHORITY
- Os prêmios acumulados ficam **isolados**
- Impossível roubar diretamente dos cofres

#### 2. **Transparência**
- Qualquer um pode ver os saldos no Explorer
- Comunidade pode auditar os valores
- Prova que o dinheiro está lá

#### 3. **Compliance**
- Fundos de usuários separados dos operacionais
- Auditoria clara de onde cada centavo vai
- Proteção contra fraude interna

---

## 📊 As 8 Wallets e Suas Funções

### 1️⃣ AUTHORITY
```
7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp
```
- **Tem private key:** ✅ SIM
- **Função:** Executar todas as operações do backend
- **Quem acessa:** Servidor backend apenas
- **Saldo ideal:** 2-5 SOL (para gas fees)

---

### 2️⃣ TREASURY (Tesouro)
```
GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1
```
- **Tem private key:** ❌ NÃO
- **Função:** Recebe 30% de todos os tickets vendidos
- **Para que serve:** Custos operacionais, marketing, desenvolvimento
- **Transparência:** 100% público no Explorer

---

### 3️⃣ AFFILIATES_POOL (Pool de Afiliados)
```
D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8
```
- **Tem private key:** ❌ NÃO
- **Função:** Recebe até 30% dos tickets para pagar afiliados
- **Como funciona:** Se afiliado trouxe 10% do volume → recebe 10% daqui
- **Saldo restante:** Vai para o DELTA

---

### 4️⃣ DELTA (Sobra de Afiliados)
```
9uCFiTZBbct66rxR5gw9BnvRKaH8NxqdyXZgf9X5XoST
```
- **Tem private key:** ❌ NÃO
- **Função:** Recebe a diferença entre 30% e o que foi pago a afiliados
- **Exemplo:** Se afiliados levaram 20%, DELTA fica com 10%
- **Uso:** Pode ser realocado para prêmios, marketing, etc

---

### 5️⃣ LOTTERY_DAILY (Loteria Diária)
```
C9R3HKUja4ppcMVWY8rLjqtUjaMySVVptEXtuc728Wiy
```
- **Tem private key:** ❌ NÃO
- **Função:** Prize pool da loteria diária
- **Como funciona:** Recebe % dos tickets diários, acumula até o sorteio
- **Transparência:** Todos podem ver o prêmio crescendo

---

### 6️⃣ LOTTERY_WEEKLY (Loteria Semanal)
```
4BA1gg2Tiq992nsHDb16evrkDMQidoKvHSb2HCHUmtA6
```
- **Tem private key:** ❌ NÃO
- **Função:** Prize pool da loteria semanal
- **Diferença:** Prêmios maiores, menos sorteios

---

### 7️⃣ LOTTERY_MEGA (Mega Loteria)
```
CpQeMyS8oAQwLqpeLSX1wGR1rdjuVRzzf2CoQvGprw3d
```
- **Tem private key:** ❌ NÃO
- **Função:** Prize pool da mega loteria (prêmios massivos)
- **Como funciona:** Acumula por mais tempo, jackpots enormes

---

### 8️⃣ SPECIAL_EVENT (Eventos Especiais)
```
HjA3E9v6D2sHFbQCHhJr4HfTbLsRfCWNbkodVNwFw7ht
```
- **Tem private key:** ❌ NÃO
- **Função:** Prize pool para eventos especiais
- **Exemplos:**
  - Halloween (já fizemos!)
  - Natal
  - Ano Novo
  - Dia das Bruxas
  - Black Friday
- **Como funciona:** Pode receber % de qualquer loteria ou doações

---

## 🔄 Fluxo Completo de Dinheiro

### Exemplo: Usuário compra 1 ticket de 1 SOL na loteria DAILY

```mermaid
User Wallet (1 SOL)
    ↓
AUTHORITY (recebe 1 SOL)
    ↓
Backend redistribui automaticamente:
    ├── 0.30 SOL → TREASURY
    ├── 0.20 SOL → AFFILIATES_POOL (se tiver afiliado)
    ├── 0.10 SOL → DELTA (30% - 20%)
    └── 0.40 SOL → LOTTERY_DAILY

Depois do sorteio:
AUTHORITY → Prize → Vencedor (0.40 SOL)
```

---

## 🛡️ Segurança: Por que esse modelo é melhor?

### ❌ Modelo RUIM (tudo numa wallet):
```
Backend tem private key de TUDO
    ↓
Se hackearem: GAME OVER
    ↓
Roubam prêmios acumulados de ANOS
```

### ✅ Modelo BOM (PowerSOL):
```
Backend só tem AUTHORITY
    ↓
Se hackearem: Perdem só o que tem na AUTHORITY
    ↓
Prize pools ISOLADAS e SEGURAS
    ↓
Dinheiro dos usuários PROTEGIDO
```

---

## 💡 Como o Backend Move Dinheiro sem Private Keys?

**Resposta:** Ele NÃO move. Ele ENVIA de onde tem a chave.

### Passo a Passo:

1. **Recebe na AUTHORITY** (tem a chave)
2. **Redistribui DA AUTHORITY** para as outras (usa a chave da AUTHORITY)
3. **Prêmios saem DA AUTHORITY** para vencedores (usa a chave da AUTHORITY)

### As outras wallets são "read-only":
```javascript
// Backend PODE fazer isso:
const balance = await getBalance("LOTTERY_DAILY");
console.log(`Prêmio acumulado: ${balance} SOL`);

// Backend NÃO PODE fazer isso:
await transfer("LOTTERY_DAILY", "hacker-wallet", 9999);
// ERROR: Missing private key!
```

---

## 🔍 Como Verificar Tudo Isso?

### 1. Ver que AUTHORITY tem private key:
```bash
cat .env | grep SOLANA_AUTHORITY_PRIVATE
```

### 2. Ver que as outras NÃO têm:
```bash
cat .env | grep -A 1 "TREASURY\|AFFILIATES\|DELTA\|LOTTERY"
# Nenhuma tem campo "PRIVATE"
```

### 3. Ver saldos públicos no Explorer:
```
https://explorer.solana.com/address/[ENDEREÇO]?cluster=devnet
```

---

## 🎯 Resumo em 3 Pontos

1. **AUTHORITY = Única com chave privada**
   - Backend pode assinar transações
   - Move dinheiro entre wallets
   - Paga prêmios aos vencedores

2. **Outras 7 = Cofres públicos**
   - Só recebem dinheiro
   - Não podem enviar (sem chave!)
   - 100% transparentes

3. **Por que assim?**
   - Segurança (limita dano de hack)
   - Transparência (comunidade audita)
   - Compliance (fundos separados)

---

## 📚 Analogia Final: Banco Tradicional

```
AUTHORITY = Gerente do banco
    - Pode mover dinheiro entre cofres
    - Autoriza pagamentos
    - Executa operações

TREASURY = Cofre operacional
    - Recebe dinheiro da operação
    - Paga custos, salários, etc

AFFILIATES = Cofre de comissões
    - Recebe dinheiro para pagar vendedores
    - Distribuído conforme performance

DELTA = Cofre de reserva
    - Sobra de comissões
    - Pode ser realocado

LOTTERIES = Cofres de prêmios
    - Dinheiro dos apostadores
    - Isolado da operação
    - Pago aos vencedores

SPECIAL_EVENT = Cofre de promoções
    - Eventos especiais
    - Marketing diferenciado
```

---

**🔐 Guarde a private key da AUTHORITY com MUITO cuidado!**

Se perder = perde controle de TUDO
Se vazar = podem esvaziar a AUTHORITY

**Dica:** Use 1Password, Bitwarden ou hardware wallet (Ledger) no mainnet!

---

**Criado pelo PowerSOL System**
