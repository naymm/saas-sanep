-- Script para migrar usuários existentes para Supabase Auth
-- Execute este script APÓS executar auth-integration.sql
-- 
-- IMPORTANTE: Este script cria contas no Supabase Auth para usuários existentes
-- com senha padrão "senha123". Os usuários devem alterar a senha no primeiro login.
--
-- Para cada usuário, você precisará:
-- 1. Criar a conta no Supabase Auth manualmente OU
-- 2. Usar a API do Supabase para criar as contas (recomendado via aplicação)

-- ==================== NOTA IMPORTANTE ====================
-- Este script NÃO cria usuários no Supabase Auth automaticamente.
-- Você precisa criar as contas manualmente ou via aplicação.
--
-- Para criar via aplicação, use a função createUser que agora cria
-- tanto no Supabase Auth quanto na tabela users.

-- ==================== EXEMPLO DE COMO CRIAR USUÁRIOS NO AUTH ====================
-- Você pode usar o Supabase Dashboard > Authentication > Add User
-- OU usar a API do Supabase via aplicação

-- ==================== VINCULAR USUÁRIOS EXISTENTES ====================
-- Se você já criou usuários no Supabase Auth, pode vincular assim:

-- UPDATE users 
-- SET auth_user_id = 'uuid-do-usuario-no-auth'
-- WHERE email = 'email@exemplo.com';

-- ==================== VERIFICAR USUÁRIOS SEM AUTH ====================
-- Execute esta query para ver usuários sem auth_user_id:

-- SELECT id, name, email, role, auth_user_id
-- FROM users
-- WHERE auth_user_id IS NULL;
