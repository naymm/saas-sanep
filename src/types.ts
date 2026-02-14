export type UserRole = 'area' | 'secretaria_geral' | 'conselho_admin' | 'master';

export type Department = 'capital_humano' | 'juridico' | 'financas';

export interface Area {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: Department;
  signatureUrl?: string;
  stampUrl?: string;
  authUserId?: string; // ID do usuário no Supabase Auth
}

export type DocumentType = 'memorando' | 'oficio' | 'relatorio' | 'contrato' | 'outro';

export type DocumentStatus =
  | 'pendente_secretaria'
  | 'pendente_conselho'
  | 'aprovado'
  | 'rejeitado'
  | 'finalizado';

export interface DocumentAction {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  comment?: string;
  timestamp: string;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  description: string;
  fileName: string;
  originalPdfStoragePath?: string; // Caminho do PDF original no Storage
  signedPdfUrl?: string; // URL do PDF assinado (data URL ou blob URL)
  signedPdfStoragePath?: string; // Caminho do PDF assinado no Storage
  createdBy: string;
  createdByName: string;
  createdByRole: UserRole;
  createdByDepartment?: Department;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  history: DocumentAction[];
  signatures: { userId: string; userName: string; role: UserRole; timestamp: string; signatureUrl?: string }[];
  // Campos para atribuição de conselho
  assignedToConselhoUserId?: string; // ID do membro específico do conselho (null se for para todos)
  assignedToAllConselho?: boolean; // true se deve ser enviado para todos os membros
  conselhoSignaturesRequired?: number; // Número de assinaturas necessárias
  conselhoSignaturesReceived?: number; // Número de assinaturas já recebidas
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  documentId: string;
  read: boolean;
  timestamp: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  area: 'Área',
  secretaria_geral: 'Secretaria Geral',
  conselho_admin: 'Conselho de Administração',
  master: 'Master',
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  capital_humano: 'Capital Humano',
  juridico: 'Jurídico',
  financas: 'Finanças',
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  memorando: 'Memorando',
  oficio: 'Ofício',
  relatorio: 'Relatório',
  contrato: 'Contrato',
  outro: 'Outro',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pendente_secretaria: 'Na Secretaria Geral',
  pendente_conselho: 'No Conselho',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
};

export const STATUS_STYLE: Record<DocumentStatus, string> = {
  pendente_secretaria: 'status-active',
  pendente_conselho: 'status-active',
  aprovado: 'status-done',
  rejeitado: 'status-rejected',
  finalizado: 'status-done',
};
