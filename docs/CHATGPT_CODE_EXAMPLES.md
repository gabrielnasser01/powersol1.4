# 🔍 Exemplos de Código para ChatGPT Seguir

Use este arquivo como referência junto com o CHATGPT_PROMPT.md para mostrar ao ChatGPT EXATAMENTE como você quer o código.

---

## 📋 EXEMPLOS DE CÓDIGO OBRIGATÓRIOS

### 1. CONTROLLER TEMPLATE

```typescript
// src/controllers/lottery.controller.ts
import { Request, Response } from 'express';
import { LotteryService } from '../services/lottery.service';
import { logger } from '../utils/logger';

export class LotteryController {
  private service: LotteryService;

  constructor() {
    this.service = new LotteryService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const lotteries = await this.service.getAll();

      return res.json({
        success: true,
        data: lotteries,
      });
    } catch (error: any) {
      logger.error('Failed to get lotteries:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get lotteries',
      });
    }
  };

  getActive = async (req: Request, res: Response) => {
    try {
      const lotteries = await this.service.getActive();

      return res.json({
        success: true,
        data: lotteries,
      });
    } catch (error: any) {
      logger.error('Failed to get active lotteries:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get active lotteries',
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const lottery = await this.service.getById(id);

      if (!lottery) {
        return res.status(404).json({
          success: false,
          error: 'Lottery not found',
        });
      }

      return res.json({
        success: true,
        data: lottery,
      });
    } catch (error: any) {
      logger.error('Failed to get lottery:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get lottery',
      });
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const stats = await this.service.getStats(id);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Failed to get lottery stats:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get lottery stats',
      });
    }
  };
}
```

### 2. SERVICE TEMPLATE

```typescript
// src/services/lottery.service.ts
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

export class LotteryService {
  async getAll() {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Database error getting lotteries:', error);
      throw new Error('Failed to fetch lotteries');
    }

    return data;
  }

  async getActive() {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .select('*')
      .eq('is_drawn', false)
      .gte('draw_timestamp', new Date().toISOString())
      .order('draw_timestamp', { ascending: true });

    if (error) {
      logger.error('Database error getting active lotteries:', error);
      throw new Error('Failed to fetch active lotteries');
    }

    return data;
  }

  async getById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('lotteries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Database error getting lottery:', error);
      throw new Error('Failed to fetch lottery');
    }

    return data;
  }

  async getStats(id: string) {
    const { data, error } = await supabaseAdmin.rpc('get_lottery_stats', {
      lottery_uuid: id,
    });

    if (error) {
      logger.error('Database error getting lottery stats:', error);
      throw new Error('Failed to fetch lottery stats');
    }

    return data;
  }

  async canBuyTickets(lotteryId: string, quantity: number): Promise<boolean> {
    const lottery = await this.getById(lotteryId);

    if (!lottery) {
      throw new Error('Lottery not found');
    }

    if (lottery.is_drawn) {
      throw new Error('Lottery already drawn');
    }

    if (new Date(lottery.draw_timestamp) < new Date()) {
      throw new Error('Lottery draw time has passed');
    }

    if (lottery.current_tickets + quantity > lottery.max_tickets) {
      throw new Error('Not enough tickets available');
    }

    return true;
  }
}
```

### 3. AUTH SERVICE (COMPLETO)

```typescript
// src/services/auth.service.ts
import { SignJWT, jwtVerify } from 'jose';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { customAlphabet } from 'nanoid';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const nanoid = customAlphabet('1234567890abcdef', 32);

export class AuthService {
  async generateNonce(walletAddress: string): Promise<string> {
    // Validar wallet address
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new Error('Invalid wallet address');
    }

    const nonce = nanoid();

    // Criar ou atualizar usuário
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          wallet_address: walletAddress,
          nonce,
        },
        {
          onConflict: 'wallet_address',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to generate nonce:', error);
      throw new Error('Failed to generate nonce');
    }

    logger.info(`Generated nonce for wallet: ${walletAddress}`);
    return nonce;
  }

  async verifySignature(
    walletAddress: string,
    signature: string
  ): Promise<{ token: string; user: any }> {
    // Buscar usuário e nonce
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Verificar assinatura
    const message = new TextEncoder().encode(
      `Sign this message to authenticate: ${user.nonce}`
    );

    try {
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = new PublicKey(walletAddress).toBytes();

      const isValid = nacl.sign.detached.verify(
        message,
        signatureBytes,
        publicKeyBytes
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }
    } catch (error) {
      logger.error('Signature verification failed:', error);
      throw new Error('Invalid signature');
    }

    // Atualizar last_login e gerar novo nonce (invalidar antigo)
    await supabaseAdmin
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        nonce: nanoid(),
      })
      .eq('id', user.id);

    // Gerar JWT
    const token = await new SignJWT({
      userId: user.id,
      wallet: walletAddress,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(new TextEncoder().encode(env.JWT_SECRET));

    logger.info(`User authenticated: ${walletAddress}`);

    return { token, user };
  }

  async verifyToken(token: string): Promise<{ userId: string; wallet: string }> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(env.JWT_SECRET)
      );

      return {
        userId: payload.userId as string,
        wallet: payload.wallet as string,
      };
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }

  async getProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address, created_at, last_login')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('User not found');
    }

    return data;
  }
}
```

### 4. SOLANA SERVICE (COMPLETO)

```typescript
// src/services/solana.service.ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { connection, coreProgram, authorityKeypair, TREASURY } from '../config/solana';
import { logger } from '../utils/logger';

export class SolanaService {
  // ==========================================
  // PDAs
  // ==========================================

  getLotteryPDA(lotteryId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lottery'), Buffer.from([lotteryId])],
      coreProgram.programId
    );
  }

  getTicketPDA(lotteryId: number, ticketNumber: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('ticket'),
        Buffer.from([lotteryId]),
        Buffer.from([ticketNumber]),
      ],
      coreProgram.programId
    );
  }

  // ==========================================
  // QUERIES
  // ==========================================

  async getLotteryData(lotteryId: number) {
    try {
      const [lotteryPda] = this.getLotteryPDA(lotteryId);
      const lottery = await coreProgram.account.lottery.fetch(lotteryPda);
      return lottery;
    } catch (error) {
      logger.error(`Failed to fetch lottery ${lotteryId}:`, error);
      return null;
    }
  }

  async getTicketData(lotteryId: number, ticketNumber: number) {
    try {
      const [ticketPda] = this.getTicketPDA(lotteryId, ticketNumber);
      const ticket = await coreProgram.account.ticket.fetch(ticketPda);
      return ticket;
    } catch (error) {
      logger.error(`Failed to fetch ticket ${ticketNumber}:`, error);
      return null;
    }
  }

  async verifyTransaction(signature: string) {
    try {
      const tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
      });

      if (!tx) {
        throw new Error('Transaction not found');
      }

      if (tx.meta?.err) {
        throw new Error('Transaction failed on-chain');
      }

      return tx;
    } catch (error) {
      logger.error(`Failed to verify transaction ${signature}:`, error);
      throw error;
    }
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================

  async buildPurchaseTransaction(
    userWallet: PublicKey,
    lotteryId: number,
    quantity: number,
    ticketNumber: number
  ): Promise<Transaction> {
    const [lotteryPda] = this.getLotteryPDA(lotteryId);
    const [ticketPda] = this.getTicketPDA(lotteryId, ticketNumber);

    // Buscar dados da loteria
    const lottery = await this.getLotteryData(lotteryId);
    if (!lottery) {
      throw new Error('Lottery not found on-chain');
    }

    const totalPrice = lottery.ticketPrice.toNumber() * quantity;

    // Criar instrução
    const ix = await coreProgram.methods
      .purchaseTicket(quantity)
      .accounts({
        lottery: lotteryPda,
        ticket: ticketPda,
        buyer: userWallet,
        treasury: TREASURY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    // Criar transação
    const tx = new Transaction().add(ix);

    // Buscar blockhash recente
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');

    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = userWallet;

    logger.info(
      `Built purchase transaction for ${quantity} ticket(s), lottery ${lotteryId}`
    );

    return tx;
  }

  async executeDraw(lotteryId: number, winningTicket: number): Promise<string> {
    const [lotteryPda] = this.getLotteryPDA(lotteryId);

    try {
      const tx = await coreProgram.methods
        .drawLottery(winningTicket)
        .accounts({
          lottery: lotteryPda,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();

      logger.info(`Drew lottery ${lotteryId}, winning ticket: ${winningTicket}`);
      return tx;
    } catch (error) {
      logger.error(`Failed to draw lottery ${lotteryId}:`, error);
      throw error;
    }
  }

  async buildClaimTransaction(
    userWallet: PublicKey,
    lotteryId: number,
    ticketNumber: number
  ): Promise<Transaction> {
    const [lotteryPda] = this.getLotteryPDA(lotteryId);
    const [ticketPda] = this.getTicketPDA(lotteryId, ticketNumber);

    const ix = await coreProgram.methods
      .claimPrize()
      .accounts({
        lottery: lotteryPda,
        ticket: ticketPda,
        claimer: userWallet,
        treasury: TREASURY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(ix);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed');

    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = userWallet;

    return tx;
  }
}
```

### 5. AUTH MIDDLEWARE

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const authService = new AuthService();

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const payload = await authService.verifyToken(token);

    // Adicionar user info ao request
    req.user = payload;

    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

// Adicionar tipagem ao Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        wallet: string;
      };
    }
  }
}
```

### 6. VALIDATE MIDDLEWARE

```typescript
// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../utils/logger';

export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      logger.error('Validation error:', error);

      const errors = error.errors?.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated;
      next();
    } catch (error: any) {
      logger.error('Validation error:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
      });
    }
  };
}
```

### 7. ERROR MIDDLEWARE

```typescript
// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
  });

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
```

### 8. LOGGER

```typescript
// src/utils/logger.ts
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
});
```

### 9. CRON JOB

```typescript
// src/jobs/drawScheduler.job.ts
import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase';
import { VRFService } from '../services/vrf.service';
import { logger } from '../utils/logger';

const vrfService = new VRFService();

export function startDrawScheduler() {
  // Executa a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Running draw scheduler...');

      // Buscar loterias que precisam sortear
      const { data: lotteries, error } = await supabaseAdmin
        .from('lotteries')
        .select('*')
        .eq('is_drawn', false)
        .lte('draw_timestamp', new Date().toISOString());

      if (error) {
        logger.error('Failed to fetch lotteries:', error);
        return;
      }

      if (!lotteries || lotteries.length === 0) {
        logger.debug('No lotteries to draw');
        return;
      }

      logger.info(`Found ${lotteries.length} lotteries to draw`);

      // Solicitar VRF para cada loteria
      for (const lottery of lotteries) {
        try {
          await vrfService.requestRandomness(lottery.id);
          logger.info(`VRF requested for lottery ${lottery.id}`);
        } catch (err) {
          logger.error(`Failed to request VRF for lottery ${lottery.id}:`, err);
        }
      }
    } catch (error) {
      logger.error('Draw scheduler error:', error);
    }
  });

  logger.info('✅ Draw scheduler started (runs every 5 minutes)');
}
```

### 10. BULLMQ PROCESSOR

```typescript
// src/queues/processors/ticketPurchase.processor.ts
import { Job } from 'bullmq';
import { supabaseAdmin } from '../../config/supabase';
import { SolanaService } from '../../services/solana.service';
import { logger } from '../../utils/logger';

const solanaService = new SolanaService();

export async function processTicketPurchase(job: Job) {
  const { userId, lotteryId, ticketId, txSignature } = job.data;

  logger.info(`Processing ticket purchase: ${ticketId}`);

  try {
    // 1. Verificar transação on-chain
    const tx = await solanaService.verifyTransaction(txSignature);

    if (!tx) {
      throw new Error('Transaction not found on-chain');
    }

    // 2. Atualizar ticket no database
    const { error } = await supabaseAdmin
      .from('tickets')
      .update({
        tx_signature: txSignature,
      })
      .eq('id', ticketId);

    if (error) {
      logger.error('Failed to update ticket:', error);
      throw error;
    }

    logger.info(`Ticket purchase confirmed: ${ticketId}`);

    return { success: true, ticketId, txSignature };
  } catch (error) {
    logger.error('Failed to process ticket purchase:', error);
    throw error;
  }
}
```

---

## 📝 INSTRUÇÕES PARA O CHATGPT

**Cole estes exemplos junto com o prompt principal e diga:**

```
Use estes exemplos como TEMPLATE para todo o código que você criar.

IMPORTANTE:
- Mantenha o mesmo padrão de error handling
- Use o mesmo formato de logging
- Todos os endpoints retornam { success, data?, error? }
- Todos os services usam supabaseAdmin
- Todas as transactions retornam Transaction serializada
- Middleware auth adiciona req.user
- Validação com Zod em todos inputs

Siga EXATAMENTE este estilo de código!
```

---

## ✅ O QUE MOSTRAR AO CHATGPT

1. **CHATGPT_PROMPT.md** (prompt principal)
2. **CHATGPT_CODE_EXAMPLES.md** (este arquivo com exemplos)

Isso vai garantir que o ChatGPT crie código CONSISTENTE e no padrão correto! 🚀
