# 🚀 COMECE AQUI - PowerSOL

Guia ultra-rápido para começar a desenvolver!

---

## ✅ PRONTO! Estrutura Organizada

```
powersol/
│
├── 📱 frontend/           ← PASTA DO FRONTEND (ABRA NO VSCODE!)
├── 🔧 powersol-backend/  ← Backend Node.js
├── ⚓ powersol-programs/  ← Smart Contracts Anchor
├── 📚 docs/               ← Toda documentação
│
├── 🚀 deploy-all.sh       ← Deploy automático
├── 📖 README.md           ← Guia completo
└── 🎯 ONDE_ABRIR_VSCODE.md ← Este guia
```

---

## 🎯 ABRIR NO VSCODE

### Frontend (Principal)
```bash
code frontend/
```

**OU no VSCode:**
- File → Open Folder...
- Selecione: `powersol/frontend/`

---

## 🚀 RODAR O PROJETO

### 1. Abrir frontend no VSCode
```bash
code frontend/
```

### 2. Instalar dependências (primeira vez)
```bash
cd frontend
npm install
```

### 3. Rodar em desenvolvimento
```bash
npm run dev
```

### 4. Acessar no navegador
http://localhost:5173

---

## 📦 COMANDOS PRINCIPAIS

### No diretório `frontend/`:

```bash
npm run dev      # Iniciar servidor de desenvolvimento
npm run build    # Build para produção
npm run preview  # Preview do build
npm run lint     # Lint do código
```

---

## 🗂️ PASTAS PRINCIPAIS

### Frontend (onde você vai trabalhar):
```
frontend/
├── src/
│   ├── components/    ← Componentes React
│   ├── pages/         ← Páginas do site
│   ├── services/      ← APIs e integrações
│   └── ...
├── public/            ← Imagens e assets
├── package.json       ← Dependências
└── .env               ← Configurações
```

---

## 📚 DOCUMENTAÇÃO

Se precisar de ajuda, veja:

- **README.md** - Guia completo do projeto
- **frontend/README.md** - Guia específico do frontend
- **ONDE_ABRIR_VSCODE.md** - Onde abrir cada parte
- **docs/** - Toda documentação adicional

---

## ✅ CHECKLIST INICIAL

- [ ] Abri `frontend/` no VSCode
- [ ] Rodei `npm install`
- [ ] Rodei `npm run dev`
- [ ] Abri http://localhost:5173
- [ ] Vi o site funcionando!

---

## 🎨 PÁGINAS DISPONÍVEIS

Você pode navegar para:

- `/` - Home
- `/lottery` - Sistema de loterias
- `/jackpot` - Jackpot mensal
- `/grand-prize` - Grande Prêmio
- `/missions` - Missões diárias
- `/affiliates` - Sistema de afiliados
- `/profile` - Perfil do usuário
- `/transparency` - Transparência
- `/faq` - Perguntas frequentes

---

## 🆘 PROBLEMAS?

### "Module not found"
```bash
cd frontend
npm install
```

### "Port already in use"
Mude a porta no `vite.config.ts` ou feche o processo na porta 5173

### Precisa de ajuda?
Veja os arquivos:
- `README.md`
- `frontend/README.md`
- `docs/` (várias guias)

---

**Agora é só abrir e codar! 🚀**

```bash
code frontend/
cd frontend
npm run dev
```

**🎉 Divirta-se desenvolvendo!**
