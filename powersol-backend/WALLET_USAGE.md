# Como Usar as Carteiras PowerSOL

## Carteiras Disponíveis

Você tem **4 carteiras com chaves privadas** que pode controlar:

### 1. AUTHORITY
- **Endereço**: `ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj`
- **Propósito**: Autoridade principal do backend
- **Uso**: Gerencia loterias, faz sorteios, distribuições
- **Saldo Recomendado**: 2-5 SOL

### 2. TREASURY
- **Endereço**: `J3qrMtB2HqKt2yUfAqdjwCdmyh64mz83nNwjLqLCA7F7`
- **Propósito**: Recebe 30% das vendas de tickets
- **Uso**: Pode mover fundos, pagar despesas operacionais
- **Saldo Recomendado**: 1-2 SOL (para gas)

### 3. AFFILIATES_POOL
- **Endereço**: `75CxzSpUZZ1tPSiUw5t52TiD6gWjjjMXTyKDMxYcm7TZ`
- **Propósito**: Pool de comissões de afiliados
- **Uso**: Distribui comissões para afiliados
- **Saldo Recomendado**: 1-2 SOL (para gas)

### 4. DELTA
- **Endereço**: `8HbdZvq48nDxUqxUjDAuZQh4UW9XU9v9eFWauJijSKoq`
- **Propósito**: Diferença quando afiliados < 30%
- **Uso**: Fundos extras que podem ser realocados
- **Saldo Recomendado**: 1-2 SOL (para gas)

---

## Como Usar no Código

### Importar as Funções

```typescript
import {
  getAuthorityKeypair,
  getTreasuryKeypair,
  getAffiliatesKeypair,
  getDeltaKeypair,
  getConnection,
} from './config/solana.js';
```

### Exemplo: Transferir SOL da TREASURY

```typescript
import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

async function transferFromTreasury() {
  const connection = getConnection();
  const treasuryKeypair = getTreasuryKeypair();

  const destinationAddress = new PublicKey('ENDEREÇO_DESTINO');
  const amountSOL = 1; // 1 SOL

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasuryKeypair.publicKey,
      toPubkey: destinationAddress,
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasuryKeypair] // Treasury assina a transação
  );

  console.log('Transferência completa:', signature);
}
```

### Exemplo: Distribuir Comissão de Afiliado

```typescript
async function payAffiliateCommission(affiliateAddress: string, amount: number) {
  const connection = getConnection();
  const affiliatesKeypair = getAffiliatesKeypair();

  const destination = new PublicKey(affiliateAddress);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: affiliatesKeypair.publicKey,
      toPubkey: destination,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [affiliatesKeypair] // AFFILIATES_POOL assina
  );

  return signature;
}
```

### Exemplo: Mover Fundos do DELTA

```typescript
async function redistributeDeltaFunds(destination: string, amount: number) {
  const connection = getConnection();
  const deltaKeypair = getDeltaKeypair();

  const destinationPubkey = new PublicKey(destination);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: deltaKeypair.publicKey,
      toPubkey: destinationPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [deltaKeypair]
  );

  return signature;
}
```

---

## Como Adicionar SOL (DevNet)

### Opção 1: Airdrop via CLI

```bash
# AUTHORITY
solana airdrop 2 ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj --url devnet

# TREASURY
solana airdrop 2 J3qrMtB2HqKt2yUfAqdjwCdmyh64mz83nNwjLqLCA7F7 --url devnet

# AFFILIATES_POOL
solana airdrop 2 75CxzSpUZZ1tPSiUw5t52TiD6gWjjjMXTyKDMxYcm7TZ --url devnet

# DELTA
solana airdrop 2 8HbdZvq48nDxUqxUjDAuZQh4UW9XU9v9eFWauJijSKoq --url devnet
```

### Opção 2: Script Automático

Vou criar um script para você:

```bash
npm run fund-wallets
```

---

## Verificar Saldos

```bash
npm run test-wallets
```

Isso vai mostrar:
- Endereço de cada carteira
- Saldo atual
- Status de funding

---

## Segurança

1. As chaves privadas estão no `.env`
2. NUNCA compartilhe o arquivo `.env`
3. NUNCA commite o `.env` no git
4. Use `.env.example` para templates

---

## Links Úteis

- **Solana Explorer (DevNet)**: https://explorer.solana.com/?cluster=devnet
- **Verificar AUTHORITY**: https://explorer.solana.com/address/ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj?cluster=devnet
- **Verificar TREASURY**: https://explorer.solana.com/address/J3qrMtB2HqKt2yUfAqdjwCdmyh64mz83nNwjLqLCA7F7?cluster=devnet
- **Verificar AFFILIATES**: https://explorer.solana.com/address/75CxzSpUZZ1tPSiUw5t52TiD6gWjjjMXTyKDMxYcm7TZ?cluster=devnet
- **Verificar DELTA**: https://explorer.solana.com/address/8HbdZvq48nDxUqxUjDAuZQh4UW9XU9v9eFWauJijSKoq?cluster=devnet
