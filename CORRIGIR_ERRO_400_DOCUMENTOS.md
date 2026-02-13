# Correção do Erro 400 ao Criar Documentos

## Problema

Erro 400 (Bad Request) ao tentar criar um documento:
```
POST https://...supabase.co/rest/v1/documents?select=* 400 (Bad Request)
```

## Causa

A coluna `original_pdf_storage_path` não existe na tabela `documents` no banco de dados Supabase.

## Solução

Execute o script SQL para adicionar a coluna faltante:

### Passo 1: Adicionar a Coluna

1. Acesse o **SQL Editor** no painel do Supabase
2. Execute o arquivo `supabase/add-original-pdf-column.sql`

Ou execute diretamente:

```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS original_pdf_storage_path TEXT;
```

### Passo 2: Verificar

Após executar o script, verifique se a coluna foi adicionada:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name = 'original_pdf_storage_path';
```

Se retornar um resultado, a coluna foi adicionada com sucesso.

## Arquivos Atualizados

- `supabase/add-original-pdf-column.sql` - Script para adicionar a coluna
- `supabase/schema.sql` - Schema atualizado para incluir a coluna
- `src/lib/supabaseService.ts` - Logs melhorados para debug

## Após Aplicar

1. Recarregue a aplicação
2. Tente criar um novo documento
3. O erro 400 não deve mais aparecer

## Nota

Se você já executou o `schema.sql` anteriormente, você precisa executar o script `add-original-pdf-column.sql` para adicionar a coluna faltante. Se você ainda não executou o `schema.sql`, ele já está atualizado com a coluna.
