# Fix Supabase 400 Bad Request on PATCH Update

## Problema
Erro 400 Bad Request ao tentar atualizar documentos via PATCH no Supabase.

## Solução Completa

### 1. Código JavaScript (Já implementado em `src/lib/supabaseService.ts`)

A função `updateDocument` já está corrigida com:
- ✅ Validação de UUID
- ✅ Remoção de campos `undefined`
- ✅ Validação de enums (status)
- ✅ Conversão snake_case para campos do banco
- ✅ Tratamento de data URLs grandes
- ✅ Logs detalhados de erro

### 2. Política RLS SQL (Execute no Supabase)

Execute o script `supabase/fix-documents-update-policy.sql` no SQL Editor do Supabase:

```sql
-- Remover política antiga
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;

-- Criar política específica para UPDATE
CREATE POLICY "Users can update documents based on role and status" ON documents
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND (
      -- Criador pode atualizar
      created_by::text = auth.uid()::text OR
      -- Secretaria pode atualizar documentos pendentes para ela
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id::text = auth.uid()::text 
          AND role = 'secretaria_geral'
        )
        AND status IN ('pendente_secretaria', 'pendente_conselho')
      )
      OR
      -- Conselho pode atualizar documentos pendentes para ele
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id::text = auth.uid()::text 
          AND role = 'conselho_admin'
        )
        AND status = 'pendente_conselho'
      )
      OR
      -- Master pode atualizar qualquer documento
      EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'master'
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      created_by::text = auth.uid()::text OR
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id::text = auth.uid()::text 
          AND role = 'secretaria_geral'
        )
        AND status IN ('pendente_secretaria', 'pendente_conselho')
      )
      OR
      (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id::text = auth.uid()::text 
          AND role = 'conselho_admin'
        )
        AND status = 'pendente_conselho'
      )
      OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'master'
      )
    )
  );
```

### 3. Verificar se a política foi criada

```sql
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
```

### 4. Testar a atualização

Após executar o SQL, teste a atualização de um documento. Os logs no console devem mostrar:
- ✅ Status adicionado
- 🚀 Enviando PATCH ao Supabase
- ✅ Documento atualizado com sucesso

### 5. Troubleshooting

Se ainda houver erro 400:

1. **Verifique os logs do console** - Procure por "🚀 Enviando PATCH ao Supabase" e verifique o `updatePayload`
2. **Verifique a política RLS** - Execute a query de verificação acima
3. **Verifique o auth.uid()** - Certifique-se de que o usuário está autenticado
4. **Verifique os valores do enum** - Status deve ser um dos valores válidos
5. **Verifique o UUID** - O ID deve ser um UUID válido

### 6. Código de exemplo para testar

```typescript
// Teste básico de atualização
const result = await supabaseService.updateDocument(
  '005dd343-fdb3-46d0-a394-75bece798c32', // UUID válido
  {
    status: 'pendente_secretaria' // Enum válido
  }
);
```

## Checklist

- [x] Código JS corrigido com validações
- [ ] Política RLS executada no Supabase
- [ ] Política RLS verificada
- [ ] Teste de atualização realizado
- [ ] Logs verificados no console
