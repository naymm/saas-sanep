-- Script para adicionar a coluna original_pdf_storage_path na tabela documents
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna para armazenar o caminho do PDF original no Storage
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS original_pdf_storage_path TEXT;

-- Comentário para documentação
COMMENT ON COLUMN documents.original_pdf_storage_path IS 'Caminho do PDF original no Supabase Storage';
