#!/bin/bash

set -e

echo "🚀 Deploying PowerSOL Programs to Devnet..."
echo ""

cd "$(dirname "$0")"

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found!"
    exit 1
fi

echo "🌐 Setting cluster to devnet..."
solana config set --url devnet

echo ""
echo "💰 Checking balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "⚠️  Low balance! Requesting airdrop..."
    solana airdrop 2
    echo "✅ Airdrop successful"
fi

echo ""
echo "🔨 Building programs..."
anchor build

echo ""
echo "📤 Deploying to devnet..."
anchor deploy --provider.cluster devnet

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🔑 Program IDs:"
    echo "powersol-core:"
    solana-keygen pubkey target/deploy/powersol_core-keypair.json
    echo ""
    echo "powersol-claim:"
    solana-keygen pubkey target/deploy/powersol_claim-keypair.json
    echo ""
    echo "📝 Update these IDs in:"
    echo "  - Anchor.toml [programs.devnet]"
    echo "  - Backend .env (POWERSOL_CORE_PROGRAM_ID, POWERSOL_CLAIM_PROGRAM_ID)"
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi
