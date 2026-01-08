#!/bin/bash

set -e

echo "⚠️  DEPLOYING TO MAINNET - ARE YOU SURE?"
echo ""
read -p "Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Deploying PowerSOL Programs to Mainnet..."
echo ""

cd "$(dirname "$0")"

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found!"
    exit 1
fi

echo "🌐 Setting cluster to mainnet..."
solana config set --url mainnet-beta

echo ""
echo "💰 Checking balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "❌ Insufficient balance! Need at least 5 SOL for deployment."
    exit 1
fi

echo ""
echo "🔨 Building programs with verifiable build..."
anchor build --verifiable

echo ""
echo "📤 Deploying to mainnet..."
anchor deploy --provider.cluster mainnet

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
    echo "  - Anchor.toml [programs.mainnet]"
    echo "  - Backend .env production"
    echo ""
    echo "🔍 Verify programs on Solana Explorer:"
    echo "https://explorer.solana.com/address/$(solana-keygen pubkey target/deploy/powersol_core-keypair.json)"
    echo "https://explorer.solana.com/address/$(solana-keygen pubkey target/deploy/powersol_claim-keypair.json)"
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi
