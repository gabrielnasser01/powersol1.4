#!/bin/bash

echo "💰 Financiando wallets PowerSOL no DEVNET..."
echo ""

# AUTHORITY (precisa de SOL para gas fees)
echo "1️⃣  Enviando 2 SOL para AUTHORITY..."
solana airdrop 2 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp --url devnet
echo ""

# Opcional: adicionar saldo de teste nas outras wallets
echo "2️⃣  Enviando 0.5 SOL para TREASURY..."
solana airdrop 0.5 GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1 --url devnet
echo ""

echo "3️⃣  Enviando 0.5 SOL para AFFILIATES_POOL..."
solana airdrop 0.5 D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8 --url devnet
echo ""

echo "✅ Pronto! Verificando saldos..."
echo ""

echo "═══════════════════════════════════════════════════════"
echo "SALDOS DAS WALLETS:"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "AUTHORITY:"
solana balance 7N4KaWeTRLoh4jTgBUPG7LPAjfwseCQDkxjSWEgzGynp --url devnet
echo ""

echo "TREASURY:"
solana balance GzCQJwtQK5qE5aivuNsxkjiEAzCbUcZzdN3jUnjob7w1 --url devnet
echo ""

echo "AFFILIATES_POOL:"
solana balance D7vuGdWj8cULtJNJ7AiudzguVrTp41SGAz14zpjkKVt8 --url devnet
echo ""

echo "DELTA:"
solana balance 9uCFiTZBbct66rxR5gw9BnvRKaH8NxqdyXZgf9X5XoST --url devnet
echo ""

echo "LOTTERY_DAILY:"
solana balance C9R3HKUja4ppcMVWY8rLjqtUjaMySVVptEXtuc728Wiy --url devnet
echo ""

echo "LOTTERY_WEEKLY:"
solana balance 4BA1gg2Tiq992nsHDb16evrkDMQidoKvHSb2HCHUmtA6 --url devnet
echo ""

echo "LOTTERY_MEGA:"
solana balance CpQeMyS8oAQwLqpeLSX1wGR1rdjuVRzzf2CoQvGprw3d --url devnet
echo ""

echo "SPECIAL_EVENT:"
solana balance HjA3E9v6D2sHFbQCHhJr4HfTbLsRfCWNbkodVNwFw7ht --url devnet
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ Todas as wallets financiadas!"
echo "═══════════════════════════════════════════════════════"
