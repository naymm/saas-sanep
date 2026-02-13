# Como Criar o Usuário Master

O usuário Master é necessário para gerenciar outros usuários e áreas no sistema.

## Método 1: Usando o Script SQL (Recomendado)

### Passo 1: Executar o Script

1. Acesse o **SQL Editor** no painel do Supabase
2. Execute o arquivo `supabase/create-master-user.sql`
3. Isso criará o usuário master com email `master@gov.ao`

### Passo 2: Fazer Login

1. Acesse a aplicação
2. Faça login com o email: `master@gov.ao`
3. A senha não é validada (autenticação simples por email)

### Passo 3: Verificar Permissões

Após fazer login, você deve ver:
- Menu "Gerenciar Usuários" na sidebar
- Menu "Gerenciar Áreas" na sidebar
- Acesso completo ao sistema

## Método 2: Criar Manualmente via SQL

Execute este comando no SQL Editor do Supabase:

```sql
INSERT INTO users (id, name, email, role, department, signature_url, stamp_url) 
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Administrador Master', 'seu-email@exemplo.com', 'master', NULL, NULL, NULL)
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role;
```

**Substitua `seu-email@exemplo.com` pelo email que deseja usar para login.**

## Método 3: Usar o Seed.sql

O arquivo `supabase/seed.sql` já inclui o usuário master:

- **Email:** `master@gov.ao`
- **Nome:** Administrador Master
- **Role:** master

Se você executou o `seed.sql`, o usuário master já está criado!

## Verificar se o Master Existe

Execute esta query no SQL Editor:

```sql
SELECT id, name, email, role 
FROM users 
WHERE role = 'master';
```

Se retornar resultados, o usuário master existe.

## Criar Múltiplos Usuários Master

Você pode criar quantos usuários master quiser:

```sql
INSERT INTO users (name, email, role, department) 
VALUES 
  ('Master 1', 'master1@exemplo.com', 'master', NULL),
  ('Master 2', 'master2@exemplo.com', 'master', NULL)
ON CONFLICT (email) DO NOTHING;
```

## Importante

- O usuário master tem acesso total ao sistema
- Pode criar, editar e deletar usuários
- Pode criar, editar e deletar áreas
- Use com cuidado em produção!

## Troubleshooting

**Problema:** Não consigo ver o menu "Gerenciar Usuários"

**Solução:**
1. Verifique se você está logado com um usuário que tem role = 'master'
2. Verifique no banco: `SELECT role FROM users WHERE email = 'seu-email@exemplo.com'`
3. Se não for 'master', atualize: `UPDATE users SET role = 'master' WHERE email = 'seu-email@exemplo.com'`

**Problema:** Erro ao criar usuário master

**Solução:**
1. Verifique se a tabela `users` existe (execute `schema.sql` primeiro)
2. Verifique se o email já existe: `SELECT * FROM users WHERE email = 'seu-email@exemplo.com'`
3. Se existir, use `ON CONFLICT DO UPDATE` para atualizar
