# 🔧 Correção: Coluna `signed_pdf_storage_path` não encontrada

## 🐛 Problema

Ao tentar encaminhar um documento para o Conselho de Administração, ocorre o erro:

```
Could not find the 'signed_pdf_storage_path' column of 'documents' in the schema cache
```

### Causa

1. **Coluna não existe no banco:** A coluna `signed_pdf_storage_path` não foi criada na tabela `documents` do Supabase
2. **Código incluindo campo desnecessário:** O código estava tentando atualizar `signed_pdf_storage_path` mesmo quando não havia assinatura (apenas encaminhando)

## ✅ Solução

### 1. Adicionar a Coluna no Banco de Dados

Execute o script SQL no **Supabase Dashboard**:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/add-signed-pdf-storage-path-column.sql`
4. Clique em **Run** ou **Execute**

O script adiciona a coluna se ela não existir:

```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS signed_pdf_storage_path TEXT;
```

### 2. Código Corrigido

O código foi corrigido para **não incluir** `signedPdfStoragePath` no payload quando não há assinatura:

**Antes (INCORRETO):**
```typescript
// Incluía signedPdfStoragePath mesmo sem assinatura
const finalSignedPdfStoragePath = signedPdfStoragePath || originalPdfStoragePath;
if (finalSignedPdfStoragePath !== undefined && finalSignedPdfStoragePath !== null && finalSignedPdfStoragePath.trim() !== '') {
  updatePayload.signedPdfStoragePath = finalSignedPdfStoragePath.trim();
}
```

**Depois (CORRETO):**
```typescript
// Só incluir signedPdfStoragePath quando há assinatura (addSignature = true)
if (addSignature && signedPdfStoragePath && signedPdfStoragePath.trim() !== '') {
  updatePayload.signedPdfStoragePath = signedPdfStoragePath.trim();
} else if (addSignature && originalPdfStoragePath && originalPdfStoragePath.trim() !== '') {
  // Se não há signedPdfStoragePath mas há originalPdfStoragePath e estamos assinando, usar o original
  updatePayload.signedPdfStoragePath = originalPdfStoragePath.trim();
}
// Se não está assinando, não incluir signedPdfStoragePath no payload
```

## 📋 Passos para Aplicar

### 1. Execute o Script SQL

Execute `supabase/add-signed-pdf-storage-path-column.sql` no Supabase Dashboard.

### 2. Verifique se a Coluna Foi Criada

Execute esta query no SQL Editor:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents' 
  AND column_name = 'signed_pdf_storage_path';
```

Você deve ver a coluna listada.

### 3. Teste o Encaminhamento

1. Faça login como Secretaria Geral
2. Abra um documento com status `pendente_secretaria`
3. Clique em "Encaminhar para Conselho de Administração"
4. Verifique que:
   - ✅ O status muda para `pendente_conselho`
   - ✅ Não há erros no console
   - ✅ O payload não inclui `signed_pdf_storage_path` (quando não há assinatura)

## 🔍 Verificação

Após aplicar a correção, verifique os logs no console:

**Quando encaminhando SEM assinatura:**
- ✅ Payload deve conter apenas `status: "pendente_conselho"`
- ✅ Não deve incluir `signed_pdf_storage_path`

**Quando assinando:**
- ✅ Payload deve incluir `signed_pdf_storage_path` (se houver)
- ✅ Payload deve incluir `signed_pdf_url` (se houver)

## 📝 Arquivos Modificados

1. `supabase/add-signed-pdf-storage-path-column.sql` - Script para adicionar a coluna
2. `src/store/useStore.ts` - Corrigido para não incluir `signedPdfStoragePath` quando não há assinatura

## ⚠️ Importante

- A coluna `signed_pdf_storage_path` é **opcional** e só deve ser preenchida quando há um PDF assinado
- Quando apenas encaminhando (sem assinar), o payload deve conter apenas o `status`
- A coluna deve existir no banco mesmo que não seja sempre usada (para quando houver assinaturas)
