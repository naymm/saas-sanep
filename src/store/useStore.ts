import { create } from 'zustand';
import { User, Document, Notification, DocumentStatus, DocumentType, Department, Area, Company, CompanyStamp, UserRole } from '@/types';
import * as supabaseService from '@/lib/supabaseService';

interface AppState {
  user: User | null;
  documents: Document[];
  notifications: Notification[];
  users: User[];
  areas: Area[];
  companies: Company[];
  companyStamps: CompanyStamp[]; // Carimbos gerais por empresa
  loading: boolean;
  error: string | null;
  initialized: boolean; // Flag para indicar se a sessão foi verificada
  initializing: boolean; // Flag para evitar múltiplas inicializações simultâneas
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>; // Função para verificar sessão existente
  loadData: () => Promise<void>;
  createDocument: (data: { title: string; type: DocumentType; description: string; fileName: string; file?: File; assignedToConselhoUserId?: string; assignedToAllConselho?: boolean }) => Promise<void>;
  advanceDocument: (docId: string, action: string, comment?: string, signatureUrl?: string, signedPdfUrl?: string, assignedToConselhoUserId?: string, assignedToAllConselho?: boolean, stampUrl?: string) => Promise<void>;
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
  // Company management functions
  createCompany: (data: { name: string; code: string; description?: string }) => Promise<void>;
  updateCompany: (companyId: string, data: Partial<Omit<Company, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  // Company stamp management functions (apenas master)
  createCompanyStamp: (data: { companyId: string; title: string; stampUrl: string }) => Promise<void>;
  updateCompanyStamp: (stampId: string, data: Partial<Omit<CompanyStamp, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCompanyStamp: (stampId: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  documents: [],
  notifications: [],
  users: [],
  areas: [],
  companies: [],
  companyStamps: [],
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
        companies: [],
        companyStamps: [],
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
        supabaseService.getCompanies(),
        supabaseService.getCompanyStamps(),
      ]);

      const [documents, users, areas, companies, companyStamps] = await Promise.race([dataPromise, timeoutPromise]) as [Document[], User[], Area[], Company[], CompanyStamp[]];

      let notifications: Notification[] = [];
      if (user) {
        try {
          notifications = await supabaseService.getNotifications(user.id);
        } catch (notifError) {
          console.error('Erro ao carregar notificações:', notifError);
          // Continuar mesmo se notificações falharem
        }
      }

      set({ documents, users, areas, companies, companyStamps, notifications, loading: false });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      set({ error: error instanceof Error ? error.message : 'Erro ao carregar dados', loading: false });
    }
  },

  createDocument: async (data) => {
    try {
      const user = get().user;
      if (!user) {
        console.warn('⚠️ Tentativa de criar documento sem usuário autenticado');
        return;
      }

      // Prevenir criação duplicada se já estiver processando
      if (get().loading) {
        console.warn('⚠️ Já existe uma operação de criação em andamento');
        return;
      }

      set({ loading: true, error: null });
      console.log('📝 Criando novo documento:', { title: data.title, fileName: data.fileName });

      // Areas send to Secretaria Geral; Secretaria Geral sends directly to Conselho
      const initialStatus: DocumentStatus =
        user.role === 'secretaria_geral' ? 'pendente_conselho' : 'pendente_secretaria';

      const actionLabel =
        user.role === 'secretaria_geral'
          ? 'Documento criado e enviado para Conselho de Administração'
          : 'Documento criado e enviado para Secretaria Geral';

      // Fazer upload do PDF se fornecido
      let originalPdfStoragePath: string | undefined;
      let newDoc: Document;
      
      // Preparar campos de atribuição de conselho (se for secretaria)
      let assignedToConselhoUserId: string | null | undefined = undefined;
      let assignedToAllConselho: boolean | undefined = undefined;
      let conselhoSignaturesRequired: number | undefined = undefined;
      let conselhoSignaturesReceived: number | undefined = undefined;
      
      if (user.role === 'secretaria_geral') {
        if (data.assignedToAllConselho) {
          // Para todos os membros
          const allConselhoMembers = get().users.filter((u) => u.role === 'conselho_admin');
          assignedToAllConselho = true;
          assignedToConselhoUserId = null;
          conselhoSignaturesRequired = allConselhoMembers.length;
          conselhoSignaturesReceived = 0;
          console.log('📋 Documento será enviado para todos os membros do conselho:', {
            totalMembers: allConselhoMembers.length,
          });
        } else if (data.assignedToConselhoUserId) {
          // Para membro específico
          assignedToAllConselho = false;
          assignedToConselhoUserId = data.assignedToConselhoUserId;
          conselhoSignaturesRequired = 1;
          conselhoSignaturesReceived = 0;
          console.log('📋 Documento será enviado para membro específico do conselho:', data.assignedToConselhoUserId);
        }
      }
      
      if (data.file) {
        // Primeiro criar o documento para obter o ID
        newDoc = await supabaseService.createDocument({
          ...data,
          createdBy: user.id,
          createdByName: user.name,
          createdByRole: user.role,
          createdByDepartment: user.department,
          status: initialStatus,
        });
        
        console.log('✅ Documento criado (ID:', newDoc.id, '). Fazendo upload do PDF...');

        try {
          // Fazer upload do PDF
          originalPdfStoragePath = await supabaseService.uploadOriginalPdf(newDoc.id, data.file);

          // Atualizar documento com o caminho do PDF e campos de atribuição
          const updateData: {
            originalPdfStoragePath: string;
            assignedToConselhoUserId?: string | null;
            assignedToAllConselho?: boolean;
            conselhoSignaturesRequired?: number;
            conselhoSignaturesReceived?: number;
          } = {
            originalPdfStoragePath,
          };
          
          if (assignedToConselhoUserId !== undefined) {
            updateData.assignedToConselhoUserId = assignedToConselhoUserId;
          }
          if (assignedToAllConselho !== undefined) {
            updateData.assignedToAllConselho = assignedToAllConselho;
          }
          if (conselhoSignaturesRequired !== undefined) {
            updateData.conselhoSignaturesRequired = conselhoSignaturesRequired;
          }
          if (conselhoSignaturesReceived !== undefined) {
            updateData.conselhoSignaturesReceived = conselhoSignaturesReceived;
          }
          
          newDoc = await supabaseService.updateDocument(newDoc.id, updateData);
          
          console.log('✅ PDF enviado e atribuição definida com sucesso:', originalPdfStoragePath);
        } catch (uploadError) {
          console.error('❌ Erro ao fazer upload do PDF:', uploadError);
          // O documento já foi criado, mas sem o PDF
          // Atualizar apenas os campos de atribuição
          try {
            const updateData: {
              assignedToConselhoUserId?: string | null;
              assignedToAllConselho?: boolean;
              conselhoSignaturesRequired?: number;
              conselhoSignaturesReceived?: number;
            } = {};
            
            if (assignedToConselhoUserId !== undefined) {
              updateData.assignedToConselhoUserId = assignedToConselhoUserId;
            }
            if (assignedToAllConselho !== undefined) {
              updateData.assignedToAllConselho = assignedToAllConselho;
            }
            if (conselhoSignaturesRequired !== undefined) {
              updateData.conselhoSignaturesRequired = conselhoSignaturesRequired;
            }
            if (conselhoSignaturesReceived !== undefined) {
              updateData.conselhoSignaturesReceived = conselhoSignaturesReceived;
            }
            
            if (Object.keys(updateData).length > 0) {
              newDoc = await supabaseService.updateDocument(newDoc.id, updateData);
            }
          } catch (updateError) {
            console.error('❌ Erro ao atualizar atribuição:', updateError);
          }
          console.warn('⚠️ Documento criado mas sem PDF devido a erro no upload');
        }
      } else {
        // Criar documento no Supabase (sem PDF)
        console.log('📝 Criando documento sem PDF');
        newDoc = await supabaseService.createDocument({
          ...data,
          createdBy: user.id,
          createdByName: user.name,
          createdByRole: user.role,
          createdByDepartment: user.department,
          status: initialStatus,
          originalPdfStoragePath,
        });
        
        // Atualizar campos de atribuição se necessário
        if (assignedToConselhoUserId !== undefined || assignedToAllConselho !== undefined) {
          const updateData: {
            assignedToConselhoUserId?: string | null;
            assignedToAllConselho?: boolean;
            conselhoSignaturesRequired?: number;
            conselhoSignaturesReceived?: number;
          } = {};
          
          if (assignedToConselhoUserId !== undefined) {
            updateData.assignedToConselhoUserId = assignedToConselhoUserId;
          }
          if (assignedToAllConselho !== undefined) {
            updateData.assignedToAllConselho = assignedToAllConselho;
          }
          if (conselhoSignaturesRequired !== undefined) {
            updateData.conselhoSignaturesRequired = conselhoSignaturesRequired;
          }
          if (conselhoSignaturesReceived !== undefined) {
            updateData.conselhoSignaturesReceived = conselhoSignaturesReceived;
          }
          
          newDoc = await supabaseService.updateDocument(newDoc.id, updateData);
        }
      }

      // Adicionar ação inicial
      await supabaseService.addDocumentAction({
        documentId: newDoc.id,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: actionLabel,
      });

      // Criar notificações
      if (user.role === 'secretaria_geral') {
        // Secretaria criou documento para conselho
        if (assignedToAllConselho) {
          // Notificar todos os membros do conselho
          const allConselhoMembers = get().users.filter((u) => u.role === 'conselho_admin');
          for (const member of allConselhoMembers) {
            try {
              await supabaseService.createNotification({
                userId: member.id,
                message: `Novo documento recebido: ${data.title}`,
                documentId: newDoc.id,
              });
              console.log('✅ Notificação criada para membro do conselho:', member.name);
            } catch (notifError: any) {
              console.error('❌ Erro ao criar notificação para membro:', {
                error: notifError,
                memberId: member.id,
                memberName: member.name,
              });
            }
          }
        } else if (assignedToConselhoUserId) {
          // Notificar apenas o membro específico
          try {
            await supabaseService.createNotification({
              userId: assignedToConselhoUserId,
              message: `Novo documento recebido: ${data.title}`,
              documentId: newDoc.id,
            });
            console.log('✅ Notificação criada para membro específico do conselho:', assignedToConselhoUserId);
          } catch (notifError: any) {
            console.error('❌ Erro ao criar notificação para membro específico:', {
              error: notifError,
              targetUserId: assignedToConselhoUserId,
              documentId: newDoc.id,
            });
          }
        } else {
          // Fallback: notificar primeiro membro do conselho encontrado
          const firstConselhoMember = get().users.find((u) => u.role === 'conselho_admin');
          if (firstConselhoMember) {
            try {
              await supabaseService.createNotification({
                userId: firstConselhoMember.id,
                message: `Novo documento recebido: ${data.title}`,
                documentId: newDoc.id,
              });
              console.log('✅ Notificação criada (fallback) para membro do conselho:', firstConselhoMember.id);
            } catch (notifError: any) {
              console.error('❌ Erro ao criar notificação (fallback):', notifError);
            }
          }
        }
      } else {
        // Área criou documento - notificar secretaria
        const secretariaUser = get().users.find((u) => u.role === 'secretaria_geral');
        if (secretariaUser) {
          try {
            await supabaseService.createNotification({
              userId: secretariaUser.id,
              message: `Novo documento recebido: ${data.title}`,
              documentId: newDoc.id,
            });
            console.log('✅ Notificação criada para secretaria:', secretariaUser.id);
          } catch (notifError: any) {
            console.error('❌ Erro ao criar notificação para secretaria:', {
              error: notifError,
              targetUserId: secretariaUser.id,
              documentId: newDoc.id,
            });
          }
        } else {
          console.warn('⚠️ Nenhum usuário de secretaria encontrado para notificar');
        }
      }

      // Recarregar dados
      await get().loadData();
      set({ loading: false });
      console.log('✅ Documento criado com sucesso:', newDoc.id);
    } catch (error) {
      console.error('❌ Erro ao criar documento:', error);
      set({ error: 'Erro ao criar documento', loading: false });
      throw error; // Re-lançar erro para que o frontend saiba
    }
  },

      advanceDocument: async (docId, action, comment, signatureUrl, signedPdfUrl, assignedToConselhoUserId, assignedToAllConselho) => {
        console.log('🚀 advanceDocument INICIADO:', { 
          docId, 
          action, 
          hasSignatureUrl: !!signatureUrl, 
          hasSignedPdfUrl: !!signedPdfUrl,
          assignedToConselhoUserId,
          assignedToAllConselho
        });
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
            if (assignedToAllConselho) {
              action = 'Documento encaminhado para todos os membros do Conselho de Administração';
            } else {
              action = 'Documento encaminhado para Conselho de Administração';
            }
          }
          console.log('Secretaria encaminhando para conselho:', {
            assignedToAllConselho,
            assignedToConselhoUserId,
          });
        }
      }
      // Conselho approves and signs
      else if (user.role === 'conselho_admin' && doc.status === 'pendente_conselho') {
        // Verificar se o usuário pode assinar este documento
        const isForAllMembers = doc.assignedToAllConselho || false;
        const assignedToUserId = doc.assignedToConselhoUserId;
        
        // Se for para membro específico, verificar se é o membro correto
        if (!isForAllMembers && assignedToUserId && assignedToUserId !== user.id) {
          console.error('❌ Usuário não autorizado a assinar este documento:', {
            userId: user.id,
            assignedToUserId,
          });
          throw new Error('Este documento foi atribuído a outro membro do conselho');
        }
        
        // Verificar se já assinou
        const hasUserSigned = doc.signatures && doc.signatures.some(sig => sig.userId === user.id);
        if (hasUserSigned) {
          console.warn('⚠️ Usuário já assinou este documento');
          throw new Error('Você já assinou este documento');
        }
        
        addSignature = true;
        
        const requiredSignatures = doc.conselhoSignaturesRequired || 1;
        const receivedSignatures = doc.conselhoSignaturesReceived || 0;
        const allConselhoMembers = get().users.filter((u) => u.role === 'conselho_admin');
        
        if (isForAllMembers && allConselhoMembers.length > 1) {
          // Documento para todos os membros - verificar se já assinou
          const hasUserSigned = doc.signatures && doc.signatures.some(sig => sig.userId === user.id);
          if (hasUserSigned) {
            console.warn('⚠️ Usuário já assinou este documento');
            throw new Error('Você já assinou este documento');
          }
          
          // Incrementar contador de assinaturas recebidas
          const newReceivedSignatures = receivedSignatures + 1;
          
          // Verificar se todos assinaram
          if (newReceivedSignatures >= allConselhoMembers.length) {
            // Todos assinaram - finalizar diretamente
            nextStatus = 'finalizado';
            if (!action || action === 'Aprovado e assinado') {
              action = `Documento aprovado e assinado por todos os membros do Conselho (${newReceivedSignatures}/${allConselhoMembers.length}) - Finalizado`;
            }
            console.log('✅ Todos os membros do conselho assinaram - documento finalizado');
          } else {
            // Ainda faltam assinaturas - encaminhar para o próximo membro que ainda não assinou
            // IMPORTANTE: Incluir o usuário atual que está assinando agora na lista de assinantes
            const signedUserIds = [
              ...(doc.signatures || []).filter(sig => sig.role === 'conselho_admin').map(sig => sig.userId),
              user.id // Incluir o usuário atual que está assinando agora
            ];
            const nextMember = allConselhoMembers.find(m => 
              !signedUserIds.includes(m.id)
            );
            
            if (nextMember) {
              // Encaminhar para o próximo membro
              nextStatus = 'pendente_conselho';
              if (!action || action === 'Aprovado e assinado') {
                action = `Documento assinado (${newReceivedSignatures}/${allConselhoMembers.length}) - encaminhado para ${nextMember.name}`;
              }
              console.log(`📤 Encaminhando para próximo membro: ${nextMember.name} (${newReceivedSignatures}/${allConselhoMembers.length})`);
            } else {
              // Não há próximo membro (erro)
              console.error('❌ Não foi possível encontrar próximo membro do conselho', {
                allMembers: allConselhoMembers.map(m => ({ id: m.id, name: m.name })),
                signedUserIds,
                currentUser: user.id,
              });
              throw new Error('Erro ao encaminhar para próximo membro do conselho');
            }
          }
        } else {
          // Documento para membro específico ou único membro - finalizar
          nextStatus = 'finalizado';
          // Atualizar ação para refletir que foi finalizado
          if (!action || action === 'Aprovado e assinado') {
            action = 'Documento aprovado, assinado e finalizado pelo Conselho de Administração';
          }
          console.log('Conselho assinando - mudando status para finalizado');
        }
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
            
            // Verificar se há PDF já assinado usando nomenclatura (contém "signed_" no nome)
            // Isso é mais confiável que verificar assinaturas no banco, pois o PDF pode ter sido assinado
            const hasSignedPdfPath = doc.signedPdfStoragePath && supabaseService.isSignedPdfPath(doc.signedPdfStoragePath);
            const hasSignedOriginalPath = doc.originalPdfStoragePath && supabaseService.isSignedPdfPath(doc.originalPdfStoragePath);
            const hasPreviousSignatures = doc.signatures && doc.signatures.some(sig => 
              sig.role === 'conselho_admin' && sig.userId !== user.id
            );
            
            // Determinar qual PDF substituir:
            // - Se há PDF já assinado (identificado pelo nome): substituir esse PDF
            // - Se é primeira assinatura: substituir o PDF original (que criará um novo arquivo "signed_")
            const pdfPathToReplace = (hasSignedPdfPath && doc.signedPdfStoragePath)
              ? doc.signedPdfStoragePath // PDF já assinado (com todas as assinaturas anteriores)
              : (hasSignedOriginalPath && doc.originalPdfStoragePath)
              ? doc.originalPdfStoragePath // PDF original foi substituído e agora está assinado
              : doc.originalPdfStoragePath; // PDF original (primeira assinatura)
            
            console.log('🔍 Verificando PDF para substituir:', {
              hasSignedPdfPath,
              hasSignedOriginalPath,
              hasPreviousSignatures,
              pdfPathToReplace,
              signedPdfStoragePath: doc.signedPdfStoragePath,
              originalPdfStoragePath: doc.originalPdfStoragePath,
            });
            
            if (pdfPathToReplace) {
              // Substituir o PDF no caminho existente
              // IMPORTANTE: Se há múltiplas assinaturas, estamos substituindo o PDF já assinado (que contém assinaturas anteriores)
              // Se é primeira assinatura, estamos substituindo o PDF original
              const replacedPath = await supabaseService.replaceOriginalPdf(
                pdfPathToReplace,
                pdfBytes
              );
              
              // Atualizar os caminhos baseado na nomenclatura do arquivo retornado
              // Se o caminho retornado contém "signed_", é um novo arquivo assinado (preservando o original)
              // Se não contém, foi substituído no mesmo caminho
              const isNewSignedFile = supabaseService.isSignedPdfPath(replacedPath);
              
              if (isNewSignedFile) {
                // Novo arquivo assinado criado (preservando o original)
                signedPdfStoragePath = replacedPath;
                originalPdfStoragePath = doc.originalPdfStoragePath; // Manter o caminho original
                console.log('✅ Novo PDF assinado criado (preservando original):', {
                  signedPath: replacedPath,
                  originalPath: doc.originalPdfStoragePath,
                });
              } else {
                // PDF foi substituído no mesmo caminho
                // Se era original, agora está assinado (mas ainda com nome original - compatibilidade)
                // Se já era assinado, foi atualizado
                signedPdfStoragePath = replacedPath;
                // Se o caminho original não contém "signed_", manter separado
                if (doc.originalPdfStoragePath && !supabaseService.isSignedPdfPath(doc.originalPdfStoragePath)) {
                  originalPdfStoragePath = doc.originalPdfStoragePath; // Manter original separado
                } else {
                  originalPdfStoragePath = replacedPath; // Mesmo caminho
                }
                console.log('✅ PDF substituído no mesmo caminho:', replacedPath);
              }
            } else {
              // Se não houver PDF para substituir, criar novo arquivo assinado
              // A função uploadSignedPdf já adiciona o prefixo "signed_" automaticamente
              signedPdfStoragePath = await supabaseService.uploadSignedPdf(
                docId,
                pdfBytes,
                doc.fileName
              );
              // Manter originalPdfStoragePath como estava (ou undefined se não havia)
              originalPdfStoragePath = doc.originalPdfStoragePath;
              console.log('✅ Novo PDF assinado criado:', {
                signedPath: signedPdfStoragePath,
                originalPath: originalPdfStoragePath,
              });
            }
            
            // Obter URL pública do Storage com cache-busting
            // IMPORTANTE: Adicionar timestamp para garantir que o navegador carregue o PDF atualizado (assinado)
            const pathForUrl = signedPdfStoragePath || originalPdfStoragePath;
            if (pathForUrl) {
              const publicUrl = await supabaseService.getSignedPdfUrl(pathForUrl);
              signedPdfUrl = publicUrl;
              console.log('✅ URL pública do PDF assinado gerada:', publicUrl);
            }
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
        assignedToConselhoUserId?: string | null;
        assignedToAllConselho?: boolean;
        conselhoSignaturesRequired?: number;
        conselhoSignaturesReceived?: number;
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
      // IMPORTANTE: Com a nova nomenclatura, PDFs assinados têm prefixo "signed_" no nome
      if (addSignature) {
        if (signedPdfStoragePath && signedPdfStoragePath.trim() !== '') {
          updatePayload.signedPdfStoragePath = signedPdfStoragePath.trim();
          console.log('✅ signedPdfStoragePath atualizado:', signedPdfStoragePath);
        } else if (originalPdfStoragePath && originalPdfStoragePath.trim() !== '') {
          // Se signedPdfStoragePath não foi definido mas originalPdfStoragePath foi, verificar se contém "signed_"
          if (supabaseService.isSignedPdfPath(originalPdfStoragePath)) {
            // O originalPdfStoragePath já aponta para um PDF assinado
            updatePayload.signedPdfStoragePath = originalPdfStoragePath.trim();
            console.log('✅ signedPdfStoragePath aponta para originalPdfStoragePath (já assinado):', originalPdfStoragePath);
          }
        }
      }
      // Se não está assinando, não incluir signedPdfStoragePath no payload
      
      // Para originalPdfStoragePath, quando há assinatura:
      // - Se foi criado um novo arquivo assinado (com "signed_"), não atualizar originalPdfStoragePath (preservar original)
      // - Se foi substituído no mesmo caminho (sem "signed_"), não atualizar (compatibilidade com documentos antigos)
      // IMPORTANTE: Com a nova nomenclatura, PDFs assinados têm prefixo "signed_" e preservam o original
      if (addSignature && originalPdfStoragePath !== undefined && originalPdfStoragePath !== null && originalPdfStoragePath.trim() !== '') {
        const isNewSignedFile = signedPdfStoragePath && supabaseService.isSignedPdfPath(signedPdfStoragePath);
        
        if (isNewSignedFile) {
          // Novo arquivo assinado criado - não atualizar originalPdfStoragePath (preservar original)
          console.log('✅ Novo PDF assinado criado - mantendo originalPdfStoragePath original');
        } else if (originalPdfStoragePath !== doc.originalPdfStoragePath) {
          // Caminho mudou - atualizar (compatibilidade com documentos antigos)
          updatePayload.originalPdfStoragePath = originalPdfStoragePath.trim();
          console.log('📝 Atualizando originalPdfStoragePath para novo caminho:', originalPdfStoragePath);
        } else {
          // Substituído no mesmo caminho - não atualizar (compatibilidade)
          console.log('✅ PDF substituído no mesmo caminho - mantendo caminho original');
        }
      }

      // Validar que o status é válido
      const validStatuses: DocumentStatus[] = ['pendente_secretaria', 'pendente_conselho', 'aprovado', 'rejeitado', 'finalizado'];
      if (!validStatuses.includes(nextStatus)) {
        console.error('❌ Status inválido:', nextStatus);
        throw new Error(`Status inválido: ${nextStatus}`);
      }

      // Adicionar campos de atribuição de conselho quando secretaria encaminha
      if (user.role === 'secretaria_geral' && nextStatus === 'pendente_conselho') {
        if (assignedToAllConselho) {
          const allConselhoMembers = get().users.filter((u) => u.role === 'conselho_admin');
          updatePayload.assignedToAllConselho = true;
          updatePayload.assignedToConselhoUserId = null;
          updatePayload.conselhoSignaturesRequired = allConselhoMembers.length;
          updatePayload.conselhoSignaturesReceived = 0;
          console.log('📋 Documento atribuído para todos os membros do conselho:', {
            totalMembers: allConselhoMembers.length,
            requiredSignatures: allConselhoMembers.length,
          });
        } else if (assignedToConselhoUserId) {
          updatePayload.assignedToAllConselho = false;
          updatePayload.assignedToConselhoUserId = assignedToConselhoUserId;
          updatePayload.conselhoSignaturesRequired = 1;
          updatePayload.conselhoSignaturesReceived = 0;
          console.log('📋 Documento atribuído para membro específico do conselho:', assignedToConselhoUserId);
        }
      }
      
      // Atualizar contador de assinaturas quando conselho assina
      if (user.role === 'conselho_admin' && addSignature) {
        const isForAllMembers = doc.assignedToAllConselho || false;
        if (isForAllMembers) {
          const allConselhoMembers = get().users.filter((u) => u.role === 'conselho_admin');
          const currentReceived = doc.conselhoSignaturesReceived || 0;
          const newReceived = currentReceived + 1;
          updatePayload.conselhoSignaturesReceived = newReceived;
          updatePayload.conselhoSignaturesRequired = allConselhoMembers.length;
          
          // Se ainda faltam assinaturas, atualizar assignedToConselhoUserId para o próximo membro
          if (newReceived < allConselhoMembers.length) {
            // IMPORTANTE: Incluir o usuário atual que está assinando agora na lista de assinantes
            const signedUserIds = [
              ...(doc.signatures || []).filter(sig => sig.role === 'conselho_admin').map(sig => sig.userId),
              user.id // Incluir o usuário atual que está assinando agora
            ];
            const nextMember = allConselhoMembers.find(m => 
              !signedUserIds.includes(m.id)
            );
            if (nextMember) {
              updatePayload.assignedToConselhoUserId = nextMember.id;
              // Manter assignedToAllConselho como true para indicar que é para todos
              updatePayload.assignedToAllConselho = true;
              console.log('📤 Próximo membro definido:', {
                nextMember: nextMember.name,
                nextMemberId: nextMember.id,
                signedUserIds,
                newReceived,
                totalRequired: allConselhoMembers.length,
              });
            } else {
              console.error('❌ Não foi possível encontrar próximo membro para atualizar assignedToConselhoUserId', {
                allMembers: allConselhoMembers.map(m => ({ id: m.id, name: m.name })),
                signedUserIds,
                currentUser: user.id,
                newReceived,
                totalRequired: allConselhoMembers.length,
              });
            }
          }
          console.log('📊 Assinaturas recebidas atualizadas:', {
            received: newReceived,
            required: allConselhoMembers.length,
          });
        }
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

      // Criar notificações
      if (nextStatus === 'pendente_conselho') {
        // Verificar se é encaminhamento entre membros (quando conselho assina e encaminha)
        const isEncaminhamentoEntreMembros = user.role === 'conselho_admin' && addSignature && doc.assignedToAllConselho;
        
        if (isEncaminhamentoEntreMembros) {
          // Encaminhamento entre membros - notificar apenas o próximo membro
          // Usar o valor do updatePayload que foi definido anteriormente
          const nextMemberId = updatePayload.assignedToConselhoUserId;
          if (nextMemberId && typeof nextMemberId === 'string') {
            try {
              await supabaseService.createNotification({
                userId: nextMemberId,
                message: `Documento "${doc.title}" - ${action}`,
                documentId: docId,
              });
              console.log('✅ Notificação criada para próximo membro do conselho:', nextMemberId);
            } catch (notifError: any) {
              console.error('❌ Erro ao criar notificação para próximo membro:', {
                error: notifError,
                nextMemberId,
                documentId: docId,
              });
            }
          } else {
            console.warn('⚠️ Próximo membro não encontrado no updatePayload:', {
              updatePayload,
              nextMemberId,
            });
          }
        } else {
          // Encaminhamento inicial da secretaria - verificar se é para membro específico ou todos
          if (assignedToAllConselho) {
            // Notificar todos os membros do conselho
            const allConselhoMembers = get().users.filter((u) => u.role === 'conselho_admin');
            for (const member of allConselhoMembers) {
              try {
                await supabaseService.createNotification({
                  userId: member.id,
                  message: `Documento "${doc.title}" - ${action}`,
                  documentId: docId,
                });
                console.log('✅ Notificação criada para membro do conselho:', member.name);
              } catch (notifError: any) {
                console.error('❌ Erro ao criar notificação para membro:', {
                  error: notifError,
                  memberId: member.id,
                  memberName: member.name,
                });
              }
            }
          } else if (assignedToConselhoUserId) {
            // Notificar apenas o membro específico
            try {
              await supabaseService.createNotification({
                userId: assignedToConselhoUserId,
                message: `Documento "${doc.title}" - ${action}`,
                documentId: docId,
              });
              console.log('✅ Notificação criada para membro específico do conselho:', assignedToConselhoUserId);
            } catch (notifError: any) {
              console.error('❌ Erro ao criar notificação:', {
                error: notifError,
                targetUserId: assignedToConselhoUserId,
                documentId: docId,
              });
            }
          } else {
            // Fallback: notificar primeiro membro do conselho encontrado
            const firstConselhoMember = get().users.find((u) => u.role === 'conselho_admin');
            if (firstConselhoMember) {
              try {
                await supabaseService.createNotification({
                  userId: firstConselhoMember.id,
                  message: `Documento "${doc.title}" - ${action}`,
                  documentId: docId,
                });
                console.log('✅ Notificação criada (fallback) para membro do conselho:', firstConselhoMember.id);
              } catch (notifError: any) {
                console.error('❌ Erro ao criar notificação (fallback):', notifError);
              }
            }
          }
        }
      } else if (nextStatus === 'finalizado') {
        // Notificar criador do documento quando finalizado
        try {
          await supabaseService.createNotification({
            userId: doc.createdBy,
            message: `Documento "${doc.title}" - ${action}`,
            documentId: docId,
          });
          console.log('✅ Notificação de finalização criada para criador:', doc.createdBy);
        } catch (notifError: any) {
          console.error('❌ Erro ao criar notificação de finalização:', notifError);
        }
      } else if (nextStatus === 'pendente_secretaria') {
        // Notificar secretaria quando documento volta para ela
        const secretariaUser = get().users.find((u) => u.role === 'secretaria_geral');
        if (secretariaUser) {
          try {
            await supabaseService.createNotification({
              userId: secretariaUser.id,
              message: `Documento "${doc.title}" - ${action}`,
              documentId: docId,
            });
            console.log('✅ Notificação criada para secretaria:', secretariaUser.id);
          } catch (notifError: any) {
            console.error('❌ Erro ao criar notificação para secretaria:', notifError);
          }
        }
      } else {
        // Fallback: notificar criador
        try {
          await supabaseService.createNotification({
            userId: doc.createdBy,
            message: `Documento "${doc.title}" - ${action}`,
            documentId: docId,
          });
          console.log('✅ Notificação criada (fallback) para criador:', doc.createdBy);
        } catch (notifError: any) {
          console.error('❌ Erro ao criar notificação (fallback):', notifError);
        }
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
      try {
        await supabaseService.createNotification({
          userId: doc.createdBy,
          message: `Documento "${doc.title}" foi rejeitado`,
          documentId: docId,
        });
        console.log('✅ Notificação de rejeição criada para:', doc.createdBy);
      } catch (notifError: any) {
        console.error('❌ Erro ao criar notificação de rejeição:', {
          error: notifError,
          message: notifError.message,
          code: notifError.code,
          targetUserId: doc.createdBy,
          documentId: docId,
        });
        // Continuar mesmo se a notificação falhar
      }

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

  // ==================== COMPANY MANAGEMENT ====================
  createCompany: async (data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') {
        throw new Error('Apenas usuários master podem criar empresas');
      }

      set({ loading: true, error: null });
      await supabaseService.createCompany(data);
      await get().loadData();
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar empresa';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateCompany: async (companyId, data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.updateCompany(companyId, data);
      await get().loadData();
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      set({ error: 'Erro ao atualizar empresa', loading: false });
    }
  },

  deleteCompany: async (companyId) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.deleteCompany(companyId);
      await get().loadData();
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      set({ error: 'Erro ao deletar empresa', loading: false });
    }
  },

  // ==================== COMPANY STAMP MANAGEMENT ====================
  createCompanyStamp: async (data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') {
        throw new Error('Apenas usuários master podem cadastrar carimbos');
      }

      set({ loading: true, error: null });
      await supabaseService.createCompanyStamp({
        companyId: data.companyId,
        title: data.title,
        stampUrl: data.stampUrl,
      });
      await get().loadData(); // Recarregar todos os dados
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao criar carimbo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar carimbo';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateCompanyStamp: async (stampId, data) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.updateCompanyStamp(stampId, data);
      await get().loadData(); // Recarregar todos os dados
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao atualizar carimbo:', error);
      set({ error: 'Erro ao atualizar carimbo', loading: false });
    }
  },

  deleteCompanyStamp: async (stampId) => {
    try {
      const user = get().user;
      if (!user || user.role !== 'master') return;

      set({ loading: true, error: null });
      await supabaseService.deleteCompanyStamp(stampId);
      await get().loadData(); // Recarregar todos os dados
      set({ loading: false });
    } catch (error) {
      console.error('Erro ao deletar carimbo:', error);
      set({ error: 'Erro ao deletar carimbo', loading: false });
    }
  },
}));
