# 🎯 Como Visualizar o Banco de Dados no Bolt

## ✅ Banco Conectado!

Seu banco Supabase já está conectado e funcionando! As migrations foram aplicadas com sucesso.

---

## 📊 Como Ver as Tabelas

### 1. Via Supabase Dashboard (Recomendado)

Acesse seu dashboard do Supabase:

**URL:** https://xdcfwggwoutumhkcpkej.supabase.co

**Passos:**
1. Vá para [app.supabase.com](https://app.supabase.com)
2. Faça login
3. Selecione seu projeto: `xdcfwggwoutumhkcpkej`
4. Vá para **Table Editor** no menu lateral
5. Você verá todas as tabelas criadas!

### 2. Tabelas Criadas

#### ✅ **users** (Atualizada)
```
Colunas:
- id (UUID)
- wallet_address (TEXT)
- is_admin (BOOLEAN) ← NOVA COLUNA
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### ✅ **affiliates** (Nova)
```
Colunas:
- id (UUID)
- user_id (UUID) → FK para users
- referral_code (TEXT)
- total_earned (NUMERIC)
- pending_earnings (NUMERIC)
- manual_tier (INTEGER) ← Para tier manual
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### ✅ **affiliate_tier_audit** (Nova)
```
Colunas:
- id (UUID)
- affiliate_id (UUID) → FK para affiliates
- admin_id (UUID) → FK para users
- action (TEXT) → 'SET_MANUAL_TIER' ou 'REMOVE_MANUAL_TIER'
- old_tier (INTEGER)
- new_tier (INTEGER)
- reason (TEXT)
- ip_address (INET)
- user_agent (TEXT)
- created_at (TIMESTAMP)
```

---

## 🔐 Como Definir o Primeiro Admin

### Opção 1: Via SQL Editor no Supabase Dashboard

1. No Supabase Dashboard, vá para **SQL Editor**
2. Cole este SQL:

```sql
-- Definir admin por wallet address
UPDATE users
SET is_admin = true
WHERE wallet_address = 'SUA_WALLET_AQUI';
```

3. Clique em **Run** ou pressione `Ctrl+Enter`

### Opção 2: Definir Primeiro Usuário como Admin

```sql
-- Automaticamente define o primeiro usuário registrado como admin
UPDATE users
SET is_admin = true
WHERE id = (
  SELECT id
  FROM users
  ORDER BY created_at ASC
  LIMIT 1
);
```

### Opção 3: Criar Admin Manualmente

```sql
-- Inserir um admin direto
INSERT INTO users (wallet_address, is_admin)
VALUES ('SUA_WALLET_ADMIN', true);
```

---

## 🧪 Como Testar o Sistema

### 1. Verificar Tabelas

```sql
-- Ver estrutura da tabela users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Ver estrutura da tabela affiliate_tier_audit
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'affiliate_tier_audit'
ORDER BY ordinal_position;
```

### 2. Verificar Admins

```sql
-- Listar todos admins
SELECT id, wallet_address, is_admin, created_at
FROM users
WHERE is_admin = true;
```

### 3. Criar Dados de Teste

```sql
-- 1. Criar usuário admin
INSERT INTO users (wallet_address, is_admin)
VALUES ('AdminWallet123', true)
RETURNING id;

-- 2. Criar usuário normal
INSERT INTO users (wallet_address, is_admin)
VALUES ('UserWallet456', false)
RETURNING id;

-- 3. Criar afiliado (use o id do usuário normal)
INSERT INTO affiliates (user_id, referral_code)
VALUES ('USER_ID_AQUI', 'REF001')
RETURNING id;

-- 4. Criar log de auditoria (use ids dos passos anteriores)
INSERT INTO affiliate_tier_audit (
  affiliate_id,
  admin_id,
  action,
  old_tier,
  new_tier,
  reason
)
VALUES (
  'AFFILIATE_ID_AQUI',
  'ADMIN_ID_AQUI',
  'SET_MANUAL_TIER',
  1,
  4,
  'Teste do sistema de auditoria'
);
```

### 4. Ver Logs de Auditoria

```sql
-- Ver todos logs
SELECT * FROM affiliate_tier_audit
ORDER BY created_at DESC;

-- Ver logs de um afiliado específico (use a função helper)
SELECT * FROM get_affiliate_tier_audit_history('AFFILIATE_ID_AQUI', 50);

-- Ver ações recentes de admins
SELECT * FROM get_recent_admin_actions(NULL, 100);

-- Ver estatísticas
SELECT * FROM affiliate_tier_audit_stats;
```

---

## 📱 Via API (Endpoints Criados)

### Autenticação Admin
```bash
# 1. Login (recebe token JWT)
POST http://localhost:4000/api/auth/login
{
  "wallet": "AdminWallet123",
  "signature": "..."
}

# Response: { "token": "eyJhbGc..." }
```

### Gerenciar Tiers
```bash
# 2. Definir tier manual
POST http://localhost:4000/api/affiliates/:affiliateId/tier/set
Authorization: Bearer <token>
{
  "tier": 4,
  "reason": "VIP Partnership"
}

# 3. Ver histórico
GET http://localhost:4000/api/audit/affiliates/:affiliateId
Authorization: Bearer <token>

# 4. Ver estatísticas
GET http://localhost:4000/api/audit/stats
Authorization: Bearer <token>
```

---

## 🔍 Explorar no Table Editor

### No Supabase Dashboard:

1. **Table Editor** → Selecione uma tabela
2. Você pode:
   - ✅ Ver todos registros
   - ✅ Adicionar novos registros
   - ✅ Editar registros existentes
   - ✅ Deletar registros
   - ✅ Filtrar e buscar
   - ✅ Exportar dados (CSV, JSON)

3. **SQL Editor** → Escrever queries customizadas
4. **Database** → Ver relacionamentos e índices
5. **Logs** → Ver queries executadas em tempo real

---

## 🛠️ Ferramentas Úteis

### DBeaver (Desktop)
1. Baixe: [dbeaver.io](https://dbeaver.io/)
2. Conecte com a string:
   ```
   postgresql://[user]:[password]@[host]:[port]/[database]
   ```
3. Você pode pegar essa string no Supabase:
   - Settings → Database → Connection String

### pgAdmin (Desktop)
1. Baixe: [pgadmin.org](https://www.pgadmin.org/)
2. Adicione nova conexão com os dados do Supabase

### VS Code Extension
1. Instale: "PostgreSQL" por Chris Kolkman
2. Conecte ao banco Supabase
3. Explore e edite direto no VS Code

---

## 🎨 Visualizar Relacionamentos

No Supabase Dashboard → **Database** → **Schemas** → **public**

Você verá um diagrama mostrando:

```
users
  ├─ id → affiliates.user_id
  └─ id → affiliate_tier_audit.admin_id

affiliates
  ├─ id → affiliate_tier_audit.affiliate_id
  └─ user_id → users.id

affiliate_tier_audit
  ├─ affiliate_id → affiliates.id
  └─ admin_id → users.id
```

---

## 📊 Views Criadas

### affiliate_tier_audit_stats
```sql
SELECT * FROM affiliate_tier_audit_stats;
```
Mostra estatísticas gerais de alterações.

### admin_activity_summary
```sql
SELECT * FROM admin_activity_summary;
```
Mostra resumo de atividade de cada admin.

---

## 🚀 Próximos Passos

### 1. Definir Primeiro Admin
```sql
UPDATE users
SET is_admin = true
WHERE wallet_address = 'SUA_WALLET';
```

### 2. Testar API
- Faça login como admin
- Teste alterar tier de um afiliado
- Veja o log criado automaticamente

### 3. Ver em Tempo Real
- Abra Table Editor no Supabase
- Faça alterações via API
- Veja as mudanças aparecerem instantaneamente

---

## 💡 Dicas

1. **Sempre use Table Editor** para ver dados rapidamente
2. **SQL Editor** para queries complexas
3. **Logs** para debug em tempo real
4. **RLS está ativado** - apenas admins veem logs de auditoria
5. **Backups automáticos** - Supabase faz backup diário

---

## 🔗 Links Úteis

- **Dashboard:** https://app.supabase.com
- **Seu Projeto:** https://xdcfwggwoutumhkcpkej.supabase.co
- **Table Editor:** Dashboard → Table Editor
- **SQL Editor:** Dashboard → SQL Editor
- **Logs:** Dashboard → Logs

---

## 📞 Como Ver TUDO

### Método Rápido (No Bolt):
1. Acesse: https://app.supabase.com
2. Login → Seu projeto
3. Table Editor → Veja todas as tabelas!

### Método Detalhado:
```sql
-- Ver TODAS as tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver TODAS as colunas de uma tabela
SELECT * FROM information_schema.columns
WHERE table_name = 'affiliate_tier_audit';

-- Ver TODOS os índices
SELECT * FROM pg_indexes
WHERE schemaname = 'public';

-- Ver TODAS as views
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';

-- Ver TODAS as funções
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public';
```

---

**Seu banco está pronto e funcionando! 🎉**
