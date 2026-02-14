import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import NewDocumentPage from "@/pages/NewDocumentPage";
import MyDocumentsPage from "@/pages/MyDocumentsPage";
import DocumentDetailPage from "@/pages/DocumentDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import UsersManagementPage from "@/pages/UsersManagementPage";
import AreasManagementPage from "@/pages/AreasManagementPage";
import CompaniesManagementPage from "@/pages/CompaniesManagementPage";
import StampsManagementPage from "@/pages/StampsManagementPage";
import NotFound from "./pages/NotFound";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const user = useStore((s) => s.user);
  const initialized = useStore((s) => s.initialized);
  const loading = useStore((s) => s.loading);

  // Mostrar loading apenas enquanto verifica sessão inicial
  // Não bloquear se já inicializou mas está carregando dados
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
};

const App = () => {
  // Inicializar sessão quando a aplicação carrega (apenas uma vez)
  useEffect(() => {
    let mounted = true;
    let authStateChangeHandled = false;

    const init = async () => {
      if (mounted) {
        const { initializeSession } = useStore.getState();
        await initializeSession();
      }
    };

    // Inicializar apenas uma vez
    init();

    // Listener para mudanças na sessão do Supabase Auth
    // Usar um pequeno delay para evitar loops com a inicialização inicial
    let lastEventTime = 0;
    const EVENT_DEBOUNCE_MS = 500; // Evitar processar eventos muito próximos

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Debounce: ignorar eventos muito próximos
      const now = Date.now();
      if (now - lastEventTime < EVENT_DEBOUNCE_MS) {
        console.log('Evento ignorado (debounce):', event);
        return;
      }
      lastEventTime = now;

      // Ignorar eventos durante a inicialização inicial
      if (!authStateChangeHandled) {
        console.log('Evento ignorado (inicialização):', event);
        return;
      }

      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.email);

      const state = useStore.getState();

      if (event === 'SIGNED_IN' && session?.user) {
        // Usuário fez login, restaurar sessão
        // Só reinicializar se não houver usuário atual ou se for um usuário diferente
        if (!state.user || (state.user.authUserId && state.user.authUserId !== session.user.id)) {
          console.log('Reinicializando sessão após SIGNED_IN');
          useStore.setState({ initialized: false, initializing: false });
          const { initializeSession } = useStore.getState();
          await initializeSession();
        } else {
          console.log('Usuário já está logado, ignorando SIGNED_IN');
        }
      } else if (event === 'SIGNED_OUT') {
        // Usuário fez logout
        // Verificar se o logout já foi processado pela função logout()
        const currentState = useStore.getState();
        if (currentState.user) {
          console.log('Processando SIGNED_OUT - limpando estado');
          // Limpar estado mas manter initialized: true para evitar loops
          useStore.setState({ 
            user: null, 
            documents: [], 
            notifications: [], 
            users: [], 
            areas: [],
            initialized: true, // IMPORTANTE: manter true para evitar loops
            initializing: false
          });
        } else {
          console.log('SIGNED_OUT já processado, ignorando');
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token foi renovado, não precisa fazer nada se já temos o usuário
        if (!state.user) {
          console.log('Token renovado mas sem usuário, reinicializando');
          useStore.setState({ initialized: false, initializing: false });
          const { initializeSession } = useStore.getState();
          await initializeSession();
        }
      }
    });

    // Marcar como pronto após um pequeno delay
    setTimeout(() => {
      authStateChangeHandled = true;
    }, 2000);

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Sem dependências para executar apenas uma vez

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/novo-documento" element={<NewDocumentPage />} />
              <Route path="/meus-documentos" element={<MyDocumentsPage />} />
              <Route path="/documento/:id" element={<DocumentDetailPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/gerenciar-usuarios" element={<UsersManagementPage />} />
              <Route path="/gerenciar-areas" element={<AreasManagementPage />} />
              <Route path="/gerenciar-empresas" element={<CompaniesManagementPage />} />
              <Route path="/gerenciar-carimbos" element={<StampsManagementPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
