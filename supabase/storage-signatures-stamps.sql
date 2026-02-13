-- Script para configurar o Storage para assinaturas e carimbos
-- Execute este script no SQL Editor do Supabase
-- As assinaturas e carimbos serão armazenados no bucket 'documents' nas pastas 'signatures' e 'stamps'

-- As políticas de Storage já configuradas no storage-setup.sql se aplicam automaticamente
-- às pastas signatures/ e stamps/ dentro do bucket documents

-- Verificar se o bucket documents existe (deve ter sido criado pelo storage-setup.sql)
-- Se não existir, execute primeiro o storage-setup.sql

-- Políticas adicionais específicas para assinaturas e carimbos (opcional)
-- As políticas existentes do bucket 'documents' já cobrem essas pastas

-- Nota: As assinaturas serão salvas em: documents/signatures/{userId}/{filename}
-- Os carimbos serão salvos em: documents/stamps/{userId}/{filename}
