import { create } from 'zustand';
import { User, Document, Notification, DocumentStatus, DocumentType, Department, Area, UserRole } from '@/types';
import { MOCK_USERS, MOCK_DOCUMENTS, MOCK_NOTIFICATIONS, MOCK_AREAS } from '@/data/mock';

interface AppState {
  user: User | null;
  documents: Document[];
  notifications: Notification[];
  users: User[];
  areas: Area[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  createDocument: (data: { title: string; type: DocumentType; description: string; fileName: string }) => void;
  advanceDocument: (docId: string, action: string, comment?: string, signatureUrl?: string, signedPdfUrl?: string) => void;
  rejectDocument: (docId: string, justification: string) => void;
  markNotificationRead: (notifId: string) => void;
  updateSignature: (url: string) => void;
  updateStamp: (url: string) => void;
  // Master user management functions
  createUser: (data: { name: string; email: string; role: UserRole; department?: Department }) => void;
  updateUser: (userId: string, data: Partial<Omit<User, 'id'>>) => void;
  deleteUser: (userId: string) => void;
  createArea: (data: { name: string; code: string; description?: string }) => void;
  updateArea: (areaId: string, data: Partial<Omit<Area, 'id' | 'createdAt'>>) => void;
  deleteArea: (areaId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  documents: MOCK_DOCUMENTS,
  notifications: MOCK_NOTIFICATIONS,
  users: MOCK_USERS,
  areas: MOCK_AREAS,

  login: (email: string, _password: string) => {
    const users = get().users;
    const found = users.find((u) => u.email === email);
    if (found) {
      set({ user: found });
      return true;
    }
    return false;
  },

  logout: () => set({ user: null }),

  createDocument: (data) => {
    const user = get().user;
    if (!user) return;
    const id = `d${Date.now()}`;
    const now = new Date().toISOString();

    // Areas send to Secretaria Geral; Secretaria Geral sends directly to Conselho
    const initialStatus: DocumentStatus =
      user.role === 'secretaria_geral' ? 'pendente_conselho' : 'pendente_secretaria';

    const actionLabel =
      user.role === 'secretaria_geral'
        ? 'Documento criado e enviado para Conselho de Administração'
        : 'Documento criado e enviado para Secretaria Geral';

    const newDoc: Document = {
      id,
      ...data,
      createdBy: user.id,
      createdByName: user.name,
      createdByRole: user.role,
      createdByDepartment: user.department,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: `${id}-h0`,
          documentId: id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: actionLabel,
          timestamp: now,
        },
      ],
      signatures: [],
    };

    // Notify the target role
    const notifUserId = user.role === 'secretaria_geral' ? 'u3' : 'u2';
    const notif: Notification = {
      id: `n${Date.now()}`,
      userId: notifUserId,
      message: `Novo documento recebido: ${data.title}`,
      documentId: id,
      read: false,
      timestamp: now,
    };
    set((s) => ({ documents: [newDoc, ...s.documents], notifications: [notif, ...s.notifications] }));
  },

  advanceDocument: (docId, action, comment, signatureUrl, signedPdfUrl) => {
    const user = get().user;
    if (!user) return;
    const now = new Date().toISOString();

    set((s) => {
      const docs = s.documents.map((doc) => {
        if (doc.id !== docId) return doc;

        let nextStatus: DocumentStatus = doc.status;
        let addSignature = false;

        // Secretaria Geral forwards to Conselho
        if (user.role === 'secretaria_geral' && doc.status === 'pendente_secretaria') {
          nextStatus = 'pendente_conselho';
        }
        // Conselho approves and signs → finalizado
        else if (user.role === 'conselho_admin' && doc.status === 'pendente_conselho') {
          nextStatus = 'finalizado';
          addSignature = true;
        }

        const newHistory = [
          ...doc.history,
          {
            id: `${doc.id}-h${doc.history.length}`,
            documentId: doc.id,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action,
            comment,
            timestamp: now,
          },
        ];
        const newSignatures = addSignature
          ? [...doc.signatures, { userId: user.id, userName: user.name, role: user.role, timestamp: now, signatureUrl }]
          : doc.signatures;

        return { 
          ...doc, 
          status: nextStatus, 
          updatedAt: now, 
          history: newHistory, 
          signatures: newSignatures,
          signedPdfUrl: signedPdfUrl || doc.signedPdfUrl, // Salvar PDF assinado se fornecido
        };
      });

      const targetDoc = docs.find((d) => d.id === docId)!;
      const notifUserId =
        targetDoc.status === 'pendente_conselho' ? 'u3'
        : targetDoc.status === 'finalizado' ? targetDoc.createdBy
        : targetDoc.createdBy;

      const notif: Notification = {
        id: `n${Date.now()}`,
        userId: notifUserId,
        message: `Documento "${targetDoc.title}" - ${action}`,
        documentId: docId,
        read: false,
        timestamp: now,
      };

      return { documents: docs, notifications: [notif, ...s.notifications] };
    });
  },

  rejectDocument: (docId, justification) => {
    const user = get().user;
    if (!user) return;
    const now = new Date().toISOString();

    set((s) => {
      const docs = s.documents.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          status: 'rejeitado' as DocumentStatus,
          updatedAt: now,
          history: [
            ...doc.history,
            {
              id: `${doc.id}-h${doc.history.length}`,
              documentId: doc.id,
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: 'Rejeitado',
              comment: justification,
              timestamp: now,
            },
          ],
        };
      });

      const targetDoc = docs.find((d) => d.id === docId)!;
      const notif: Notification = {
        id: `n${Date.now()}`,
        userId: targetDoc.createdBy,
        message: `Documento "${targetDoc.title}" foi rejeitado`,
        documentId: docId,
        read: false,
        timestamp: now,
      };

      return { documents: docs, notifications: [notif, ...s.notifications] };
    });
  },

  markNotificationRead: (notifId) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    }));
  },

  updateSignature: (url) => {
    set((s) => (s.user ? { user: { ...s.user, signatureUrl: url } } : {}));
  },

  updateStamp: (url) => {
    set((s) => (s.user ? { user: { ...s.user, stampUrl: url } } : {}));
  },

  // Master user management functions
  createUser: (data) => {
    const user = get().user;
    if (!user || user.role !== 'master') return;
    
    const newUser: User = {
      id: `u${Date.now()}`,
      ...data,
    };
    
    set((s) => ({ users: [...s.users, newUser] }));
  },

  updateUser: (userId, data) => {
    const user = get().user;
    if (!user || user.role !== 'master') return;
    
    set((s) => ({
      users: s.users.map((u) => (u.id === userId ? { ...u, ...data } : u)),
      // Update current user if it's the one being updated
      user: s.user?.id === userId ? { ...s.user, ...data } : s.user,
    }));
  },

  deleteUser: (userId) => {
    const user = get().user;
    if (!user || user.role !== 'master') return;
    
    // Prevent deleting yourself
    if (user.id === userId) return;
    
    set((s) => ({
      users: s.users.filter((u) => u.id !== userId),
    }));
  },

  createArea: (data) => {
    const user = get().user;
    if (!user || user.role !== 'master') return;
    
    const now = new Date().toISOString();
    const newArea: Area = {
      id: `a${Date.now()}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    set((s) => ({ areas: [...s.areas, newArea] }));
  },

  updateArea: (areaId, data) => {
    const user = get().user;
    if (!user || user.role !== 'master') return;
    
    const now = new Date().toISOString();
    set((s) => ({
      areas: s.areas.map((a) =>
        a.id === areaId ? { ...a, ...data, updatedAt: now } : a
      ),
    }));
  },

  deleteArea: (areaId) => {
    const user = get().user;
    if (!user || user.role !== 'master') return;
    
    set((s) => ({
      areas: s.areas.filter((a) => a.id !== areaId),
    }));
  },
}));
