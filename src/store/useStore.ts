import { create } from 'zustand';
import { User, Document, Notification, DocumentStatus, DocumentType, Department, Area, UserRole } from '@/types';
import * as supabaseService from '@/lib/supabaseService';

interface AppState {
  user: User | null;
  documents: Document[];
  notifications: Notification[];
  users: User[];
  areas: Area[];
  loading: boolean;
  error: string | null;
  initialized: boolean; // Flag para indicar se a sessão foi verificada
  initializing: boolean; // Flag para evitar múltiplas inicializações simultâneas
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>; // Função para verificar sessão existente
  loadData: () => Promise<void>;
  createDocument: (data: { title: string; type: DocumentType; description: string; fileName: string; file?: File }) => Promise<void>;
  advanceDocument: (docId: string, action: string, comment?: string, signatureUrl?: string, signedPdfUrl?: string) => Promise<void>;
  rejectDocument: (docId: string, justification: string) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  updateSignature: (url: string) => Promise<void>;
  updateStamp: (url: string) => Promise<void>;
  // Master user management functions
  createUser: (data: { name: string; email: string; role: UserRole; department?: Department }) => Promise<void>;
  updateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  createArea: (data: { name: string; code: string; description?: string }) => Promise<void>;
  updateArea: (areaId: string, data: Partial<Omit<Area, 'id' | 'createdAt'>>) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  documents: [],
  notifications: [],
  users: [],
  areas: [],
  loading: false,
  error: null,
  initialized: false,
  initializing: false,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      
      // Autenticar com Supabase Auth
      const { data: authData, error: authError } = await supabaseService.signInWithPassword(email, password);
      
      if (authError || !authData?.user) {
        set({ loading: false, error: authError?.message || 'Credenciais inválidas' });
        return false;
      }

      // Buscar dados do usuário na tabela users
      const user = await supabaseService.getUserByAuthId(authData.user.id);
      
      if (!user) {
        // Se o usuário não existe na tabela users, tentar buscar por email
        const userByEmail = await supabaseService.getUserByEmail(email);
        if (userByEmail) {
          // Vincular o auth_user_id
          await supabaseService.updateUser(userByEmail.id, { authUserId: authData.user.id });
          set({ user: { ...userByEmail, authUserId: authData.user.id }, loading: false, initialized: true });
        } else {
          set({ loading: false, error: 'Usuário não encontrado no sistema' });
          return false;
        }
      } else {
        set({ user, loading: false, initialized: true });
      }
      
      // Carregar dados após login (sem await para não bloquear)
      get().loadData().catch(err => {
        console.error('Erro ao carregar dados após login:', err);
      });
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      set({ error: error instanceof Error ? error.message : 'Erro ao fazer login', loading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      // Limpar estado primeiro para evitar loops
      set({ 
        user: null, 
        documents: [], 
        notifications: [], 
        users: [], 
        areas: [],
        initialized: true, // Manter inicializado para evitar loops
        initializing: false
      });
      // Depois fazer signOut (que pode disparar onAuthStateChange)
      await supabaseService.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo se falhar, garantir que está inicializado
      set({ initialized: true, initializing: false });
    }
  },

  initializeSession: async () => {
    // Evitar múltiplas inicializações simultâneas
    if (get().initializing) {
      console.log('Inicialização já em andamento, aguardando...');
      // Aguardar a inicialização atual terminar
      return new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!get().initializing) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        // Timeout de segurança
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
    }

    // Se já está inicializado, não precisa fazer nada
    // A verificação de sessão já foi feita
    if (get().initialized) {
      console.log('Sessão já inicializada, pulando...');
      return;
    }

    try {
      set({ loading: true, error: null, initializing: true });
      console.log('Iniciando verificação de sessão...');

      // Verificar se há uma sessão ativa do Supabase Auth
      // Usar getSession() que é mais rápido (não faz requisição ao servidor)
      const authUser = await supabaseService.getCurrentAuthUser();

      console.log('Usuário Auth:', authUser ? authUser.email : 'Nenhum');

      if (authUser) {
        // Buscar dados do usuário na tabela users
        // Usar Promise.allSettled para não bloquear se uma query falhar
        const [userByAuthId, userByEmail] = await Promise.allSettled([
          supabaseService.getUserByAuthId(authUser.id),
          authUser.email ? supabaseService.getUserByEmail(authUser.email) : Promise.resolve(null),
        ]);

        let user: User | null = null;

        // Tentar usar resultado de getUserByAuthId primeiro
        if (userByAuthId.status === 'fulfilled' && userByAuthId.value) {
          user = userByAuthId.value;
        } 
        // Se não encontrou, tentar por email
        else if (userByEmail.status === 'fulfilled' && userByEmail.value) {
          user = userByEmail.value;
          // Vincular o auth_user_id
          try {
            await supabaseService.updateUser(user.id, { authUserId: authUser.id });
            user = { ...user, authUserId: authUser.id };
          } catch (updateError) {
            console.error('Erro ao vincular auth_user_id:', updateError);
            // Continuar mesmo se falhar a vinculação
            user = { ...user, authUserId: authUser.id };
          }
        }

        if (user) {
          console.log('Usuário restaurado:', user.email);
          set({ user, loading: false, initialized: true, initializing: false });
          // Carregar dados após restaurar sessão (sem await para não bloquear)
          get().loadData().catch(err => {
            console.error('Erro ao carregar dados após restaurar sessão:', err);
          });
        } else {
          console.warn('Usuário autenticado não encontrado na tabela users');
          set({ loading: false, initialized: true, initializing: false });
        }
      } else {
        // Não há sessão ativa - marcar como inicializado imediatamente
        console.log('Nenhuma sessão ativa encontrada');
        // Garantir que não há usuário
        if (get().user) {
          set({ user: null, loading: false, initialized: true, initializing: false });
        } else {
          set({ loading: false, initialized: true, initializing: false });
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar sessão:', error);
      // Sempre marcar como inicializado para evitar loop infinito
      // Mesmo em caso de erro, permitir que o usuário continue
      set({ 
        error: error instanceof Error ? error.message : 'Erro ao verificar sessão', 
        loading: false, 
        initialized: true,
        initializing: false
      });
    }
  },

  loadData: async () => {
    try {
      set({ loading: true, error: null });
      const user = get().user;
      
      // Timeout para evitar travamento
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar dados')), 15000)
      );

      const dataPromise = Promise.all([
        supabaseService.getDocuments(),
        supabaseService.getUsers(),
        supabaseService.getAreas(),
      ]);

      const [documents, users, areas] = await Promise.race([dataPromise, timeoutPromise]) as [Document[], User[], Area[]];

      let notifications: Notification[] = [];
      if (user) {
        try {
          notifications = await supabaseService.getNotifications(user.id);
        } catch (notifError) {
          console.error('Erro ao carregar notificações:', notifError);
          // Continuar mesmo se notificações falharem
        }
      }

      set({ documents, users, areas, notifications, loading: false });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      set({ error: error instanceof Error ? error.message : 'Erro ao carregar dados', loading: false });
    }
  },

  createDocument: async (data) => {
    try {
      const user = get().user;
      if (!user) return;

      set({ loading: true, error: null });

      // Areas send to Secretaria Geral; Secretaria Geral sends directly to Conselho
      const initialStatus: DocumentStatus =
        user.role === 'secretaria_geral' ? 'pendente_conselho' : 'pendente_secretaria';

      const actionLabel =
        user.role === 'secretaria_geral'
          ? 'Documento criado e enviado para Conselho de Administração'
          : 'Documento criado e enviado para Secretaria Geral';

      // Fazer upload do PDF se fornecido
      let originalPdfStoragePath: string | undefined;
      if (data.file) {
        try {
          // Primeiro criar o documento para obter o ID
          const tempDoc = await supabaseService.createDocument({
            ...data,
            createdBy: user.id,
            createdByName: user.name,
            createdByRole: user.role,
            createdByDepartment: user.department,
            status: initialStatus,
          });

          // Fazer upload do PDF
          originalPdfStoragePath = await supabaseService.uploadOriginalPdf(tempDoc.id, data.file);

          // Atualizar documento com o caminho do PDF
          const newDoc = await supabaseService.updateDocument(tempDoc.id, {
            originalPdfStoragePath,
          });

          // Adicionar ação inicial
          await supabaseService.addDocumentAction({
            documentId: newDoc.id,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: actionLabel,
          });

          // Buscar usuário para notificar (Secretaria Geral ou Conselho)
          const targetUsers = get().users.filter((u) =>
            user.role === 'secretaria_geral' ? u.role === 'conselho_admin' : u.role === 'secretaria_geral'
          );

          // Criar notificações
          if (targetUsers.length > 0) {
            await supabaseService.createNotification({
              userId: targetUsers[0].id,
              message: `Novo documento recebido: ${data.title}`,
              documentId: newDoc.id,
            });
          }

          // Recarregar dados
          await get().loadData();
          set({ loading: false });
          return;
        } catch (uploadError) {
          console.error('Erro ao fazer upload do PDF:', uploadError);
          // Continuar sem o PDF se o upload falhar
        }
      }

      // Criar documento no Supabase (sem PDF ou se upload falhou)
      const newDoc = await supabaseService.createDocument({
        ...data,
        createdBy: user.id,
        createdByName: user.name,
        createdByRole: user.role,
        createdByDepartment: user.department,
        status: initialStatus,
        originalPdfStoragePath,
      });

      // Adicionar ação inicial
      await supabaseService.addDocumentAction({
        documentId: newDoc.id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: actionLabel,
      });

      // Buscar usuário para notificar (Secretaria Geral ou Conselho)
      const targetUsers = get().users.filter((u) =>
        user.role === 'secretaria_geral' ? u.role === 'conselho_admin' : u.role === 'secretaria_geral'
      );

      // Criar notificações
      if (targetUsers.length > 0) {
        await supabaseService.createNotification({
          userId: targetUsers[0].id,
          message: `Novo documento recebido: ${data.title}`,
          documentId: newDoc.id,
        });
      }

      // Recarregar dados
      await get().loadData();
    } catch (error) {
      console.error('Erro ao criar documento:', error);
      set({ error: 'Erro ao criar documento', loading: false });
    }
  },

      advanceDocument: async (docId, action, comment, signatureUrl, signedPdfUrl) => {
        console.log('🚀 advanceDocument INICIADO:', { docId, action, hasSignatureUrl: !!signatureUrl, hasSignedPdfUrl: !!signedPdfUrl });
        try {
          const user = get().user;
          if (!user) {
            console.error('❌ Usuário não autenticado');
            return;
          }

          set({ loading: true, error: null });

          const doc = get().documents.find((d) => d.id === docId);
          if (!doc) {
            console.error('❌ Documento não encontrado:', docId);
            return;
          }
          
          console.log('📄 Documento encontrado:', { id: doc.id, status: doc.status, title: doc.title });

      let nextStatus: DocumentStatus = doc.status;
      let addSignature = false;

      console.log('advanceDocument - Estado inicial:', {
        userId: user.id,
        userRole: user.role,
        docId: docId,
        currentStatus: doc.status,
        hasSignatures: doc.signatures?.length || 0,
      });

      // Secretaria Geral forwards to Conselho (se documento ainda não foi assinado)
      if (user.role === 'secretaria_geral' && doc.status === 'pendente_secretaria') {
        // Verificar se já foi assinado pelo conselho
        const hasConselhoSignature = doc.signatures && doc.signatures.some(sig => sig.role === 'conselho_admin');
        if (hasConselhoSignature) {
          // Se já foi assinado, finalizar
          nextStatus = 'finalizado';
          // Atualizar ação se não foi fornecida
          if (!action || action.trim() === '') {
            action = 'Documento finalizado pela Secretaria Geral';
          }
          console.log('Secretaria finalizando documento já assinado');
        } else {
          // Se não foi assinado, encaminhar para conselho
          nextStatus = 'pendente_conselho';
          // Atualizar ação se não foi fornecida
          if (!action || action.trim() === '') {
            action = 'Documento encaminhado para Conselho de Administração';
          }
          console.log('Secretaria encaminhando para conselho');
        }
      }
      // Conselho approves and signs → finaliza o documento
      else if (user.role === 'conselho_admin' && doc.status === 'pendente_conselho') {
        nextStatus = 'finalizado'; // Finaliza após assinatura do conselho
        addSignature = true;
        // Atualizar ação para refletir que foi finalizado
        if (!action || action === 'Aprovado e assinado') {
          action = 'Documento aprovado, assinado e finalizado pelo Conselho de Administração';
        }
        console.log('Conselho assinando - mudando status para finalizado');
      } else {
        console.warn('Nenhuma condição de atualização de status atendida:', {
          userRole: user.role,
          docStatus: doc.status,
        });
      }

      // Se houver PDF assinado (data URL), fazer upload para o Storage
      let signedPdfStoragePath: string | undefined;
      let originalPdfStoragePath: string | undefined = doc.originalPdfStoragePath;
      
      if (signedPdfUrl && signedPdfUrl.startsWith('data:') && addSignature) {
        try {
          // Converter data URL para bytes
          const base64 = signedPdfUrl.split(',')[1];
          if (base64) {
            const pdfBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            
            // Se o documento já tem um PDF original, substituir usando o mesmo caminho
            // IMPORTANTE: Isso elimina o PDF não assinado, substituindo-o pelo assinado
            if (doc.originalPdfStoragePath) {
              // Substituir o PDF original pelo assinado no mesmo caminho
              // Isso elimina o PDF não assinado e mantém apenas o assinado
              originalPdfStoragePath = await supabaseService.replaceOriginalPdf(
                doc.originalPdfStoragePath,
                pdfBytes
              );
              signedPdfStoragePath = originalPdfStoragePath; // Mesmo caminho
              console.log('✅ PDF original substituído pelo assinado no mesmo caminho:', originalPdfStoragePath);
            } else {
              // Se não houver PDF original, criar novo
              signedPdfStoragePath = await supabaseService.uploadSignedPdf(
                docId,
                pdfBytes,
                doc.fileName
              );
              originalPdfStoragePath = signedPdfStoragePath;
              console.log('✅ PDF assinado criado:', signedPdfStoragePath);
            }
            
            // Obter URL pública do Storage com cache-busting
            // IMPORTANTE: Adicionar timestamp para garantir que o navegador carregue o PDF atualizado (assinado)
            const publicUrl = await supabaseService.getSignedPdfUrl(originalPdfStoragePath);
            signedPdfUrl = publicUrl;
            console.log('✅ URL pública do PDF assinado gerada:', publicUrl);
          }
        } catch (uploadError) {
          console.error('Erro ao fazer upload do PDF:', uploadError);
          // Continuar com data URL se o upload falhar
        }
      }

      // Atualizar documento - construir payload limpo
      const updatePayload: {
        status: DocumentStatus;
        signedPdfUrl?: string;
        signedPdfStoragePath?: string;
        originalPdfStoragePath?: string;
      } = {
        status: nextStatus, // Sempre atualizar o status
      };

      // Só adicionar campos se tiverem valores definidos, não forem undefined e não forem strings vazias
      if (signedPdfUrl !== undefined && signedPdfUrl !== null && signedPdfUrl.trim() !== '') {
        // Não enviar data URLs muito grandes
        if (!signedPdfUrl.startsWith('data:') || signedPdfUrl.length <= 100000) {
          updatePayload.signedPdfUrl = signedPdfUrl.trim();
        } else {
          console.warn('⚠️ signedPdfUrl é uma data URL muito grande, não incluindo no payload');
        }
      }
      
      // Para signedPdfStoragePath, só adicionar se houver assinatura (addSignature = true)
      // IMPORTANTE: Quando o conselho assina, o PDF original é substituído pelo assinado no mesmo caminho
      // Isso elimina o PDF não assinado e mantém apenas o assinado
      if (addSignature) {
        if (signedPdfStoragePath && signedPdfStoragePath.trim() !== '') {
          updatePayload.signedPdfStoragePath = signedPdfStoragePath.trim();
          console.log('✅ signedPdfStoragePath atualizado:', signedPdfStoragePath);
        } else if (originalPdfStoragePath && originalPdfStoragePath.trim() !== '') {
          // Quando substituímos no mesmo caminho, signedPdfStoragePath = originalPdfStoragePath
          updatePayload.signedPdfStoragePath = originalPdfStoragePath.trim();
          console.log('✅ signedPdfStoragePath aponta para o mesmo caminho do original (PDF substituído):', originalPdfStoragePath);
        }
      }
      // Se não está assinando, não incluir signedPdfStoragePath no payload
      
      // Para originalPdfStoragePath, quando há assinatura:
      // - Se foi substituído no mesmo caminho, não precisa atualizar (já aponta para o PDF assinado)
      // - Se foi criado um novo caminho, atualizar
      // IMPORTANTE: Quando substituímos no mesmo caminho, o originalPdfStoragePath já aponta para o PDF assinado
      if (addSignature && originalPdfStoragePath !== undefined && originalPdfStoragePath !== null && originalPdfStoragePath.trim() !== '') {
        if (originalPdfStoragePath !== doc.originalPdfStoragePath) {
          // Novo caminho criado, atualizar
          updatePayload.originalPdfStoragePath = originalPdfStoragePath.trim();
          console.log('📝 Atualizando originalPdfStoragePath para novo caminho:', originalPdfStoragePath);
        } else {
          // Substituído no mesmo caminho - o PDF original foi eliminado e substituído pelo assinado
          // Não precisa atualizar o caminho, mas garantir que signedPdfStoragePath aponte para o mesmo lugar
          console.log('✅ PDF substituído no mesmo caminho - PDF não assinado foi eliminado');
        }
      }

      // Validar que o status é válido
      const validStatuses: DocumentStatus[] = ['pendente_secretaria', 'pendente_conselho', 'aprovado', 'rejeitado', 'finalizado'];
      if (!validStatuses.includes(nextStatus)) {
        console.error('❌ Status inválido:', nextStatus);
        throw new Error(`Status inválido: ${nextStatus}`);
      }

      // Garantir que o status está sempre presente no payload
      if (!updatePayload.status) {
        console.error('❌ Status não está presente no updatePayload!');
        updatePayload.status = nextStatus;
      }

      console.log('📝 Atualizando documento com payload:', {
        docId,
        statusAnterior: doc.status,
        statusNovo: nextStatus,
        updatePayload: {
          ...updatePayload,
          status: updatePayload.status, // Garantir que está presente
        },
        addSignature,
        signedPdfUrl: signedPdfUrl ? 'presente' : 'ausente',
        signedPdfStoragePath: (addSignature && signedPdfStoragePath) ? 'presente' : 'ausente',
        originalPdfStoragePath: originalPdfStoragePath ? 'presente' : 'ausente',
      });

      // Atualizar documento no banco
      console.log('🔄 Chamando supabaseService.updateDocument...');
      try {
        const updatedDoc = await supabaseService.updateDocument(docId, updatePayload);
        
        console.log('✅ Documento atualizado no banco:', {
          id: docId,
          statusAnterior: doc.status,
          statusNovo: nextStatus,
          statusRetornado: updatedDoc.status,
          statusCorreto: updatedDoc.status === nextStatus,
          updatePayload,
          userRole: user.role,
        });

        // Verificar se o status foi atualizado corretamente
        if (updatedDoc.status !== nextStatus) {
          console.error('⚠️ ATENÇÃO: Status não foi atualizado corretamente!', {
            esperado: nextStatus,
            retornado: updatedDoc.status,
            docId,
            userRole: user.role,
            updatePayload,
          });
          // Tentar atualizar novamente apenas o status
          try {
            console.log('🔄 Tentando corrigir status...');
            const retryDoc = await supabaseService.updateDocument(docId, { status: nextStatus });
            console.log('🔄 Tentativa de correção do status:', {
              statusEsperado: nextStatus,
              statusRetornado: retryDoc.status,
              sucesso: retryDoc.status === nextStatus,
            });
          } catch (retryError: any) {
            console.error('❌ Erro ao tentar corrigir status:', {
              error: retryError,
              message: retryError.message,
              code: retryError.code,
            });
          }
        } else {
          console.log('✅ Status atualizado corretamente!');
        }
      } catch (updateError: any) {
        console.error('❌ Erro ao atualizar documento:', {
          error: updateError,
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          docId,
          statusEsperado: nextStatus,
          statusAtual: doc.status,
          userRole: user.role,
          updatePayload: JSON.stringify(updatePayload, null, 2),
        });
        throw updateError;
      }

      // Adicionar ação ao histórico ANTES de atualizar o documento
      // Isso garante que a ação seja registrada mesmo se houver erro na atualização
      try {
        await supabaseService.addDocumentAction({
          documentId: docId,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action,
          comment,
        });
        console.log('Ação adicionada ao histórico:', { action, comment });
      } catch (actionError) {
        console.error('Erro ao adicionar ação ao histórico:', actionError);
        // Continuar mesmo se falhar ao adicionar ação
      }

      // Adicionar assinatura se necessário
      if (addSignature && signatureUrl) {
        await supabaseService.addDocumentSignature({
          documentId: docId,
          userId: user.id,
          userName: user.name,
          role: user.role,
          signatureUrl,
        });
      }

      // Criar notificação
      let targetUserId: string | undefined;
      if (nextStatus === 'pendente_conselho') {
        // Notificar conselho
        targetUserId = get().users.find((u) => u.role === 'conselho_admin')?.id;
      } else if (nextStatus === 'finalizado') {
        // Notificar criador do documento quando finalizado
        targetUserId = doc.createdBy;
      } else if (nextStatus === 'pendente_secretaria') {
        // Notificar secretaria quando documento volta para ela
        targetUserId = get().users.find((u) => u.role === 'secretaria_geral')?.id;
      } else {
        // Fallback: notificar criador
        targetUserId = doc.createdBy;
      }

      if (targetUserId) {
        await supabaseService.createNotification({
          userId: targetUserId,
          message: `Documento "${doc.title}" - ${action}`,
          documentId: docId,
        });
      }

      // Recarregar dados para atualizar a lista de documentos (após todas as operações)
      console.log('Recarregando dados após atualização do documento...');
      await get().loadData();
      
      // Verificar se o status foi atualizado corretamente
      const updatedDocAfterReload = get().documents.find((d) => d.id === docId);
      if (updatedDocAfterReload) {
        console.log('Status após recarregar:', {
          docId,
          statusEsperado: nextStatus,
          statusAtual: updatedDocAfterReload.status,
          statusCorreto: updatedDocAfterReload.status === nextStatus,
        });
        
        if (updatedDocAfterReload.status !== nextStatus) {
          console.error('⚠️ ATENÇÃO: Status não foi atualizado corretamente!', {
            esperado: nextStatus,
            atual: updatedDocAfterReload.status,
          });
        }
      } else {
        console.warn('Documento não encontrado após recarregar dados');
      }
    } catch (error) {
      console.error('Erro ao avançar documento:', error);
      set({ error: 'Erro ao avançar documento', loading: false });
    }
  },

  rejectDocument: async (docId, justification) => {
    try {
      const user = get().user;
      if (!user) return;

      set({ loading: true, error: null });

      const doc = get().documents.find((d) => d.id === docId);
      if (!doc) return;

      // Atualizar status
      await supabaseService.updateDocument(docId, {
        status: 'rejeitado',
      });

      // Adicionar ação
      await supabaseService.addDocumentAction({
        documentId: docId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'Rejeitado',
        comment: justification,
      });

      // Criar notificação
      await supabaseService.createNotification({
        userId: doc.createdBy,
        message: `Documento "${doc.title}" foi rejeitado`,
        documentId: docId,
      });

      // Recarregar dados
      await get().loadData();
    } catch (error) {
      console.error('Erro ao rejeitar documento:', error);
      set({ error: 'Erro ao rejeitar documento', loading: false });
    }
  },

  markNotificationRead: async (notifId) => {
    try {
      await supabaseService.markNotificationAsRead(notifId);
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
      }));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  },

  updateSignature: async (urlOrFile: string | File) => {
    try {
      const user = get().user;
      if (!user) return;

      set({ loading: true, error: null });

      let finalUrl: string;

      // Se for um File, fazer upload para o Storage
      if (urlOrFile instanceof File) {
        const storagePath = await supabaseService.uploadSignature(user.id, urlOrFile);
        finalUrl = await supabaseService.getSignatureOrStampUrl(storagePath);
      } 
      // Se for string vazia, remover assinatura
      else if (!urlOrFile) {
        // Se havia uma assinatura no Storage, deletar
        if (user.signatureUrl && user.signatureUrl.includes('storage.supabase.co')) {
          // Tentar extrair o caminho do Storage da URL
          try {
            const urlParts = user.signatureUrl.split('/');
            const pathIndex = urlParts.findIndex(part => part === 'signatures');
            if (pathIndex !== -1) {
              const storagePath = urlParts.slice(pathIndex).join('/');
              await supabaseService.deleteSignatureOrStamp(storagePath);
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar assinatura antiga do Storage:', deleteError);
          }
        }
        finalUrl = '';
      }
      // Se for uma URL (data URL ou blob URL), fazer upload para o Storage
      else if (urlOrFile.startsWith('data:') || urlOrFile.startsWith('blob:')) {
        // Converter data URL ou blob URL para File
        let file: File;
        if (urlOrFile.startsWith('data:')) {
          const response = await fetch(urlOrFile);
          const blob = await response.blob();
          file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
        } else {
          const response = await fetch(urlOrFile);
          const blob = await response.blob();
          file = new File([blob], `signature_${Date.now()}.png`, { type: 'image/png' });
        }
        const storagePath = await supabaseService.uploadSignature(user.id, file);
        finalUrl = await supabaseService.getSignatureOrStampUrl(storagePath);
      } 
      // Se já for uma URL do Storage, usar diretamente
      else {
        finalUrl = urlOrFile;
      }

      await supabaseService.updateUser(user.id, { signatureUrl: finalUrl });
      const updatedUser = await supabaseService.getUserById(user.id);
      if (updatedUser) {
        set({ user: updatedUser, loading: false });
      }
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      set({ error: 'Erro ao atualizar assinatura', loading: false });
      throw error;
    }
  },

  updateStamp: async (urlOrFile: string | File) => {
    try {
      const user = get().user;
      if (!user) return;

      set({ loading: true, error: null });

      let finalUrl: string;

      // Se for um File, fazer upload para o Storage
      if (urlOrFile instanceof File) {
        const storagePath = await supabaseService.uploadStamp(user.id, urlOrFile);
        finalUrl = await supabaseService.getSignatureOrStampUrl(storagePath);
      } 
      // Se for string vazia, remover carimbo
      else if (!urlOrFile) {
        // Se havia um carimbo no Storage, deletar
        if (user.stampUrl && user.stampUrl.includes('storage.supabase.co')) {
          // Tentar extrair o caminho do Storage da URL
          try {
            const urlParts = user.stampUrl.split('/');
            const pathIndex = urlParts.findIndex(part => part === 'stamps');
            if (pathIndex !== -1) {
              const storagePath = urlParts.slice(pathIndex).join('/');
              await supabaseService.deleteSignatureOrStamp(storagePath);
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar carimbo antigo do Storage:', deleteError);
          }
        }
        finalUrl = '';
      }
      // Se for uma URL (data URL ou blob URL), fazer upload para o Storage
      else if (urlOrFile.startsWith('data:') || urlOrFile.startsWith('blob:')) {
        // Converter data URL ou blob URL para File
        let file: File;
        if (urlOrFile.startsWith('data:')) {
          const response = await fetch(urlOrFile);
          const blob = await response.blob();
          file = new File([blob], `stamp_${Date.now()}.png`, { type: 'image/png' });
        } else {
          const response = await fetch(urlOrFile);
          const blob = await response.blob();
          file = new File([blob], `stamp_${Date.now()}.png`, { type: 'image/png' });
        }
        const storagePath = await supabaseService.uploadStamp(user.id, file);
        finalUrl = await supabaseService.getSignatureOrStampUrl(storagePath);
      } 
      // Se já for uma URL do Storage, usar diretamente
      else {
        finalUrl = urlOrFile;
      }

      await supabaseService.updateUser(user.id, { stampUrl: finalUrl });
      const updatedUser = await supabaseService.getUserById(user.id);
      if (updatedUser) {
        set({ user: updatedUser, loading: false });
      }
    } catch (error) {
      console.error('Erro ao atualizar carimbo:', error);
      set({ error: 'Erro ao atualizar carimbo', loading: false });
      throw error;
    }
  },

  // Master user management functions
  createUser: async (data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') {
        throw new Error('Apenas usuários master podem criar usuários');
      }

      set({ loading: true, error: null });
      await supabaseService.createUser(data);
      await get().loadData();
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar usuário';
      set({ error: errorMessage, loading: false });
      throw error; // Re-throw para que o componente possa capturar
    }
  },

  updateUser: async (userId, data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.updateUser(userId, data);
      
      // Se estiver atualizando o usuário atual, atualizar também
      if (user.id === userId) {
        const updatedUser = await supabaseService.getUserById(userId);
        if (updatedUser) {
          set({ user: updatedUser });
        }
      }
      
      await get().loadData();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      set({ error: 'Erro ao atualizar usuário', loading: false });
    }
  },

  deleteUser: async (userId) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      // Prevent deleting yourself
      if (user.id === userId) return;

      set({ loading: true, error: null });
      await supabaseService.deleteUser(userId);
      await get().loadData();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      set({ error: 'Erro ao deletar usuário', loading: false });
    }
  },

  createArea: async (data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') {
        throw new Error('Apenas usuários master podem criar áreas');
      }

      set({ loading: true, error: null });
      await supabaseService.createArea(data);
      await get().loadData();
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao criar área:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar área';
      set({ error: errorMessage, loading: false });
      throw error; // Re-throw para que o componente possa capturar
    }
  },

  updateArea: async (areaId, data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.updateArea(areaId, data);
      await get().loadData();
    } catch (error) {
      console.error('Erro ao atualizar área:', error);
      set({ error: 'Erro ao atualizar área', loading: false });
    }
  },

  deleteArea: async (areaId) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.deleteArea(areaId);
      await get().loadData();
    } catch (error) {
      console.error('Erro ao deletar área:', error);
      set({ error: 'Erro ao deletar área', loading: false });
    }
  },
}));
