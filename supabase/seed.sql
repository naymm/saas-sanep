-- Script de dados iniciais para o Fluxo Seguro
-- Execute este script no SQL Editor do Supabase após executar schema.sql

-- ==================== USUÁRIOS INICIAIS ====================

-- Inserir usuários (usando UUIDs fixos para referências)
INSERT INTO users (id, name, email, role, department, signature_url, stamp_url) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Carlos Mendes', 'rh@gov.ao', 'area', 'capital_humano', NULL, NULL),
  ('00000000-0000-0000-0000-000000000002', 'Ana Silva', 'secretaria@gov.ao', 'secretaria_geral', NULL, NULL, NULL),
  ('00000000-0000-0000-0000-000000000003', 'João Ferreira', 'conselho@gov.ao', 'conselho_admin', NULL, '/assinatura.png', NULL),
  ('00000000-0000-0000-0000-000000000005', 'Pedro Neto', 'juridico@gov.ao', 'area', 'juridico', NULL, NULL),
  ('00000000-0000-0000-0000-000000000006', 'Luísa Gomes', 'financas@gov.ao', 'area', 'financas', NULL, NULL),
  ('00000000-0000-0000-0000-000000000000', 'Administrador Master', 'master@gov.ao', 'master', NULL, NULL, NULL)
ON CONFLICT (email) DO NOTHING;

-- ==================== ÁREAS INICIAIS ====================

INSERT INTO areas (id, name, code, description) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Capital Humano', 'CH', 'Departamento de Recursos Humanos'),
  ('00000000-0000-0000-0000-0000000000a2', 'Jurídico', 'JUR', 'Departamento Jurídico'),
  ('00000000-0000-0000-0000-0000000000a3', 'Finanças', 'FIN', 'Departamento Financeiro')
ON CONFLICT (code) DO NOTHING;

-- ==================== DOCUMENTOS INICIAIS ====================

-- Documento 1: Memorando de Aquisição (pendente_secretaria)
INSERT INTO documents (id, title, type, description, file_name, created_by, created_by_name, created_by_role, created_by_department, status, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'Memorando de Aquisição de Equipamentos', 'memorando', 'Solicitação de aquisição de equipamentos de informática para o departamento.', 'memorando_aquisicao.pdf', '00000000-0000-0000-0000-000000000001', 'Carlos Mendes', 'area', 'capital_humano', 'pendente_secretaria', '2026-02-10T09:00:00Z', '2026-02-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_actions (document_id, user_id, user_name, user_role, action, comment, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', 'Carlos Mendes', 'area', 'Documento criado e enviado para Secretaria Geral', NULL, '2026-02-10T09:00:00Z');

-- Documento 2: Ofício de Cooperação (pendente_conselho)
INSERT INTO documents (id, title, type, description, file_name, created_by, created_by_name, created_by_role, created_by_department, status, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000d2', 'Ofício de Cooperação Interinstitucional', 'oficio', 'Proposta de cooperação técnica entre instituições governamentais.', 'oficio_cooperacao.pdf', '00000000-0000-0000-0000-000000000002', 'Ana Silva', 'secretaria_geral', NULL, 'pendente_conselho', '2026-02-08T14:30:00Z', '2026-02-09T10:15:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_actions (document_id, user_id, user_name, user_role, action, comment, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000002', 'Ana Silva', 'secretaria_geral', 'Documento criado e enviado para Conselho de Administração', NULL, '2026-02-08T14:30:00Z');

-- Documento 3: Contrato de Serviços (pendente_conselho)
INSERT INTO documents (id, title, type, description, file_name, created_by, created_by_name, created_by_role, created_by_department, status, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000d3', 'Contrato de Prestação de Serviços', 'contrato', 'Contrato de serviços de consultoria para modernização administrativa.', 'contrato_servicos.pdf', '00000000-0000-0000-0000-000000000005', 'Pedro Neto', 'area', 'juridico', 'pendente_conselho', '2026-02-05T11:00:00Z', '2026-02-07T16:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_actions (document_id, user_id, user_name, user_role, action, comment, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000005', 'Pedro Neto', 'area', 'Documento criado e enviado para Secretaria Geral', NULL, '2026-02-05T11:00:00Z'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000002', 'Ana Silva', 'secretaria_geral', 'Encaminhado para Conselho de Administração', NULL, '2026-02-06T09:30:00Z');

-- Documento 4: Relatório Anual (finalizado)
INSERT INTO documents (id, title, type, description, file_name, created_by, created_by_name, created_by_role, created_by_department, status, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000d4', 'Relatório Anual de Atividades', 'relatorio', 'Relatório consolidado de atividades do exercício de 2025.', 'relatorio_anual.pdf', '00000000-0000-0000-0000-000000000006', 'Luísa Gomes', 'area', 'financas', 'finalizado', '2026-01-20T08:00:00Z', '2026-02-01T14:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_actions (document_id, user_id, user_name, user_role, action, comment, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000006', 'Luísa Gomes', 'area', 'Documento criado e enviado para Secretaria Geral', NULL, '2026-01-20T08:00:00Z'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000002', 'Ana Silva', 'secretaria_geral', 'Encaminhado para Conselho de Administração', NULL, '2026-01-21T10:00:00Z'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000003', 'João Ferreira', 'conselho_admin', 'Aprovado e assinado', 'Parecer favorável.', '2026-01-25T11:00:00Z');

INSERT INTO document_signatures (document_id, user_id, user_name, role, signature_url, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000003', 'João Ferreira', 'conselho_admin', '/assinatura.png', '2026-01-25T11:00:00Z');

-- Documento 5: Memorando de Reestruturação (rejeitado)
INSERT INTO documents (id, title, type, description, file_name, created_by, created_by_name, created_by_role, created_by_department, status, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000d5', 'Memorando de Reestruturação Organizacional', 'memorando', 'Proposta de reestruturação dos departamentos internos.', 'memorando_reestruturacao.pdf', '00000000-0000-0000-0000-000000000001', 'Carlos Mendes', 'area', 'capital_humano', 'rejeitado', '2026-02-01T13:00:00Z', '2026-02-04T17:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_actions (document_id, user_id, user_name, user_role, action, comment, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-000000000001', 'Carlos Mendes', 'area', 'Documento criado e enviado para Secretaria Geral', NULL, '2026-02-01T13:00:00Z'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-000000000002', 'Ana Silva', 'secretaria_geral', 'Encaminhado para Conselho de Administração', NULL, '2026-02-02T09:00:00Z'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-000000000003', 'João Ferreira', 'conselho_admin', 'Rejeitado', 'Necessita de mais detalhes sobre impacto orçamentário.', '2026-02-04T17:00:00Z');

-- ==================== NOTIFICAÇÕES INICIAIS ====================

INSERT INTO notifications (id, user_id, message, document_id, read, timestamp) VALUES
  ('00000000-0000-0000-0000-0000000000n1', '00000000-0000-0000-0000-000000000002', 'Novo documento recebido: Memorando de Aquisição de Equipamentos', '00000000-0000-0000-0000-0000000000d1', false, '2026-02-10T09:00:00Z'),
  ('00000000-0000-0000-0000-0000000000n2', '00000000-0000-0000-0000-000000000003', 'Novo documento para análise: Ofício de Cooperação Interinstitucional', '00000000-0000-0000-0000-0000000000d2', false, '2026-02-09T10:15:00Z'),
  ('00000000-0000-0000-0000-0000000000n3', '00000000-0000-0000-0000-000000000003', 'Novo documento para análise: Contrato de Prestação de Serviços', '00000000-0000-0000-0000-0000000000d3', false, '2026-02-07T16:00:00Z'),
  ('00000000-0000-0000-0000-0000000000n4', '00000000-0000-0000-0000-000000000006', 'Relatório Anual de Atividades foi finalizado', '00000000-0000-0000-0000-0000000000d4', true, '2026-02-01T14:00:00Z'),
  ('00000000-0000-0000-0000-0000000000n5', '00000000-0000-0000-0000-000000000001', 'Memorando de Reestruturação foi rejeitado', '00000000-0000-0000-0000-0000000000d5', false, '2026-02-04T17:00:00Z')
ON CONFLICT (id) DO NOTHING;
