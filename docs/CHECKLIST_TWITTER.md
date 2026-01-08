# ✅ Checklist Twitter API (Versão Simples)

## 🎯 Objetivo
Fazer as missões sociais do PowerSOL funcionarem

---

## 📝 PASSO A PASSO

### ☐ 1. Entrar no Twitter Developer
- [ ] Ir em: https://developer.twitter.com/en/portal/dashboard
- [ ] Fazer login com sua conta do Twitter
- [ ] Se primeira vez, criar conta Developer (grátis)

### ☐ 2. Criar um App
- [ ] Clicar em "+ Create Project" ou "+ Add App"
- [ ] Nome do App: `PowerSOL-Backend`
- [ ] Descrição: `Backend para sistema de loterias PowerSOL`
- [ ] Permissões: Escolher **"Read and Write"**

### ☐ 3. Pegar as 4 Chaves
- [ ] Copiar **API Key**
- [ ] Copiar **API Key Secret**
- [ ] Clicar em "Generate" Access Token
- [ ] Copiar **Access Token**
- [ ] Copiar **Access Token Secret**

### ☐ 4. Colocar no .env
- [ ] Abrir arquivo `.env` na raiz do projeto
- [ ] Achar as 4 linhas que começam com `TWITTER_`
- [ ] Colar suas chaves (sem espaços extras)
- [ ] Salvar arquivo (Ctrl+S)

### ☐ 5. Rodar o Servidor
```bash
npm run server
```

- [ ] Ver mensagem: `🐦 Twitter API integration ready`

### ☐ 6. Testar
```bash
./test-twitter-api.sh
```

- [ ] Ver mensagem: `🎉 TUDO FUNCIONANDO!`

---

## 📄 Onde Colocar as Chaves

Abra o arquivo `.env` e preencha aqui:

```env
# Antes (valores de exemplo):
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_SECRET=your_twitter_access_token_secret_here

# Depois (com suas chaves reais):
TWITTER_API_KEY=K7Vhx3mPqR9sT2wF
TWITTER_API_SECRET=Ym5nQp8rXt4vZ7wD3fG6hJ9kL2mN5oR8sT1uY4xA7bC0e
TWITTER_ACCESS_TOKEN=1234567890-Abc123Def456Ghi789
TWITTER_ACCESS_SECRET=Wx3yZ6bN9mK2jH5gF8dS1aQ4pO7rT0u
```

---

## 🎁 O Que Vai Funcionar Depois

1. ✅ Usuários podem conectar Twitter
2. ✅ Verificar se seguiram @powerSOL_io
3. ✅ Verificar se tweetaram com #powerSOL
4. ✅ Dar recompensas automáticas (tickets/chests)

---

## ⚠️ IMPORTANTE

**NUNCA** compartilhe suas chaves do Twitter!
- ❌ Não poste em chat
- ❌ Não faça commit no GitHub
- ❌ Não compartilhe screenshots

Se vazar → Regenere as chaves no Twitter Developer Portal

---

## 🆘 Deu Erro?

**"Invalid credentials"**
→ Chaves erradas ou com espaços extras

**"Could not authenticate you"**
→ App precisa de permissão "Read and Write"

**"Rate limit exceeded"**
→ Twitter limita requests, espere 15 min

---

## 📖 Tutorial Completo

Precisa de mais detalhes? Veja:
→ `TUTORIAL_TWITTER_API.md`

---

**Tempo total:** 10 minutos
**Dificuldade:** ⭐⭐☆☆☆ (Fácil)

✅ Após completar, suas missões sociais estarão funcionando!
