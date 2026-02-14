-- ==================== ADICIONAR CAMPOS PARA ATRIBUIÇÃO DE CONSELHO ====================
-- Este script adiciona campos para permitir que a Secretaria Geral direcione documentos
-- para membro(s) específico(s) do conselho ou para todos os membros

-- Adicionar campos na tabela documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS assigned_to_conselho_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to_all_conselho BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conselho_signatures_required INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS conselho_signatures_received INTEGER NOT NULL DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN documents.assigned_to_conselho_user_id IS 'ID do membro do conselho específico que deve receber o documento (NULL se for para todos)';
COMMENT ON COLUMN documents.assigned_to_all_conselho IS 'TRUE se o documento deve ser enviado para todos os membros do conselho para pareceres';
COMMENT ON COLUMN documents.conselho_signatures_required IS 'Número de assinaturas necessárias do conselho (1 se membro específico, N se todos)';
COMMENT ON COLUMN documents.conselho_signatures_received IS 'Número de assinaturas já recebidas do conselho';

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_documents_assigned_to_conselho 
ON documents(assigned_to_conselho_user_id) 
WHERE assigned_to_conselho_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_assigned_to_all_conselho 
ON documents(assigned_to_all_conselho) 
WHERE assigned_to_all_conselho = TRUE;

-- Verificar se os campos foram adicionados
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'documents'
AND column_name IN (
  'assigned_to_conselho_user_id',
  'assigned_to_all_conselho',
  'conselho_signatures_required',
  'conselho_signatures_received'
)
ORDER BY column_name;
