import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { ROLE_LABELS } from '@/types';
import { FileText, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as supabaseService from '@/lib/supabaseService';
import { User } from '@/types';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const login = useStore((s) => s.login);
  const currentUser = useStore((s) => s.user);
  const navigate = useNavigate();

  const initialized = useStore((s) => s.initialized);
  const initializing = useStore((s) => s.initializing);

  // Carregar usuários do banco para exibir na página de login
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await supabaseService.getUsers();
        setDemoUsers(users);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Mostrar loading apenas enquanto verifica sessão inicial
  // Não bloquear se já inicializou
  if (!initialized || initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (currentUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Credenciais inválidas. Use um dos emails cadastrados.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img src="/logoWhite.png" alt="Logo" className="h-20 w-auto" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrar</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full gap-2">
                <LogIn className="h-4 w-4" /> Entrar
              </Button>
            </form>

            {demoUsers.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">Usuários cadastrados:</p>
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">Carregando usuários...</p>
                ) : (
                  <div className="space-y-2">
                    {demoUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setEmail(u.email); setPassword('demo'); }}
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="font-medium text-foreground">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
