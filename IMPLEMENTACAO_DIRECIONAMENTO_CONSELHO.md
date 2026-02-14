# 🎯 Implementação: Direcionamento de Documentos para Conselho

## 📋 Resumo

Implementado sistema que permite à Secretaria Geral direcionar documentos para:
1. **Um membro específico do conselho** - O documento vai apenas para esse membro
2. **Todos os membros do conselho** - O documento circula entre todos os membros para pareceres

## ✅ Funcionalidades Implementadas

### 1. Campos no Banco de Dados
**Arquivo:** `supabase/add-conselho-assignment-fields.sql`

Adicionados campos na tabela `documents`:
- `assigned_to_conselho_user_id` (UUID) - ID do membro específico (NULL se for para todos)
- `assigned_to_all_conselho` (BOOLEAN) - TRUE se for para todos os membros
- `conselho_signatures_required` (INTEGER) - Número de assinaturas necessárias
- `conselho_signatures_received` (INTEGER) - Número de assinaturas já recebidas

### 2. Tipos TypeScript
**Arquivo:** `src/types.ts`

Atualizada interface `Document` com os novos campos:
```typescript
assignedToConselhoUserId?: string;
assignedToAllConselho?: boolean;
conselhoSignaturesRequired?: number;
conselhoSignaturesReceived?: number;
```

### 3. Interface de Seleção
**Arquivo:** `src/pages/DocumentDetailPage.tsx`

Adicionado componente de seleção com:
- RadioGroup para escolher entre "Um membro específico" ou "Todos os membros"
- Select dropdown para escolher o membro específico (quando aplicável)
- Mensagem informativa quando selecionado "Todos os membros"

### 4. Lógica de Encaminhamento
**Arquivo:** `src/store/useStore.ts`

#### Cenário 1: Membro Específico
- Secretaria seleciona um membro específico
- Documento vai apenas para esse membro
- Após assinatura, documento é finalizado

#### Cenário 2: Todos os Membros
- Secretaria seleciona "Todos os membros"
- Documento vai para todos os membros do conselho
- **Fluxo:**
  1. Primeiro membro assina → documento encaminhado para o próximo membro
  2. Segundo membro assina → documento encaminhado para o próximo (se houver)
  3. Após todos assinarem → documento é **finalizado automaticamente** (`finalizado`)

### 5. Validações e Segurança
- Verificação se o membro do conselho pode assinar (quando é membro específico)
- Verificação se o membro já assinou (evita duplicação)
- Contador de assinaturas recebidas vs necessárias

### 6. Notificações
**Arquivo:** `src/store/useStore.ts`

Notificações são enviadas:
- Para o membro específico (quando selecionado)
- Para todos os membros (quando selecionado "Todos")
- Para o próximo membro (quando conselho encaminha para outro membro)
- Para a Secretaria (quando todos assinaram e documento retorna)

## 📋 Passos para Aplicar

### 1. Execute o Script SQL

**IMPORTANTE:** Execute no Supabase Dashboard:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/add-conselho-assignment-fields.sql`
4. Clique em **Run** ou **Execute**

### 2. Verifique os Campos

Execute esta query para verificar se os campos foram adicionados:

```sql
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
```

## 🧪 Como Testar

### Teste 1: Membro Específico
1. Faça login como **Secretaria Geral**
2. Abra um documento com status `pendente_secretaria`
3. Selecione **"Um membro específico do conselho"**
4. Escolha um membro do dropdown
5. Clique em **"Encaminhar para Conselho de Administração"**
6. Faça login como o **membro selecionado**
7. Verifique se o documento aparece para ele
8. Assine o documento
9. Verifique se o documento foi finalizado

### Teste 2: Todos os Membros
1. Faça login como **Secretaria Geral**
2. Abra um documento com status `pendente_secretaria`
3. Selecione **"Todos os membros do conselho (para pareceres)"**
4. Clique em **"Encaminhar para Conselho de Administração"**
5. Faça login como **primeiro membro do conselho**
6. Assine o documento
7. Verifique se o documento foi encaminhado para o próximo membro
8. Faça login como **segundo membro do conselho**
9. Assine o documento
10. Verifique se o documento retornou para a Secretaria Geral
11. Faça login como **Secretaria Geral**
12. Verifique se pode finalizar o documento

## 📝 Arquivos Modificados

1. `supabase/add-conselho-assignment-fields.sql` - Script SQL para adicionar campos
2. `src/types.ts` - Interface Document atualizada
3. `src/lib/supabaseService.ts` - Funções de mapeamento e updateDocument atualizadas
4. `src/store/useStore.ts` - Lógica de advanceDocument e notificações
5. `src/pages/DocumentDetailPage.tsx` - UI de seleção de membro(s)

## ⚠️ Importante

- **Todos os membros do conselho** devem ter `auth_user_id` vinculado
- O sistema verifica automaticamente quantos membros do conselho existem
- Quando "Todos os membros" é selecionado, o documento circula entre todos
- O primeiro que assinar encaminha para o próximo automaticamente
- Após todos assinarem, o documento retorna para a Secretaria para finalização

## 🎯 Resultado Esperado

Após aplicar todas as mudanças:

- ✅ Secretaria pode escolher membro específico ou todos
- ✅ Documento vai apenas para o membro selecionado (quando específico)
- ✅ Documento circula entre todos os membros (quando "todos")
- ✅ Primeiro membro que assina encaminha para o próximo
- ✅ Após todos assinarem, documento retorna para Secretaria
- ✅ Secretaria pode finalizar após todos assinarem
- ✅ Notificações são enviadas corretamente
- ✅ Validações impedem assinaturas duplicadas
- ✅ Validações impedem membro errado de assinar
