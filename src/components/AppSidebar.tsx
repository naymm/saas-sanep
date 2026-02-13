import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { ROLE_LABELS, DEPARTMENT_LABELS } from '@/types';
import { FileText, LayoutDashboard, FilePlus, FolderOpen, UserCircle, LogOut, X, Users, Building2 } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/novo-documento', label: 'Novo Documento', icon: FilePlus, roles: ['area', 'secretaria_geral'] as string[] },
  { to: '/meus-documentos', label: 'Meus Documentos', icon: FolderOpen },
  { to: '/perfil', label: 'Perfil', icon: UserCircle },
  { to: '/gerenciar-usuarios', label: 'Gerenciar Usuários', icon: Users, roles: ['master'] as string[] },
  { to: '/gerenciar-areas', label: 'Gerenciar Áreas', icon: Building2, roles: ['master'] as string[] },
];

const AppSidebar = ({ open, onClose }: SidebarProps) => {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const location = useLocation();

  if (!user) return null;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-bold">DocFlow</span>
          </div>
          <button className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-4 mb-4 rounded-lg bg-sidebar-accent p-3">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-sidebar-muted">{user.role === 'area' && user.department ? DEPARTMENT_LABELS[user.department] : ROLE_LABELS[user.role]}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(user.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
