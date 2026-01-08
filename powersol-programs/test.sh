#!/bin/bash

set -e

echo "🧪 Testing PowerSOL Anchor Programs..."
echo ""

cd "$(dirname "$0")"

echo "🔨 Building programs..."
anchor build

echo ""
echo "🧪 Running tests..."
anchor test

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Tests failed!"
    exit 1
fi
