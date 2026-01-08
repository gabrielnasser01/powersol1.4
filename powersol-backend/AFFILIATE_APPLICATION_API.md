# API de Aplicações de Afiliados Premium

## Endpoints

### 1. Submeter Aplicação
```
POST /affiliate-applications/submit
```

**Body**:
```json
{
  "wallet_address": "ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj",
  "full_name": "João Silva",
  "email": "joao@example.com",
  "country": "Brazil",
  "social_media": "https://twitter.com/joaosilva",
  "marketing_experience": "5+ years",
  "marketing_strategy": "I plan to promote PowerSOL through my Twitter community..."
}
```

**Resposta (201)**:
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "wallet_address": "ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj",
    "full_name": "João Silva",
    "email": "joao@example.com",
    "country": "Brazil",
    "social_media": "https://twitter.com/joaosilva",
    "marketing_experience": "5+ years",
    "marketing_strategy": "I plan to promote PowerSOL...",
    "status": "pending",
    "created_at": "2026-01-03T10:00:00Z",
    "updated_at": "2026-01-03T10:00:00Z"
  }
}
```

**Erros**:
- `400`: Campos obrigatórios faltando
- `409`: Wallet já submeteu uma aplicação
- `500`: Erro interno

---

### 2. Consultar Minha Aplicação
```
GET /affiliate-applications/my-application?wallet_address=ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj
```

**Resposta (200)**:
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "wallet_address": "ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj",
    "full_name": "João Silva",
    "status": "pending",
    "created_at": "2026-01-03T10:00:00Z"
  }
}
```

**Erros**:
- `404`: Nenhuma aplicação encontrada
- `500`: Erro interno

---

### 3. Listar Aplicações (Admin)
```
GET /affiliate-applications/list?status=pending&limit=50&offset=0
```

**Query Params**:
- `status` (opcional): `pending`, `approved`, `rejected`
- `limit` (opcional): Número de resultados (padrão: 50)
- `offset` (opcional): Pular resultados (padrão: 0)

**Resposta (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "wallet_address": "ENmCwrkbbXVaBF7GWTZFLaVstx6ECHLUCUyh5oBfK7jj",
      "full_name": "João Silva",
      "email": "joao@example.com",
      "status": "pending",
      "created_at": "2026-01-03T10:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

### 4. Atualizar Status (Admin)
```
PATCH /affiliate-applications/:id/status
```

**Body**:
```json
{
  "status": "approved",
  "admin_notes": "Great marketing strategy!"
}
```

**Resposta (200)**:
```json
{
  "success": true,
  "message": "Application status updated",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "approved",
    "admin_notes": "Great marketing strategy!",
    "reviewed_at": "2026-01-03T11:00:00Z"
  }
}
```

---

### 5. Deletar Aplicação (Admin)
```
DELETE /affiliate-applications/:id
```

**Resposta (200)**:
```json
{
  "success": true,
  "message": "Application deleted successfully"
}
```

---

## Regras de Negócio

1. **Uma aplicação por wallet**: O campo `wallet_address` é único. Se tentar submeter novamente, retorna erro 409.

2. **Validações**:
   - Email deve ter formato válido
   - Wallet deve ter entre 32-44 caracteres
   - Campos obrigatórios: `wallet_address`, `full_name`, `email`

3. **Status**:
   - `pending`: Aguardando revisão (padrão)
   - `approved`: Aprovado pelo admin
   - `rejected`: Rejeitado pelo admin

4. **Segurança**:
   - Qualquer pessoa pode submeter (anônimo ou autenticado)
   - Apenas admins podem atualizar/deletar

---

## Exemplo de Uso no Frontend

```typescript
// Submeter aplicação
async function submitAffiliateApplication(data: {
  wallet_address: string;
  full_name: string;
  email: string;
  country?: string;
  social_media?: string;
  marketing_experience?: string;
  marketing_strategy?: string;
}) {
  const response = await fetch('http://localhost:4000/affiliate-applications/submit', {
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

// Verificar se já submeteu
async function checkExistingApplication(walletAddress: string) {
  const response = await fetch(
    `http://localhost:4000/affiliate-applications/my-application?wallet_address=${walletAddress}`
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

## Tabela no Supabase

**Nome**: `affiliate_applications`

**Colunas**:
- `id` (uuid, PK)
- `wallet_address` (text, unique, not null)
- `full_name` (text, not null)
- `email` (text, not null)
- `country` (text)
- `social_media` (text)
- `marketing_experience` (text)
- `marketing_strategy` (text)
- `status` (enum: pending, approved, rejected)
- `admin_notes` (text)
- `reviewed_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies**:
- Qualquer pessoa pode INSERT (anônimo ou autenticado)
- Qualquer pessoa pode SELECT
- Constraint UNIQUE garante 1 aplicação por wallet
