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
  assignedToConselhoUserId?: string | null;
  assignedToAllConselho?: boolean;
  conselhoSignaturesRequired?: number;
  conselhoSignaturesReceived?: number;
}): Promise<Document> {
  console.log('🔵 updateDocument chamado:', { id, updates });
  
  // 1. Validar UUID
  if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const error = new Error(`ID inválido: deve ser um UUID válido. Recebido: ${id}`);
    console.error('❌', error.message);
    throw error;
  }

  // 2. Construir payload apenas com campos válidos e não-undefined
  const updateData: Record<string, any> = {};
  
  // 3. Validar e adicionar status (enum)
  if (updates.status !== undefined) {
    const validStatuses = ['pendente_secretaria', 'pendente_conselho', 'aprovado', 'rejeitado', 'finalizado'];
    if (!validStatuses.includes(updates.status)) {
      const error = new Error(`Status inválido: ${updates.status}. Deve ser um dos: ${validStatuses.join(', ')}`);
      console.error('❌', error.message);
      throw error;
    }
    updateData.status = updates.status;
    console.log('✅ Status validado e adicionado:', updates.status);
  }
  
  // 4. Adicionar signed_pdf_url (snake_case para o banco)
  // IMPORTANTE: Não enviar data URLs muito grandes - usar apenas storage path
  if (updates.signedPdfUrl !== undefined) {
    if (updates.signedPdfUrl === null || updates.signedPdfUrl === '') {
      updateData.signed_pdf_url = null;
    } else if (typeof updates.signedPdfUrl === 'string') {
      // Se for data URL muito grande (>100KB), não enviar (usar apenas storage path)
      if (updates.signedPdfUrl.startsWith('data:') && updates.signedPdfUrl.length > 100000) {
        console.warn('⚠️ signedPdfUrl é uma data URL muito grande, não enviando (usar apenas storage path)');
        updateData.signed_pdf_url = null; // Não enviar data URL muito grande
      } else {
        updateData.signed_pdf_url = updates.signedPdfUrl;
      }
    }
  }
  
  // 5. Adicionar signed_pdf_storage_path
  if (updates.signedPdfStoragePath !== undefined) {
    updateData.signed_pdf_storage_path = (updates.signedPdfStoragePath && updates.signedPdfStoragePath.trim() !== '') 
      ? updates.signedPdfStoragePath 
      : null;
  }
  
  // 6. Adicionar original_pdf_storage_path
  // IMPORTANTE: Só adicionar se for explicitamente definido (undefined = não atualizar, null = limpar, string = atualizar)
  if (updates.originalPdfStoragePath !== undefined) {
    if (updates.originalPdfStoragePath === null || updates.originalPdfStoragePath === '') {
      updateData.original_pdf_storage_path = null;
    } else if (typeof updates.originalPdfStoragePath === 'string' && updates.originalPdfStoragePath.trim() !== '') {
      updateData.original_pdf_storage_path = updates.originalPdfStoragePath.trim();
    } else {
      // Valor inválido, não incluir
      console.warn('⚠️ originalPdfStoragePath tem valor inválido, não incluindo no update');
    }
  }

  // 7. Adicionar campos de atribuição de conselho
  if (updates.assignedToConselhoUserId !== undefined) {
    updateData.assigned_to_conselho_user_id = (updates.assignedToConselhoUserId && updates.assignedToConselhoUserId.trim() !== '') 
      ? updates.assignedToConselhoUserId 
      : null;
  }
  
  if (updates.assignedToAllConselho !== undefined) {
    updateData.assigned_to_all_conselho = Boolean(updates.assignedToAllConselho);
  }
  
  if (updates.conselhoSignaturesRequired !== undefined) {
    updateData.conselho_signatures_required = Math.max(1, Math.floor(updates.conselhoSignaturesRequired));
  }
  
  if (updates.conselhoSignaturesReceived !== undefined) {
    updateData.conselho_signatures_received = Math.max(0, Math.floor(updates.conselhoSignaturesReceived));
  }

  // 7. Garantir que há pelo menos um campo para atualizar
  if (Object.keys(updateData).length === 0) {
    console.warn('⚠️ Nenhum campo para atualizar');
    return await getDocumentById(id) || Promise.reject(new Error('Documento não encontrado'));
  }

  // 8. Remover qualquer undefined que possa ter escapado e validar valores
  const finalUpdateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(updateData)) {
    // Pular valores undefined
    if (value === undefined) {
      console.warn(`⚠️ Pulando campo undefined: ${key}`);
      continue;
    }
    
    // Validar tipos
    if (key === 'status') {
      if (typeof value !== 'string') {
        const error = new Error(`Campo 'status' deve ser string, recebido: ${typeof value}`);
        console.error('❌', error.message);
        throw error;
      }
      finalUpdateData[key] = value;
    } else if (key.includes('_url') || key.includes('_path')) {
      // URLs e paths podem ser null ou string
      if (value === null) {
        finalUpdateData[key] = null;
      } else if (typeof value === 'string') {
        // Remover espaços em branco e verificar se não está vazio
        const trimmed = value.trim();
        if (trimmed === '') {
          finalUpdateData[key] = null;
        } else {
          finalUpdateData[key] = trimmed;
        }
      } else {
        const error = new Error(`Campo '${key}' deve ser string ou null, recebido: ${typeof value} (${value})`);
        console.error('❌', error.message);
        throw error;
      }
    } else {
      // Outros campos
      finalUpdateData[key] = value;
    }
  }

  // 9. Garantir que há pelo menos um campo válido
  if (Object.keys(finalUpdateData).length === 0) {
    console.warn('⚠️ Nenhum campo válido para atualizar após validação');
    return await getDocumentById(id) || Promise.reject(new Error('Documento não encontrado'));
  }

  // 10. Status não é obrigatório - pode atualizar apenas outros campos (ex: originalPdfStoragePath)
  // O status só é necessário quando estamos mudando o status do documento
  // Se não há status no payload, significa que estamos atualizando apenas outros campos

  console.log('🚀 Enviando PATCH ao Supabase:', {
    id,
    updatePayloadOriginal: JSON.stringify(updateData, null, 2),
    updatePayloadFinal: JSON.stringify(finalUpdateData, null, 2),
    keys: Object.keys(finalUpdateData),
    statusValue: finalUpdateData.status,
    hasStatus: !!finalUpdateData.status,
  });

  try {
    // Validar estrutura final antes de enviar
    const payloadToSend = JSON.parse(JSON.stringify(finalUpdateData)); // Deep clone para garantir que não há referências
    
    console.log('📤 Payload final a ser enviado:', {
      id,
      payload: JSON.stringify(payloadToSend, null, 2),
      keys: Object.keys(payloadToSend),
      types: Object.fromEntries(
        Object.entries(payloadToSend).map(([k, v]) => [k, typeof v])
      ),
    });

    const { data, error } = await supabase
      .from('documents')
      .update(payloadToSend)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar documento:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        id,
        updatePayloadOriginal: JSON.stringify(updateData, null, 2),
        updatePayloadFinal: JSON.stringify(finalUpdateData, null, 2),
        payloadEnviado: JSON.stringify(payloadToSend, null, 2),
      });
      
      // Mensagens de erro específicas
      if (error.code === 'PGRST116') {
        throw new Error('Documento não encontrado');
      } else if (error.code === '42501') {
        throw new Error('Erro de permissão (RLS). Verifique as políticas do Supabase.');
      } else if (error.code === '23505') {
        throw new Error('Violação de constraint única');
      } else if (error.code === '23503') {
        throw new Error('Violação de chave estrangeira');
      } else if (error.code === 'PGRST301' || error.code === '400') {
        throw new Error(`Requisição inválida (400): ${error.message}. ${error.details || ''} ${error.hint || ''}`);
      } else {
        throw new Error(`Erro ao atualizar documento: ${error.message}`);
      }
    }

    if (!data) {
      throw new Error('Documento não encontrado após atualização');
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

    console.log('✅ Documento atualizado com sucesso:', {
      id,
      status: data.status,
      hasActions: (actionsResult.data || []).length,
      hasSignatures: (signaturesResult.data || []).length,
    });

    return {
      ...mapDocumentFromDb(data),
      history: (actionsResult.data || []).map(mapActionFromDb),
      signatures: (signaturesResult.data || []).map(mapSignatureFromDb),
    };
  } catch (err: any) {
    console.error('❌ Erro inesperado ao atualizar documento:', err);
    throw err;
  }
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
    // Campos para atribuição de conselho
    assignedToConselhoUserId: dbDoc.assigned_to_conselho_user_id || undefined,
    assignedToAllConselho: dbDoc.assigned_to_all_conselho || false,
    conselhoSignaturesRequired: dbDoc.conselho_signatures_required || 1,
    conselhoSignaturesReceived: dbDoc.conselho_signatures_received || 0,
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
  console.log('🔔 Buscando notificações para usuário:', userId);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar notificações:', {
      error,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
    });
    throw error;
  }

  console.log('✅ Notificações encontradas:', (data || []).length);
  return (data || []).map(mapNotificationFromDb);
}

export async function createNotification(notification: {
  userId: string;
  message: string;
  documentId: string;
}): Promise<Notification> {
  console.log('📢 Criando notificação:', {
    userId: notification.userId,
    message: notification.message,
    documentId: notification.documentId,
  });

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
    console.error('❌ Erro ao criar notificação:', {
      error,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: notification.userId,
      documentId: notification.documentId,
    });
    throw error;
  }

  console.log('✅ Notificação criada com sucesso:', data.id);
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
 * IMPORTANTE: Usa nomenclatura especial para identificar PDFs assinados
 * Formato: {docId}/signed_{fileName} ou {docId}/signed_{timestamp}.pdf
 * @param documentId - ID do documento
 * @param pdfBytes - Bytes do PDF
 * @param fileName - Nome do arquivo original (opcional, será usado para gerar o nome assinado)
 * @returns Caminho do arquivo no Storage
 */
export async function uploadSignedPdf(
  documentId: string,
  pdfBytes: Uint8Array,
  fileName?: string
): Promise<string> {
  // Gerar nome do arquivo assinado com prefixo "signed_"
  let signedFileName: string;
  if (fileName) {
    // Se o nome já contém "signed_", manter; senão, adicionar prefixo
    if (fileName.includes('signed_')) {
      signedFileName = fileName;
    } else {
      // Extrair apenas o nome do arquivo (sem caminho) e adicionar prefixo
      const baseName = fileName.split('/').pop() || fileName;
      signedFileName = `signed_${baseName}`;
    }
  } else {
    signedFileName = `signed_${Date.now()}.pdf`;
  }
  
  const filePath = `${documentId}/${signedFileName}`;

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

  console.log('✅ PDF assinado enviado com sucesso:', filePath);
  return filePath;
}

/**
 * Verifica se um caminho de PDF indica que o arquivo já está assinado
 * @param filePath - Caminho do arquivo no Storage
 * @returns true se o arquivo está assinado (contém "signed_" no nome)
 */
export function isSignedPdfPath(filePath: string): boolean {
  if (!filePath) return false;
  const fileName = filePath.split('/').pop() || '';
  return fileName.includes('signed_');
}

/**
 * Substitui um PDF no Storage (original ou já assinado)
 * IMPORTANTE: Se o caminho não contém "signed_", cria um novo arquivo com prefixo "signed_"
 * para preservar o PDF original e identificar claramente que está assinado
 * @param existingPath - Caminho do PDF no Storage
 * @param pdfBytes - Bytes do PDF assinado
 * @returns Caminho do arquivo no Storage (pode ser diferente se criar novo arquivo assinado)
 */
export async function replaceOriginalPdf(
  existingPath: string,
  pdfBytes: Uint8Array
): Promise<string> {
  console.log('🔄 Substituindo PDF:', existingPath);

  // Se o caminho já indica que está assinado, substituir no mesmo caminho
  if (isSignedPdfPath(existingPath)) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .update(existingPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('❌ Erro ao substituir PDF assinado:', error);
      throw error;
    }

    console.log('✅ PDF assinado substituído com sucesso:', existingPath);
    return existingPath;
  }

  // Se é PDF original, criar novo arquivo assinado (preservando o original)
  const pathParts = existingPath.split('/');
  const documentId = pathParts[0];
  const originalFileName = pathParts.slice(1).join('/');
  const signedFileName = `signed_${originalFileName}`;
  const signedPath = `${documentId}/${signedFileName}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(signedPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('❌ Erro ao criar PDF assinado:', error);
    throw error;
  }

  console.log('✅ PDF assinado criado (preservando original):', signedPath);
  return signedPath;
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

  // Adicionar timestamp para evitar cache do navegador quando o arquivo é atualizado
  const url = new URL(data.publicUrl);
  url.searchParams.set('t', Date.now().toString());
  
  return url.toString();
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
