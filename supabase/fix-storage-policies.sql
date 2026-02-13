-- Script para corrigir as políticas RLS do Storage
-- Execute este script no SQL Editor do Supabase
-- Isso permite uploads sem Supabase Auth completo

-- ==================== REMOVER POLÍTICAS ANTIGAS ====================

DROP POLICY IF EXISTS "Documents are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- ==================== CRIAR NOVAS POLÍTICAS ====================

-- Permitir leitura pública dos documentos
CREATE POLICY "Documents are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Permitir upload para todos (será validado pela aplicação)
-- NOTA: Em produção, implemente Supabase Auth e use auth.uid()
CREATE POLICY "Allow upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

-- Permitir atualização para todos (será validada pela aplicação)
CREATE POLICY "Allow update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents');

-- Permitir deleção para todos (será validada pela aplicação)
CREATE POLICY "Allow delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');
