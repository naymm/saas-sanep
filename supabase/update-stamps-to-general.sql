-- Atualizar estrutura de carimbos para serem gerais por empresa (não por usuário)
-- Execute este script no SQL Editor do Supabase

-- ==================== REMOVER TABELA ANTIGA E CRIAR NOVA ====================

-- Remover tabela antiga (se existir)
DROP TABLE IF EXISTS user_stamps CASCADE;
DROP TABLE IF EXISTS company_stamps CASCADE;

-- Criar nova tabela de carimbos gerais por empresa
CREATE TABLE IF NOT EXISTS company_stamps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- Título/nome do carimbo
  stamp_url TEXT NOT NULL, -- Caminho do carimbo no Storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Removido UNIQUE(company_id) para permitir múltiplos carimbos por empresa
);

COMMENT ON TABLE company_stamps IS 'Carimbos gerais por empresa - todos os membros do conselho veem os mesmos carimbos por empresa';
COMMENT ON COLUMN company_stamps.company_id IS 'ID da empresa';
COMMENT ON COLUMN company_stamps.title IS 'Título/nome do carimbo';
COMMENT ON COLUMN company_stamps.stamp_url IS 'Caminho do carimbo no Supabase Storage';

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_company_stamps_company_id ON company_stamps(company_id);

-- ==================== RLS POLICIES ====================

-- Habilitar RLS
ALTER TABLE company_stamps ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ver os carimbos
CREATE POLICY "Users can view company stamps" ON company_stamps
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas master pode gerenciar carimbos
CREATE POLICY "Master can manage company stamps" ON company_stamps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'master'
    )
  );

-- ==================== TRIGGERS ====================
CREATE TRIGGER update_company_stamps_updated_at
  BEFORE UPDATE ON company_stamps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
