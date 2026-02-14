import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, PenTool, X, Move, Check, Stamp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PdfCanvasViewer from './PdfCanvasViewer';

interface PdfViewerWithSignatureProps {
  pdfUrl: string;
  defaultSignatureUrl?: string; // Assinatura padrão do perfil do usuário
  signatureUrl?: string; // Assinatura selecionada para este documento
  onSignatureChange: (signatureUrl: string, position?: { x: number; y: number; width?: number; height?: number; containerWidth?: number; containerHeight?: number; pdfScale?: number; pdfPageWidth?: number; pdfPageHeight?: number; pageNumber?: number }) => void;
  onRemoveSignature?: () => void;
  // Props para carimbo
  stampUrl?: string; // Carimbo selecionado
  onStampChange?: (stampUrl: string, position?: { x: number; y: number; width?: number; height?: number; containerWidth?: number; containerHeight?: number; pdfScale?: number; pdfPageWidth?: number; pdfPageHeight?: number; pageNumber?: number }) => void;
  onRemoveStamp?: () => void;
}

const PdfViewerWithSignature = ({
  pdfUrl,
  defaultSignatureUrl,
  signatureUrl,
  onSignatureChange,
  onRemoveSignature,
  stampUrl,
  onStampChange,
  onRemoveStamp,
}: PdfViewerWithSignatureProps) => {
  const [signaturePosition, setSignaturePosition] = useState({ x: 50, y: 50 });
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [signatureDragOffset, setSignatureDragOffset] = useState({ x: 0, y: 0 });
  const [pdfError, setPdfError] = useState(false);
  const [signatureSize, setSignatureSize] = useState({ width: 200, height: 100 });
  const [pdfInfo, setPdfInfo] = useState<{ scale: number; pageWidth: number; pageHeight: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [signaturePage, setSignaturePage] = useState<number | null>(null); // Página onde a assinatura foi posicionada
  // Estados para carimbo
  const [stampPosition, setStampPosition] = useState({ x: 200, y: 50 });
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);
  const [stampDragOffset, setStampDragOffset] = useState({ x: 0, y: 0 });
  const [stampSize, setStampSize] = useState({ width: 150, height: 150 });
  const [stampPage, setStampPage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<HTMLImageElement>(null);
  const stampRef = useRef<HTMLImageElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handlePdfLoaded = useCallback((pageWidth: number, pageHeight: number, scale: number, canvasWidth: number, canvasHeight: number, pageNumber?: number, totalPages?: number) => {
    setPdfInfo({ scale, pageWidth, pageHeight });
    // Atualizar página atual quando o PDF carregar ou mudar de página
    if (pageNumber) {
      setCurrentPage(pageNumber);
    }
    // Atualizar dimensões do container quando o PDF carregar
    if (canvasContainerRef.current) {
      // O canvas tem dimensões exatas, usar essas
      canvasContainerRef.current.style.width = `${canvasWidth}px`;
      canvasContainerRef.current.style.height = `${canvasHeight}px`;
    }
    // Log para debug (pode ser útil saber em qual página estamos)
    if (pageNumber && totalPages) {
      console.log(`PDF carregado: página ${pageNumber} de ${totalPages}`);
    }
  }, []);

  const handleUseDefaultSignature = useCallback(() => {
    if (defaultSignatureUrl && canvasContainerRef.current) {
      // Resetar posição quando aplicar assinatura padrão
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const initialPosition = { x: 50, y: 50 };
      setSignaturePosition(initialPosition);
      // Definir a página atual como a página da assinatura
      setSignaturePage(currentPage);
      // Usar tamanho padrão inicialmente, será atualizado quando a imagem carregar
      onSignatureChange(defaultSignatureUrl, {
        ...initialPosition,
        width: 200,
        height: 100,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        pdfScale: pdfInfo?.scale,
        pdfPageWidth: pdfInfo?.pageWidth,
        pdfPageHeight: pdfInfo?.pageHeight,
        pageNumber: currentPage, // Incluir número da página
      });
    }
  }, [defaultSignatureUrl, onSignatureChange, pdfInfo, currentPage]);

  const handleSignatureMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!signatureRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingSignature(true);
      const rect = signatureRef.current.getBoundingClientRect();
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setSignatureDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  const handleStampMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!stampRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingStamp(true);
      const rect = stampRef.current.getBoundingClientRect();
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setStampDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDraggingSignature && canvasContainerRef.current && signatureRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const signatureRect = signatureRef.current.getBoundingClientRect();
        
        const newX = e.clientX - containerRect.left - signatureDragOffset.x;
        const newY = e.clientY - containerRect.top - signatureDragOffset.y;

        const signatureWidth = signatureRect.width || 200;
        const signatureHeight = signatureRect.height || 100;
        const maxX = containerRect.width - signatureWidth;
        const maxY = containerRect.height - signatureHeight;

        const newPosition = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        };
        setSignaturePosition(newPosition);
      }
      
      if (isDraggingStamp && canvasContainerRef.current && stampRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const stampRect = stampRef.current.getBoundingClientRect();
        
        const newX = e.clientX - containerRect.left - stampDragOffset.x;
        const newY = e.clientY - containerRect.top - stampDragOffset.y;

        const stampWidth = stampRect.width || 150;
        const stampHeight = stampRect.height || 150;
        const maxX = containerRect.width - stampWidth;
        const maxY = containerRect.height - stampHeight;

        const newPosition = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        };
        setStampPosition(newPosition);
      }
    },
    [isDraggingSignature, isDraggingStamp, signatureDragOffset, stampDragOffset]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingSignature) {
      setIsDraggingSignature(false);
      if (signatureUrl && signaturePosition && canvasContainerRef.current && signatureRef.current) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const imgRect = signatureRef.current.getBoundingClientRect();
        setSignaturePage(currentPage);
        onSignatureChange(signatureUrl, {
          ...signaturePosition,
          width: imgRect.width,
          height: imgRect.height,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height,
          pdfScale: pdfInfo?.scale,
          pdfPageWidth: pdfInfo?.pageWidth,
          pdfPageHeight: pdfInfo?.pageHeight,
          pageNumber: currentPage,
        });
      }
    }
    
    if (isDraggingStamp) {
      setIsDraggingStamp(false);
      if (stampUrl && stampPosition && canvasContainerRef.current && stampRef.current && onStampChange) {
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const imgRect = stampRef.current.getBoundingClientRect();
        setStampPage(currentPage);
        onStampChange(stampUrl, {
          ...stampPosition,
          width: imgRect.width,
          height: imgRect.height,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height,
          pdfScale: pdfInfo?.scale,
          pdfPageWidth: pdfInfo?.pageWidth,
          pdfPageHeight: pdfInfo?.pageHeight,
          pageNumber: currentPage,
        });
      }
    }
  }, [isDraggingSignature, isDraggingStamp, signatureUrl, stampUrl, signaturePosition, stampPosition, onSignatureChange, onStampChange, pdfInfo, currentPage]);

  // Adicionar event listeners para drag da assinatura e carimbo
  useEffect(() => {
    if (isDraggingSignature || isDraggingStamp) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingSignature, isDraggingStamp, handleMouseMove, handleMouseUp]);

  // Resetar página da assinatura quando a assinatura for removida
  useEffect(() => {
    if (!signatureUrl) {
      setSignaturePage(null);
    }
  }, [signatureUrl]);

  // Resetar página do carimbo quando o carimbo for removido
  useEffect(() => {
    if (!stampUrl) {
      setStampPage(null);
    }
  }, [stampUrl]);

  // Quando o carimbo é definido, posicionar automaticamente
  useEffect(() => {
    if (stampUrl && canvasContainerRef.current && !stampPage && onStampChange) {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const initialPosition = { x: 200, y: 50 }; // Posição inicial diferente da assinatura
      setStampPosition(initialPosition);
      setStampPage(currentPage);
      onStampChange(stampUrl, {
        ...initialPosition,
        width: 150,
        height: 150,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        pdfScale: pdfInfo?.scale,
        pdfPageWidth: pdfInfo?.pageWidth,
        pdfPageHeight: pdfInfo?.pageHeight,
        pageNumber: currentPage,
      });
    }
  }, [stampUrl, currentPage, pdfInfo, stampPage, onStampChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Visualização do Documento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seleção de assinatura padrão */}
        {!signatureUrl && (
          <div className="rounded-lg border-2 border-dashed p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <PenTool className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-2">
                  Use sua assinatura padrão para assinar o documento
                </p>
                {defaultSignatureUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3 rounded-lg border bg-accent p-3">
                      <img 
                        src={defaultSignatureUrl} 
                        alt="Assinatura padrão" 
                        className="h-12 object-contain"
                      />
                    </div>
                    <Button onClick={handleUseDefaultSignature} className="gap-2">
                      <Check className="h-4 w-4" />
                      Usar Assinatura Padrão
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Você pode cadastrar ou alterar sua assinatura padrão no seu perfil
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma assinatura padrão cadastrada.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre uma assinatura no seu perfil para poder assinar documentos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Visualizador de PDF com assinatura usando Canvas */}
        <div
          ref={containerRef}
          className="relative w-full border rounded-lg overflow-hidden bg-muted"
          style={{ minHeight: '600px' }}
        >
          <div ref={canvasContainerRef} className="relative inline-block">
            <PdfCanvasViewer
              pdfUrl={pdfUrl}
              onPdfLoaded={handlePdfLoaded}
              className="w-full"
            />
            
            {/* Assinatura sobreposta - apenas na página onde foi posicionada */}
            {signatureUrl && signaturePage === currentPage && (
              <div
                ref={signatureRef}
                style={{
                  position: 'absolute',
                  left: `${signaturePosition.x}px`,
                  top: `${signaturePosition.y}px`,
                  cursor: isDraggingSignature ? 'grabbing' : 'grab',
                  zIndex: 10,
                }}
                onMouseDown={handleSignatureMouseDown}
                className="group"
              >
                <div className="relative inline-block">
                  <img
                    src={signatureUrl}
                    alt="Assinatura"
                    className="max-w-[200px] max-h-[100px] object-contain drop-shadow-lg"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setSignatureSize({
                        width: img.naturalWidth || 200,
                        height: img.naturalHeight || 100,
                      });
                    }}
                  />
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-background/80 rounded-full p-1">
                      <Move className="h-3 w-3 text-muted-foreground" />
                    </div>
                    {onRemoveSignature && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSignature();
                        }}
                        className="bg-destructive/80 rounded-full p-1 hover:bg-destructive"
                      >
                        <X className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Carimbo sobreposto - apenas na página onde foi posicionado */}
            {stampUrl && stampPage === currentPage && (
              <div
                ref={stampRef}
                style={{
                  position: 'absolute',
                  left: `${stampPosition.x}px`,
                  top: `${stampPosition.y}px`,
                  cursor: isDraggingStamp ? 'grabbing' : 'grab',
                  zIndex: 11, // Carimbo acima da assinatura
                }}
                onMouseDown={handleStampMouseDown}
                className="group"
              >
                <div className="relative inline-block">
                  <img
                    src={stampUrl}
                    alt="Carimbo"
                    className="max-w-[150px] max-h-[150px] object-contain drop-shadow-lg"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setStampSize({
                        width: img.naturalWidth || 150,
                        height: img.naturalHeight || 150,
                      });
                    }}
                  />
                  <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-background/80 rounded-full p-1">
                      <Move className="h-3 w-3 text-muted-foreground" />
                    </div>
                    {onRemoveStamp && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStamp();
                        }}
                        className="bg-destructive/80 rounded-full p-1 hover:bg-destructive"
                      >
                        <X className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instruções */}
        {(signatureUrl || stampUrl) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {signatureUrl && stampUrl 
                ? 'Arraste a assinatura e o carimbo para reposicioná-los no documento'
                : signatureUrl 
                ? 'Arraste a assinatura para reposicioná-la no documento'
                : 'Arraste o carimbo para reposicioná-lo no documento'}
            </p>
            <div className="flex justify-center gap-2">
              {onRemoveSignature && signatureUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRemoveSignature}
                  className="gap-2"
                >
                  <X className="h-3 w-3" />
                  Remover Assinatura
                </Button>
              )}
              {onRemoveStamp && stampUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRemoveStamp}
                  className="gap-2"
                >
                  <X className="h-3 w-3" />
                  Remover Carimbo
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfViewerWithSignature;
