# 🔧 Resumo da Correção: Encaminhar para Conselho de Administração

## 🐛 Problema Identificado

O "Encaminhar para Conselho de Administração" não estava funcionando devido a **dois problemas principais**:

### 1. Política RLS Incorreta ❌
A política RLS estava comparando `users.id` diretamente com `auth.uid()`, mas:
- `users.id` é um UUID gerado pela aplicação
- `auth.uid()` retorna o ID do usuário no Supabase Auth
- A vinculação correta é através da coluna `auth_user_id`

**Código incorreto:**
```sql
WHERE id::text = auth.uid()::text 
AND role = 'secretaria_geral'
```

**Código correto:**
```sql
WHERE auth_user_id = auth.uid() 
AND role = 'secretaria_geral'
```

### 2. Falta de `await` na Chamada ⚠️
A função `advanceDocument` não estava sendo aguardada corretamente, causando erros silenciosos.

## ✅ Correções Aplicadas

### 1. Política RLS Corrigida
- ✅ Arquivo: `supabase/fix-documents-update-policy.sql`
- ✅ Usa `auth_user_id` para vincular com `auth.uid()`
- ✅ Verifica corretamente o criador do documento
- ✅ Verifica corretamente as roles dos usuários

### 2. Código Frontend Corrigido
- ✅ Arquivo: `src/pages/DocumentDetailPage.tsx`
- ✅ Adicionado `await` antes de `advanceDocument`
- ✅ Adicionado tratamento de erro com `try/catch`
- ✅ Adicionado estado de carregamento (`isProcessing`)

### 3. Validação e Limpeza do Payload
- ✅ Arquivo: `src/lib/supabaseService.ts`
- ✅ Validação rigorosa de tipos
- ✅ Remoção de campos `undefined`
- ✅ Normalização de strings vazias para `null`
- ✅ Logs detalhados para debug

## 📋 Passos para Aplicar a Correção

### 1. Execute o Script SQL Corrigido

**IMPORTANTE:** Execute este script no Supabase Dashboard:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/fix-documents-update-policy.sql`
4. Clique em **Run** ou **Execute**

### 2. Verifique se os Usuários Têm `auth_user_id`

Execute esta query no SQL Editor:

```sql
SELECT 
  id,
  name,
  email,
  role,
  auth_user_id,
  CASE 
    WHEN auth_user_id IS NULL THEN '❌ SEM VINCULAÇÃO COM AUTH'
    ELSE '✅ VINCULADO'
  END as status_auth
FROM users
ORDER BY role, name;
```

### 3. Se Algum Usuário Não Tiver `auth_user_id`

Você precisa vincular os usuários ao Supabase Auth:

#### Opção A: Via Aplicação (Recomendado)
1. Faça login como usuário master
2. Vá em "Gerenciar Usuários"
3. Para cada usuário sem `auth_user_id`:
   - Edite o usuário
   - Defina uma senha
   - Salve (isso criará a conta no Supabase Auth e vinculará)

#### Opção B: Manualmente no Supabase Dashboard
1. Acesse **Authentication** > **Users** no Supabase Dashboard
2. Clique em **Add User**
3. Preencha:
   - Email: o mesmo email do usuário na tabela `users`
   - Password: defina uma senha
   - Auto Confirm User: ✅ (marcar)
4. Copie o **User UID**
5. Execute no SQL Editor:

```sql
UPDATE users 
SET auth_user_id = 'uuid-copiado-aqui'
WHERE email = 'email@exemplo.com';
```

## 🧪 Como Testar

1. **Faça login como Secretaria Geral**
   - Certifique-se de que o usuário tem `auth_user_id` vinculado

2. **Abra um documento com status `pendente_secretaria`**
   - O documento deve estar visível na lista

3. **Clique em "Encaminhar para Conselho de Administração"**
   - O botão deve estar habilitado
   - Deve mostrar "Processando..." durante a operação

4. **Verifique o resultado:**
   - ✅ O status deve mudar para `pendente_conselho`
   - ✅ Deve aparecer uma notificação para o Conselho
   - ✅ O histórico deve mostrar a ação
   - ✅ Não deve haver erros no console

5. **Verifique os logs no console:**
   - Procure por:
     - "Secretaria encaminhando para conselho"
     - "📝 Atualizando documento com payload"
     - "🔵 updateDocument chamado"
     - "✅ Documento atualizado com sucesso"

## 🔍 Verificação da Política RLS

Após executar o script SQL, verifique se a política foi criada:

```sql
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;
```

Você deve ver a política `"Users can update documents based on role and status"` com `cmd = 'UPDATE'`.

## ⚠️ Erros Comuns

### Erro 400 (Bad Request)
- **Causa:** Payload inválido ou campos incorretos
- **Solução:** Verifique os logs no console para ver o payload exato

### Erro 401 (Unauthorized) ou 42501 (RLS)
- **Causa:** Política RLS bloqueando ou usuário sem `auth_user_id`
- **Solução:** 
  1. Execute o script SQL corrigido
  2. Verifique se o usuário tem `auth_user_id` vinculado
  3. Verifique se o usuário tem a role correta

### Status não muda
- **Causa:** Política RLS bloqueando ou erro silencioso
- **Solução:** 
  1. Verifique os logs no console
  2. Verifique se a política RLS permite a atualização
  3. Verifique se o usuário tem permissão

## 📝 Arquivos Modificados

1. `supabase/fix-documents-update-policy.sql` - Política RLS corrigida
2. `src/pages/DocumentDetailPage.tsx` - Adicionado `await` e tratamento de erro
3. `src/store/useStore.ts` - Melhorias na construção do payload
4. `src/lib/supabaseService.ts` - Validação rigorosa do payload

## 🎯 Resultado Esperado

Após aplicar todas as correções:

- ✅ Secretaria Geral pode encaminhar documentos para o Conselho
- ✅ Status muda corretamente de `pendente_secretaria` para `pendente_conselho`
- ✅ Notificações são criadas corretamente
- ✅ Histórico é atualizado
- ✅ Sem erros 400 ou 401
- ✅ Logs detalhados para debug
