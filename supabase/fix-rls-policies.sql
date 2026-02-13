-- Script para corrigir as políticas RLS para funcionar sem Supabase Auth
-- Execute este script se já executou o schema.sql anteriormente
-- Isso atualiza as políticas para permitir operações (validação feita pela aplicação)

-- ==================== REMOVER POLÍTICAS ANTIGAS ====================

-- Remover políticas antigas de users
DROP POLICY IF EXISTS "Only master can insert users" ON users;
DROP POLICY IF EXISTS "Only master can update users" ON users;
DROP POLICY IF EXISTS "Only master can delete users" ON users;

-- Remover políticas antigas de areas
DROP POLICY IF EXISTS "Only master can insert areas" ON areas;
DROP POLICY IF EXISTS "Only master can update areas" ON areas;
DROP POLICY IF EXISTS "Only master can delete areas" ON areas;

-- Remover políticas antigas de documents
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
DROP POLICY IF EXISTS "Allow insert documents" ON documents;
DROP POLICY IF EXISTS "Allow update documents" ON documents;

-- Remover políticas antigas de document_actions
DROP POLICY IF EXISTS "Authenticated users can insert document actions" ON document_actions;

-- Remover políticas antigas de document_signatures
DROP POLICY IF EXISTS "Authenticated users can insert document signatures" ON document_signatures;

-- Remover políticas antigas de notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- ==================== CRIAR NOVAS POLÍTICAS ====================

-- Políticas para users (permitir operações - validação feita pela aplicação)
CREATE POLICY "Allow insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update users" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete users" ON users
  FOR DELETE USING (true);

-- Políticas para areas (permitir operações - validação feita pela aplicação)
CREATE POLICY "Allow insert areas" ON areas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update areas" ON areas
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete areas" ON areas
  FOR DELETE USING (true);

-- Políticas para documents (permitir operações - validação feita pela aplicação)
CREATE POLICY "Allow insert documents" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update documents" ON documents
  FOR UPDATE USING (true);

-- Políticas para document_actions (permitir operações - validação feita pela aplicação)
CREATE POLICY "Allow insert document actions" ON document_actions
  FOR INSERT WITH CHECK (true);

-- Políticas para document_signatures (permitir operações - validação feita pela aplicação)
CREATE POLICY "Allow insert document signatures" ON document_signatures
  FOR INSERT WITH CHECK (true);

-- Políticas para notifications (permitir operações - validação feita pela aplicação)
CREATE POLICY "Notifications are viewable by everyone" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Allow insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update notifications" ON notifications
  FOR UPDATE USING (true);
