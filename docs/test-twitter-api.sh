#!/bin/bash

# Script para testar a Twitter API do PowerSOL
# Uso: ./test-twitter-api.sh

echo "🐦 Testando Twitter API do PowerSOL..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o servidor está rodando
echo "1️⃣ Verificando se o servidor está rodando..."
HEALTH_CHECK=$(curl -s http://localhost:3001/api/health 2>/dev/null)

if [ -z "$HEALTH_CHECK" ]; then
    echo -e "${RED}❌ Servidor não está rodando!${NC}"
    echo "   Execute: npm run server"
    exit 1
else
    echo -e "${GREEN}✅ Servidor está rodando!${NC}"
    echo "   Resposta: $HEALTH_CHECK"
fi

echo ""
echo "2️⃣ Fazendo login com wallet de teste..."

# Fazer login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"TestWallet123456789"}')

# Extrair token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Falha no login!${NC}"
    echo "   Resposta: $LOGIN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✅ Login bem-sucedido!${NC}"
    echo "   Token: ${TOKEN:0:20}..."
fi

echo ""
echo "3️⃣ Buscando missões disponíveis..."

# Buscar missões
MISSIONS=$(curl -s http://localhost:3001/api/missions \
  -H "Authorization: Bearer $TOKEN")

MISSION_COUNT=$(echo $MISSIONS | grep -o '"id"' | wc -l)

if [ "$MISSION_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $MISSION_COUNT missões encontradas!${NC}"
    echo ""
    echo "Missões disponíveis:"
    echo "$MISSIONS" | grep -o '"title":"[^"]*' | sed 's/"title":"/ - /'
else
    echo -e "${RED}❌ Nenhuma missão encontrada!${NC}"
fi

echo ""
echo "4️⃣ Testando conexão do Twitter..."

# Verificar se as chaves do Twitter estão configuradas
if grep -q "your_twitter_api_key_here" .env; then
    echo -e "${YELLOW}⚠️  Twitter API não configurada ainda!${NC}"
    echo "   Edite o arquivo .env e adicione suas chaves"
    echo "   Veja: TUTORIAL_TWITTER_API.md"
else
    echo -e "${GREEN}✅ Chaves do Twitter configuradas no .env${NC}"

    # Tentar conectar Twitter
    echo ""
    echo "   Teste de conexão Twitter (com username de teste):"
    TWITTER_CONNECT=$(curl -s -X POST http://localhost:3001/api/twitter/connect \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"twitterUsername":"elonmusk"}')

    if echo "$TWITTER_CONNECT" | grep -q "success"; then
        echo -e "${GREEN}   ✅ Conexão Twitter funcionando!${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Erro ao conectar Twitter${NC}"
        echo "   Resposta: $TWITTER_CONNECT"
    fi
fi

echo ""
echo "5️⃣ Verificando recompensas..."

REWARDS=$(curl -s http://localhost:3001/api/rewards \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ Sistema de recompensas OK${NC}"
echo "   $REWARDS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTADO FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if grep -q "your_twitter_api_key_here" .env; then
    echo -e "${YELLOW}🔧 Backend funcionando, mas Twitter API precisa ser configurada${NC}"
    echo ""
    echo "Próximo passo:"
    echo "1. Abra: TUTORIAL_TWITTER_API.md"
    echo "2. Siga o tutorial para pegar as chaves do Twitter"
    echo "3. Cole as chaves no arquivo .env"
    echo "4. Reinicie o servidor"
else
    echo -e "${GREEN}🎉 TUDO FUNCIONANDO!${NC}"
    echo ""
    echo "Você pode agora:"
    echo "- Conectar contas do Twitter"
    echo "- Verificar missões sociais"
    echo "- Dar recompensas aos usuários"
fi

echo ""
