import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { STATUS_LABELS, STATUS_STYLE, DOC_TYPE_LABELS, ROLE_LABELS, DEPARTMENT_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, XCircle, Send, FileText, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import PdfViewerWithSignature from '@/components/PdfViewerWithSignature';
import { applySignatureToPdf, fetchPdfAsBytes, pdfBytesToDataUrl } from '@/lib/pdfUtils';
import { getPdfUrl } from '@/lib/pdfStorage';

const DocumentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useStore((s) => s.user)!;
  const documents = useStore((s) => s.documents);
  const advanceDocument = useStore((s) => s.advanceDocument);
  const rejectDocument = useStore((s) => s.rejectDocument);
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [signaturePosition, setSignaturePosition] = useState<{ x: number; y: number; width?: number; height?: number; containerWidth?: number; containerHeight?: number; pdfScale?: number; pdfPageWidth?: number; pdfPageHeight?: number; pageNumber?: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const doc = documents.find((d) => d.id === id);
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Documento não encontrado.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const canAct =
    (user.role === 'secretaria_geral' && doc.status === 'pendente_secretaria') ||
    (user.role === 'conselho_admin' && doc.status === 'pendente_conselho');

  const isConselhoSigning = user.role === 'conselho_admin' && doc.status === 'pendente_conselho';
  
  // URL do PDF - sempre usar o PDF assinado se disponível, senão usa o original
  // Em produção, cada documento teria seu próprio PDF, mas para demo usamos o mesmo
  // IMPORTANTE: Se o documento foi assinado, sempre mostrar o PDF assinado
  const pdfUrl = doc.signedPdfUrl || '/documento.pdf';
  
  // Para conselho assinando, sempre usar o PDF original (ainda não assinado)
  const displayPdfUrl = isConselhoSigning ? '/documento.pdf' : pdfUrl;

  const handleAdvance = async () => {
    let action = '';
    if (user.role === 'secretaria_geral') {
      action = 'Encaminhado para Conselho de Administração';
      advanceDocument(doc.id, action, comment || undefined);
      toast({ title: 'Ação realizada com sucesso!' });
      setComment('');
      return;
    } else if (user.role === 'conselho_admin') {
      action = 'Aprovado e assinado';
      if (!signatureUrl || !signaturePosition) {
        toast({ 
          title: 'Assinatura obrigatória', 
          description: 'Por favor, adicione e posicione sua assinatura digital antes de aprovar.',
          variant: 'destructive' 
        });
        return;
      }

      // Aplicar assinatura no PDF
      setIsProcessing(true);
      try {
        // Verificar se pdf-lib está disponível
        try {
          await import('pdf-lib');
        } catch (importError) {
          throw new Error('A biblioteca pdf-lib não está instalada. Execute: npm install');
        }

        // Carregar o PDF original (sempre usar o original, não o assinado se existir)
        const originalPdfUrl = '/documento.pdf';
        const pdfBytes = await fetchPdfAsBytes(originalPdfUrl);
        
        // Aplicar a assinatura no PDF com as dimensões do container e informações do PDF
        // Usar pageNumber da posição (se disponível), senão usar 0 (primeira página)
        const pageIndex = (signaturePosition.pageNumber !== undefined) 
          ? signaturePosition.pageNumber - 1  // Converter para índice baseado em 0
          : 0;
        
        const signedPdfBytes = await applySignatureToPdf(
          pdfBytes,
          signatureUrl,
          {
            x: signaturePosition.x,
            y: signaturePosition.y,
            width: signaturePosition.width || 200, // Usar largura real da assinatura
            height: signaturePosition.height || 100, // Usar altura real da assinatura
            containerWidth: signaturePosition.containerWidth,
            containerHeight: signaturePosition.containerHeight,
            pdfScale: signaturePosition.pdfScale,
            pdfPageWidth: signaturePosition.pdfPageWidth,
            pdfPageHeight: signaturePosition.pdfPageHeight,
          },
          pageIndex // Passar o índice da página onde a assinatura foi posicionada
        );

        // Converter para data URL base64 (persistente)
        const signedPdfUrl = pdfBytesToDataUrl(signedPdfBytes);

        // Avançar o documento com o PDF assinado
        advanceDocument(doc.id, action, comment || undefined, signatureUrl, signedPdfUrl);
        
        // Fazer download automático do PDF assinado
        try {
          const link = document.createElement('a');
          link.href = signedPdfUrl;
          link.download = `${doc.fileName.replace('.pdf', '')}_assinado.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (downloadError) {
          console.warn('Não foi possível fazer download automático:', downloadError);
        }
        
        toast({ 
          title: 'Documento assinado e aprovado com sucesso!',
          description: 'O PDF assinado foi salvo e o download foi iniciado automaticamente.'
        });
        setComment('');
        setSignatureUrl('');
        setSignaturePosition(null);
      } catch (error) {
        console.error('Erro ao aplicar assinatura no PDF:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        toast({ 
          title: 'Erro ao assinar documento', 
          description: errorMessage.length > 100 
            ? 'Não foi possível aplicar a assinatura no PDF. Verifique o console para mais detalhes.'
            : errorMessage,
          variant: 'destructive' 
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = () => {
    if (!comment.trim()) {
      toast({ title: 'Informe a justificativa da rejeição', variant: 'destructive' });
      return;
    }
    rejectDocument(doc.id, comment);
    toast({ title: 'Documento rejeitado.' });
    setComment('');
  };

  const advanceLabel =
    user.role === 'secretaria_geral'
      ? 'Encaminhar para Conselho'
      : 'Aprovar e Assinar';

  const getRoleDisplay = (role: string) => {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  };

  // Componente para visualizar PDF assinado (com suporte a Storage)
  const SignedPdfViewer = ({ signedPdfUrl, fileName }: { signedPdfUrl: string; fileName: string }) => {
    const [displayUrl, setDisplayUrl] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadPdfUrl = async () => {
        try {
          setLoading(true);
          const url = await getPdfUrl(signedPdfUrl);
          setDisplayUrl(url);
        } catch (error) {
          console.error('Erro ao carregar URL do PDF:', error);
          toast({
            title: 'Erro ao carregar PDF assinado',
            description: 'Não foi possível carregar o PDF do Storage.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };

      loadPdfUrl();
    }, [signedPdfUrl]);

    const handleDownload = async () => {
      try {
        const url = await getPdfUrl(signedPdfUrl);
        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName.replace('.pdf', '')}_assinado.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Erro ao baixar PDF:', error);
        toast({
          title: 'Erro ao baixar PDF',
          description: 'Não foi possível baixar o PDF assinado.',
          variant: 'destructive',
        });
      }
    };

    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento Assinado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Carregando PDF...</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!displayUrl) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento Assinado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-muted-foreground">PDF não disponível</p>
              <Button onClick={handleDownload} variant="outline">
                <FileText className="mr-2 h-4 w-4" />Tentar Baixar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documento Assinado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full border rounded-lg overflow-hidden bg-muted" style={{ minHeight: '600px' }}>
            <iframe
              src={displayUrl}
              className="w-full h-full"
              style={{ minHeight: '600px' }}
              title="PDF Assinado"
              onError={() => {
                toast({
                  title: 'Erro ao carregar PDF assinado',
                  description: 'O PDF assinado não pôde ser exibido. Tente baixar o arquivo.',
                  variant: 'destructive',
                });
              }}
            />
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <FileText className="mr-2 h-4 w-4" />Baixar PDF Assinado
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Este documento foi assinado digitalmente e está finalizado.
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {DOC_TYPE_LABELS[doc.type]} · Criado por {doc.createdByName}
            {doc.createdByDepartment && ` (${DEPARTMENT_LABELS[doc.createdByDepartment]})`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[doc.status]}`}>
          {STATUS_LABELS[doc.status]}
        </span>
      </div>

      {/* PDF Viewer com Assinatura - apenas para conselho assinando */}
      {isConselhoSigning && (
        <PdfViewerWithSignature
          pdfUrl={displayPdfUrl}
          defaultSignatureUrl={user.signatureUrl}
          signatureUrl={signatureUrl}
          onSignatureChange={(url, position) => {
            setSignatureUrl(url);
            if (position) {
              setSignaturePosition(position);
            }
          }}
          onRemoveSignature={() => {
            setSignatureUrl('');
            setSignaturePosition(null);
          }}
        />
      )}

      {/* Visualização do PDF assinado - para documentos finalizados */}
      {doc.status === 'finalizado' && doc.signedPdfUrl && !isConselhoSigning && (
        <SignedPdfViewer signedPdfUrl={doc.signedPdfUrl} fileName={doc.fileName} />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descrição</span>
            <span className="text-right text-foreground max-w-[60%]">{doc.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Arquivo</span>
            <span className="flex items-center gap-1 text-primary"><FileText className="h-3 w-3" /> {doc.fileName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span className="text-foreground">{format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Atualizado em</span>
            <span className="text-foreground">{format(new Date(doc.updatedAt), "dd/MM/yyyy 'às' HH:mm")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Tramitação</CardTitle></CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {doc.history.map((h, i) => (
              <div key={h.id} className="relative flex gap-4 pb-6 last:pb-0">
                {i < doc.history.length - 1 && (
                  <div className="absolute left-[11px] top-6 h-full w-0.5 bg-border" />
                )}
                <div className="relative z-10 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                  <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{h.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.userName} ({getRoleDisplay(h.userRole)}) · {format(new Date(h.timestamp), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                  {h.comment && (
                    <p className="mt-1 rounded-md bg-accent px-3 py-2 text-sm text-foreground">"{h.comment}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      {doc.signatures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Assinaturas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {doc.signatures.map((sig, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <PenTool className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{sig.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleDisplay(sig.role)} · {format(new Date(sig.timestamp), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
                {sig.signatureUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={sig.signatureUrl} 
                      alt={`Assinatura de ${sig.userName}`}
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canAct && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={user.role === 'conselho_admin' ? 'Adicionar parecer...' : 'Adicionar comentário...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleAdvance} className="flex-1 gap-2" disabled={isProcessing}>
                {isProcessing ? (
                  <>Processando...</>
                ) : user.role === 'conselho_admin' ? (
                  <><PenTool className="h-4 w-4" /> {advanceLabel}</>
                ) : (
                  <><Send className="h-4 w-4" /> {advanceLabel}</>
                )}
              </Button>
              {user.role === 'conselho_admin' && (
                <Button variant="destructive" onClick={handleReject} className="flex-1 gap-2">
                  <XCircle className="h-4 w-4" /> Rejeitar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentDetailPage;
