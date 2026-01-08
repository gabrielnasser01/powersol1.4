#!/bin/bash

# Script para integrar programas Anchor com repositório PowerSOL existente
# Uso: ./integrate-with-repo.sh /path/to/seu/powersol-repo

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PowerSOL - Integração com Repositório    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Verificar argumento
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Caminho do repositório não fornecido${NC}"
    echo ""
    echo "Uso: $0 /path/to/seu/powersol-repo"
    echo ""
    echo "Exemplo:"
    echo "  $0 ~/projetos/powersol"
    exit 1
fi

REPO_PATH="$1"

# Verificar se diretório existe
if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}❌ Erro: Diretório não encontrado: $REPO_PATH${NC}"
    exit 1
fi

# Verificar se é um repo PowerSOL
if [ ! -f "$REPO_PATH/Anchor.toml" ]; then
    echo -e "${RED}❌ Erro: Anchor.toml não encontrado em $REPO_PATH${NC}"
    echo "   Tem certeza que este é o diretório correto?"
    exit 1
fi

echo -e "${GREEN}✅ Repositório encontrado: $REPO_PATH${NC}"
echo ""

# Mostrar info do repo
echo -e "${BLUE}📋 Informações do Repositório:${NC}"
if [ -f "$REPO_PATH/package.json" ]; then
    REPO_NAME=$(grep -m 1 '"name"' "$REPO_PATH/package.json" | cut -d'"' -f4)
    echo "   Nome: $REPO_NAME"
fi
echo "   Anchor.toml: ✅"
echo ""

# Perguntar confirmação
read -p "Deseja integrar os programas Anchor neste repositório? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Operação cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Iniciando integração...${NC}"
echo ""

# 1. Criar backup
echo "📦 Criando backup..."
BACKUP_DIR="$REPO_PATH/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -d "$REPO_PATH/programs" ]; then
    cp -r "$REPO_PATH/programs" "$BACKUP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}   ✅ Backup salvo em: $BACKUP_DIR${NC}"
fi
echo ""

# 2. Criar estrutura de diretórios
echo "📁 Criando estrutura de diretórios..."
mkdir -p "$REPO_PATH/programs/powersol-core/src"
mkdir -p "$REPO_PATH/programs/powersol-claim/src"
mkdir -p "$REPO_PATH/target/idl"
echo -e "${GREEN}   ✅ Estrutura criada${NC}"
echo ""

# 3. Copiar código Rust
echo "📄 Copiando código Rust dos programas..."

# powersol-core
if [ -f "./programs/powersol_core/src/lib.rs" ]; then
    cp "./programs/powersol_core/src/lib.rs" "$REPO_PATH/programs/powersol-core/src/"
    cp "./programs/powersol_core/Cargo.toml" "$REPO_PATH/programs/powersol-core/"

    # Ajustar nome no Cargo.toml (underscore -> hyphen)
    sed -i 's/name = "powersol_core"/name = "powersol-core"/' "$REPO_PATH/programs/powersol-core/Cargo.toml"
    sed -i 's/name = "powersol_core"/name = "powersol_core"/' "$REPO_PATH/programs/powersol-core/Cargo.toml"

    echo -e "${GREEN}   ✅ powersol-core copiado${NC}"
else
    echo -e "${YELLOW}   ⚠️  powersol_core não encontrado localmente${NC}"
fi

# powersol-claim
if [ -f "./programs/powersol_claim/src/lib.rs" ]; then
    cp "./programs/powersol_claim/src/lib.rs" "$REPO_PATH/programs/powersol-claim/src/"
    cp "./programs/powersol_claim/Cargo.toml" "$REPO_PATH/programs/powersol-claim/"

    # Ajustar nome no Cargo.toml
    sed -i 's/name = "powersol_claim"/name = "powersol-claim"/' "$REPO_PATH/programs/powersol-claim/Cargo.toml"
    sed -i 's/name = "powersol_claim"/name = "powersol_claim"/' "$REPO_PATH/programs/powersol-claim/Cargo.toml"

    echo -e "${GREEN}   ✅ powersol-claim copiado${NC}"
else
    echo -e "${YELLOW}   ⚠️  powersol_claim não encontrado localmente${NC}"
fi
echo ""

# 4. Copiar IDLs se existirem
echo "📄 Copiando IDLs (se disponíveis)..."
if [ -f "./target/idl/powersol_core.json" ]; then
    cp "./target/idl/powersol_core.json" "$REPO_PATH/target/idl/"
    echo -e "${GREEN}   ✅ powersol_core.json copiado${NC}"
fi
if [ -f "./target/idl/powersol_claim.json" ]; then
    cp "./target/idl/powersol_claim.json" "$REPO_PATH/target/idl/"
    echo -e "${GREEN}   ✅ powersol_claim.json copiado${NC}"
fi
echo ""

# 5. Verificar Anchor.toml
echo "🔍 Verificando Anchor.toml..."
if grep -q "powersol-core" "$REPO_PATH/Anchor.toml"; then
    echo -e "${GREEN}   ✅ Anchor.toml configurado corretamente${NC}"
else
    echo -e "${YELLOW}   ⚠️  Anchor.toml pode precisar de ajustes${NC}"
fi
echo ""

# 6. Sugerir próximos passos
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Integração Concluída!                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📝 Próximos Passos:${NC}"
echo ""
echo "1. Entre no diretório do repositório:"
echo -e "   ${BLUE}cd $REPO_PATH${NC}"
echo ""
echo "2. Build dos programas:"
echo -e "   ${BLUE}anchor build${NC}"
echo ""
echo "3. Inicie o validador local (em outro terminal):"
echo -e "   ${BLUE}solana-test-validator${NC}"
echo ""
echo "4. Deploy dos programas:"
echo -e "   ${BLUE}anchor deploy${NC}"
echo ""
echo "5. Verifique os Program IDs:"
echo -e "   ${BLUE}solana program show 9uZygNvHxtQdZpSevr1WpMGjRZou7qhzyap5mpVL6sP7${NC}"
echo ""
echo "6. Atualize src/lib/solana.ts com os Program IDs corretos"
echo ""
echo "7. Teste os scripts:"
echo -e "   ${BLUE}yarn ts-node scripts/buy.ts --help${NC}"
echo ""
echo -e "${YELLOW}📚 Documentação:${NC}"
echo "   - INTEGRATION_WITH_REPO.md"
echo "   - BLOCKCHAIN_INTEGRATION.md"
echo ""
echo -e "${GREEN}🎉 Boa sorte com o PowerSOL!${NC}"
echo ""
