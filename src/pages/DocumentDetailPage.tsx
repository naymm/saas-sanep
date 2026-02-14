import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { STATUS_LABELS, STATUS_STYLE, DOC_TYPE_LABELS, ROLE_LABELS, DEPARTMENT_LABELS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, XCircle, Send, FileText, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import PdfViewerWithSignature from '@/components/PdfViewerWithSignature';
import { applySignatureToPdf, applyStampToPdf, fetchPdfAsBytes, pdfBytesToDataUrl } from '@/lib/pdfUtils';
import { getPdfUrl } from '@/lib/pdfStorage';
import * as supabaseService from '@/lib/supabaseService';
import { Stamp } from 'lucide-react';

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
  // Estados para seleção de membro(s) do conselho
  const [conselhoAssignmentType, setConselhoAssignmentType] = useState<'single' | 'all'>('single');
  const [selectedConselhoUserId, setSelectedConselhoUserId] = useState<string>('');
  const users = useStore((s) => s.users);
  // Estados para seleção de empresa e carimbo
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedStampId, setSelectedStampId] = useState<string>('');
  const [stampUrl, setStampUrl] = useState<string>('');
  const [stampPosition, setStampPosition] = useState<{ x: number; y: number; width?: number; height?: number; containerWidth?: number; containerHeight?: number; pdfScale?: number; pdfPageWidth?: number; pdfPageHeight?: number; pageNumber?: number } | null>(null);
  const companies = useStore((s) => s.companies);
  const companyStamps = useStore((s) => s.companyStamps);
  
  // Filtrar carimbos por empresa selecionada
  const availableStamps = selectedCompanyId 
    ? companyStamps.filter(stamp => stamp.companyId === selectedCompanyId)
    : [];
  
  // Filtrar apenas membros do conselho
  const conselhoMembers = users.filter((u) => u.role === 'conselho_admin');

  const doc = documents.find((d) => d.id === id);
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Documento não encontrado.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  // Secretaria pode atuar quando:
  // 1. Documento está pendente_secretaria (novo ou retornado do conselho)
  // 2. Se já foi assinado pelo conselho, pode finalizar
  const canSecretariaAct = user.role === 'secretaria_geral' && doc.status === 'pendente_secretaria';
  
  // Conselho pode atuar quando:
  // 1. Documento está pendente_conselho
  // 2. Se for para membro específico, verificar se é para este membro
  // 3. Se for para todos, verificar se ainda não assinou
  const canConselhoAct = user.role === 'conselho_admin' && doc.status === 'pendente_conselho' && (
    // Se for para todos os membros, verificar se ainda não assinou
    (doc.assignedToAllConselho && !doc.signatures?.some(sig => sig.role === 'conselho_admin' && sig.userId === user.id)) ||
    // Se for para membro específico, verificar se é para este membro
    (doc.assignedToConselhoUserId === user.id) ||
    // Fallback: se não tem atribuição definida (compatibilidade com documentos antigos)
    (!doc.assignedToAllConselho && !doc.assignedToConselhoUserId)
  );
  
  const canAct = canSecretariaAct || canConselhoAct;
  
  // Verificar se documento já foi assinado pelo conselho
  const hasConselhoSignature = doc.signatures && doc.signatures.some(sig => sig.role === 'conselho_admin');

  const isConselhoSigning = user.role === 'conselho_admin' && doc.status === 'pendente_conselho';
  
  // URL do PDF - usar originalPdfStoragePath que contém o PDF assinado se o documento foi finalizado
  // Se o documento foi assinado, o originalPdfStoragePath já contém o PDF assinado (substituído)
  const [displayPdfUrl, setDisplayPdfUrl] = useState<string>('/documento.pdf');
  const [pdfUrlError, setPdfUrlError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadPdfUrl = async () => {
      try {
        setPdfUrlError(null);
        let url: string | undefined;
        
        if (isConselhoSigning) {
          // Para conselho assinando, verificar se há PDF já assinado (múltiplas assinaturas)
          // Se há PDF assinado (com "signed_" no nome), usar esse como base para aplicar nova assinatura
          // Se não há, usar o PDF original (primeira assinatura)
          const hasSignedPdf = doc.signedPdfStoragePath && supabaseService.isSignedPdfPath(doc.signedPdfStoragePath);
          const hasSignedOriginal = doc.originalPdfStoragePath && supabaseService.isSignedPdfPath(doc.originalPdfStoragePath);
          
          if (hasSignedPdf && doc.signedPdfStoragePath) {
            // Há PDF já assinado - usar como base (contém assinaturas anteriores)
            console.log('📄 Conselho assinando - usando PDF já assinado como base:', doc.signedPdfStoragePath);
            url = await getPdfUrl(doc.signedPdfStoragePath);
          } else if (hasSignedOriginal && doc.originalPdfStoragePath) {
            // PDF original foi substituído e agora está assinado
            console.log('📄 Conselho assinando - usando PDF original (já assinado):', doc.originalPdfStoragePath);
            url = await getPdfUrl(doc.originalPdfStoragePath);
          } else if (doc.originalPdfStoragePath) {
            // Primeira assinatura - usar PDF original
            console.log('📄 Conselho assinando - usando PDF original (primeira assinatura):', doc.originalPdfStoragePath);
            url = await getPdfUrl(doc.originalPdfStoragePath);
          } else {
            url = '/documento.pdf';
          }
        } else if (doc.status === 'finalizado') {
          // Documento finalizado: SEMPRE usar o PDF assinado
          // Prioridade: signedPdfUrl > signedPdfStoragePath > originalPdfStoragePath (que foi substituído pelo assinado)
          console.log('📄 Carregando PDF assinado para documento finalizado:', {
            hasSignedPdfUrl: !!doc.signedPdfUrl,
            hasSignedPdfStoragePath: !!doc.signedPdfStoragePath,
            hasOriginalPdfStoragePath: !!doc.originalPdfStoragePath,
            signedPdfUrl: doc.signedPdfUrl?.substring(0, 100),
            signedPdfStoragePath: doc.signedPdfStoragePath,
            originalPdfStoragePath: doc.originalPdfStoragePath,
          });
          
          if (doc.signedPdfUrl) {
            url = await getPdfUrl(doc.signedPdfUrl);
            console.log('✅ Usando signedPdfUrl:', url?.substring(0, 100));
          } else if (doc.signedPdfStoragePath) {
            url = await getPdfUrl(doc.signedPdfStoragePath);
            console.log('✅ Usando signedPdfStoragePath:', url?.substring(0, 100));
          } else if (doc.originalPdfStoragePath) {
            // Se não há signedPdfUrl/signedPdfStoragePath, o originalPdfStoragePath foi substituído pelo assinado
            url = await getPdfUrl(doc.originalPdfStoragePath);
            console.log('✅ Usando originalPdfStoragePath (substituído pelo assinado):', url?.substring(0, 100));
          } else {
            setPdfUrlError('PDF assinado não encontrado para documento finalizado');
            console.error('❌ PDF assinado não encontrado para documento finalizado');
          }
        } else {
          // Documento ainda não finalizado: verificar se há PDF assinado
          // Prioridade: signedPdfStoragePath (se contém "signed_") > originalPdfStoragePath
          const hasSignedPdf = doc.signedPdfStoragePath && supabaseService.isSignedPdfPath(doc.signedPdfStoragePath);
          const hasSignedOriginal = doc.originalPdfStoragePath && supabaseService.isSignedPdfPath(doc.originalPdfStoragePath);
          
          if (hasSignedPdf && doc.signedPdfStoragePath) {
            // Há PDF assinado - usar esse (contém assinaturas anteriores)
            console.log('📄 Documento em tramitação - usando PDF assinado:', doc.signedPdfStoragePath);
            url = await getPdfUrl(doc.signedPdfStoragePath);
          } else if (hasSignedOriginal && doc.originalPdfStoragePath) {
            // PDF original foi substituído e agora está assinado
            console.log('📄 Documento em tramitação - usando PDF original (já assinado):', doc.originalPdfStoragePath);
            url = await getPdfUrl(doc.originalPdfStoragePath);
          } else if (doc.signedPdfStoragePath) {
            // Usar signedPdfStoragePath mesmo que não tenha "signed_" (compatibilidade)
            console.log('📄 Documento em tramitação - usando signedPdfStoragePath:', doc.signedPdfStoragePath);
            url = await getPdfUrl(doc.signedPdfStoragePath);
          } else if (doc.originalPdfStoragePath) {
            // Usar PDF original
            console.log('📄 Documento em tramitação - usando PDF original:', doc.originalPdfStoragePath);
            url = await getPdfUrl(doc.originalPdfStoragePath);
          } else if (doc.signedPdfUrl) {
            // Fallback: usar signedPdfUrl se disponível
            url = await getPdfUrl(doc.signedPdfUrl);
          } else {
            url = '/documento.pdf'; // Fallback para demo
          }
        }
        
        if (url) {
          setDisplayPdfUrl(url);
        } else {
          setPdfUrlError('URL do PDF não disponível');
        }
      } catch (error) {
        console.error('Erro ao carregar URL do PDF:', error);
        setPdfUrlError(error instanceof Error ? error.message : 'Erro desconhecido');
        // Usar fallback em caso de erro
        setDisplayPdfUrl('/documento.pdf');
      }
    };
    
    loadPdfUrl();
  }, [doc.originalPdfStoragePath, doc.signedPdfUrl, doc.signedPdfStoragePath, doc.status, isConselhoSigning]);

  const handleAdvance = async () => {
    let action = '';
    if (user.role === 'secretaria_geral') {
      // Se já foi assinado pelo conselho, finalizar. Senão, encaminhar para conselho
      if (hasConselhoSignature) {
        action = 'Documento finalizado';
      } else {
        // Validar seleção de membro(s) do conselho
        if (conselhoAssignmentType === 'single' && !selectedConselhoUserId) {
          toast({ 
            title: 'Selecione um membro do conselho', 
            variant: 'destructive' 
          });
          return;
        }
        if (conselhoAssignmentType === 'all' && conselhoMembers.length === 0) {
          toast({ 
            title: 'Nenhum membro do conselho encontrado', 
            variant: 'destructive' 
          });
          return;
        }
        action = conselhoAssignmentType === 'all' 
          ? 'Encaminhado para todos os membros do Conselho de Administração'
          : 'Encaminhado para Conselho de Administração';
      }
      
      try {
        setIsProcessing(true);
        await advanceDocument(
          doc.id, 
          action, 
          comment || undefined,
          undefined, // signatureUrl
          undefined, // signedPdfUrl
          conselhoAssignmentType === 'single' ? selectedConselhoUserId : undefined,
          conselhoAssignmentType === 'all'
        );
        toast({ title: 'Ação realizada com sucesso!' });
        setComment('');
        setSelectedConselhoUserId('');
        setConselhoAssignmentType('single');
      } catch (error: any) {
        console.error('Erro ao encaminhar documento:', error);
        toast({ 
          title: 'Erro ao encaminhar documento', 
          description: error.message || 'Ocorreu um erro inesperado.',
          variant: 'destructive' 
        });
      } finally {
        setIsProcessing(false);
      }
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

        // Carregar o PDF base para aplicar a nova assinatura
        // IMPORTANTE: Usar nomenclatura para identificar PDFs assinados (contém "signed_" no nome)
        // Isso é mais confiável que verificar assinaturas no banco
        let pdfBytes: Uint8Array;
        
        // Verificar se há PDF já assinado usando nomenclatura (contém "signed_" no nome)
        const hasSignedPdfPath = doc.signedPdfStoragePath && supabaseService.isSignedPdfPath(doc.signedPdfStoragePath);
        const hasSignedOriginalPath = doc.originalPdfStoragePath && supabaseService.isSignedPdfPath(doc.originalPdfStoragePath);
        
        console.log('🔍 Verificando PDF base para assinatura:', {
          hasSignedPdfPath,
          hasSignedOriginalPath,
          signedPdfStoragePath: doc.signedPdfStoragePath,
          originalPdfStoragePath: doc.originalPdfStoragePath,
          isSignedPdfPath: doc.signedPdfStoragePath ? supabaseService.isSignedPdfPath(doc.signedPdfStoragePath) : false,
          isSignedOriginalPath: doc.originalPdfStoragePath ? supabaseService.isSignedPdfPath(doc.originalPdfStoragePath) : false,
        });
        
        // Se há PDF já assinado (identificado pelo nome), usar esse como base
        if (hasSignedPdfPath && doc.signedPdfStoragePath) {
          // PDF já assinado existe - usar como base para preservar assinaturas anteriores
          console.log('📄 Usando PDF já assinado como base (preservando assinaturas anteriores):', doc.signedPdfStoragePath);
          pdfBytes = await supabaseService.downloadSignedPdf(doc.signedPdfStoragePath);
        } else if (hasSignedOriginalPath && doc.originalPdfStoragePath) {
          // PDF original foi substituído e agora está assinado - usar como base
          console.log('📄 Usando PDF original (já assinado) como base:', doc.originalPdfStoragePath);
          pdfBytes = await supabaseService.downloadSignedPdf(doc.originalPdfStoragePath);
        } else if (doc.originalPdfStoragePath) {
          // Primeira assinatura - usar PDF original
          console.log('📄 Usando PDF original (primeira assinatura):', doc.originalPdfStoragePath);
          pdfBytes = await supabaseService.downloadSignedPdf(doc.originalPdfStoragePath);
        } else {
          // Fallback: usar PDF de demonstração
          console.log('⚠️ Nenhum PDF encontrado, usando fallback');
          pdfBytes = await fetchPdfAsBytes('/documento.pdf');
        }
        
        // Aplicar a assinatura no PDF com as dimensões do container e informações do PDF
        // Usar pageNumber da posição (se disponível), senão usar 0 (primeira página)
        const signaturePageIndex = (signaturePosition.pageNumber !== undefined) 
          ? signaturePosition.pageNumber - 1  // Converter para índice baseado em 0
          : 0;
        
        let pdfBytesWithSignature = await applySignatureToPdf(
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
          signaturePageIndex // Passar o índice da página onde a assinatura foi posicionada
        );

        // Se houver carimbo selecionado, aplicar após a assinatura
        if (stampUrl && stampPosition) {
          const stampPageIndex = (stampPosition.pageNumber !== undefined)
            ? stampPosition.pageNumber - 1
            : 0;
          
          pdfBytesWithSignature = await applyStampToPdf(
            pdfBytesWithSignature,
            stampUrl,
            {
              x: stampPosition.x,
              y: stampPosition.y,
              width: stampPosition.width || 150,
              height: stampPosition.height || 150,
              containerWidth: stampPosition.containerWidth,
              containerHeight: stampPosition.containerHeight,
              pdfScale: stampPosition.pdfScale,
              pdfPageWidth: stampPosition.pdfPageWidth,
              pdfPageHeight: stampPosition.pdfPageHeight,
            },
            stampPageIndex
          );
        }

        // Converter para data URL base64 (persistente)
        const signedPdfUrl = pdfBytesToDataUrl(pdfBytesWithSignature);

        // Avançar o documento com o PDF assinado (e carimbado, se houver)
        // O carimbo já está aplicado no PDF (signedPdfUrl), não precisa passar separadamente
        await advanceDocument(doc.id, action, comment || undefined, signatureUrl, signedPdfUrl);
        
        toast({ 
          title: 'Documento assinado e aprovado com sucesso!',
          description: 'O PDF assinado foi salvo e o documento foi finalizado.'
        });
        
        setComment('');
        setSignatureUrl('');
        setSignaturePosition(null);
        setSelectedCompanyId('');
        setSelectedStampId('');
        setStampUrl('');
        setStampPosition(null);
        setIsProcessing(false);
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

  // Determinar label do botão baseado no estado do documento
  const advanceLabel = (() => {
    if (user.role === 'secretaria_geral') {
      // Se já foi assinado pelo conselho, finalizar. Senão, encaminhar para conselho
      return hasConselhoSignature ? 'Finalizar Documento' : 'Encaminhar para Conselho de Administração';
    } else if (user.role === 'conselho_admin') {
      return 'Aprovar e Assinar';
    }
    return 'Avançar';
  })();

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
          // Adicionar cache-busting para garantir que o PDF assinado seja carregado
          let urlToLoad = signedPdfUrl;
          if (urlToLoad && !urlToLoad.includes('?t=')) {
            // Se a URL não tem timestamp, adicionar para evitar cache
            const url = new URL(urlToLoad, window.location.href);
            url.searchParams.set('t', Date.now().toString());
            urlToLoad = url.toString();
          }
          const url = await getPdfUrl(urlToLoad);
          setDisplayUrl(url);
          console.log('📄 PDF assinado carregado para visualização:', url);
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

      {/* PDF Viewer com Assinatura e Carimbo - apenas para conselho assinando */}
      {isConselhoSigning && (
        <>
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
            stampUrl={stampUrl}
            onStampChange={(url, position) => {
              setStampUrl(url);
              if (position) {
                setStampPosition(position);
              }
            }}
            onRemoveStamp={() => {
              setStampUrl('');
              setStampPosition(null);
              setSelectedStampId('');
            }}
          />
          
          {/* Seleção de Empresa e Carimbo - apenas após assinatura estar posicionada */}
          {signatureUrl && signaturePosition && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stamp className="h-5 w-5" />
                  Selecionar Carimbo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select
                    value={selectedCompanyId}
                    onValueChange={(value) => {
                      setSelectedCompanyId(value);
                      setSelectedStampId(''); // Limpar carimbo quando mudar empresa
                      setStampUrl('');
                      setStampPosition(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} ({company.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedCompanyId && availableStamps.length > 0 && (
                  <div className="space-y-2">
                    <Label>Título do Carimbo *</Label>
                    <Select
                      value={selectedStampId}
                      onValueChange={(value) => {
                        setSelectedStampId(value);
                        const selectedStamp = availableStamps.find(s => s.id === value);
                        if (selectedStamp) {
                          setStampUrl(selectedStamp.stampUrl);
                          setStampPosition(null); // Resetar posição para posicionar novamente
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o carimbo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStamps.map((stamp) => (
                          <SelectItem key={stamp.id} value={stamp.id}>
                            <div className="flex items-center gap-2">
                              <img 
                                src={stamp.stampUrl} 
                                alt={stamp.title}
                                className="h-6 w-6 object-contain"
                              />
                              <span>{stamp.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedCompanyId && availableStamps.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum carimbo cadastrado para esta empresa.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Preview do PDF para Área (criador) - quando documento está em tramitação */}
      {user.role === 'area' && doc.createdBy === user.id && !isConselhoSigning && doc.status !== 'finalizado' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Visualização do Documento
              <span className="ml-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                Em Tramitação
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full border rounded-lg overflow-hidden bg-muted" style={{ minHeight: '600px' }}>
              {pdfUrlError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-4">
                  <p className="text-destructive">{pdfUrlError}</p>
                  <Button variant="outline" onClick={() => {
                    const link = document.createElement('a');
                    link.href = displayPdfUrl;
                    link.target = '_blank';
                    link.click();
                  }}>
                    <FileText className="mr-2 h-4 w-4" />Abrir PDF em Nova Aba
                  </Button>
                </div>
              ) : (
                <iframe
                  src={displayPdfUrl}
                  className="w-full h-full"
                  style={{ minHeight: '600px' }}
                  title="Preview do Documento"
                  onError={() => {
                    setPdfUrlError('Erro ao carregar PDF');
                    toast({
                      title: 'Erro ao carregar PDF',
                      description: 'Não foi possível exibir o PDF. Tente abrir em nova aba.',
                      variant: 'destructive',
                    });
                  }}
                />
              )}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => {
                const link = document.createElement('a');
                link.href = displayPdfUrl;
                link.download = doc.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <FileText className="mr-2 h-4 w-4" />Baixar PDF
              </Button>
              <Button variant="outline" onClick={() => {
                const link = document.createElement('a');
                link.href = displayPdfUrl;
                link.target = '_blank';
                link.click();
              }}>
                <FileText className="mr-2 h-4 w-4" />Abrir em Nova Aba
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview do PDF para Secretaria - quando documento está pendente_secretaria */}
      {canSecretariaAct && !isConselhoSigning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Visualização do Documento
              {hasConselhoSignature && (
                <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                  Assinado pelo Conselho
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full border rounded-lg overflow-hidden bg-muted" style={{ minHeight: '600px' }}>
              {pdfUrlError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-4">
                  <p className="text-destructive">{pdfUrlError}</p>
                  <Button variant="outline" onClick={() => {
                    const link = document.createElement('a');
                    link.href = displayPdfUrl;
                    link.target = '_blank';
                    link.click();
                  }}>
                    <FileText className="mr-2 h-4 w-4" />Abrir PDF em Nova Aba
                  </Button>
                </div>
              ) : (
                <iframe
                  src={displayPdfUrl}
                  className="w-full h-full"
                  style={{ minHeight: '600px' }}
                  title="Preview do Documento"
                  onError={() => {
                    setPdfUrlError('Erro ao carregar PDF');
                    toast({
                      title: 'Erro ao carregar PDF',
                      description: 'Não foi possível exibir o PDF. Tente abrir em nova aba.',
                      variant: 'destructive',
                    });
                  }}
                />
              )}
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => {
                const link = document.createElement('a');
                link.href = displayPdfUrl;
                link.download = doc.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <FileText className="mr-2 h-4 w-4" />Baixar PDF
              </Button>
              <Button variant="outline" onClick={() => {
                const link = document.createElement('a');
                link.href = displayPdfUrl;
                link.target = '_blank';
                link.click();
              }}>
                <FileText className="mr-2 h-4 w-4" />Abrir em Nova Aba
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualização do PDF assinado - para documentos finalizados */}
      {/* Mostrar para todos os usuários (Secretaria, Conselho, Área) quando o documento está finalizado */}
      {/* IMPORTANTE: Documentos finalizados SEMPRE mostram o PDF assinado */}
      {doc.status === 'finalizado' && (doc.signedPdfUrl || doc.signedPdfStoragePath || doc.originalPdfStoragePath) && !isConselhoSigning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento Finalizado e Assinado
              <span className="ml-2 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                Assinado Digitalmente
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignedPdfViewer 
              signedPdfUrl={doc.signedPdfUrl || displayPdfUrl} 
              fileName={doc.fileName} 
            />
          </CardContent>
        </Card>
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
          {doc.history && doc.history.length > 0 ? (
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
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma ação registrada ainda.
            </div>
          )}
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

      {/* Seleção de membro(s) do conselho - apenas para secretaria quando vai encaminhar */}
      {canSecretariaAct && !hasConselhoSignature && conselhoMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Direcionar para Conselho de Administração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Selecione o destino do documento:</Label>
              <RadioGroup
                value={conselhoAssignmentType}
                onValueChange={(value) => {
                  setConselhoAssignmentType(value as 'single' | 'all');
                  if (value === 'all') {
                    setSelectedConselhoUserId('');
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">
                    Um membro específico do conselho
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">
                    Todos os membros do conselho (para pareceres)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {conselhoAssignmentType === 'single' && (
              <div className="space-y-2">
                <Label htmlFor="conselho-member">Selecione o membro:</Label>
                <Select
                  value={selectedConselhoUserId}
                  onValueChange={setSelectedConselhoUserId}
                >
                  <SelectTrigger id="conselho-member">
                    <SelectValue placeholder="Selecione um membro do conselho" />
                  </SelectTrigger>
                  <SelectContent>
                    {conselhoMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} {member.email && `(${member.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {conselhoAssignmentType === 'all' && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  O documento será enviado para todos os {conselhoMembers.length} membro(s) do conselho.
                  O primeiro que assinar encaminhará para o próximo, e após todos assinarem, o documento será finalizado automaticamente.
                </p>
              </div>
            )}
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
