import { supabase } from './supabase';
import { User, Document, Notification, Area, DocumentStatus, DocumentType, UserRole, Department } from '@/types';

// ==================== AUTHENTICATION ====================

export async function signInWithPassword(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function signUp(email: string, password: string, metadata?: { name?: string }) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
}

export async function getCurrentAuthUser() {
  try {
    // Usar getSession() que é mais rápido e não faz requisição ao servidor
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro ao obter sessão:', error);
      return null;
    }
    return session?.user || null;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

// ==================== USERS ====================

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }

  // Mapear usuários e resolver URLs do Storage se necessário
  const users = await Promise.all((data || []).map(async (dbUser) => {
    const user = mapUserFromDb(dbUser);
    // Se signature_url ou stamp_url são caminhos do Storage, obter URL pública
    if (user.signatureUrl && !user.signatureUrl.startsWith('http') && !user.signatureUrl.startsWith('data:') && !user.signatureUrl.startsWith('blob:')) {
      try {
        user.signatureUrl = await getSignatureOrStampUrl(user.signatureUrl);
      } catch (error) {
        console.warn('Erro ao obter URL pública da assinatura:', error);
      }
    }
    if (user.stampUrl && !user.stampUrl.startsWith('http') && !user.stampUrl.startsWith('data:') && !user.stampUrl.startsWith('blob:')) {
      try {
        user.stampUrl = await getSignatureOrStampUrl(user.stampUrl);
      } catch (error) {
        console.warn('Erro ao obter URL pública do carimbo:', error);
      }
    }
    return user;
  }));

  return users;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Erro ao buscar usuário:', error);
    throw error;
  }

  if (!data) return null;

  const user = mapUserFromDb(data);
  // Resolver URLs do Storage se necessário
  if (user.signatureUrl && !user.signatureUrl.startsWith('http') && !user.signatureUrl.startsWith('data:') && !user.signatureUrl.startsWith('blob:')) {
    try {
      user.signatureUrl = await getSignatureOrStampUrl(user.signatureUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública da assinatura:', error);
    }
  }
  if (user.stampUrl && !user.stampUrl.startsWith('http') && !user.stampUrl.startsWith('data:') && !user.stampUrl.startsWith('blob:')) {
    try {
      user.stampUrl = await getSignatureOrStampUrl(user.stampUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública do carimbo:', error);
    }
  }
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Erro ao buscar usuário por email:', error);
    throw error;
  }

  if (!data) return null;

  const user = mapUserFromDb(data);
  // Resolver URLs do Storage se necessário
  if (user.signatureUrl && !user.signatureUrl.startsWith('http') && !user.signatureUrl.startsWith('data:') && !user.signatureUrl.startsWith('blob:')) {
    try {
      user.signatureUrl = await getSignatureOrStampUrl(user.signatureUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública da assinatura:', error);
    }
  }
  if (user.stampUrl && !user.stampUrl.startsWith('http') && !user.stampUrl.startsWith('data:') && !user.stampUrl.startsWith('blob:')) {
    try {
      user.stampUrl = await getSignatureOrStampUrl(user.stampUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública do carimbo:', error);
    }
  }
  return user;
}

export async function getUserByAuthId(authUserId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Erro ao buscar usuário por auth_user_id:', error);
    throw error;
  }

  if (!data) return null;

  const user = mapUserFromDb(data);
  // Resolver URLs do Storage se necessário
  if (user.signatureUrl && !user.signatureUrl.startsWith('http') && !user.signatureUrl.startsWith('data:') && !user.signatureUrl.startsWith('blob:')) {
    try {
      user.signatureUrl = await getSignatureOrStampUrl(user.signatureUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública da assinatura:', error);
    }
  }
  if (user.stampUrl && !user.stampUrl.startsWith('http') && !user.stampUrl.startsWith('data:') && !user.stampUrl.startsWith('blob:')) {
    try {
      user.stampUrl = await getSignatureOrStampUrl(user.stampUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública do carimbo:', error);
    }
  }
  return user;
}

export async function createUser(user: {
  name: string;
  email: string;
  role: UserRole;
  department?: Department;
  signatureUrl?: string;
  stampUrl?: string;
  password?: string; // Senha para criar no Supabase Auth
}): Promise<User> {
  let authUserId: string | undefined;

  // Se uma senha foi fornecida, criar usuário no Supabase Auth primeiro
  if (user.password) {
    const { data: authData, error: authError } = await signUp(user.email, user.password, { name: user.name });
    
    if (authError) {
      console.error('Erro ao criar usuário no Supabase Auth:', authError);
      throw new Error(`Erro ao criar conta: ${authError.message}`);
    }

    if (authData?.user) {
      authUserId = authData.user.id;
    }
  }

  // Criar usuário na tabela users
  const { data, error } = await supabase
    .from('users')
    .insert({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || null,
      signature_url: user.signatureUrl || null,
      stamp_url: user.stampUrl || null,
      auth_user_id: authUserId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar usuário:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    // Se criou no Auth mas falhou na tabela, tentar limpar
    if (authUserId) {
      console.warn('Usuário criado no Auth mas falhou na tabela. Limpando...');
      // Não vamos deletar do Auth automaticamente, deixar para o admin
    }
    
    // Mensagem mais amigável para erro 401
    if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('401')) {
      throw new Error('Erro de permissão (401): As políticas RLS estão bloqueando a operação. Execute o script supabase/auth-integration.sql no Supabase.');
    }
    
    throw error;
  }

  const createdUser = mapUserFromDb(data);
  // Resolver URLs do Storage se necessário
  if (createdUser.signatureUrl && !createdUser.signatureUrl.startsWith('http') && !createdUser.signatureUrl.startsWith('data:') && !createdUser.signatureUrl.startsWith('blob:')) {
    try {
      createdUser.signatureUrl = await getSignatureOrStampUrl(createdUser.signatureUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública da assinatura:', error);
    }
  }
  if (createdUser.stampUrl && !createdUser.stampUrl.startsWith('http') && !createdUser.stampUrl.startsWith('data:') && !createdUser.stampUrl.startsWith('blob:')) {
    try {
      createdUser.stampUrl = await getSignatureOrStampUrl(createdUser.stampUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública do carimbo:', error);
    }
  }
  return createdUser;
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.department !== undefined) updateData.department = updates.department || null;
  if (updates.signatureUrl !== undefined) updateData.signature_url = updates.signatureUrl || null;
  if (updates.stampUrl !== undefined) updateData.stamp_url = updates.stampUrl || null;
  if (updates.authUserId !== undefined) updateData.auth_user_id = updates.authUserId || null;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }

  const user = mapUserFromDb(data);
  // Resolver URLs do Storage se necessário
  if (user.signatureUrl && !user.signatureUrl.startsWith('http') && !user.signatureUrl.startsWith('data:') && !user.signatureUrl.startsWith('blob:')) {
    try {
      user.signatureUrl = await getSignatureOrStampUrl(user.signatureUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública da assinatura:', error);
    }
  }
  if (user.stampUrl && !user.stampUrl.startsWith('http') && !user.stampUrl.startsWith('data:') && !user.stampUrl.startsWith('blob:')) {
    try {
      user.stampUrl = await getSignatureOrStampUrl(user.stampUrl);
    } catch (error) {
      console.warn('Erro ao obter URL pública do carimbo:', error);
    }
  }
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar usuário:', error);
    throw error;
  }
}

function mapUserFromDb(dbUser: any): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: dbUser.department || undefined,
    signatureUrl: dbUser.signature_url || undefined,
    stampUrl: dbUser.stamp_url || undefined,
  };
}

// ==================== AREAS ====================

export async function getAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar áreas:', error);
    throw error;
  }

  return (data || []).map(mapAreaFromDb);
}

export async function createArea(area: { name: string; code: string; description?: string }): Promise<Area> {
  const { data, error } = await supabase
    .from('areas')
    .insert({
      name: area.name,
      code: area.code,
      description: area.description || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar área:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    // Mensagem mais amigável para erro 401
    if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('401')) {
      throw new Error('Erro de permissão (401): As políticas RLS estão bloqueando a operação. Execute o script supabase/disable-rls-temporarily.sql ou supabase/enable-rls-with-open-policies.sql no Supabase.');
    }
    
    throw error;
  }

  return mapAreaFromDb(data);
}

export async function updateArea(id: string, updates: Partial<Omit<Area, 'id' | 'createdAt'>>): Promise<Area> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.code !== undefined) updateData.code = updates.code;
  if (updates.description !== undefined) updateData.description = updates.description || null;

  const { data, error } = await supabase
    .from('areas')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar área:', error);
    throw error;
  }

  return mapAreaFromDb(data);
}

export async function deleteArea(id: string): Promise<void> {
  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar área:', error);
    throw error;
  }
}

function mapAreaFromDb(dbArea: any): Area {
  return {
    id: dbArea.id,
    name: dbArea.name,
    code: dbArea.code,
    description: dbArea.description || undefined,
    createdAt: dbArea.created_at,
    updatedAt: dbArea.updated_at,
  };
}

// ==================== DOCUMENTS ====================

export async function getDocuments(): Promise<Document[]> {
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (docsError) {
    console.error('Erro ao buscar documentos:', docsError);
    throw docsError;
  }

  if (!documents || documents.length === 0) {
    return [];
  }

  // Buscar ações e assinaturas para cada documento
  const documentIds = documents.map((d) => d.id);

  const [actionsResult, signaturesResult] = await Promise.all([
    supabase
      .from('document_actions')
      .select('*')
      .in('document_id', documentIds)
      .order('timestamp', { ascending: true }),
    supabase
      .from('document_signatures')
      .select('*')
      .in('document_id', documentIds)
      .order('timestamp', { ascending: true }),
  ]);

  if (actionsResult.error) {
    console.error('Erro ao buscar ações dos documentos:', actionsResult.error);
  }
  if (signaturesResult.error) {
    console.error('Erro ao buscar assinaturas dos documentos:', signaturesResult.error);
  }

  const actions = actionsResult.data || [];
  const signatures = signaturesResult.data || [];

  return documents.map((doc) => ({
    ...mapDocumentFromDb(doc),
    history: actions
      .filter((a) => a.document_id === doc.id)
      .map(mapActionFromDb),
    signatures: signatures
      .filter((s) => s.document_id === doc.id)
      .map(mapSignatureFromDb),
  }));
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (docError) {
    if (docError.code === 'PGRST116') return null;
    console.error('Erro ao buscar documento:', docError);
    throw docError;
  }

  if (!doc) return null;

  // Buscar ações e assinaturas
  const [actionsResult, signaturesResult] = await Promise.all([
    supabase
      .from('document_actions')
      .select('*')
      .eq('document_id', id)
      .order('timestamp', { ascending: true }),
    supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', id)
      .order('timestamp', { ascending: true }),
  ]);

  return {
    ...mapDocumentFromDb(doc),
    history: (actionsResult.data || []).map(mapActionFromDb),
    signatures: (signaturesResult.data || []).map(mapSignatureFromDb),
  };
}

export async function createDocument(doc: {
  title: string;
  type: DocumentType;
  description: string;
  fileName: string;
  createdBy: string;
  createdByName: string;
  createdByRole: UserRole;
  createdByDepartment?: Department;
  status: DocumentStatus;
  originalPdfStoragePath?: string; // Caminho do PDF no Storage
}): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: doc.title,
      type: doc.type,
      description: doc.description,
      file_name: doc.fileName,
      original_pdf_storage_path: doc.originalPdfStoragePath || null,
      created_by: doc.createdBy,
      created_by_name: doc.createdByName,
      created_by_role: doc.createdByRole,
      created_by_department: doc.createdByDepartment || null,
      status: doc.status,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar documento:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    console.error('Dados enviados:', {
      title: doc.title,
      type: doc.type,
      description: doc.description,
      file_name: doc.fileName,
      original_pdf_storage_path: doc.originalPdfStoragePath || null,
      created_by: doc.createdBy,
      created_by_name: doc.createdByName,
      created_by_role: doc.createdByRole,
      created_by_department: doc.createdByDepartment || null,
      status: doc.status,
    });
    throw error;
  }

  return {
    ...mapDocumentFromDb(data),
    history: [],
    signatures: [],
  };
}

export async function updateDocument(id: string, updates: {
  status?: DocumentStatus;
  signedPdfUrl?: string;
  signedPdfStoragePath?: string;
  originalPdfStoragePath?: string;
}): Promise<Document> {
  const updateData: any = {};
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.signedPdfUrl !== undefined) updateData.signed_pdf_url = updates.signedPdfUrl || null;
  if (updates.signedPdfStoragePath !== undefined) updateData.signed_pdf_storage_path = updates.signedPdfStoragePath || null;
  if (updates.originalPdfStoragePath !== undefined) updateData.original_pdf_storage_path = updates.originalPdfStoragePath || null;
  if (updates.originalPdfStoragePath !== undefined) updateData.original_pdf_storage_path = updates.originalPdfStoragePath || null;

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar documento:', error);
    throw error;
  }

  // Buscar ações e assinaturas atualizadas
  const [actionsResult, signaturesResult] = await Promise.all([
    supabase
      .from('document_actions')
      .select('*')
      .eq('document_id', id)
      .order('timestamp', { ascending: true }),
    supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', id)
      .order('timestamp', { ascending: true }),
  ]);

  return {
    ...mapDocumentFromDb(data),
    history: (actionsResult.data || []).map(mapActionFromDb),
    signatures: (signaturesResult.data || []).map(mapSignatureFromDb),
  };
}

export async function addDocumentAction(action: {
  documentId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  comment?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('document_actions')
    .insert({
      document_id: action.documentId,
      user_id: action.userId,
      user_name: action.userName,
      user_role: action.userRole,
      action: action.action,
      comment: action.comment || null,
    });

  if (error) {
    console.error('Erro ao adicionar ação ao documento:', error);
    throw error;
  }
}

export async function addDocumentSignature(signature: {
  documentId: string;
  userId: string;
  userName: string;
  role: UserRole;
  signatureUrl?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('document_signatures')
    .insert({
      document_id: signature.documentId,
      user_id: signature.userId,
      user_name: signature.userName,
      role: signature.role,
      signature_url: signature.signatureUrl || null,
    });

  if (error) {
    console.error('Erro ao adicionar assinatura ao documento:', error);
    throw error;
  }
}

function mapDocumentFromDb(dbDoc: any): Omit<Document, 'history' | 'signatures'> {
  // Priorizar Storage path se existir, senão usar signed_pdf_url
  let signedPdfUrl = dbDoc.signed_pdf_url || undefined;
  if (dbDoc.signed_pdf_storage_path) {
    // Marcar como referência ao Storage (será resolvida quando necessário)
    signedPdfUrl = `storage:${dbDoc.signed_pdf_storage_path}`;
  }

  return {
    id: dbDoc.id,
    title: dbDoc.title,
    type: dbDoc.type,
    description: dbDoc.description,
    fileName: dbDoc.file_name,
    originalPdfStoragePath: dbDoc.original_pdf_storage_path || undefined,
    signedPdfUrl,
    signedPdfStoragePath: dbDoc.signed_pdf_storage_path || undefined,
    createdBy: dbDoc.created_by,
    createdByName: dbDoc.created_by_name,
    createdByRole: dbDoc.created_by_role,
    createdByDepartment: dbDoc.created_by_department || undefined,
    status: dbDoc.status,
    createdAt: dbDoc.created_at,
    updatedAt: dbDoc.updated_at,
  };
}

function mapActionFromDb(dbAction: any) {
  return {
    id: dbAction.id,
    documentId: dbAction.document_id,
    userId: dbAction.user_id,
    userName: dbAction.user_name,
    userRole: dbAction.user_role,
    action: dbAction.action,
    comment: dbAction.comment || undefined,
    timestamp: dbAction.timestamp,
  };
}

function mapSignatureFromDb(dbSignature: any) {
  return {
    userId: dbSignature.user_id,
    userName: dbSignature.user_name,
    role: dbSignature.role,
    timestamp: dbSignature.timestamp,
    signatureUrl: dbSignature.signature_url || undefined,
  };
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Erro ao buscar notificações:', error);
    throw error;
  }

  return (data || []).map(mapNotificationFromDb);
}

export async function createNotification(notification: {
  userId: string;
  message: string;
  documentId: string;
}): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.userId,
      message: notification.message,
      document_id: notification.documentId,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }

  return mapNotificationFromDb(data);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw error;
  }
}

function mapNotificationFromDb(dbNotif: any): Notification {
  return {
    id: dbNotif.id,
    userId: dbNotif.user_id,
    message: dbNotif.message,
    documentId: dbNotif.document_id,
    read: dbNotif.read,
    timestamp: dbNotif.timestamp,
  };
}

// ==================== STORAGE (PDFs, Assinaturas e Carimbos) ====================

const STORAGE_BUCKET = 'documents';
const SIGNATURES_FOLDER = 'signatures';
const STAMPS_FOLDER = 'stamps';

/**
 * Faz upload de um PDF original para o Supabase Storage
 * @param documentId - ID do documento
 * @param file - Arquivo PDF (File object)
 * @returns Caminho do arquivo no Storage
 */
export async function uploadOriginalPdf(
  documentId: string,
  file: File
): Promise<string> {
  const filePath = `${documentId}/${file.name}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: true, // Substituir se já existir
    });

  if (error) {
    console.error('Erro ao fazer upload do PDF original:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      statusCode: (error as any).statusCode,
    });
    throw error;
  }

  console.log('PDF original enviado com sucesso:', filePath);
  return filePath;
}

/**
 * Faz upload de um PDF assinado para o Supabase Storage
 * @param documentId - ID do documento
 * @param pdfBytes - Bytes do PDF
 * @param fileName - Nome do arquivo (opcional)
 * @returns Caminho do arquivo no Storage
 */
export async function uploadSignedPdf(
  documentId: string,
  pdfBytes: Uint8Array,
  fileName?: string
): Promise<string> {
  const filePath = `${documentId}/${fileName || `signed_${Date.now()}.pdf`}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true, // Substituir se já existir
    });

  if (error) {
    console.error('Erro ao fazer upload do PDF assinado:', error);
    console.error('Detalhes do erro:', {
      message: error.message,
      statusCode: (error as any).statusCode,
    });
    throw error;
  }

  console.log('PDF assinado enviado com sucesso:', filePath);
  return filePath;
}

/**
 * Obtém a URL pública de um PDF armazenado no Storage
 * @param filePath - Caminho do arquivo no Storage
 * @returns URL pública do arquivo
 */
export async function getSignedPdfUrl(filePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Faz upload de uma assinatura para o Supabase Storage
 * @param userId - ID do usuário
 * @param file - Arquivo de imagem (PNG)
 * @returns Caminho do arquivo no Storage
 */
export async function uploadSignature(userId: string, file: File): Promise<string> {
  const filePath = `${SIGNATURES_FOLDER}/${userId}/${file.name || `signature_${Date.now()}.png`}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      contentType: 'image/png',
      upsert: true, // Substituir se já existir
    });

  if (error) {
    console.error('Erro ao fazer upload da assinatura:', error);
    throw error;
  }

  console.log('Assinatura enviada com sucesso:', filePath);
  return filePath;
}

/**
 * Faz upload de um carimbo para o Supabase Storage
 * @param userId - ID do usuário
 * @param file - Arquivo de imagem (PNG)
 * @returns Caminho do arquivo no Storage
 */
export async function uploadStamp(userId: string, file: File): Promise<string> {
  const filePath = `${STAMPS_FOLDER}/${userId}/${file.name || `stamp_${Date.now()}.png`}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      contentType: 'image/png',
      upsert: true, // Substituir se já existir
    });

  if (error) {
    console.error('Erro ao fazer upload do carimbo:', error);
    throw error;
  }

  console.log('Carimbo enviado com sucesso:', filePath);
  return filePath;
}

/**
 * Obtém a URL pública de uma assinatura ou carimbo armazenado no Storage
 * @param filePath - Caminho do arquivo no Storage
 * @returns URL pública do arquivo
 */
export async function getSignatureOrStampUrl(filePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Deleta uma assinatura ou carimbo do Storage
 * @param filePath - Caminho do arquivo no Storage
 */
export async function deleteSignatureOrStamp(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Erro ao deletar assinatura/carimbo:', error);
    throw error;
  }
}

/**
 * Faz download de um PDF do Storage
 * @param filePath - Caminho do arquivo no Storage
 * @returns Bytes do PDF
 */
export async function downloadSignedPdf(filePath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(filePath);

  if (error) {
    console.error('Erro ao fazer download do PDF:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Arquivo não encontrado no Storage');
  }

  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Deleta um PDF do Storage
 * @param filePath - Caminho do arquivo no Storage
 */
export async function deleteSignedPdf(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error('Erro ao deletar PDF:', error);
    throw error;
  }
}
