# Solução para Erro 401 - Não é possível criar área/usuário

## Problema

O erro **401 (Unauthorized)** indica que as políticas RLS (Row Level Security) do Supabase estão bloqueando as operações de INSERT/UPDATE/DELETE.

## Solução Rápida

Você tem **2 opções** para resolver:

### Opção 1: Desabilitar RLS Temporariamente (Mais Simples)

Execute este script no **SQL Editor do Supabase**:

```sql
-- Arquivo: supabase/disable-rls-temporarily.sql
```

**Passos:**
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase/disable-rls-temporarily.sql`
4. Clique em **Run** ou **Execute**

Isso desabilitará completamente o RLS, permitindo todas as operações.

### Opção 2: Manter RLS com Políticas Abertas (Recomendado)

Execute este script no **SQL Editor do Supabase**:

```sql
-- Arquivo: supabase/enable-rls-with-open-policies.sql
```

**Passos:**
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase/enable-rls-with-open-policies.sql`
4. Clique em **Run** ou **Execute**

Isso manterá o RLS habilitado, mas com políticas que permitem todas as operações.

## Como Verificar se Funcionou

Após executar um dos scripts:

1. Recarregue a aplicação
2. Faça login como usuário master
3. Tente criar uma nova área
4. Tente criar um novo usuário
5. Verifique se não há mais erro 401

## Por que isso acontece?

As políticas RLS originais usavam `auth.uid()` e `auth.role()`, que só funcionam com **Supabase Auth** (autenticação completa). Como estamos usando autenticação simples por email, essas funções retornam `NULL`, bloqueando todas as operações.

## Para Produção

⚠️ **IMPORTANTE:** As soluções acima são para **desenvolvimento**. 

Para produção, você deve:

1. **Implementar Supabase Auth completo** (não apenas autenticação por email)
2. **Criar políticas RLS adequadas** que usem `auth.uid()` e `auth.role()`
3. **Validar permissões** tanto no banco quanto na aplicação

## Arquivos Criados

- `supabase/disable-rls-temporarily.sql` - Desabilita RLS completamente
- `supabase/enable-rls-with-open-policies.sql` - Mantém RLS com políticas abertas
- `SOLUCAO_ERRO_401.md` - Este arquivo

## Ajuda Adicional

Se ainda houver problemas:

1. Verifique o console do navegador para erros detalhados
2. Verifique a aba Network para ver a requisição que falhou
3. Verifique o SQL Editor do Supabase para confirmar que as políticas foram atualizadas
4. Verifique se as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas
