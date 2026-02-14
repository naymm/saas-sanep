import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { STATUS_LABELS, STATUS_STYLE, DOC_TYPE_LABELS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

type Tab = 'pendentes' | 'tramitacao' | 'finalizados';

const MyDocumentsPage = () => {
  const user = useStore((s) => s.user)!;
  const documents = useStore((s) => s.documents);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pendentes');

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

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pendentes', label: 'Pendentes', count: pending.length },
    { key: 'tramitacao', label: 'Em Tramitação', count: inProgress.length },
    { key: 'finalizados', label: 'Finalizados', count: finished.length },
  ];

  const currentDocs = tab === 'pendentes' ? pending : tab === 'tramitacao' ? inProgress : finished;

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meus Documentos</h1>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  tab === t.key
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : t.key === 'pendentes'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {currentDocs.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhum documento nesta categoria.</p>
          ) : (
            <div className="divide-y">
              {currentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/documento/${doc.id}`)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {DOC_TYPE_LABELS[doc.type]} · {doc.createdByName} · {format(new Date(doc.createdAt), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[doc.status]}`}>
                    {STATUS_LABELS[doc.status]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyDocumentsPage;
