import { useStore } from '@/store/useStore';
import { ROLE_LABELS, DEPARTMENT_LABELS, STATUS_LABELS, STATUS_STYLE, DOC_TYPE_LABELS } from '@/types';
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const DashboardPage = () => {
  const user = useStore((s) => s.user)!;
  const documents = useStore((s) => s.documents);
  const navigate = useNavigate();

  const pending = documents.filter((d) => {
    if (user.role === 'secretaria_geral') return d.status === 'pendente_secretaria';
    if (user.role === 'conselho_admin') return d.status === 'pendente_conselho';
    return false;
  });

  const inProgress = documents.filter(
    (d) => d.createdBy === user.id && !['finalizado', 'rejeitado'].includes(d.status)
  );

  const finished = documents.filter((d) => {
    // Área: apenas documentos que criou
    if (user.role === 'area') {
      return d.createdBy === user.id && ['finalizado', 'rejeitado'].includes(d.status);
    }
    // Secretaria Geral e Conselho: todos os documentos finalizados
    if (user.role === 'secretaria_geral' || user.role === 'conselho_admin') {
      return d.status === 'finalizado';
    }
    // Outros roles: apenas documentos que criou
    return d.createdBy === user.id && ['finalizado', 'rejeitado'].includes(d.status);
  });

  const roleLabel = user.role === 'area' && user.department
    ? DEPARTMENT_LABELS[user.department]
    : ROLE_LABELS[user.role];

  const stats = [
    { label: 'Pendentes', value: pending.length, icon: AlertCircle, color: 'text-warning' },
    { label: 'Em Tramitação', value: inProgress.length, icon: Clock, color: 'text-primary' },
    { label: 'Finalizados', value: finished.length, icon: CheckCircle, color: 'text-success' },
    { label: 'Total', value: documents.length, icon: FileText, color: 'text-muted-foreground' },
  ];

  const recent = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {user.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">{roleLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl bg-accent p-3 ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-40">
            {[
              { label: 'Pendente', count: documents.filter(d => ['pendente_secretaria', 'pendente_conselho'].includes(d.status)).length, bg: 'bg-warning' },
              { label: 'Finalizado', count: documents.filter(d => d.status === 'finalizado').length, bg: 'bg-success' },
              { label: 'Rejeitado', count: documents.filter(d => d.status === 'rejeitado').length, bg: 'bg-destructive' },
            ].map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-lg ${bar.bg} transition-all`}
                  style={{ height: `${Math.max((bar.count / Math.max(documents.length, 1)) * 120, 8)}px` }}
                />
                <span className="text-xs text-muted-foreground">{bar.label}</span>
                <span className="text-sm font-semibold text-foreground">{bar.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Documentos Recentes</CardTitle>
          <button
            onClick={() => navigate('/meus-documentos')}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recent.map((doc) => (
              <button
                key={doc.id}
                onClick={() => navigate(`/documento/${doc.id}`)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOC_TYPE_LABELS[doc.type]} · {format(new Date(doc.updatedAt), 'dd/MM/yyyy')}
                  </p>
                </div>
                <span className={`ml-3 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[doc.status]}`}>
                  {STATUS_LABELS[doc.status]}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
