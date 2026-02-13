import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { MOCK_USERS } from '@/data/mock';
import { ROLE_LABELS } from '@/types';
import { FileText, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useStore((s) => s.login);
  const currentUser = useStore((s) => s.user);
  const navigate = useNavigate();

  if (currentUser) return <Navigate to="/" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/');
    } else {
      setError('Credenciais inválidas. Use um dos emails de demonstração.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DocFlow</h1>
          <p className="text-muted-foreground">Gestão de Fluxo de Documentos</p>
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

            <div className="mt-6 border-t pt-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Contas de demonstração:</p>
              <div className="space-y-2">
                {MOCK_USERS.map((u) => (
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
