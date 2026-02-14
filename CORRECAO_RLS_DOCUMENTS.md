# 🔧 Correção da Política RLS para UPDATE de Documents

## 🐛 Problema Identificado

A política RLS estava comparando `users.id` diretamente com `auth.uid()`, mas isso está **incorreto** porque:

1. `users.id` é um UUID gerado pela aplicação (não é o mesmo que `auth.uid()`)
2. `auth.uid()` retorna o ID do usuário no Supabase Auth
3. A vinculação entre `users` e `auth.users` é feita através da coluna `auth_user_id`

## ✅ Solução

A política RLS foi corrigida para usar `auth_user_id` corretamente:

### Antes (INCORRETO):
```sql
WHERE id::text = auth.uid()::text 
AND role = 'secretaria_geral'
```

### Depois (CORRETO):
```sql
WHERE auth_user_id = auth.uid() 
AND role = 'secretaria_geral'
```

## 📋 Passos para Corrigir

### 1. Execute o Script SQL Corrigido

Execute o arquivo `supabase/fix-documents-update-policy.sql` no **SQL Editor do Supabase**:

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

## 🔍 Verificação

Após executar o script, verifique se a política foi criada corretamente:

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

## 🎯 O Que Foi Corrigido

1. ✅ Comparação correta usando `auth_user_id = auth.uid()`
2. ✅ Verificação do criador do documento via `auth_user_id`
3. ✅ Verificação de roles usando `auth_user_id`
4. ✅ Query para verificar usuários sem vinculação

## ⚠️ Importante

- **Todos os usuários** que precisam atualizar documentos devem ter `auth_user_id` vinculado
- Se um usuário não tiver `auth_user_id`, a política RLS **bloqueará** as atualizações
- A política permite que:
  - O criador do documento atualize
  - Usuários `master` atualizem qualquer documento
  - `secretaria_geral` atualize documentos com status `pendente_secretaria` ou `pendente_conselho`
  - `conselho_admin` atualize documentos com status `pendente_conselho`

## 🧪 Teste

Após aplicar a correção:

1. Faça login como Secretaria Geral
2. Abra um documento com status `pendente_secretaria`
3. Clique em "Encaminhar para Conselho de Administração"
4. Verifique se o status mudou para `pendente_conselho`
5. Verifique os logs no console para confirmar que não há erros 400 ou 401
