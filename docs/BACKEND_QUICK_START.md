# ⚡ Backend PowerSOL - Quick Start

## 🚀 Setup em 15 Minutos

### 1. Criar Projeto
```bash
mkdir powersol-backend
cd powersol-backend
npm init -y
```

### 2. Instalar Dependências Principais
```bash
# Core
npm install express cors helmet dotenv

# Solana & Anchor
npm install @solana/web3.js @coral-xyz/anchor @solana/spl-token

# Database
npm install @supabase/supabase-js

# Auth
npm install jose tweetnacl bs58

# Background Jobs
npm install bullmq ioredis node-cron

# Validation & Utils
npm install zod pino pino-pretty

# Dev Dependencies
npm install -D typescript tsx @types/node @types/express @types/cors
npm install -D tsc-alias
```

### 3. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. .env
```env
# API
NODE_ENV=development
PORT=4000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Solana
RPC_URL=https://api.devnet.solana.com
RPC_COMMITMENT=confirmed
CLUSTER=devnet

# Wallets (GERAR NOVAS KEYS!)
AUTHORITY_WALLET_SECRET=base58_secret_key_here
TREASURY_WALLET=public_key_here

# Program IDs (após anchor deploy)
POWERSOL_CORE_PROGRAM_ID=xxx
POWERSOL_CLAIM_PROGRAM_ID=xxx

# VRF
VRF_QUEUE_PUBKEY=xxx

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=generate_random_32_char_secret_here
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=*
```

### 5. Estrutura Mínima
```bash
mkdir -p src/{config,routes,controllers,services,middleware,lib,jobs,queues,utils}
mkdir -p programs/{powersol-core,powersol-claim}/src
mkdir -p supabase/migrations
```

### 6. src/index.ts (Mínimo)
```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Supabase test
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

app.get('/api/test-db', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('count');

  res.json({ data, error });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### 7. Testar
```bash
npm run dev
curl http://localhost:4000/api/health
```

---

## 📊 Ordem de Implementação

### Fase 1: Base (1-2 horas)
1. ✅ Configurar projeto e dependências
2. ✅ Configurar Supabase
3. ✅ Criar schema database (migrations)
4. ✅ Testar conexão DB
5. ✅ Configurar Solana connection

### Fase 2: Auth (1-2 horas)
1. ✅ Implementar `auth.service.ts`
2. ✅ Criar `auth.middleware.ts`
3. ✅ Endpoints de auth
4. ✅ Testar login com wallet

### Fase 3: Loterias (2-3 horas)
1. ✅ Service `lottery.service.ts`
2. ✅ Service `solana.service.ts` (PDAs, queries)
3. ✅ Endpoints de loterias
4. ✅ Testar consultas

### Fase 4: Tickets (2-3 horas)
1. ✅ Service `ticket.service.ts`
2. ✅ Build transaction on-chain
3. ✅ Endpoints de compra
4. ✅ Testar compra end-to-end

### Fase 5: Sorteios (3-4 horas)
1. ✅ Service `vrf.service.ts`
2. ✅ Integração Switchboard
3. ✅ Cron job para draws
4. ✅ Webhook VRF callback

### Fase 6: Claims (1-2 horas)
1. ✅ Service `claim.service.ts`
2. ✅ Endpoints de claim
3. ✅ Testar claim de prêmio

### Fase 7: Extras (2-3 horas)
1. ✅ Missões
2. ✅ Afiliados
3. ✅ Transparência
4. ✅ Background jobs

### Fase 8: Testes & Deploy (2-3 horas)
1. ✅ Testes de integração
2. ✅ Deploy Supabase (prod)
3. ✅ Deploy backend
4. ✅ Monitoring

**Total: 15-23 horas** de desenvolvimento

---

## 🔥 Templates Prontos

### Controller Template
```typescript
import { Request, Response } from 'express';
import { MyService } from '../services/my.service';

export class MyController {
  private service: MyService;

  constructor() {
    this.service = new MyService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getAll();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}
```

### Service Template
```typescript
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class MyService {
  async getAll() {
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(input: any) {
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Created record: ${data.id}`);
    return data;
  }

  async update(id: string, input: any) {
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('table_name')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
```

### Middleware Template
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = await authService.verifyToken(token);

    // Adicionar user ao request
    req.user = payload;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Adicionar tipo ao Request
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; wallet: string };
    }
  }
}
```

---

## 📝 Scripts Úteis

### scripts/generate-keypair.ts
```typescript
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Gerar keypair para authority
const keypair = Keypair.generate();

console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Secret Key (base58):', bs58.encode(keypair.secretKey));
console.log('\nAdd to .env:');
console.log(`AUTHORITY_WALLET_SECRET=${bs58.encode(keypair.secretKey)}`);
console.log(`TREASURY_WALLET=${keypair.publicKey.toBase58()}`);
```

```bash
tsx scripts/generate-keypair.ts
```

### scripts/test-connection.ts
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

async function test() {
  const connection = new Connection(process.env.RPC_URL!);

  console.log('Testing Solana connection...');

  const version = await connection.getVersion();
  console.log('✅ Connected! Version:', version);

  const slot = await connection.getSlot();
  console.log('Current slot:', slot);

  // Test program
  const programId = new PublicKey(process.env.POWERSOL_CORE_PROGRAM_ID!);
  const info = await connection.getAccountInfo(programId);

  if (info) {
    console.log('✅ Program found!');
    console.log('Owner:', info.owner.toBase58());
  } else {
    console.log('❌ Program not found');
  }
}

test();
```

```bash
tsx scripts/test-connection.ts
```

### scripts/seed-lotteries.ts
```typescript
import { supabaseAdmin } from '../src/config/supabase';
import 'dotenv/config';

async function seed() {
  console.log('Seeding lotteries...');

  const lotteries = [
    {
      lottery_id: 1,
      type: 'TRI_DAILY',
      ticket_price: 100000000, // 0.1 SOL
      max_tickets: 1000,
      draw_timestamp: new Date(Date.now() + 8 * 60 * 60 * 1000), // +8h
    },
    {
      lottery_id: 2,
      type: 'JACKPOT',
      ticket_price: 500000000, // 0.5 SOL
      max_tickets: 5000,
      draw_timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    },
    {
      lottery_id: 3,
      type: 'GRAND_PRIZE',
      ticket_price: 1000000000, // 1 SOL
      max_tickets: 10000,
      draw_timestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7d
    },
  ];

  for (const lottery of lotteries) {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .upsert(lottery, { onConflict: 'lottery_id' })
      .select();

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ Created:', data[0].type);
    }
  }

  console.log('Done!');
}

seed();
```

```bash
tsx scripts/seed-lotteries.ts
```

---

## 🔧 Troubleshooting

### Problema: "Cannot find module"
```bash
npm install --save-dev @types/node @types/express
```

### Problema: Redis connection failed
```bash
# Mac
brew install redis
brew services start redis

# Linux
sudo apt install redis-server
sudo systemctl start redis
```

### Problema: Supabase connection error
- Verifique URL e keys no .env
- Confirme que tabelas existem
- Teste: `curl https://xxx.supabase.co/rest/v1/` (deve retornar 200)

### Problema: Anchor program not found
```bash
# Build e deploy
anchor build
solana program deploy target/deploy/powersol_core.so

# Verificar
solana program show <PROGRAM_ID>
```

### Problema: Transaction failed
- Verifique saldo: `solana balance`
- Airdrop: `solana airdrop 5`
- Confirme RPC: `solana config get`

---

## ✅ Checklist de Verificação

Antes de considerar o backend "pronto", verifique:

- [ ] `GET /api/health` retorna 200
- [ ] Database conectado (teste query)
- [ ] Solana RPC conectado
- [ ] Anchor programs deployed
- [ ] Auth funciona (login wallet)
- [ ] Lotteries listam corretamente
- [ ] Compra de ticket funciona
- [ ] Sorteio funciona (VRF)
- [ ] Claim de prêmio funciona
- [ ] Cron jobs rodando
- [ ] Redis conectado
- [ ] Logs funcionando
- [ ] CORS configurado
- [ ] Rate limiting ativo
- [ ] Error handling robusto

---

## 🎯 Prioridades

Se tiver **tempo limitado**, implemente nesta ordem:

### Essencial (MVP)
1. ✅ Auth (wallet login)
2. ✅ Lotteries (listar)
3. ✅ Tickets (comprar)
4. ✅ Draw (manual trigger)
5. ✅ Claims (reivindicar prêmio)

### Importante
6. ✅ VRF (sorteio automático justo)
7. ✅ Cron jobs (automação)
8. ✅ Sync blockchain ↔ DB

### Nice to Have
9. ✅ Missões
10. ✅ Afiliados
11. ✅ Background queues (BullMQ)
12. ✅ Transparência avançada

---

## 📚 Próximos Passos

Depois de implementar o MVP:

1. **Testes**: Jest + Supertest
2. **Documentação**: Swagger/OpenAPI
3. **Monitoring**: Sentry para errors
4. **Analytics**: Mixpanel/Amplitude
5. **CI/CD**: GitHub Actions
6. **Deploy**: Railway/Render/Fly.io

---

**Comece pelo mínimo funcionando, depois expanda!** 🚀
