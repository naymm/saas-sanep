-- Script para configurar o Storage do Supabase
-- Execute este script no SQL Editor do Supabase após criar o schema principal

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública dos documentos
CREATE POLICY "Documents are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Política para permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir atualização apenas para usuários autenticados
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir deleção apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);
