# 🎰 PowerSOL Frontend

Frontend React da plataforma PowerSOL de loterias descentralizadas.

---

## 🚀 INÍCIO RÁPIDO

### Instalar dependências
```bash
npm install
```

### Rodar em desenvolvimento
```bash
npm run dev
```

Acesse: http://localhost:5173

### Build para produção
```bash
npm run build
```

---

## 📁 ESTRUTURA

```
frontend/
├── src/
│   ├── components/      ← Componentes React
│   ├── pages/           ← Páginas
│   ├── services/        ← APIs e serviços
│   ├── store/           ← Estado global
│   ├── hooks/           ← Custom hooks
│   ├── lib/             ← Bibliotecas (Supabase)
│   ├── chain/           ← Integração blockchain
│   ├── utils/           ← Utilitários
│   ├── App.tsx          ← App principal
│   └── main.tsx         ← Entry point
│
├── public/              ← Assets estáticos
├── package.json         ← Dependências
├── vite.config.ts       ← Configuração Vite
├── tailwind.config.js   ← Configuração Tailwind
└── .env                 ← Variáveis de ambiente
```

---

## ⚙️ CONFIGURAÇÃO

### 1. Configure o .env

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_BACKEND_URL=http://localhost:4000
VITE_POWERSOL_CORE_PROGRAM_ID=your_program_id
VITE_POWERSOL_CLAIM_PROGRAM_ID=your_program_id
VITE_RPC_URL=https://api.devnet.solana.com
```

### 2. Instale e rode
```bash
npm install
npm run dev
```

---

## 📄 PÁGINAS DISPONÍVEIS

- **/** - Home
- **/lottery** - Sistema de loterias
- **/jackpot** - Jackpot mensal
- **/grand-prize** - Grande Prêmio
- **/halloween** - Halloween especial
- **/missions** - Missões diárias
- **/affiliates** - Sistema de afiliados
- **/affiliate-dashboard** - Dashboard afiliados (Level 1-2)
- **/affiliate-dashboard-level3** - Dashboard Level 3+
- **/profile** - Perfil do usuário
- **/transparency** - Transparência blockchain
- **/faq** - Perguntas frequentes
- **/terms** - Termos de uso
- **/privacy** - Política de privacidade

---

## 🔌 INTEGRAÇÃO COM BACKEND

O frontend se conecta ao backend via API REST:

```typescript
// Exemplo: Buscar loterias ativas
const response = await fetch(`${BACKEND_URL}/api/lotteries/active`);
const lotteries = await response.json();
```

Base URL configurada em: `VITE_BACKEND_URL`

---

## 🔗 INTEGRAÇÃO BLOCKCHAIN

### Conectar Wallet
```typescript
import { WalletConnection } from '@/components/WalletConnection';

<WalletConnection />
```

### Comprar Ticket
```typescript
import { purchaseTicket } from '@/services/api';

await purchaseTicket({
  lotteryId: '123',
  quantity: 1,
  wallet: userWallet
});
```

---

## 🎨 COMPONENTES PRINCIPAIS

### WalletConnection
Componente de conexão com Phantom/Solflare
```tsx
<WalletConnection />
```

### TicketPurchaseCard
Card de compra de tickets
```tsx
<TicketPurchaseCard
  lotteryId="123"
  ticketPrice={0.1}
  onPurchase={handlePurchase}
/>
```

### WinnersDisplay
Exibição de vencedores
```tsx
<WinnersDisplay lotteryId="123" />
```

### Countdown
Contador regressivo para sorteio
```tsx
<Countdown targetDate={drawDate} />
```

---

## 📦 SCRIPTS

```bash
npm run dev          # Desenvolvimento (Vite)
npm run build        # Build produção
npm run preview      # Preview do build
npm run lint         # Lint do código
npm run type-check   # Verificar tipos TypeScript
```

---

## 🛠️ TECNOLOGIAS

- **React 18** - Framework
- **TypeScript** - Tipagem
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animações
- **Lucide React** - Ícones
- **Solana Web3.js** - Blockchain
- **Supabase** - Database
- **React Router** - Rotas

---

## 🔐 AUTENTICAÇÃO

O sistema usa autenticação baseada em assinatura de wallet:

1. Usuário conecta wallet
2. Backend gera nonce
3. Usuário assina mensagem
4. Backend valida e retorna JWT
5. Frontend usa JWT nas requisições

---

## 🧪 DESENVOLVIMENTO

### Hot Reload
Vite oferece hot reload automático. Edite qualquer arquivo em `src/` e veja as mudanças instantaneamente.

### Adicionar Nova Página
1. Crie o componente em `src/pages/NovaPagina.tsx`
2. Adicione a rota em `src/router.tsx`
3. Adicione link na navegação

### Adicionar Componente
1. Crie em `src/components/NomeComponente.tsx`
2. Importe onde necessário:
```tsx
import { NomeComponente } from '@/components/NomeComponente';
```

---

## 📱 RESPONSIVO

Todos os componentes são responsivos usando Tailwind CSS:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Conteúdo */}
</div>
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## 🎨 TEMA

Cores configuradas em `tailwind.config.js`:

```javascript
colors: {
  primary: '#8B5CF6',
  secondary: '#10B981',
  // ...
}
```

---

## 🔍 DEBUG

### Ver estado Supabase
```typescript
import { supabase } from '@/lib/supabase';
console.log(supabase.auth.getSession());
```

### Ver wallet conectada
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
const { publicKey } = useWallet();
console.log(publicKey?.toString());
```

---

## 🆘 PROBLEMAS COMUNS

### Wallet não conecta
- Verifique se tem Phantom/Solflare instalado
- Verifique RPC URL no `.env`
- Verifique console do navegador

### API não responde
- Verifique se backend está rodando
- Verifique `VITE_BACKEND_URL` no `.env`
- Verifique Network tab no DevTools

### Build falha
```bash
npm run type-check  # Ver erros de tipo
npm run lint        # Ver erros de lint
```

---

## 📄 LICENÇA

Propriedade do PowerSOL Team.

---

**Pronto para desenvolver! 🚀**
