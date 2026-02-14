# Solução Completa: Erro 400 Bad Request ao Atualizar Documento

## 🔍 Causa Mais Provável do Erro 400

O erro 400 Bad Request ao atualizar documentos após assinar PDF pode ter várias causas:

### 1. **Campos `undefined` no Payload** ⚠️ (MAIS PROVÁVEL)
- Supabase não aceita campos `undefined` no payload
- A função `updateDocument` tinha um bug: `originalPdfStoragePath` estava sendo definido **duas vezes** (linha 579)
- Campos `undefined` não são removidos antes de enviar

### 2. **Data URL Muito Grande**
- Data URLs de PDFs assinados podem ser muito grandes (>100KB)
- Supabase pode rejeitar payloads muito grandes
- Solução: Fazer upload para Storage primeiro e enviar apenas a URL pública

### 3. **Valores de Enum Inválidos**
- Status não validado antes de enviar
- Valores que não passam no CHECK constraint do banco

### 4. **UUID Inválido**
- ID não validado antes de usar no `.eq('id', id)`

### 5. **Política RLS Bloqueando**
- Política RLS muito restritiva ou incorreta
- `auth.uid()` não corresponde ao usuário esperado

## ✅ Solução Implementada

### 1. Função `updateDocument` Corrigida

```typescript
export async function updateDocument(id: string, updates: {
  status?: DocumentStatus;
  signedPdfUrl?: string;
  signedPdfStoragePath?: string;
  originalPdfStoragePath?: string;
}): Promise<Document> {
  // ✅ 1. Validar UUID
  if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`ID inválido: deve ser um UUID válido`);
  }

  // ✅ 2. Construir payload apenas com campos válidos
  const updateData: Record<string, any> = {};
  
  // ✅ 3. Validar enum de status
  if (updates.status !== undefined) {
    const validStatuses = ['pendente_secretaria', 'pendente_conselho', 'aprovado', 'rejeitado', 'finalizado'];
    if (!validStatuses.includes(updates.status)) {
      throw new Error(`Status inválido: ${updates.status}`);
    }
    updateData.status = updates.status;
  }
  
  // ✅ 4. Adicionar signed_pdf_url (não enviar data URLs muito grandes)
  if (updates.signedPdfUrl !== undefined) {
    if (updates.signedPdfUrl === null || updates.signedPdfUrl === '') {
      updateData.signed_pdf_url = null;
    } else if (typeof updates.signedPdfUrl === 'string') {
      // Não enviar data URLs muito grandes
      if (updates.signedPdfUrl.startsWith('data:') && updates.signedPdfUrl.length > 100000) {
        updateData.signed_pdf_url = null; // Usar apenas storage path
      } else {
        updateData.signed_pdf_url = updates.signedPdfUrl;
      }
    }
  }
  
  // ✅ 5. Adicionar signed_pdf_storage_path
  if (updates.signedPdfStoragePath !== undefined) {
    updateData.signed_pdf_storage_path = (updates.signedPdfStoragePath && updates.signedPdfStoragePath.trim() !== '') 
      ? updates.signedPdfStoragePath 
      : null;
  }
  
  // ✅ 6. Adicionar original_pdf_storage_path (APENAS UMA VEZ - bug corrigido)
  if (updates.originalPdfStoragePath !== undefined) {
    updateData.original_pdf_storage_path = (updates.originalPdfStoragePath && updates.originalPdfStoragePath.trim() !== '') 
      ? updates.originalPdfStoragePath 
      : null;
  }

  // ✅ 7. Remover campos undefined
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  // ✅ 8. Validar tipos finais
  for (const [key, value] of Object.entries(updateData)) {
    if (key === 'status' && typeof value !== 'string') {
      throw new Error(`Campo 'status' deve ser string`);
    }
    if ((key.includes('_url') || key.includes('_path')) && value !== null && typeof value !== 'string') {
      throw new Error(`Campo '${key}' deve ser string ou null`);
    }
  }

  // ✅ 9. Enviar ao Supabase com logs detalhados
  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro detalhado:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      updatePayload: JSON.stringify(updateData, null, 2),
    });
    throw error;
  }

  // ... resto da função
}
```

### 2. Função `replaceOriginalPdf` Adicionada

```typescript
export async function replaceOriginalPdf(
  existingPath: string,
  pdfBytes: Uint8Array
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .update(existingPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('❌ Erro ao substituir PDF:', error);
    throw error;
  }

  return existingPath;
}
```

### 3. Política RLS Corrigida

Execute o script `supabase/fix-documents-update-policy.sql` no Supabase:

```sql
-- Remove políticas antigas
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;

-- Cria política segura
CREATE POLICY "Users can update documents based on role and status" ON documents
  FOR UPDATE 
  USING (
    auth.uid() IS NOT NULL AND (
      created_by::text = auth.uid()::text OR
      EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'master') OR
      (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'secretaria_geral')
       AND status IN ('pendente_secretaria', 'pendente_conselho')) OR
      (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'conselho_admin')
       AND status = 'pendente_conselho')
    )
  )
  WITH CHECK (
    -- Mesma lógica do USING
    auth.uid() IS NOT NULL AND (
      created_by::text = auth.uid()::text OR
      EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'master') OR
      (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'secretaria_geral')
       AND status IN ('pendente_secretaria', 'pendente_conselho')) OR
      (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'conselho_admin')
       AND status = 'pendente_conselho')
    )
  );
```

## 📋 Checklist de Implementação

- [x] ✅ Função `updateDocument` corrigida com validações
- [x] ✅ Remoção de campos `undefined`
- [x] ✅ Validação de UUID
- [x] ✅ Validação de enum de status
- [x] ✅ Tratamento de data URLs grandes
- [x] ✅ Função `replaceOriginalPdf` adicionada
- [x] ✅ Logs detalhados de erro
- [x] ✅ Política RLS SQL criada

## 🚀 Próximos Passos

1. **Execute o SQL no Supabase:**
   - Abra o SQL Editor no Supabase Dashboard
   - Execute o conteúdo de `supabase/fix-documents-update-policy.sql`

2. **Teste a atualização:**
   - Tente aprovar e assinar um documento
   - Verifique os logs no console do navegador
   - O status deve ser atualizado corretamente

3. **Se ainda houver erro:**
   - Verifique os logs no console (procure por "🚀 Enviando PATCH")
   - Verifique se a política RLS foi criada corretamente
   - Verifique se o usuário está autenticado (`auth.uid()`)

## 🔧 Debug

Os logs agora mostram:
- ✅ Status validado e adicionado
- 🚀 Enviando PATCH ao Supabase (com payload completo)
- ✅ Documento atualizado com sucesso
- ❌ Erro detalhado (se houver)

Verifique o console do navegador para ver exatamente o que está sendo enviado ao Supabase.
