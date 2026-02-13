-- Script para integrar autenticação com Supabase Auth
-- Execute este script APÓS executar o schema.sql

-- ==================== ADICIONAR CAMPO DE VINCULAÇÃO COM AUTH ====================

-- Adicionar coluna para vincular com auth.users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- ==================== FUNÇÃO PARA SINCRONIZAR USUÁRIOS ====================

-- Função para criar usuário na tabela users quando um usuário é criado no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Não criar automaticamente, pois vamos criar manualmente via aplicação
  -- Esta função pode ser usada para sincronização futura se necessário
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar (opcional, não vamos usar por enquanto)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== ATUALIZAR POLÍTICAS RLS ====================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Allow insert users" ON users;
DROP POLICY IF EXISTS "Allow update users" ON users;
DROP POLICY IF EXISTS "Allow delete users" ON users;
DROP POLICY IF EXISTS "Open policy for users SELECT" ON users;
DROP POLICY IF EXISTS "Open policy for users INSERT" ON users;
DROP POLICY IF EXISTS "Open policy for users UPDATE" ON users;
DROP POLICY IF EXISTS "Open policy for users DELETE" ON users;

-- Criar novas políticas que usam auth.uid()
-- Todos podem ver usuários (para login)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Apenas usuários autenticados podem inserir (será validado pela aplicação)
CREATE POLICY "Authenticated users can insert" ON users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Usuários podem atualizar seus próprios dados OU master pode atualizar qualquer um
CREATE POLICY "Users can update own or master can update all" ON users
  FOR UPDATE USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

-- Apenas master pode deletar
CREATE POLICY "Only master can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

-- ==================== ATUALIZAR POLÍTICAS DE OUTRAS TABELAS ====================

-- Documents: usuários autenticados podem criar/atualizar
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
DROP POLICY IF EXISTS "Allow insert documents" ON documents;
DROP POLICY IF EXISTS "Allow update documents" ON documents;
DROP POLICY IF EXISTS "Open policy for documents SELECT" ON documents;
DROP POLICY IF EXISTS "Open policy for documents INSERT" ON documents;
DROP POLICY IF EXISTS "Open policy for documents UPDATE" ON documents;

CREATE POLICY "Documents are viewable by authenticated users" ON documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update documents" ON documents
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Document actions: usuários autenticados podem criar
DROP POLICY IF EXISTS "Document actions are viewable by everyone" ON document_actions;
DROP POLICY IF EXISTS "Allow insert document actions" ON document_actions;
DROP POLICY IF EXISTS "Open policy for document_actions SELECT" ON document_actions;
DROP POLICY IF EXISTS "Open policy for document_actions INSERT" ON document_actions;

CREATE POLICY "Document actions are viewable by authenticated users" ON document_actions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert document actions" ON document_actions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Document signatures: usuários autenticados podem criar
DROP POLICY IF EXISTS "Document signatures are viewable by everyone" ON document_signatures;
DROP POLICY IF EXISTS "Allow insert document signatures" ON document_signatures;
DROP POLICY IF EXISTS "Open policy for document_signatures SELECT" ON document_signatures;
DROP POLICY IF EXISTS "Open policy for document_signatures INSERT" ON document_signatures;

CREATE POLICY "Document signatures are viewable by authenticated users" ON document_signatures
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert document signatures" ON document_signatures
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications: usuários veem apenas suas próprias notificações
DROP POLICY IF EXISTS "Notifications are viewable by everyone" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow update notifications" ON notifications;
DROP POLICY IF EXISTS "Open policy for notifications SELECT" ON notifications;
DROP POLICY IF EXISTS "Open policy for notifications INSERT" ON notifications;
DROP POLICY IF EXISTS "Open policy for notifications UPDATE" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Areas: todos podem ver, apenas master pode modificar
DROP POLICY IF EXISTS "Areas are viewable by everyone" ON areas;
DROP POLICY IF EXISTS "Allow insert areas" ON areas;
DROP POLICY IF EXISTS "Allow update areas" ON areas;
DROP POLICY IF EXISTS "Allow delete areas" ON areas;
DROP POLICY IF EXISTS "Open policy for areas SELECT" ON areas;
DROP POLICY IF EXISTS "Open policy for areas INSERT" ON areas;
DROP POLICY IF EXISTS "Open policy for areas UPDATE" ON areas;
DROP POLICY IF EXISTS "Open policy for areas DELETE" ON areas;

CREATE POLICY "Areas are viewable by authenticated users" ON areas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only master can insert areas" ON areas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Only master can update areas" ON areas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );

CREATE POLICY "Only master can delete areas" ON areas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'master'
    )
  );
