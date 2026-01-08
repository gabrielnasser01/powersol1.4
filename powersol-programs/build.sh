#!/bin/bash

set -e

echo "🔨 Building PowerSOL Anchor Programs..."
echo ""

cd "$(dirname "$0")"

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found!"
    echo "Install: cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked"
    exit 1
fi

echo "✅ Anchor CLI found"
echo ""

echo "📦 Building programs..."
anchor build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📄 Generated files:"
    echo "  - target/deploy/powersol_core.so"
    echo "  - target/deploy/powersol_claim.so"
    echo "  - target/idl/powersol_core.json"
    echo "  - target/idl/powersol_claim.json"
    echo ""
    echo "🔑 Program IDs:"
    solana-keygen pubkey target/deploy/powersol_core-keypair.json
    solana-keygen pubkey target/deploy/powersol_claim-keypair.json
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
