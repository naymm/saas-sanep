# 🔔 Correção do Sistema de Notificações

## 🐛 Problema Identificado

O sistema de notificações não estava funcionando devido a **políticas RLS incorretas**. A política estava comparando `auth.uid()` diretamente com `user_id`, mas:

- `user_id` na tabela `notifications` referencia `users(id)`, não `auth.uid()`
- A vinculação correta é através da coluna `auth_user_id` na tabela `users`

## ✅ Correções Aplicadas

### 1. Política RLS Corrigida
**Arquivo:** `supabase/fix-notifications-rls-policy.sql`

**Antes (INCORRETO):**
```sql
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

**Depois (CORRETO):**
```sql
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = notifications.user_id 
      AND auth_user_id = auth.uid()
    )
  );
```

### 2. Logs Detalhados Adicionados
**Arquivos:** `src/lib/supabaseService.ts`, `src/store/useStore.ts`

- Logs ao criar notificações
- Logs ao buscar notificações
- Logs ao marcar notificações como lidas
- Tratamento de erros melhorado

### 3. Tratamento de Erros
- Notificações não bloqueiam o fluxo principal
- Erros são logados mas não interrompem operações
- Mensagens de erro mais detalhadas

## 📋 Passos para Aplicar a Correção

### 1. Execute o Script SQL Corrigido

**IMPORTANTE:** Execute este script no Supabase Dashboard:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/fix-notifications-rls-policy.sql`
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

### 3. Verifique Notificações Existentes

Execute esta query para ver notificações:

```sql
SELECT 
  n.id,
  n.user_id,
  u.name as user_name,
  u.email,
  u.auth_user_id,
  n.message,
  n.document_id,
  n.read,
  n.timestamp
FROM notifications n
LEFT JOIN users u ON u.id = n.user_id
ORDER BY n.timestamp DESC
LIMIT 20;
```

## 🔍 Verificação

Após executar o script SQL, verifique se as políticas foram criadas:

```sql
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
```

Você deve ver as políticas:
- `"Users can view own notifications"` (SELECT)
- `"Authenticated users can insert notifications"` (INSERT)
- `"Users can update own notifications"` (UPDATE)

## 🧪 Como Testar

1. **Criar um documento:**
   - Faça login como Área
   - Crie um novo documento
   - Verifique se a Secretaria recebe notificação

2. **Encaminhar documento:**
   - Faça login como Secretaria
   - Encaminhe um documento para o Conselho
   - Verifique se o Conselho recebe notificação

3. **Assinar documento:**
   - Faça login como Conselho
   - Assine e aprove um documento
   - Verifique se o criador recebe notificação

4. **Verificar notificações:**
   - Clique no ícone de sino no header
   - Verifique se as notificações aparecem
   - Clique em uma notificação para abrir o documento

## 📝 Arquivos Modificados

1. `supabase/fix-notifications-rls-policy.sql` - Política RLS corrigida
2. `src/lib/supabaseService.ts` - Logs e tratamento de erros melhorados
3. `src/store/useStore.ts` - Tratamento de erros ao criar notificações

## ⚠️ Importante

- **Todos os usuários** que precisam receber notificações devem ter `auth_user_id` vinculado
- Se um usuário não tiver `auth_user_id`, não conseguirá ver suas notificações
- As políticas permitem que:
  - Usuários vejam apenas suas próprias notificações
  - Usuários autenticados possam criar notificações
  - Usuários possam marcar suas notificações como lidas

## 🎯 Resultado Esperado

Após aplicar todas as correções:

- ✅ Notificações são criadas corretamente
- ✅ Notificações são exibidas no header
- ✅ Contador de não lidas funciona
- ✅ Clique na notificação abre o documento
- ✅ Notificações são marcadas como lidas
- ✅ Sem erros 401 ou 42501 relacionados a notificações
