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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const user = useStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
};

const App = () => (
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
