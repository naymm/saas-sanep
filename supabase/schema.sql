-- Schema do banco de dados para o Fluxo Seguro
-- Execute este script no SQL Editor do Supabase

-- ==================== EXTENSÕES ====================
-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== TABELAS ====================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('area', 'secretaria_geral', 'conselho_admin', 'master')),
  department TEXT CHECK (department IN ('capital_humano', 'juridico', 'financas')),
  signature_url TEXT,
  stamp_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Áreas
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('memorando', 'oficio', 'relatorio', 'contrato', 'outro')),
  description TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_pdf_storage_path TEXT, -- Caminho do PDF original no Supabase Storage
  signed_pdf_url TEXT,
  signed_pdf_storage_path TEXT, -- Caminho do PDF assinado no Supabase Storage
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_name TEXT NOT NULL,
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('area', 'secretaria_geral', 'conselho_admin', 'master')),
  created_by_department TEXT CHECK (created_by_department IN ('capital_humano', 'juridico', 'financas')),
  status TEXT NOT NULL CHECK (status IN ('pendente_secretaria', 'pendente_conselho', 'aprovado', 'rejeitado', 'finalizado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Ações dos Documentos (Histórico)
CREATE TABLE IF NOT EXISTS document_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('area', 'secretaria_geral', 'conselho_admin', 'master')),
  action TEXT NOT NULL,
  comment TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Assinaturas dos Documentos
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('area', 'secretaria_geral', 'conselho_admin', 'master')),
  signature_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== ÍNDICES ====================

CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_actions_document_id ON document_actions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ==================== TRIGGERS ====================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para users (todos podem ler, apenas master pode modificar)
-- NOTA: Como estamos usando autenticação simples (sem Supabase Auth),
-- as políticas permitem operações. Em produção, implemente Supabase Auth
-- e use auth.uid() para validação adequada.

CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Permitir inserção (será validada pela aplicação)
CREATE POLICY "Allow insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Permitir atualização (será validada pela aplicação)
CREATE POLICY "Allow update users" ON users
  FOR UPDATE USING (true);

-- Permitir deleção (será validada pela aplicação)
CREATE POLICY "Allow delete users" ON users
  FOR DELETE USING (true);

-- Políticas para areas (todos podem ler, apenas master pode modificar)
-- NOTA: Como estamos usando autenticação simples (sem Supabase Auth),
-- as políticas permitem operações. Em produção, implemente Supabase Auth
-- e use auth.uid() para validação adequada.

CREATE POLICY "Areas are viewable by everyone" ON areas
  FOR SELECT USING (true);

-- Permitir inserção (será validada pela aplicação)
CREATE POLICY "Allow insert areas" ON areas
  FOR INSERT WITH CHECK (true);

-- Permitir atualização (será validada pela aplicação)
CREATE POLICY "Allow update areas" ON areas
  FOR UPDATE USING (true);

-- Permitir deleção (será validada pela aplicação)
CREATE POLICY "Allow delete areas" ON areas
  FOR DELETE USING (true);

-- Políticas para documents (todos podem ler, usuários autenticados podem criar/modificar)
-- NOTA: Como estamos usando autenticação simples, permitimos operações.
-- Em produção, implemente Supabase Auth para validação adequada.

CREATE POLICY "Documents are viewable by everyone" ON documents
  FOR SELECT USING (true);

-- Permitir inserção (será validada pela aplicação)
CREATE POLICY "Allow insert documents" ON documents
  FOR INSERT WITH CHECK (true);

-- Permitir atualização (será validada pela aplicação)
CREATE POLICY "Allow update documents" ON documents
  FOR UPDATE USING (true);

-- Políticas para document_actions (todos podem ler, usuários autenticados podem criar)
CREATE POLICY "Document actions are viewable by everyone" ON document_actions
  FOR SELECT USING (true);

-- Permitir inserção (será validada pela aplicação)
CREATE POLICY "Allow insert document actions" ON document_actions
  FOR INSERT WITH CHECK (true);

-- Políticas para document_signatures (todos podem ler, usuários autenticados podem criar)
CREATE POLICY "Document signatures are viewable by everyone" ON document_signatures
  FOR SELECT USING (true);

-- Permitir inserção (será validada pela aplicação)
CREATE POLICY "Allow insert document signatures" ON document_signatures
  FOR INSERT WITH CHECK (true);

-- Políticas para notifications (todos podem ver todas as notificações por enquanto)
-- NOTA: Em produção com Supabase Auth, restrinja para apenas notificações do usuário
CREATE POLICY "Notifications are viewable by everyone" ON notifications
  FOR SELECT USING (true);

-- Permitir inserção (será validada pela aplicação)
CREATE POLICY "Allow insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Permitir atualização (será validada pela aplicação)
CREATE POLICY "Allow update notifications" ON notifications
  FOR UPDATE USING (true);

-- ==================== DADOS INICIAIS (OPCIONAL) ====================

-- Inserir usuários iniciais (descomente e ajuste conforme necessário)
/*
INSERT INTO users (name, email, role, department) VALUES
  ('Maria Silva', 'area@gov.ao', 'area', 'capital_humano'),
  ('Pedro Santos', 'secretaria@gov.ao', 'secretaria_geral', NULL),
  ('João Ferreira', 'conselho@gov.ao', 'conselho_admin', NULL),
  ('Administrador Master', 'master@gov.ao', 'master', NULL)
ON CONFLICT (email) DO NOTHING;
*/
