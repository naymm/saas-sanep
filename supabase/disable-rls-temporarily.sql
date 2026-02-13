-- Script para DESABILITAR TEMPORARIAMENTE o RLS
-- ⚠️ ATENÇÃO: Este script desabilita a segurança RLS. Use apenas para desenvolvimento.
-- Em produção, você DEVE usar Supabase Auth e políticas RLS adequadas.

-- ==================== DESABILITAR RLS ====================

-- Desabilitar RLS em todas as tabelas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- ==================== REMOVER TODAS AS POLÍTICAS ====================

-- Remover todas as políticas de users
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Only master can insert users" ON users;
DROP POLICY IF EXISTS "Only master can update users" ON users;
DROP POLICY IF EXISTS "Only master can delete users" ON users;
DROP POLICY IF EXISTS "Allow insert users" ON users;
DROP POLICY IF EXISTS "Allow update users" ON users;
DROP POLICY IF EXISTS "Allow delete users" ON users;

-- Remover todas as políticas de areas
DROP POLICY IF EXISTS "Areas are viewable by everyone" ON areas;
DROP POLICY IF EXISTS "Only master can insert areas" ON areas;
DROP POLICY IF EXISTS "Only master can update areas" ON areas;
DROP POLICY IF EXISTS "Only master can delete areas" ON areas;
DROP POLICY IF EXISTS "Allow insert areas" ON areas;
DROP POLICY IF EXISTS "Allow update areas" ON areas;
DROP POLICY IF EXISTS "Allow delete areas" ON areas;

-- Remover todas as políticas de documents
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
DROP POLICY IF EXISTS "Allow insert documents" ON documents;
DROP POLICY IF EXISTS "Allow update documents" ON documents;

-- Remover todas as políticas de document_actions
DROP POLICY IF EXISTS "Document actions are viewable by everyone" ON document_actions;
DROP POLICY IF EXISTS "Authenticated users can insert document actions" ON document_actions;
DROP POLICY IF EXISTS "Allow insert document actions" ON document_actions;

-- Remover todas as políticas de document_signatures
DROP POLICY IF EXISTS "Document signatures are viewable by everyone" ON document_signatures;
DROP POLICY IF EXISTS "Authenticated users can insert document signatures" ON document_signatures;
DROP POLICY IF EXISTS "Allow insert document signatures" ON document_signatures;

-- Remover todas as políticas de notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Notifications are viewable by everyone" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow update notifications" ON notifications;
