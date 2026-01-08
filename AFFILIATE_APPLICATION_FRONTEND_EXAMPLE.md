# Exemplo de Integração do Formulário de Afiliados

## Como Usar a API no Frontend

### 1. Criar Service/API Helper

Crie um arquivo `src/services/affiliateApplicationApi.ts`:

```typescript
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export interface AffiliateApplicationData {
  wallet_address: string;
  full_name: string;
  email: string;
  country?: string;
  social_media?: string;
  marketing_experience?: string;
  marketing_strategy?: string;
}

export async function submitAffiliateApplication(data: AffiliateApplicationData) {
  const response = await fetch(`${API_URL}/affiliate-applications/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit application');
  }

  return response.json();
}

export async function checkExistingApplication(walletAddress: string) {
  const response = await fetch(
    `${API_URL}/affiliate-applications/my-application?wallet_address=${walletAddress}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to check application');
  }

  const result = await response.json();
  return result.data;
}
```

---

### 2. Atualizar o Componente do Formulário

Modifique o componente `AffiliateDashboard.tsx` ou crie um novo:

```typescript
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { submitAffiliateApplication, checkExistingApplication } from '../services/affiliateApplicationApi';

export function AffiliateApplicationForm() {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    country: '',
    social_media: '',
    marketing_experience: '',
    marketing_strategy: '',
  });
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Verificar se já tem aplicação
  useEffect(() => {
    if (publicKey) {
      checkExistingApplication(publicKey.toBase58())
        .then(setExistingApplication)
        .catch(console.error);
    }
  }, [publicKey]);

  // Se já submeteu, mostrar status
  if (existingApplication) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-slate-800 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4">Application Status</h2>
        <div className={`p-4 rounded-lg ${
          existingApplication.status === 'approved' ? 'bg-green-500/20' :
          existingApplication.status === 'rejected' ? 'bg-red-500/20' :
          'bg-yellow-500/20'
        }`}>
          <p className="text-lg font-semibold">
            Status: {existingApplication.status.toUpperCase()}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Submitted: {new Date(existingApplication.created_at).toLocaleDateString()}
          </p>
          {existingApplication.admin_notes && (
            <p className="text-sm mt-2">
              Admin Notes: {existingApplication.admin_notes}
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await submitAffiliateApplication({
        wallet_address: publicKey.toBase58(),
        ...formData,
      });

      setSuccess(true);
      setFormData({
        full_name: '',
        email: '',
        country: '',
        social_media: '',
        marketing_experience: '',
        marketing_strategy: '',
      });

      // Recarregar para mostrar status
      setTimeout(() => {
        checkExistingApplication(publicKey.toBase58())
          .then(setExistingApplication)
          .catch(console.error);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-slate-800 rounded-2xl border border-cyan-500/20">
      <h2 className="text-2xl font-bold mb-6 text-center">Premium Affiliate Application</h2>

      {success && (
        <div className="mb-4 p-4 bg-green-500/20 rounded-lg">
          <p className="text-green-400">Application submitted successfully! We'll review it soon.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Solana Wallet Address *</label>
          <input
            type="text"
            value={publicKey?.toBase58() || ''}
            disabled
            className="w-full px-4 py-2 bg-slate-700/50 rounded-lg text-gray-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Country</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select Country</option>
              <option value="Brazil">Brazil</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Social Media / Website</label>
            <input
              type="url"
              name="social_media"
              value={formData.social_media}
              onChange={handleChange}
              placeholder="https://twitter.com/yourhandle"
              className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Marketing Experience</label>
          <select
            name="marketing_experience"
            value={formData.marketing_experience}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Select Experience Level</option>
            <option value="Beginner">Beginner</option>
            <option value="1-2 years">1-2 years</option>
            <option value="3-5 years">3-5 years</option>
            <option value="5+ years">5+ years</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tell us about your marketing strategy</label>
          <textarea
            name="marketing_strategy"
            value={formData.marketing_strategy}
            onChange={handleChange}
            placeholder="Describe how you plan to promote powerSOL and your target audience..."
            rows={4}
            className="w-full px-4 py-2 bg-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !publicKey}
            className="flex-1 py-3 bg-cyan-500 rounded-lg hover:bg-cyan-600 transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

### 3. Adicionar Variável de Ambiente

No arquivo `.env`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

---

### 4. Testar

1. Inicie o backend:
   ```bash
   cd powersol-backend
   npm run dev
   ```

2. Inicie o frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Conecte sua wallet e preencha o formulário

---

## Endpoints Disponíveis

- `POST /affiliate-applications/submit` - Submeter aplicação
- `GET /affiliate-applications/my-application?wallet_address=XXX` - Ver status
- `GET /affiliate-applications/list` - Listar todas (admin)
- `PATCH /affiliate-applications/:id/status` - Atualizar status (admin)
- `DELETE /affiliate-applications/:id` - Deletar (admin)

---

## Validações

- ✅ Cada wallet só pode submeter **1 aplicação**
- ✅ Email deve ter formato válido
- ✅ Wallet deve ter 32-44 caracteres
- ✅ Campos obrigatórios: wallet, nome, email
