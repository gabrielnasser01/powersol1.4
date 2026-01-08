# 🛡️ Sistema de Admin e Auditoria - PowerSOL

Sistema completo de **controle de administradores** e **auditoria de alterações** em tiers de afiliados.

---

## 📋 OVERVIEW

O sistema garante que:

1. **Apenas admins** podem alterar tiers manualmente
2. **Todas as alterações** são registradas em log imutável
3. **Histórico completo** de quem mudou o quê, quando e por quê
4. **Rastreamento de IP** e User-Agent para segurança
5. **Estatísticas** de atividade administrativa

---

## 🔐 SISTEMA DE ADMIN

### 1. Estrutura no Banco de Dados

```sql
-- Coluna is_admin na tabela users
ALTER TABLE users
ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;
```

- **Default: `false`** - Por segurança, todos usuários são não-admin
- **Apenas admins existentes** podem criar novos admins
- **Primeiro admin** deve ser definido manualmente via SQL

### 2. Como Definir o Primeiro Admin

```sql
-- Opção 1: Por wallet address
UPDATE users
SET is_admin = true
WHERE wallet = 'SUA_WALLET_AQUI';

-- Opção 2: Primeiro usuário registrado
UPDATE users
SET is_admin = true
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

-- Opção 3: Por ID específico
UPDATE users
SET is_admin = true
WHERE id = 'user-id-aqui';
```

### 3. Middleware de Admin

```typescript
// middleware/admin.middleware.ts
export async function requireAdmin(req, res, next) {
  // 1. Verifica autenticação
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // 2. Busca status de admin no banco
  const user = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', req.user.userId)
    .single();

  // 3. Rejeita se não for admin
  if (!user.is_admin) {
    throw new ForbiddenError('Admin access required');
  }

  // 4. Permite acesso
  next();
}
```

### 4. Aplicação nas Rotas

```typescript
// Rotas protegidas por admin
router.post(
  '/:affiliateId/tier/set',
  authenticate,      // ← Primeiro: verifica autenticação
  requireAdmin,      // ← Segundo: verifica se é admin
  setManualTier
);
```

---

## 📊 SISTEMA DE AUDITORIA

### 1. Tabela de Auditoria

```sql
CREATE TABLE affiliate_tier_audit (
  id UUID PRIMARY KEY,
  affiliate_id UUID REFERENCES affiliates(id),
  admin_id UUID REFERENCES users(id),
  action TEXT CHECK (action IN ('SET_MANUAL_TIER', 'REMOVE_MANUAL_TIER')),
  old_tier INTEGER,     -- Tier anterior
  new_tier INTEGER,     -- Novo tier (manual)
  reason TEXT,          -- Motivo da alteração
  ip_address INET,      -- IP do admin
  user_agent TEXT,      -- Navegador/cliente usado
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Características da Auditoria

**Imutável:**
- ✅ INSERT permitido
- ❌ UPDATE bloqueado
- ❌ DELETE bloqueado

**RLS Ativado:**
- Apenas admins podem visualizar logs
- Sistema pode inserir (via service role)
- Ninguém pode modificar ou deletar

### 3. Log Automático

Toda alteração de tier é **automaticamente registrada**:

```typescript
// No affiliate.service.ts
async setManualTier(affiliateId, tier, adminId, reason, ipAddress, userAgent) {
  // 1. Captura tier atual
  const oldTier = await this.getAffiliateTier(affiliateId);

  // 2. Atualiza tier
  await supabase
    .from('affiliates')
    .update({ manual_tier: tier })
    .eq('id', affiliateId);

  // 3. Registra em auditoria
  if (adminId) {
    await auditService.logTierChange({
      affiliateId,
      adminId,
      action: 'SET_MANUAL_TIER',
      oldTier,
      newTier: tier,
      reason,
      ipAddress,
      userAgent,
    });
  }
}
```

---

## 🔧 API ENDPOINTS

Base URL: `http://localhost:4000/api`

### Endpoints de Tier (Admin apenas)

#### 1. Definir Tier Manual

```bash
POST /affiliates/:affiliateId/tier/set
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "tier": 4,
  "reason": "VIP Partnership Program 2024"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Manual tier set successfully",
    "affiliateId": "abc-123",
    "manualTier": 4,
    "effectiveTier": 4,
    "affiliate": { ... }
  }
}
```

#### 2. Remover Tier Manual

```bash
DELETE /affiliates/:affiliateId/tier
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Promotion ended"
}
```

#### 3. Ver Tier de Afiliado

```bash
GET /affiliates/:affiliateId/tier
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "affiliateId": "abc-123",
    "manualTier": 4,
    "effectiveTier": 4,
    "validatedReferrals": 42,
    "calculatedTier": 1
  }
}
```

### Endpoints de Auditoria (Admin apenas)

#### 1. Histórico de um Afiliado

```bash
GET /audit/affiliates/:affiliateId?limit=50
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "affiliateId": "abc-123",
    "history": [
      {
        "id": "log-1",
        "admin_wallet": "Admin1Wallet...",
        "action": "SET_MANUAL_TIER",
        "old_tier": 1,
        "new_tier": 4,
        "reason": "VIP Partnership",
        "ip_address": "192.168.1.1",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

#### 2. Ações Recentes de Admins

```bash
GET /audit/actions?adminId=<admin-id>&limit=100
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "id": "log-1",
        "affiliate_code": "VIP2024",
        "admin_wallet": "Admin1Wallet...",
        "action": "SET_MANUAL_TIER",
        "old_tier": 1,
        "new_tier": 4,
        "reason": "VIP Partnership",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1,
    "adminId": "admin-123"
  }
}
```

#### 3. Estatísticas de Auditoria

```bash
GET /audit/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_changes": 150,
    "affiliates_affected": 85,
    "admins_involved": 3,
    "tiers_set": 120,
    "tiers_removed": 30,
    "changes_last_24h": 5,
    "changes_last_7d": 25,
    "changes_last_30d": 150
  }
}
```

#### 4. Resumo de Atividade de Admins

```bash
GET /audit/admins
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "admin_id": "admin-1",
        "admin_wallet": "Admin1Wallet...",
        "total_actions": 85,
        "tiers_set": 70,
        "tiers_removed": 15,
        "first_action": "2024-01-01T00:00:00Z",
        "last_action": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

---

## 💡 EXEMPLOS DE USO

### Exemplo 1: Admin Define Tier VIP

```bash
# 1. Admin faz login e recebe token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet": "AdminWallet...", "signature": "..."}'

# Response:
# { "token": "eyJhbGc..." }

# 2. Admin define afiliado como Tier 4
curl -X POST http://localhost:4000/api/affiliates/abc-123/tier/set \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 4,
    "reason": "VIP Partnership - Contrato especial com 30% comissão"
  }'

# 3. Log é automaticamente criado em affiliate_tier_audit
```

### Exemplo 2: Ver Histórico de Alterações

```bash
# Ver todos os logs de um afiliado
curl -X GET http://localhost:4000/api/audit/affiliates/abc-123 \
  -H "Authorization: Bearer <admin_token>"
```

### Exemplo 3: SQL Direto

```sql
-- Ver histórico de um afiliado
SELECT * FROM get_affiliate_tier_audit_history('abc-123', 50);

-- Ver ações recentes de todos admins
SELECT * FROM get_recent_admin_actions(NULL, 100);

-- Ver ações de um admin específico
SELECT * FROM get_recent_admin_actions('admin-id', 50);

-- Estatísticas gerais
SELECT * FROM affiliate_tier_audit_stats;

-- Atividade de cada admin
SELECT * FROM admin_activity_summary;
```

---

## 🔍 QUERIES ÚTEIS

### Ver Todos Admins

```sql
SELECT id, wallet, is_admin, created_at
FROM users
WHERE is_admin = true
ORDER BY created_at ASC;
```

### Logs Recentes (últimas 24h)

```sql
SELECT
  ata.created_at,
  u.wallet as admin_wallet,
  a.referral_code,
  ata.action,
  ata.old_tier,
  ata.new_tier,
  ata.reason
FROM affiliate_tier_audit ata
JOIN users u ON u.id = ata.admin_id
JOIN affiliates a ON a.id = ata.affiliate_id
WHERE ata.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ata.created_at DESC;
```

### Afiliados com Tier Manual + Histórico

```sql
SELECT
  a.referral_code,
  a.manual_tier,
  get_affiliate_effective_tier(a.id) as effective_tier,
  COUNT(ata.id) as total_changes,
  MAX(ata.created_at) as last_change
FROM affiliates a
LEFT JOIN affiliate_tier_audit ata ON ata.affiliate_id = a.id
WHERE a.manual_tier IS NOT NULL
GROUP BY a.id, a.referral_code, a.manual_tier
ORDER BY last_change DESC;
```

### Admin mais Ativo

```sql
SELECT
  u.wallet,
  COUNT(ata.id) as total_actions,
  MIN(ata.created_at) as first_action,
  MAX(ata.created_at) as last_action
FROM users u
JOIN affiliate_tier_audit ata ON ata.admin_id = u.id
WHERE u.is_admin = true
GROUP BY u.id, u.wallet
ORDER BY total_actions DESC
LIMIT 10;
```

---

## 🛡️ SEGURANÇA

### 1. Proteção em Camadas

```
┌─────────────────────────────────────┐
│ 1. Authentication (JWT)             │  ← authenticate middleware
├─────────────────────────────────────┤
│ 2. Admin Check (is_admin = true)    │  ← requireAdmin middleware
├─────────────────────────────────────┤
│ 3. RLS no Banco (só admins veem)    │  ← Supabase RLS policies
├─────────────────────────────────────┤
│ 4. Logs Imutáveis (no UPDATE/DELETE)│  ← SQL policies
└─────────────────────────────────────┘
```

### 2. Rastreamento Completo

Cada ação registra:
- **Quem**: admin_id + wallet
- **O quê**: action + old_tier + new_tier
- **Quando**: created_at (timestamp automático)
- **Por quê**: reason (fornecido pelo admin)
- **De onde**: ip_address + user_agent

### 3. Prevenção de Fraudes

**Logs Imutáveis:**
- Admins não podem apagar seus rastros
- Tentativas de modificar logs são bloqueadas pelo RLS
- Histórico permanente para compliance

**Auditoria de Admins:**
- Listar todos admins: `SELECT * FROM users WHERE is_admin = true`
- Atividade suspeita: múltiplas alterações em curto período
- Comparar actions com affiliate earnings

---

## 📈 DASHBOARD RECOMENDADO

### Interface Admin

```typescript
// Admin Panel - Tier Management

interface AdminDashboard {
  // Resumo
  totalAdmins: number;
  totalChanges: number;
  changesLast24h: number;

  // Afiliados com tier manual
  manualTierAffiliates: Array<{
    referralCode: string;
    manualTier: number;
    effectiveTier: number;
    lastChanged: Date;
    changedBy: string;
  }>;

  // Ações recentes
  recentActions: Array<{
    timestamp: Date;
    adminWallet: string;
    affiliateCode: string;
    action: string;
    oldTier: number;
    newTier: number;
    reason: string;
  }>;

  // Atividade de admins
  adminActivity: Array<{
    adminWallet: string;
    totalActions: number;
    lastAction: Date;
  }>;
}
```

### Componentes

1. **Lista de Afiliados** - Com botão "Set Tier" para admins
2. **Modal de Tier** - Input de tier (1-4) + campo de reason
3. **Histórico de Alterações** - Timeline de logs por afiliado
4. **Dashboard de Auditoria** - Estatísticas e gráficos
5. **Lista de Admins** - Gerenciar quem é admin

---

## ✅ CHECKLIST DE SEGURANÇA

### Implementação
- [x] Coluna `is_admin` na tabela `users`
- [x] Tabela `affiliate_tier_audit` criada
- [x] RLS ativado em `affiliate_tier_audit`
- [x] Policies de imutabilidade (no UPDATE/DELETE)
- [x] Middleware `requireAdmin`
- [x] Aplicado em rotas de tier
- [x] Auditoria automática em todas alterações
- [x] Endpoints de consulta de logs
- [x] Funções SQL helper (get_affiliate_tier_audit_history, etc)

### Operacional
- [ ] Definir primeiro admin via SQL
- [ ] Testar fluxo completo (set tier → ver log)
- [ ] Criar dashboard de admin no frontend
- [ ] Documentar processo de adicionar novos admins
- [ ] Configurar alertas para atividade suspeita
- [ ] Backup regular da tabela de auditoria

### Manutenção
- [ ] Monitorar tamanho da tabela de auditoria
- [ ] Arquivar logs antigos (>1 ano) se necessário
- [ ] Revisar lista de admins periodicamente
- [ ] Auditar ações de cada admin mensalmente

---

## 🔗 ARQUIVOS RELACIONADOS

### Backend
- `src/middleware/admin.middleware.ts` - Middleware de admin
- `src/services/audit.service.ts` - Service de auditoria
- `src/controllers/audit.controller.ts` - Controller de auditoria
- `src/routes/audit.routes.ts` - Rotas de auditoria
- `src/types/audit.types.ts` - Tipos TypeScript
- `supabase/migrations/005_admin_and_audit.sql` - Migration completa

### Documentação
- `MANUAL_TIER.md` - Sistema de tier manual
- `AFFILIATE_SYSTEM.md` - Sistema de afiliados
- `DELTA_SYSTEM.md` - Sistema de delta

---

## 📞 COMANDOS RÁPIDOS

```bash
# Definir primeiro admin
psql $DATABASE_URL -c "UPDATE users SET is_admin = true WHERE wallet = 'WALLET';"

# Ver todos admins
psql $DATABASE_URL -c "SELECT wallet, is_admin FROM users WHERE is_admin = true;"

# Ver logs recentes
psql $DATABASE_URL -c "SELECT * FROM get_recent_admin_actions(NULL, 10);"

# Estatísticas
psql $DATABASE_URL -c "SELECT * FROM affiliate_tier_audit_stats;"
```

---

**Sistema de Admin e Auditoria - Segurança e Transparência Total! 🛡️✅**
