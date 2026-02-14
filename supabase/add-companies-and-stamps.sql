-- Adicionar tabela de empresas e carimbos por empresa
-- Execute este script no SQL Editor do Supabase

-- ==================== TABELA DE EMPRESAS ====================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE companies IS 'Tabela de empresas para associar carimbos';
COMMENT ON COLUMN companies.name IS 'Nome da empresa';
COMMENT ON COLUMN companies.code IS 'Código único da empresa';
COMMENT ON COLUMN companies.description IS 'Descrição da empresa';

-- ==================== TABELA DE CARIMBOS POR USUÁRIO E EMPRESA ====================
CREATE TABLE IF NOT EXISTS user_stamps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stamp_url TEXT NOT NULL, -- Caminho do carimbo no Storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, company_id) -- Um carimbo por usuário por empresa
);

COMMENT ON TABLE user_stamps IS 'Carimbos associados a usuários e empresas';
COMMENT ON COLUMN user_stamps.user_id IS 'ID do usuário (geralmente conselho_admin)';
COMMENT ON COLUMN user_stamps.company_id IS 'ID da empresa';
COMMENT ON COLUMN user_stamps.stamp_url IS 'Caminho do carimbo no Supabase Storage';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_id ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_company_id ON user_stamps(company_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_company ON user_stamps(user_id, company_id);

-- ==================== RLS POLICIES ====================

-- Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

-- Políticas para companies (todos os usuários autenticados podem ver)
CREATE POLICY "Users can view companies" ON companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas master pode criar/atualizar/deletar empresas
CREATE POLICY "Master can manage companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'master'
    )
  );

-- Políticas para user_stamps
-- Usuários podem ver seus próprios carimbos
CREATE POLICY "Users can view own stamps" ON user_stamps
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND id = user_stamps.user_id
      )
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'master'
      )
    )
  );

-- Usuários podem gerenciar seus próprios carimbos (ou master pode gerenciar todos)
CREATE POLICY "Users can manage own stamps" ON user_stamps
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND id = user_stamps.user_id
      )
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'master'
      )
    )
  );

-- ==================== TRIGGERS ====================
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stamps_updated_at
  BEFORE UPDATE ON user_stamps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
