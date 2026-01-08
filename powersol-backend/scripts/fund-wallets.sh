#!/bin/bash

echo "💰 Financiando Carteiras PowerSOL (DevNet)..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# AUTHORITY
echo "1️⃣  AUTHORITY"
solana airdrop 2 ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj --url devnet
sleep 2

# TREASURY
echo ""
echo "2️⃣  TREASURY"
solana airdrop 2 J3qrMtB2HqKt2yUfAqdjwCdmyh64mz83nNwjLqLCA7F7 --url devnet
sleep 2

# AFFILIATES_POOL
echo ""
echo "3️⃣  AFFILIATES_POOL"
solana airdrop 2 75CxzSpUZZ1tPSiUw5t52TiD6gWjjjMXTyKDMxYcm7TZ --url devnet
sleep 2

# DELTA
echo ""
echo "4️⃣  DELTA"
solana airdrop 2 8HbdZvq48nDxUqxUjDAuZQh4UW9XU9v9eFWauJijSKoq --url devnet

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Financiamento concluído!"
echo ""
echo "💡 Execute 'npm run test-wallets' para verificar os saldos"
