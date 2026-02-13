-- Script para criar o primeiro usuário Master
-- Execute este script no SQL Editor do Supabase ANTES de executar seed.sql
-- OU use este script se precisar criar um novo usuário master

-- ==================== CRIAR USUÁRIO MASTER ====================

-- Opção 1: Criar com UUID específico (recomendado para o primeiro master)
INSERT INTO users (id, name, email, role, department, signature_url, stamp_url) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Administrador Master', 'master@gov.ao', 'master', NULL, NULL, NULL)
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department;

-- Opção 2: Criar com UUID gerado automaticamente (para criar múltiplos masters)
-- Descomente e ajuste os dados conforme necessário:
/*
INSERT INTO users (name, email, role, department, signature_url, stamp_url) VALUES
  ('Seu Nome', 'seu-email@exemplo.com', 'master', NULL, NULL, NULL)
ON CONFLICT (email) DO UPDATE
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department = EXCLUDED.department;
*/

-- ==================== VERIFICAR SE FOI CRIADO ====================

-- Execute esta query para verificar se o usuário master foi criado:
-- SELECT id, name, email, role FROM users WHERE role = 'master';
