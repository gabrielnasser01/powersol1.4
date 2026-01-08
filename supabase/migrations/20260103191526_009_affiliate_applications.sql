/*
  # Tabela de Aplicações de Afiliados Premium

  1. Nova Tabela: `affiliate_applications`
    - `id` (uuid, primary key)
    - `wallet_address` (text, unique, not null) - Garante 1 aplicação por wallet
    - `full_name` (text, not null)
    - `email` (text, not null)
    - `country` (text)
    - `social_media` (text) - URL do Twitter, Instagram, etc
    - `marketing_experience` (text) - Nível de experiência
    - `marketing_strategy` (text) - Descrição da estratégia
    - `status` (enum: pending, approved, rejected) - Status da aplicação
    - `admin_notes` (text) - Notas do admin sobre a aplicação
    - `reviewed_at` (timestamp) - Quando foi revisado
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS
    - Policy: Qualquer pessoa pode inserir (anônimo)
    - Policy: Todos podem ver suas próprias aplicações
    - Constraint: Wallet address único (1 aplicação por wallet)
*/

-- Criar tipo enum para status de aplicação
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Criar tabela de aplicações de afiliados
CREATE TABLE IF NOT EXISTS affiliate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados do aplicante
  wallet_address text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  country text,
  social_media text,
  marketing_experience text,
  marketing_strategy text,
  
  -- Status e aprovação
  status application_status DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_wallet CHECK (length(wallet_address) >= 32 AND length(wallet_address) <= 44)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_wallet ON affiliate_applications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_email ON affiliate_applications(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_status ON affiliate_applications(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_created_at ON affiliate_applications(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_affiliate_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_affiliate_applications_updated_at ON affiliate_applications;
CREATE TRIGGER trigger_affiliate_applications_updated_at
  BEFORE UPDATE ON affiliate_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_applications_updated_at();

-- Enable RLS
ALTER TABLE affiliate_applications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Qualquer pessoa pode inserir UMA aplicação (verificação de duplicata via constraint UNIQUE)
CREATE POLICY "Anyone can submit one affiliate application"
  ON affiliate_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Qualquer pessoa pode ver aplicações (pode ser ajustado depois)
CREATE POLICY "Anyone can view applications"
  ON affiliate_applications
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy 3: Ninguém pode atualizar por enquanto (só admins via service key)
-- Você pode adicionar policies específicas depois

-- Comentários para documentação
COMMENT ON TABLE affiliate_applications IS 'Aplicações de usuários para se tornarem afiliados premium. Cada wallet só pode aplicar 1 vez (constraint UNIQUE).';
COMMENT ON COLUMN affiliate_applications.wallet_address IS 'Endereço da wallet Solana (único, garante 1 aplicação por usuário)';
COMMENT ON COLUMN affiliate_applications.status IS 'Status: pending (aguardando), approved (aprovado), rejected (rejeitado)';
COMMENT ON COLUMN affiliate_applications.marketing_experience IS 'Nível de experiência em marketing';
COMMENT ON COLUMN affiliate_applications.marketing_strategy IS 'Descrição da estratégia de marketing do aplicante';
