-- Script para HABILITAR RLS com políticas abertas (permitem tudo)
-- Use este script se preferir manter RLS habilitado mas com políticas permissivas
-- ⚠️ ATENÇÃO: Estas políticas permitem todas as operações. Use apenas para desenvolvimento.

-- ==================== HABILITAR RLS ====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==================== REMOVER POLÍTICAS ANTIGAS ====================

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Only master can insert users" ON users;
DROP POLICY IF EXISTS "Only master can update users" ON users;
DROP POLICY IF EXISTS "Only master can delete users" ON users;
DROP POLICY IF EXISTS "Allow insert users" ON users;
DROP POLICY IF EXISTS "Allow update users" ON users;
DROP POLICY IF EXISTS "Allow delete users" ON users;

DROP POLICY IF EXISTS "Areas are viewable by everyone" ON areas;
DROP POLICY IF EXISTS "Only master can insert areas" ON areas;
DROP POLICY IF EXISTS "Only master can update areas" ON areas;
DROP POLICY IF EXISTS "Only master can delete areas" ON areas;
DROP POLICY IF EXISTS "Allow insert areas" ON areas;
DROP POLICY IF EXISTS "Allow update areas" ON areas;
DROP POLICY IF EXISTS "Allow delete areas" ON areas;

DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
DROP POLICY IF EXISTS "Allow insert documents" ON documents;
DROP POLICY IF EXISTS "Allow update documents" ON documents;

DROP POLICY IF EXISTS "Document actions are viewable by everyone" ON document_actions;
DROP POLICY IF EXISTS "Authenticated users can insert document actions" ON document_actions;
DROP POLICY IF EXISTS "Allow insert document actions" ON document_actions;

DROP POLICY IF EXISTS "Document signatures are viewable by everyone" ON document_signatures;
DROP POLICY IF EXISTS "Authenticated users can insert document signatures" ON document_signatures;
DROP POLICY IF EXISTS "Allow insert document signatures" ON document_signatures;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Notifications are viewable by everyone" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow update notifications" ON notifications;

-- ==================== CRIAR POLÍTICAS ABERTAS ====================

-- Políticas para users (permitir tudo)
CREATE POLICY "Open policy for users SELECT" ON users FOR SELECT USING (true);
CREATE POLICY "Open policy for users INSERT" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Open policy for users UPDATE" ON users FOR UPDATE USING (true);
CREATE POLICY "Open policy for users DELETE" ON users FOR DELETE USING (true);

-- Políticas para areas (permitir tudo)
CREATE POLICY "Open policy for areas SELECT" ON areas FOR SELECT USING (true);
CREATE POLICY "Open policy for areas INSERT" ON areas FOR INSERT WITH CHECK (true);
CREATE POLICY "Open policy for areas UPDATE" ON areas FOR UPDATE USING (true);
CREATE POLICY "Open policy for areas DELETE" ON areas FOR DELETE USING (true);

-- Políticas para documents (permitir tudo)
CREATE POLICY "Open policy for documents SELECT" ON documents FOR SELECT USING (true);
CREATE POLICY "Open policy for documents INSERT" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Open policy for documents UPDATE" ON documents FOR UPDATE USING (true);
CREATE POLICY "Open policy for documents DELETE" ON documents FOR DELETE USING (true);

-- Políticas para document_actions (permitir tudo)
CREATE POLICY "Open policy for document_actions SELECT" ON document_actions FOR SELECT USING (true);
CREATE POLICY "Open policy for document_actions INSERT" ON document_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Open policy for document_actions UPDATE" ON document_actions FOR UPDATE USING (true);
CREATE POLICY "Open policy for document_actions DELETE" ON document_actions FOR DELETE USING (true);

-- Políticas para document_signatures (permitir tudo)
CREATE POLICY "Open policy for document_signatures SELECT" ON document_signatures FOR SELECT USING (true);
CREATE POLICY "Open policy for document_signatures INSERT" ON document_signatures FOR INSERT WITH CHECK (true);
CREATE POLICY "Open policy for document_signatures UPDATE" ON document_signatures FOR UPDATE USING (true);
CREATE POLICY "Open policy for document_signatures DELETE" ON document_signatures FOR DELETE USING (true);

-- Políticas para notifications (permitir tudo)
CREATE POLICY "Open policy for notifications SELECT" ON notifications FOR SELECT USING (true);
CREATE POLICY "Open policy for notifications INSERT" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Open policy for notifications UPDATE" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Open policy for notifications DELETE" ON notifications FOR DELETE USING (true);
