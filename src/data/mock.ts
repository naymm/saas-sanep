import { User, Document, Notification, DocumentAction, Area } from '@/types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Carlos Mendes', email: 'rh@gov.ao', role: 'area', department: 'capital_humano' },
  { id: 'u2', name: 'Ana Silva', email: 'secretaria@gov.ao', role: 'secretaria_geral' },
  { id: 'u3', name: 'João Ferreira', email: 'conselho@gov.ao', role: 'conselho_admin', signatureUrl: '/assinatura.png' },
  { id: 'u5', name: 'Pedro Neto', email: 'juridico@gov.ao', role: 'area', department: 'juridico' },
  { id: 'u6', name: 'Luísa Gomes', email: 'financas@gov.ao', role: 'area', department: 'financas' },
  { id: 'u0', name: 'Administrador Master', email: 'master@gov.ao', role: 'master' },
];

export const MOCK_AREAS: Area[] = [
  { id: 'a1', name: 'Capital Humano', code: 'CH', description: 'Departamento de Recursos Humanos', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00' },
  { id: 'a2', name: 'Jurídico', code: 'JUR', description: 'Departamento Jurídico', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00' },
  { id: 'a3', name: 'Finanças', code: 'FIN', description: 'Departamento Financeiro', createdAt: '2026-01-01T00:00:00', updatedAt: '2026-01-01T00:00:00' },
];

const h = (docId: string, entries: Omit<DocumentAction, 'id' | 'documentId'>[]): DocumentAction[] =>
  entries.map((e, i) => ({ ...e, id: `${docId}-h${i}`, documentId: docId }));

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'Memorando de Aquisição de Equipamentos',
    type: 'memorando',
    description: 'Solicitação de aquisição de equipamentos de informática para o departamento.',
    fileName: 'memorando_aquisicao.pdf',
    createdBy: 'u1',
    createdByName: 'Carlos Mendes',
    createdByRole: 'area',
    createdByDepartment: 'capital_humano',
    status: 'pendente_secretaria',
    createdAt: '2026-02-10T09:00:00',
    updatedAt: '2026-02-10T09:00:00',
    history: h('d1', [
      { userId: 'u1', userName: 'Carlos Mendes', userRole: 'area', action: 'Documento criado e enviado para Secretaria Geral', timestamp: '2026-02-10T09:00:00' },
    ]),
    signatures: [],
  },
  {
    id: 'd2',
    title: 'Ofício de Cooperação Interinstitucional',
    type: 'oficio',
    description: 'Proposta de cooperação técnica entre instituições governamentais.',
    fileName: 'oficio_cooperacao.pdf',
    createdBy: 'u2',
    createdByName: 'Ana Silva',
    createdByRole: 'secretaria_geral',
    status: 'pendente_conselho',
    createdAt: '2026-02-08T14:30:00',
    updatedAt: '2026-02-09T10:15:00',
    history: h('d2', [
      { userId: 'u2', userName: 'Ana Silva', userRole: 'secretaria_geral', action: 'Documento criado e enviado para Conselho de Administração', timestamp: '2026-02-08T14:30:00' },
    ]),
    signatures: [],
  },
  {
    id: 'd3',
    title: 'Contrato de Prestação de Serviços',
    type: 'contrato',
    description: 'Contrato de serviços de consultoria para modernização administrativa.',
    fileName: 'contrato_servicos.pdf',
    createdBy: 'u5',
    createdByName: 'Pedro Neto',
    createdByRole: 'area',
    createdByDepartment: 'juridico',
    status: 'pendente_conselho',
    createdAt: '2026-02-05T11:00:00',
    updatedAt: '2026-02-07T16:00:00',
    history: h('d3', [
      { userId: 'u5', userName: 'Pedro Neto', userRole: 'area', action: 'Documento criado e enviado para Secretaria Geral', timestamp: '2026-02-05T11:00:00' },
      { userId: 'u2', userName: 'Ana Silva', userRole: 'secretaria_geral', action: 'Encaminhado para Conselho de Administração', timestamp: '2026-02-06T09:30:00' },
    ]),
    signatures: [],
  },
  {
    id: 'd4',
    title: 'Relatório Anual de Atividades',
    type: 'relatorio',
    description: 'Relatório consolidado de atividades do exercício de 2025.',
    fileName: 'relatorio_anual.pdf',
    createdBy: 'u6',
    createdByName: 'Luísa Gomes',
    createdByRole: 'area',
    createdByDepartment: 'financas',
    status: 'finalizado',
    createdAt: '2026-01-20T08:00:00',
    updatedAt: '2026-02-01T14:00:00',
    history: h('d4', [
      { userId: 'u6', userName: 'Luísa Gomes', userRole: 'area', action: 'Documento criado e enviado para Secretaria Geral', timestamp: '2026-01-20T08:00:00' },
      { userId: 'u2', userName: 'Ana Silva', userRole: 'secretaria_geral', action: 'Encaminhado para Conselho de Administração', timestamp: '2026-01-21T10:00:00' },
      { userId: 'u3', userName: 'João Ferreira', userRole: 'conselho_admin', action: 'Aprovado e assinado', comment: 'Parecer favorável.', timestamp: '2026-01-25T11:00:00' },
    ]),
    signatures: [
      { userId: 'u3', userName: 'João Ferreira', role: 'conselho_admin', timestamp: '2026-01-25T11:00:00' },
    ],
  },
  {
    id: 'd5',
    title: 'Memorando de Reestruturação Organizacional',
    type: 'memorando',
    description: 'Proposta de reestruturação dos departamentos internos.',
    fileName: 'memorando_reestruturacao.pdf',
    createdBy: 'u1',
    createdByName: 'Carlos Mendes',
    createdByRole: 'area',
    createdByDepartment: 'capital_humano',
    status: 'rejeitado',
    createdAt: '2026-02-01T13:00:00',
    updatedAt: '2026-02-04T17:00:00',
    history: h('d5', [
      { userId: 'u1', userName: 'Carlos Mendes', userRole: 'area', action: 'Documento criado e enviado para Secretaria Geral', timestamp: '2026-02-01T13:00:00' },
      { userId: 'u2', userName: 'Ana Silva', userRole: 'secretaria_geral', action: 'Encaminhado para Conselho de Administração', timestamp: '2026-02-02T09:00:00' },
      { userId: 'u3', userName: 'João Ferreira', userRole: 'conselho_admin', action: 'Rejeitado', comment: 'Necessita de mais detalhes sobre impacto orçamentário.', timestamp: '2026-02-04T17:00:00' },
    ]),
    signatures: [],
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u2', message: 'Novo documento recebido: Memorando de Aquisição de Equipamentos', documentId: 'd1', read: false, timestamp: '2026-02-10T09:00:00' },
  { id: 'n2', userId: 'u3', message: 'Novo documento para análise: Ofício de Cooperação Interinstitucional', documentId: 'd2', read: false, timestamp: '2026-02-09T10:15:00' },
  { id: 'n3', userId: 'u3', message: 'Novo documento para análise: Contrato de Prestação de Serviços', documentId: 'd3', read: false, timestamp: '2026-02-07T16:00:00' },
  { id: 'n4', userId: 'u6', message: 'Relatório Anual de Atividades foi finalizado', documentId: 'd4', read: true, timestamp: '2026-02-01T14:00:00' },
  { id: 'n5', userId: 'u1', message: 'Memorando de Reestruturação foi rejeitado', documentId: 'd5', read: false, timestamp: '2026-02-04T17:00:00' },
];
