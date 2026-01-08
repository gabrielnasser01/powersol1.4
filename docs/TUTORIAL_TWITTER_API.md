# 🐦 Como Configurar a Twitter API (Tutorial Completo)

## 📋 O que você vai fazer:
1. Criar uma conta no Twitter Developer Portal
2. Criar um "App" (aplicativo)
3. Pegar 4 códigos secretos
4. Colocar esses códigos no arquivo `.env`
5. Rodar o servidor

**Tempo estimado:** 10-15 minutos

---

## 🎯 PASSO 1: Criar conta no Twitter Developer Portal

### 1.1. Acesse o site
- Abra seu navegador
- Vá para: https://developer.twitter.com/en/portal/dashboard
- Faça login com sua conta do Twitter

### 1.2. Se for a primeira vez
- Clique em "Sign up for Free Account"
- Escolha: **"Hobbyist"** → **"Exploring the API"**
- Preencha o formulário:
  - **Nome do projeto:** PowerSOL Lottery
  - **Descrição:** Sistema de loterias na blockchain Solana com missões sociais

---

## 🎯 PASSO 2: Criar um App

### 2.1. No painel principal
- Clique em **"+ Create Project"** (botão azul)
- Ou se já tem projeto: **"+ Add App"**

### 2.2. Preencher informações

**Nome do App:**
```
PowerSOL-Backend
```

**Descrição do App:**
```
Backend server para PowerSOL - Sistema de loterias descentralizadas na Solana com verificação de missões sociais no Twitter
```

### 2.3. Tipo de acesso
- Selecione: **"Read and Write"** (Ler e Escrever)
- Isso permite verificar tweets e follows dos usuários

---

## 🎯 PASSO 3: Pegar as 4 Chaves Secretas

### 3.1. Assim que criar o app, você verá uma tela com chaves

Você verá algo assim:

```
API Key:                 xxxxxxxxxxxxxxxxxxxxx
API Key Secret:          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Bearer Token:            xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **IMPORTANTE:** Copie e guarde essas chaves! Você só verá elas UMA VEZ!

### 3.2. Gerar Access Token e Secret

- Na mesma página, role para baixo
- Procure por: **"Authentication Tokens"**
- Clique em **"Generate"** em "Access Token and Secret"
- Você verá mais 2 chaves:

```
Access Token:            xxxxxxxxxxxxxxxxxxxxx
Access Token Secret:     xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.3. Salvar TODAS as 4 chaves

Copie todas as 4 chaves para um bloco de notas temporário:

1. **API Key** (começa com letras e números)
2. **API Key Secret** (mais longo, letras e números)
3. **Access Token** (números com hífens)
4. **Access Token Secret** (letras e números misturados)

---

## 🎯 PASSO 4: Colocar as Chaves no Arquivo .env

### 4.1. Abrir o arquivo `.env`

No seu projeto, abra o arquivo `.env` que está na raiz.

### 4.2. Substituir os valores

Você vai ver estas linhas:

```env
# Twitter API Configuration
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_SECRET=your_twitter_access_token_secret_here
```

### 4.3. Colar suas chaves

Substitua EXATAMENTE assim (sem espaços extras):

```env
# Twitter API Configuration
TWITTER_API_KEY=sua_api_key_aqui
TWITTER_API_SECRET=sua_api_secret_aqui
TWITTER_ACCESS_TOKEN=seu_access_token_aqui
TWITTER_ACCESS_SECRET=seu_access_secret_aqui
```

**EXEMPLO REAL (com dados falsos):**

```env
# Twitter API Configuration
TWITTER_API_KEY=K7Vhx3mPqR9sT2wF
TWITTER_API_SECRET=Ym5nQp8rXt4vZ7wD3fG6hJ9kL2mN5oR8sT1uY4xA7bC0e
TWITTER_ACCESS_TOKEN=1234567890-Abc123Def456Ghi789Jkl012Mno345Pqr678
TWITTER_ACCESS_SECRET=Wx3yZ6bN9mK2jH5gF8dS1aQ4pO7rT0uY3vC6xE9zA
```

### 4.4. Salvar o arquivo
- Aperte **Ctrl+S** (Windows) ou **Cmd+S** (Mac)
- Feche o arquivo

---

## 🎯 PASSO 5: Testar se Funcionou

### 5.1. Rodar o servidor

Abra o terminal na pasta do projeto e digite:

```bash
npm run server
```

### 5.2. Você deve ver isso:

```
🚀 Backend server running on port 3001
🐦 Twitter API integration ready
💾 Database initialized
```

### 5.3. Testar a API

Abra outro terminal e teste:

```bash
curl http://localhost:3001/api/health
```

Você deve ver:

```json
{"status":"OK","timestamp":"2024-12-04T..."}
```

---

## ✅ Pronto! Agora você pode:

### 1. Ver as missões do Twitter
```bash
# Login com wallet primeiro
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"SUA_WALLET_AQUI"}'

# Pegar o token que retornar e usar:
curl http://localhost:3001/api/missions \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 2. Conectar conta do Twitter
```bash
curl -X POST http://localhost:3001/api/twitter/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"twitterUsername":"seu_username"}'
```

### 3. Verificar missões
```bash
curl -X POST http://localhost:3001/api/missions/verify-twitter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"missionId":"twitter-follow-official"}'
```

---

## 🎨 Missões Disponíveis

O servidor já vem com 4 missões pré-configuradas:

1. **Seguir @powerSOL_io** → 🎫 2 tickets
2. **Tweet com #powerSOL** → 🎫 3 tickets
3. **Retweet com #powerSOLCommunity** → 🎁 1 chest
4. **Tweet e marcar 3 amigos** → 🎫 5 tickets

---

## ⚠️ Problemas Comuns

### Erro: "Invalid credentials"
- Você copiou as chaves erradas
- Tem espaços extras no `.env`
- Não salvou o arquivo `.env`

### Erro: "Could not authenticate you"
- Suas chaves estão corretas mas o app não tem permissões
- Vá no Twitter Developer Portal → Settings → Permissions
- Mude para "Read and Write"

### Erro: "Rate limit exceeded"
- O Twitter limita quantas verificações por hora
- Espere 15 minutos e tente de novo

---

## 🔐 Segurança

⚠️ **NUNCA** compartilhe suas chaves do Twitter!

- Não faça commit do `.env` no GitHub
- Não poste as chaves em chat/Discord
- Se vazar, regenere imediatamente no Twitter Developer Portal

---

## 📞 Precisa de Ajuda?

Se algo não funcionar:

1. Verifique se todas as 4 chaves estão corretas
2. Certifique-se que não tem espaços extras
3. Reinicie o servidor (`Ctrl+C` e `npm run server` de novo)
4. Teste com `curl http://localhost:3001/api/health`

---

**✅ Tutorial completo! Agora suas missões sociais vão funcionar!** 🎉
