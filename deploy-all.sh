#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🎰 PowerSOL - Deploy Sistema Completo   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# ============================================
# PASSO 1: Verificar Ferramentas
# ============================================
echo -e "${BLUE}📋 Verificando ferramentas necessárias...${NC}"
echo ""

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 não encontrado!${NC}"
        echo -e "${YELLOW}Instale primeiro: $2${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ $1 encontrado${NC}"
    fi
}

check_command "node" "https://nodejs.org/"
check_command "rustc" "https://rustup.rs/"
check_command "solana" "https://docs.solana.com/cli/install-solana-cli-tools"
check_command "anchor" "cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked"

echo ""

# ============================================
# PASSO 2: Setup Solana Wallet
# ============================================
echo -e "${BLUE}🔑 Configurando Solana Wallet...${NC}"
echo ""

WALLET_PATH="$HOME/.config/solana/id.json"

if [ ! -f "$WALLET_PATH" ]; then
    echo -e "${YELLOW}⚠️  Wallet não encontrada. Criando nova...${NC}"
    solana-keygen new --outfile "$WALLET_PATH" --no-bip39-passphrase
    echo -e "${GREEN}✅ Wallet criada em $WALLET_PATH${NC}"
else
    echo -e "${GREEN}✅ Wallet já existe em $WALLET_PATH${NC}"
fi

echo ""

# Configurar devnet
echo -e "${BLUE}🌐 Configurando cluster devnet...${NC}"
solana config set --url devnet
echo -e "${GREEN}✅ Cluster configurado para devnet${NC}"
echo ""

# Verificar balance e fazer airdrop se necessário
echo -e "${BLUE}💰 Verificando balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo "Balance atual: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Balance baixo! Solicitando airdrop...${NC}"
    solana airdrop 2 || echo -e "${YELLOW}⚠️  Airdrop falhou, mas continuando...${NC}"
    sleep 2
    BALANCE=$(solana balance | awk '{print $1}')
    echo "Novo balance: $BALANCE SOL"
fi

echo ""

# ============================================
# PASSO 3: Build e Deploy Anchor Programs
# ============================================
echo -e "${BLUE}🔨 Building Anchor Programs...${NC}"
echo ""

cd "$PROJECT_ROOT/powersol-programs"

echo "📦 Compilando programas..."
anchor build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build falhou!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build concluído!${NC}"
echo ""

# ============================================
# PASSO 4: Deploy em Devnet
# ============================================
echo -e "${BLUE}🚀 Deploying para devnet...${NC}"
echo ""

anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deploy falhou!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""

# Pegar Program IDs
echo -e "${BLUE}🔑 Program IDs:${NC}"
CORE_ID=$(solana-keygen pubkey target/deploy/powersol_core-keypair.json)
CLAIM_ID=$(solana-keygen pubkey target/deploy/powersol_claim-keypair.json)

echo "powersol-core:  $CORE_ID"
echo "powersol-claim: $CLAIM_ID"
echo ""

# ============================================
# PASSO 5: Atualizar Program IDs no Código
# ============================================
echo -e "${BLUE}📝 Atualizando Program IDs no código...${NC}"
echo ""

# Atualizar powersol-core/src/lib.rs
sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$CORE_ID\")/" programs/powersol-core/src/lib.rs
echo -e "${GREEN}✅ Atualizado programs/powersol-core/src/lib.rs${NC}"

# Atualizar powersol-claim/src/lib.rs
sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$CLAIM_ID\")/" programs/powersol-claim/src/lib.rs
echo -e "${GREEN}✅ Atualizado programs/powersol-claim/src/lib.rs${NC}"

# Atualizar Anchor.toml
sed -i.bak "s/powersol_core = \".*\"/powersol_core = \"$CORE_ID\"/" Anchor.toml
sed -i.bak "s/powersol_claim = \".*\"/powersol_claim = \"$CLAIM_ID\"/" Anchor.toml
echo -e "${GREEN}✅ Atualizado Anchor.toml${NC}"

echo ""

# Rebuild com novos IDs
echo -e "${BLUE}🔨 Rebuild com novos Program IDs...${NC}"
anchor build

echo -e "${BLUE}🚀 Redeploy...${NC}"
anchor deploy --provider.cluster devnet

echo -e "${GREEN}✅ Programs atualizados e redeployados!${NC}"
echo ""

# ============================================
# PASSO 6: Copiar IDLs para Backend
# ============================================
echo -e "${BLUE}📄 Copiando IDLs para backend...${NC}"
echo ""

mkdir -p "$PROJECT_ROOT/powersol-backend/src/lib/idl"

cp target/idl/powersol_core.json "$PROJECT_ROOT/powersol-backend/src/lib/idl/"
cp target/idl/powersol_claim.json "$PROJECT_ROOT/powersol-backend/src/lib/idl/"

echo -e "${GREEN}✅ IDLs copiados para powersol-backend/src/lib/idl/${NC}"
echo ""

# ============================================
# PASSO 7: Configurar Backend
# ============================================
echo -e "${BLUE}⚙️  Configurando backend...${NC}"
echo ""

cd "$PROJECT_ROOT/powersol-backend"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do backend..."
    npm install
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
else
    echo -e "${GREEN}✅ Dependências já instaladas${NC}"
fi

echo ""

# Verificar se .env existe
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Arquivo .env criado a partir de .env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example não encontrado${NC}"
    fi
fi

# Atualizar .env com Program IDs
if [ -f ".env" ]; then
    echo -e "${BLUE}📝 Atualizando .env com Program IDs...${NC}"

    # Backup do .env
    cp .env .env.backup

    # Atualizar Program IDs
    sed -i.bak "s|POWERSOL_CORE_PROGRAM_ID=.*|POWERSOL_CORE_PROGRAM_ID=$CORE_ID|" .env
    sed -i.bak "s|POWERSOL_CLAIM_PROGRAM_ID=.*|POWERSOL_CLAIM_PROGRAM_ID=$CLAIM_ID|" .env

    # Atualizar RPC URL para devnet
    sed -i.bak "s|RPC_URL=.*|RPC_URL=https://api.devnet.solana.com|" .env

    echo -e "${GREEN}✅ .env atualizado${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Você precisará criá-lo manualmente.${NC}"
fi

echo ""

# ============================================
# PASSO 8: Atualizar Frontend .env
# ============================================
echo -e "${BLUE}⚙️  Atualizando frontend .env...${NC}"
echo ""

cd "$PROJECT_ROOT/frontend"

if [ -f ".env" ]; then
    # Backup do .env
    cp .env .env.backup

    # Atualizar Program IDs
    sed -i.bak "s|VITE_POWERSOL_CORE_PROGRAM_ID=.*|VITE_POWERSOL_CORE_PROGRAM_ID=$CORE_ID|" .env
    sed -i.bak "s|VITE_POWERSOL_CLAIM_PROGRAM_ID=.*|VITE_POWERSOL_CLAIM_PROGRAM_ID=$CLAIM_ID|" .env

    # Atualizar RPC URL para devnet
    sed -i.bak "s|VITE_RPC_URL=.*|VITE_RPC_URL=https://api.devnet.solana.com|" .env

    echo -e "${GREEN}✅ Frontend .env atualizado${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend .env não encontrado${NC}"
fi

echo ""

# ============================================
# RESUMO FINAL
# ============================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       🎉 DEPLOY CONCLUÍDO COM SUCESSO!    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 RESUMO:${NC}"
echo ""
echo -e "${GREEN}✅ Wallet Solana configurada${NC}"
echo -e "${GREEN}✅ Programas Anchor compilados${NC}"
echo -e "${GREEN}✅ Programas deployados em devnet${NC}"
echo -e "${GREEN}✅ Program IDs atualizados${NC}"
echo -e "${GREEN}✅ IDLs copiados para backend${NC}"
echo -e "${GREEN}✅ Backend configurado${NC}"
echo -e "${GREEN}✅ Frontend .env atualizado${NC}"
echo ""

echo -e "${BLUE}🔑 PROGRAM IDs:${NC}"
echo "powersol-core:  $CORE_ID"
echo "powersol-claim: $CLAIM_ID"
echo ""

echo -e "${BLUE}🌐 EXPLORER:${NC}"
echo "https://explorer.solana.com/address/$CORE_ID?cluster=devnet"
echo "https://explorer.solana.com/address/$CLAIM_ID?cluster=devnet"
echo ""

echo -e "${BLUE}📝 PRÓXIMOS PASSOS:${NC}"
echo ""
echo "1. Configure AUTHORITY_WALLET_SECRET no backend/.env:"
echo "   cd powersol-backend"
echo "   npm run generate-keypair"
echo ""
echo "2. Inicie o backend:"
echo "   cd powersol-backend"
echo "   npm run dev"
echo ""
echo "3. Em outro terminal, inicie o frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Acesse http://localhost:5173 e teste!"
echo ""

echo -e "${GREEN}🚀 Sistema pronto para uso!${NC}"
echo ""
