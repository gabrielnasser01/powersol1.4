# 🔗 Integração Frontend ↔ Backend PowerSOL

## 📋 Como Conectar Este Frontend com o Backend

Este guia mostra **exatamente** como integrar este frontend React com o backend documentado.

---

## 🔌 1. Configurar Variáveis de Ambiente

### Frontend `.env`
```env
# Backend API
VITE_API_URL=http://localhost:4000

# Supabase (mesmo do backend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Solana
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_CLUSTER=devnet

# Program IDs (copiar do backend .env)
VITE_POWERSOL_CORE_PROGRAM_ID=2hGiqYuw2sxu7P5AnbcW2CYwiVdcgGqzGwdrDam6DCrZ
VITE_POWERSOL_CLAIM_PROGRAM_ID=4Qa4fA1NVuMcZV8K4D4x3Efr2E1V9AqMfCVxYvByBPjE
```

---

## 📡 2. Criar API Client

### src/lib/api-client.ts
```typescript
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  // ==========================================
  // AUTH
  // ==========================================

  async getNonce(wallet: string) {
    return this.request<{ nonce: string }>(
      `/api/auth/nonce?wallet=${wallet}`
    );
  }

  async loginWallet(walletAddress: string, signature: string) {
    const data = await this.request<ApiResponse<{ token: string; user: any }>>(
      '/api/auth/wallet',
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature }),
      }
    );

    if (data.success && data.data) {
      this.setToken(data.data.token);
    }

    return data;
  }

  async getProfile() {
    return this.request<ApiResponse<any>>('/api/auth/me');
  }

  // ==========================================
  // LOTTERIES
  // ==========================================

  async getLotteries() {
    return this.request<ApiResponse<any[]>>('/api/lotteries');
  }

  async getActiveLotteries() {
    return this.request<ApiResponse<any[]>>('/api/lotteries/active');
  }

  async getLottery(id: string) {
    return this.request<ApiResponse<any>>(`/api/lotteries/${id}`);
  }

  async getLotteryStats(id: string) {
    return this.request<ApiResponse<any>>(`/api/lotteries/${id}/stats`);
  }

  async getLotteryWinners(id: string) {
    return this.request<ApiResponse<any[]>>(`/api/lotteries/${id}/winners`);
  }

  // ==========================================
  // TICKETS
  // ==========================================

  async purchaseTicket(lotteryId: string, quantity: number) {
    return this.request<ApiResponse<{ transaction: any; ticketNumber: number }>>(
      '/api/tickets/purchase',
      {
        method: 'POST',
        body: JSON.stringify({ lotteryId, quantity }),
      }
    );
  }

  async getMyTickets() {
    return this.request<ApiResponse<any[]>>('/api/tickets/my-tickets');
  }

  async getTicket(id: string) {
    return this.request<ApiResponse<any>>(`/api/tickets/${id}`);
  }

  async verifyTicket(id: string) {
    return this.request<ApiResponse<any>>(`/api/tickets/${id}/verify`, {
      method: 'POST',
    });
  }

  // ==========================================
  // CLAIMS
  // ==========================================

  async claimPrize(ticketId: string) {
    return this.request<ApiResponse<{ txSignature: string }>>(
      '/api/claims/prize',
      {
        method: 'POST',
        body: JSON.stringify({ ticketId }),
      }
    );
  }

  async getMyClaims() {
    return this.request<ApiResponse<any[]>>('/api/claims/my-claims');
  }

  async getClaimStatus(id: string) {
    return this.request<ApiResponse<any>>(`/api/claims/${id}/status`);
  }

  // ==========================================
  // MISSIONS
  // ==========================================

  async getMissions() {
    return this.request<ApiResponse<any[]>>('/api/missions');
  }

  async getDailyMissions() {
    return this.request<ApiResponse<any[]>>('/api/missions/daily');
  }

  async getMyMissionProgress() {
    return this.request<ApiResponse<any[]>>('/api/missions/my-progress');
  }

  async completeMission(missionId: string) {
    return this.request<ApiResponse<any>>(
      `/api/missions/${missionId}/complete`,
      { method: 'POST' }
    );
  }

  // ==========================================
  // AFFILIATES
  // ==========================================

  async getAffiliateDashboard() {
    return this.request<ApiResponse<any>>('/api/affiliates/dashboard');
  }

  async getAffiliateReferrals() {
    return this.request<ApiResponse<any[]>>('/api/affiliates/referrals');
  }

  async getAffiliateEarnings() {
    return this.request<ApiResponse<any>>('/api/affiliates/earnings');
  }

  async withdrawAffiliate(amount: number) {
    return this.request<ApiResponse<{ txSignature: string }>>(
      '/api/affiliates/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }
    );
  }

  async getAffiliateStats() {
    return this.request<ApiResponse<any>>('/api/affiliates/stats');
  }

  // ==========================================
  // TRANSPARENCY
  // ==========================================

  async getDraws() {
    return this.request<ApiResponse<any[]>>('/api/transparency/draws');
  }

  async getDraw(id: string) {
    return this.request<ApiResponse<any>>(`/api/transparency/draws/${id}`);
  }

  async getVRFInfo() {
    return this.request<ApiResponse<any>>('/api/transparency/vrf');
  }

  async getGlobalStats() {
    return this.request<ApiResponse<any>>('/api/transparency/stats');
  }

  async getOnChainData(address: string) {
    return this.request<ApiResponse<any>>(
      `/api/transparency/on-chain/${address}`
    );
  }
}

export const apiClient = new ApiClient();
```

---

## 🔐 3. Integrar Autenticação Wallet

### src/hooks/useAuth.ts
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';
import bs58 from 'bs58';

export function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar se já tem token salvo
    const token = localStorage.getItem('auth_token');
    if (token && connected) {
      loadProfile();
    }
  }, [connected]);

  async function loadProfile() {
    try {
      const response = await apiClient.getProfile();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // Token inválido/expirado
      logout();
    }
  }

  async function login() {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);

    try {
      // 1. Obter nonce do backend
      const { nonce } = await apiClient.getNonce(publicKey.toBase58());

      // 2. Assinar nonce com wallet
      const message = `Sign this message to authenticate: ${nonce}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // 3. Enviar assinatura para backend
      const response = await apiClient.loginWallet(
        publicKey.toBase58(),
        signatureBase58
      );

      if (response.success && response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return response.data;
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    apiClient.clearToken();
    setUser(null);
    setIsAuthenticated(false);
  }

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  };
}
```

---

## 🎫 4. Integrar Compra de Tickets

### src/components/TicketPurchase.tsx
```typescript
import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { apiClient } from '../lib/api-client';
import { Transaction } from '@solana/web3.js';

export function TicketPurchase({ lotteryId }: { lotteryId: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handlePurchase() {
    if (!publicKey || !signTransaction) {
      setError('Connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Solicitar transação do backend
      const response = await apiClient.purchaseTicket(lotteryId, quantity);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create transaction');
      }

      const { transaction: txData, ticketNumber } = response.data;

      // 2. Deserializar transação
      const tx = Transaction.from(Buffer.from(txData, 'base64'));

      // 3. Assinar com wallet
      const signedTx = await signTransaction(tx);

      // 4. Enviar transação
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      // 5. Confirmar
      await connection.confirmTransaction(signature, 'confirmed');

      // 6. Notificar backend
      // O backend deve ter um webhook ou polling para verificar
      // Alternativamente, chamar endpoint de confirmação:
      // await apiClient.confirmPurchase(signature);

      setSuccess(true);
      console.log('Purchase successful!', {
        signature,
        ticketNumber,
      });

      // Mostrar toast ou modal de sucesso
      alert(`Ticket #${ticketNumber} purchased! Tx: ${signature}`);
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ticket-purchase">
      <h3>Purchase Tickets</h3>

      <div>
        <label>Quantity:</label>
        <input
          type="number"
          min="1"
          max="100"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          disabled={loading}
        />
      </div>

      <button onClick={handlePurchase} disabled={loading || !publicKey}>
        {loading ? 'Processing...' : `Buy ${quantity} Ticket(s)`}
      </button>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">Purchase successful! ✅</div>}
    </div>
  );
}
```

---

## 🏆 5. Integrar Claims

### src/components/PrizeClaim.tsx
```typescript
import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { apiClient } from '../lib/api-client';

export function PrizeClaim({ ticketId, amount }: { ticketId: string; amount: number }) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  async function handleClaim() {
    if (!publicKey) {
      setError('Connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Backend cria e envia transação
      const response = await apiClient.claimPrize(ticketId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Claim failed');
      }

      const signature = response.data.txSignature;

      // Confirmar transação
      await connection.confirmTransaction(signature, 'confirmed');

      setTxSignature(signature);
      setSuccess(true);

      alert(`Prize claimed! ${amount / 1e9} SOL\nTx: ${signature}`);
    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.message || 'Claim failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="prize-claim">
      <h3>Claim Your Prize</h3>
      <p>Amount: {amount / 1e9} SOL</p>

      <button onClick={handleClaim} disabled={loading || success || !publicKey}>
        {loading ? 'Claiming...' : success ? 'Claimed ✅' : 'Claim Prize'}
      </button>

      {error && <div className="error">{error}</div>}
      {success && txSignature && (
        <div className="success">
          <p>Claimed successfully! ✅</p>
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 6. Integrar Loterias no Frontend

### Atualizar src/pages/Lottery.tsx
```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { TicketPurchase } from '../components/TicketPurchase';

export function Lottery() {
  const [lotteries, setLotteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLotteries();
  }, []);

  async function loadLotteries() {
    try {
      const response = await apiClient.getActiveLotteries();
      if (response.success && response.data) {
        setLotteries(response.data);
      }
    } catch (error) {
      console.error('Failed to load lotteries:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="lottery-page">
      <h1>Active Lotteries</h1>

      <div className="lottery-grid">
        {lotteries.map((lottery) => (
          <div key={lottery.id} className="lottery-card">
            <h2>{lottery.type}</h2>
            <p>Prize Pool: {lottery.prize_pool / 1e9} SOL</p>
            <p>Tickets: {lottery.current_tickets} / {lottery.max_tickets}</p>
            <p>Draw: {new Date(lottery.draw_timestamp).toLocaleString()}</p>

            <TicketPurchase lotteryId={lottery.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 7. Integrar Missões

### src/pages/Missions.tsx (atualizado)
```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../hooks/useAuth';

export function Missions() {
  const { isAuthenticated } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissions();
    if (isAuthenticated) {
      loadProgress();
    }
  }, [isAuthenticated]);

  async function loadMissions() {
    try {
      const response = await apiClient.getMissions();
      if (response.success && response.data) {
        setMissions(response.data);
      }
    } catch (error) {
      console.error('Failed to load missions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProgress() {
    try {
      const response = await apiClient.getMyMissionProgress();
      if (response.success && response.data) {
        setProgress(response.data);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }

  async function completeMission(missionId: string) {
    try {
      const response = await apiClient.completeMission(missionId);
      if (response.success) {
        alert('Mission completed! 🎉');
        loadProgress(); // Reload
      }
    } catch (error: any) {
      alert(error.message || 'Failed to complete mission');
    }
  }

  function getMissionProgress(missionId: string) {
    return progress.find((p) => p.mission_id === missionId);
  }

  if (loading) {
    return <div>Loading missions...</div>;
  }

  return (
    <div className="missions-page">
      <h1>Daily Missions</h1>

      <div className="missions-grid">
        {missions.map((mission) => {
          const userProgress = getMissionProgress(mission.id);
          const isCompleted = userProgress?.is_completed || false;
          const currentProgress = userProgress?.progress || 0;

          return (
            <div key={mission.id} className="mission-card">
              <h3>{mission.title}</h3>
              <p>{mission.description}</p>

              <div className="mission-reward">
                Reward: {mission.reward_amount} {mission.reward_type}
              </div>

              {isAuthenticated && (
                <div className="mission-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(currentProgress / mission.requirement.target) * 100}%`,
                      }}
                    />
                  </div>
                  <span>
                    {currentProgress} / {mission.requirement.target}
                  </span>
                </div>
              )}

              <button
                onClick={() => completeMission(mission.id)}
                disabled={!isAuthenticated || isCompleted}
              >
                {isCompleted ? 'Completed ✅' : 'Complete Mission'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 📈 8. Integrar Transparência

### src/pages/Transparency.tsx (atualizado)
```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';

export function Transparency() {
  const [draws, setDraws] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [drawsRes, statsRes] = await Promise.all([
        apiClient.getDraws(),
        apiClient.getGlobalStats(),
      ]);

      if (drawsRes.success && drawsRes.data) {
        setDraws(drawsRes.data);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Failed to load transparency data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="transparency-page">
      <h1>Transparency Dashboard</h1>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Lotteries</h3>
            <p>{stats.totalLotteries}</p>
          </div>
          <div className="stat-card">
            <h3>Total Tickets Sold</h3>
            <p>{stats.totalTickets}</p>
          </div>
          <div className="stat-card">
            <h3>Total Prize Pool</h3>
            <p>{stats.totalPrizePool / 1e9} SOL</p>
          </div>
          <div className="stat-card">
            <h3>Total Winners</h3>
            <p>{stats.totalWinners}</p>
          </div>
        </div>
      )}

      <h2>Recent Draws</h2>
      <div className="draws-list">
        {draws.map((draw) => (
          <div key={draw.id} className="draw-card">
            <h3>Lottery #{draw.lottery_id}</h3>
            <p>Winning Ticket: #{draw.winning_ticket}</p>
            <p>Drawn: {new Date(draw.drawn_at).toLocaleString()}</p>
            <a
              href={`https://explorer.solana.com/tx/${draw.tx_signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Transaction →
            </a>

            {draw.vrf_proof && (
              <details>
                <summary>VRF Proof</summary>
                <pre>{JSON.stringify(draw.vrf_proof, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist de Integração

### Configuração
- [ ] Criar `src/lib/api-client.ts`
- [ ] Criar `src/hooks/useAuth.ts`
- [ ] Atualizar `.env` com `VITE_API_URL`
- [ ] Instalar `bs58` se não estiver: `npm install bs58`

### Autenticação
- [ ] Conectar wallet
- [ ] Login com assinatura
- [ ] Salvar token JWT
- [ ] Proteger rotas autenticadas

### Funcionalidades
- [ ] Listar loterias (GET /api/lotteries)
- [ ] Comprar ticket (POST /api/tickets/purchase)
- [ ] Ver meus tickets (GET /api/tickets/my-tickets)
- [ ] Claim prêmio (POST /api/claims/prize)
- [ ] Missões (GET /api/missions)
- [ ] Dashboard afiliado (GET /api/affiliates/dashboard)
- [ ] Transparência (GET /api/transparency/*)

### Testes
- [ ] Login funciona
- [ ] Compra de ticket funciona end-to-end
- [ ] Claim funciona
- [ ] Dados atualizam em tempo real
- [ ] Erros são tratados corretamente

---

## 🔧 Troubleshooting

### CORS Error
**Backend** precisa configurar CORS:
```typescript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### 401 Unauthorized
- Verificar se token está sendo enviado
- Verificar se token não expirou
- Refazer login

### Transaction Failed
- Verificar saldo da wallet
- Confirmar que program IDs estão corretos
- Verificar RPC URL (devnet vs mainnet)

### Data Not Loading
- Abrir DevTools → Network
- Verificar se requisições estão sendo feitas
- Verificar responses do backend

---

## 🎯 Próximos Passos

1. ✅ Implementar API client
2. ✅ Integrar autenticação
3. ✅ Integrar compra de tickets
4. ✅ Integrar claims
5. ✅ Integrar missões
6. ✅ Real-time updates (WebSockets opcional)
7. ✅ Notificações (toast/modal)
8. ✅ Loading states
9. ✅ Error boundaries
10. ✅ Analytics tracking

---

**Com isso, seu frontend estará 100% integrado ao backend!** 🚀
