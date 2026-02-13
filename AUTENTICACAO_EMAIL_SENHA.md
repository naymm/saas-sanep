# Autenticação com Email e Senha

O sistema agora usa **Supabase Auth** para autenticação completa com email e senha.

## 🚀 Configuração Inicial

### 1. Execute o Script de Integração

Execute o arquivo `supabase/auth-integration.sql` no **SQL Editor do Supabase**:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `supabase/auth-integration.sql`
4. Clique em **Run** ou **Execute**

Este script:
- Adiciona a coluna `auth_user_id` na tabela `users`
- Atualiza as políticas RLS para usar `auth.uid()`
- Configura permissões adequadas

### 2. Migrar Usuários Existentes

Se você já tem usuários no banco, precisa criar contas no Supabase Auth para eles:

#### Opção A: Criar via Aplicação (Recomendado)

1. Faça login como usuário master
2. Vá em "Gerenciar Usuários"
3. Para cada usuário existente:
   - Edite o usuário
   - Defina uma senha
   - Salve (isso criará a conta no Supabase Auth)

#### Opção B: Criar Manualmente no Supabase Dashboard

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

## 🔐 Como Funciona Agora

### Login

1. O usuário digita **email** e **senha**
2. O sistema autentica com Supabase Auth usando `signInWithPassword`
3. Se autenticação for bem-sucedida, busca os dados do usuário na tabela `users`
4. Se o usuário não tiver `auth_user_id` vinculado, tenta vincular automaticamente

### Criar Novo Usuário

Quando um usuário master cria um novo usuário:

1. O sistema cria a conta no **Supabase Auth** com email e senha
2. Cria o registro na tabela `users` vinculado ao `auth_user_id`
3. O novo usuário pode fazer login imediatamente

### Senhas

- **Mínimo:** 6 caracteres
- **Recomendado:** 8+ caracteres com letras, números e símbolos
- As senhas são armazenadas de forma segura pelo Supabase Auth (hash bcrypt)

## 📋 Checklist de Migração

- [ ] Executei `supabase/auth-integration.sql`
- [ ] Criei contas no Supabase Auth para usuários existentes
- [ ] Vinculei `auth_user_id` para usuários existentes
- [ ] Testei login com email e senha
- [ ] Testei criação de novo usuário com senha
- [ ] Verifiquei que as políticas RLS estão funcionando

## 🔍 Verificar Status

### Ver usuários sem autenticação:

```sql
SELECT id, name, email, role, auth_user_id
FROM users
WHERE auth_user_id IS NULL;
```

### Ver todos os usuários com status de auth:

```sql
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.auth_user_id,
  CASE 
    WHEN u.auth_user_id IS NULL THEN 'Sem Auth'
    ELSE 'Com Auth'
  END as status
FROM users u
ORDER BY u.created_at DESC;
```

## ⚠️ Problemas Comuns

### Erro: "Invalid login credentials"

- Verifique se o usuário existe no Supabase Auth
- Verifique se a senha está correta
- Verifique se o email está correto

### Erro: "User not found in system"

- O usuário existe no Supabase Auth mas não na tabela `users`
- Crie o usuário na tabela `users` ou vincule o `auth_user_id`

### Erro: 401 ao criar usuário

- Execute `supabase/auth-integration.sql` novamente
- Verifique se as políticas RLS estão corretas
- Verifique se você está autenticado como master

## 🔒 Segurança

- ✅ Senhas são armazenadas com hash (nunca em texto plano)
- ✅ Autenticação gerenciada pelo Supabase Auth
- ✅ Tokens JWT para sessões
- ✅ Políticas RLS protegem os dados
- ✅ Validação de senha mínima (6 caracteres)

## 📝 Próximos Passos (Opcional)

- [ ] Implementar recuperação de senha
- [ ] Implementar alteração de senha
- [ ] Adicionar verificação de email
- [ ] Implementar 2FA (autenticação de dois fatores)
