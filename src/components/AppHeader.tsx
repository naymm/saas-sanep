import { useStore } from '@/store/useStore';
import { Bell, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HeaderProps {
  onMenuClick: () => void;
}

const AppHeader = ({ onMenuClick }: HeaderProps) => {
  const user = useStore((s) => s.user);
  const notifications = useStore((s) => s.notifications);
  const markNotificationRead = useStore((s) => s.markNotificationRead);
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const myNotifs = notifications.filter((n) => n.userId === user?.id);
  const unreadCount = myNotifs.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <button className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5 text-foreground" />
      </button>
      <div className="hidden lg:block">
        <h2 className="text-sm font-semibold text-foreground">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h2>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="relative rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border bg-card shadow-lg animate-fade-in">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {myNotifs.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
              ) : (
                myNotifs.slice(0, 10).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      setShowNotifs(false);
                      navigate(`/documento/${n.documentId}`);
                    }}
                    className={`flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-accent ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <span className="text-sm text-foreground">{n.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(n.timestamp), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
