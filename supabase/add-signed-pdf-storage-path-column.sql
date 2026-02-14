-- Script para adicionar a coluna signed_pdf_storage_path na tabela documents
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna para armazenar o caminho do PDF assinado no Storage
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS signed_pdf_storage_path TEXT;

-- Comentário para documentação
COMMENT ON COLUMN documents.signed_pdf_storage_path IS 'Caminho do PDF assinado no Supabase Storage';

-- Verificar se a coluna foi criada
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents' 
  AND column_name = 'signed_pdf_storage_path';
