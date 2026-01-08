# 🎯 ONDE ABRIR NO VSCODE

## ⚠️ IMPORTANTE: ABRA A PASTA FRONTEND!

### ✅ ABRA ESTA PASTA:
```
📁 frontend/
```

### 🔴 NÃO ABRA A RAIZ DO PROJETO!

**No terminal do seu computador:**
```bash
cd caminho/para/powersol
code frontend/
```

**Ou no VSCode:**
1. File → Open Folder...
2. Navegue até a pasta do projeto
3. Entre na pasta `frontend/`
4. Clique em "Abrir"

**A pasta correta deve ter:**
- ✅ package.json
- ✅ vite.config.ts
- ✅ src/ (com componentes)
- ✅ .env (variáveis de ambiente)

---

## 🗂️ ESTRUTURA ORGANIZADA

```
powersol/                           ← Raiz do projeto
│
├── 📱 frontend/                    ← ABRA AQUI NO VSCODE!
│   ├── src/                       ← Código React
│   │   ├── components/            ← Componentes
│   │   ├── pages/                 ← Páginas
│   │   ├── services/              ← APIs
│   │   ├── hooks/                 ← Custom hooks
│   │   ├── lib/                   ← Supabase
│   │   ├── chain/                 ← Blockchain
│   │   ├── store/                 ← Estado
│   │   └── utils/                 ← Utilitários
│   ├── public/                    ← Assets (imagens)
│   ├── package.json               ← Dependências
│   ├── vite.config.ts             ← Config Vite
│   ├── .env                       ← Variáveis
│   └── README.md                  ← Guia do frontend
│
├── 🔧 powersol-backend/           ← Backend (opcional)
│   ├── src/                       ← Código TypeScript
│   ├── package.json               ← Dependências
│   └── .env                       ← Variáveis
│
├── ⚓ powersol-programs/          ← Smart Contracts (opcional)
│   ├── programs/                  ← Código Rust
│   │   ├── powersol-core/
│   │   └── powersol-claim/
│   └── build.sh                   ← Compilar
│
├── 📚 docs/                       ← Toda documentação
│   ├── COMO_FAZER_DEPLOY.md      ← Guia deploy
│   ├── README_*.md               ← Vários guias
│   └── *.sh                      ← Scripts
│
├── 🚀 deploy-all.sh               ← Deploy completo
└── 📖 README.md                   ← Guia principal
```

---

## 🎯 OPÇÕES DE ABERTURA

### Opção 1: Só Frontend (RECOMENDADO) ⭐
```bash
code frontend/
```

**Melhor para:**
- Desenvolver interface
- Trabalhar nos componentes React
- Editar páginas e estilos

### Opção 2: Workspace Completo
```bash
code .
```

**Melhor para:**
- Ver tudo junto
- Trabalhar em múltiplos projetos
- Navegar entre frontend/backend

### Opção 3: Múltiplas Janelas
```bash
# Janela 1 - Frontend
code frontend/

# Janela 2 - Backend
code powersol-backend/

# Janela 3 - Programs
code powersol-programs/
```

**Melhor para:**
- Trabalho full-stack
- Ver tudo ao mesmo tempo
- Múltiplos monitores

---

## 🚀 DEPOIS DE ABRIR

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend (outro terminal)
```bash
cd powersol-backend
npm install
npm run dev
```

### 3. Acesse
- Frontend: http://localhost:5173
- Backend: http://localhost:4000

---

## 📁 ARQUIVOS IMPORTANTES

### Frontend
- `frontend/src/App.tsx` - Componente principal
- `frontend/src/main.tsx` - Entry point
- `frontend/src/router.tsx` - Rotas
- `frontend/.env` - Configurações

### Backend
- `powersol-backend/src/index.ts` - Server
- `powersol-backend/src/app.ts` - Express app
- `powersol-backend/.env` - Configurações

---

## 💡 DICAS VSCODE

### Instale as Extensões:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

### Settings Recomendados:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## ✅ CHECKLIST

- [ ] Abri `frontend/` no VSCode
- [ ] Instalei dependências (`npm install`)
- [ ] Copiei `.env.example` para `.env`
- [ ] Configurei as variáveis de ambiente
- [ ] Rodei `npm run dev`
- [ ] Abri http://localhost:5173
- [ ] Tudo funcionando!

---

**Agora é só codar! 🚀**
