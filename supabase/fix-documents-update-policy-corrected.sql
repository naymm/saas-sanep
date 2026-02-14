-- ==================== CORRIGIR POLÍTICA RLS PARA UPDATE DE DOCUMENTS (CORRIGIDO) ====================
-- Este script corrige a política RLS para permitir UPDATE de documentos de forma segura
-- IMPORTANTE: Usa auth_user_id para vincular com auth.uid()
-- Execute este script no SQL Editor do Supabase

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
DROP POLICY IF EXISTS "Users can update documents" ON documents;
DROP POLICY IF EXISTS "Open policy for documents UPDATE" ON documents;
DROP POLICY IF EXISTS "Users can update documents based on role and status" ON documents;

-- Criar política mais específica e segura para UPDATE
-- Permite UPDATE se:
-- 1. Usuário é o criador do documento (verificando via auth_user_id), OU
-- 2. Usuário tem role 'master' (acesso total), OU
-- 3. Usuário tem role 'secretaria_geral' e documento está pendente_secretaria ou pendente_conselho, OU
-- 4. Usuário tem role 'conselho_admin' e documento está pendente_conselho
CREATE POLICY "Users can update documents based on role and status" ON documents
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND (
      -- Criador pode atualizar (verificando via auth_user_id)
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = documents.created_by 
        AND auth_user_id = auth.uid()
      )
      OR
      -- Master pode atualizar qualquer documento
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'master'
      )
      OR
      -- Secretaria pode atualizar documentos pendentes para ela ou conselho
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE auth_user_id = auth.uid() 
          AND role = 'secretaria_geral'
        )
        AND status IN ('pendente_secretaria', 'pendente_conselho')
      )
      OR
      -- Conselho pode atualizar documentos pendentes para ele
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE auth_user_id = auth.uid() 
          AND role = 'conselho_admin'
        )
        AND status = 'pendente_conselho'
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Criador pode atualizar (verificando via auth_user_id)
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = documents.created_by 
        AND auth_user_id = auth.uid()
      )
      OR
      -- Master pode atualizar qualquer documento
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND role = 'master'
      )
      OR
      -- Secretaria pode atualizar documentos pendentes para ela ou conselho
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE auth_user_id = auth.uid() 
          AND role = 'secretaria_geral'
        )
        AND status IN ('pendente_secretaria', 'pendente_conselho')
      )
      OR
      -- Conselho pode atualizar documentos pendentes para ele
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE auth_user_id = auth.uid() 
          AND role = 'conselho_admin'
        )
        AND status = 'pendente_conselho'
      )
    )
  );

-- Verificar se a política foi criada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'documents' AND policyname = 'Users can update documents based on role and status';

-- Verificar todas as políticas da tabela documents
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;

-- ==================== VERIFICAR SE USUÁRIOS TÊM auth_user_id ====================
-- Execute esta query para verificar se os usuários têm auth_user_id vinculado:
SELECT 
  id,
  name,
  email,
  role,
  auth_user_id,
  CASE 
    WHEN auth_user_id IS NULL THEN '❌ SEM VINCULAÇÃO COM AUTH'
    ELSE '✅ VINCULADO'
  END as status_auth
FROM users
ORDER BY role, name;
