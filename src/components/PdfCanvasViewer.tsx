import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do PDF.js usando arquivo local
if (typeof window !== 'undefined') {
  // Usar worker local da pasta public (mais confiável que CDN)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  console.log('PDF.js Worker configurado (local):', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

interface PdfCanvasViewerProps {
  pdfUrl: string;
  onPdfLoaded?: (pageWidth: number, pageHeight: number, scale: number, canvasWidth: number, canvasHeight: number, pageNumber?: number, totalPages?: number) => void;
  className?: string;
}

const PdfCanvasViewer = ({ pdfUrl, onPdfLoaded, className = '' }: PdfCanvasViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Função para renderizar uma página específica
  const renderPage = async (pageNumber: number) => {
    if (!pdfDocumentRef.current || !containerRef.current || !canvasRef.current) {
      return;
    }

    try {
      const pdf = pdfDocumentRef.current;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });

      // Calcular escala para caber no container
      const container = containerRef.current;
      // Usar offsetWidth/offsetHeight para obter dimensões reais incluindo padding
      let containerWidth = container.offsetWidth || container.clientWidth;
      let containerHeight = container.offsetHeight || container.clientHeight;
      
      // Se o container ainda não tem dimensões, usar fallback
      if (containerWidth === 0 || containerHeight === 0) {
        containerWidth = window.innerWidth * 0.8; // 80% da largura da janela
        containerHeight = 600; // Altura mínima padrão
        console.log('Usando dimensões de fallback:', { containerWidth, containerHeight });
      }

      // Calcular escala mantendo proporção
      // Usar devicePixelRatio para melhor qualidade em telas de alta resolução
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const baseScale = Math.min(scaleX, scaleY) * 0.95; // 95% para deixar margem
      
      // Aumentar a escala base para melhor legibilidade (mínimo 1.2x para garantir legibilidade)
      const minScale = 1.2;
      const displayScale = Math.max(baseScale, minScale);
      
      // Escala de renderização: multiplicar pela devicePixelRatio para alta qualidade
      const renderScale = displayScale * devicePixelRatio;
      
      const displayViewport = page.getViewport({ scale: displayScale });
      const renderViewport = page.getViewport({ scale: renderScale });

      // Configurar canvas
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Definir dimensões do canvas com alta resolução (para renderização)
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      
      // Estilizar canvas para exibição (dimensões visuais do display)
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;
      canvas.style.imageRendering = 'auto'; // Melhor qualidade de renderização

      // Renderizar página no canvas com alta qualidade
      const renderContext = {
        canvasContext: context,
        viewport: renderViewport, // Usar viewport de alta resolução para renderização
      };

      await page.render(renderContext).promise;

      setScale(displayScale);
      setPageDimensions({
        width: viewport.width, // Dimensões originais em pontos PDF
        height: viewport.height,
      });

      // Notificar dimensões para cálculo de posicionamento
      if (onPdfLoaded) {
        onPdfLoaded(
          viewport.width, // Largura original da página em pontos PDF
          viewport.height, // Altura original da página em pontos PDF
          displayScale, // Escala usada para exibição
          displayViewport.width, // Largura do canvas em pixels (display)
          displayViewport.height, // Altura do canvas em pixels (display)
          pageNumber, // Número da página atual
          pdf.numPages // Total de páginas
        );
      }
    } catch (err: any) {
      console.error('Erro ao renderizar página:', err);
      setError(`Erro ao renderizar página ${pageNumber}: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  // Carregar PDF e renderizar primeira página
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Carregando PDF:', pdfUrl);
        console.log('Worker configurado:', pdfjsLib.GlobalWorkerOptions.workerSrc);

        // Verificar se o worker está configurado
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          throw new Error('PDF.js worker não está configurado. Verifique a configuração do worker.');
        }

        // Carregar o PDF
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          httpHeaders: {},
          withCredentials: false,
        });
        
        // Adicionar listeners para debug
        loadingTask.onPassword = (callback, reason) => {
          console.log('PDF requer senha:', reason);
        };
        
        const pdf = await loadingTask.promise;
        console.log('PDF carregado com sucesso. Número de páginas:', pdf.numPages);

        if (!isMounted) return;

        // Salvar referência do PDF
        pdfDocumentRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);

        // Aguardar um pouco para garantir que o container está renderizado
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!containerRef.current || !canvasRef.current) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`Container ou canvas não disponível, tentando novamente (${retryCount}/${maxRetries})...`);
            setTimeout(loadPdf, 200);
            return;
          }
          throw new Error('Container ou canvas não disponível após várias tentativas');
        }

        // Renderizar primeira página
        await renderPage(1);

        setLoading(false);
      } catch (err: any) {
        console.error('Erro ao carregar PDF:', err);
        console.error('URL do PDF:', pdfUrl);
        console.error('Detalhes do erro:', {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
        });
        if (isMounted) {
          const errorMessage = err?.message || 'Não foi possível carregar o PDF';
          setError(`Erro: ${errorMessage}. Verifique o console para mais detalhes.`);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (pdfDocumentRef.current) {
        pdfDocumentRef.current.destroy();
        pdfDocumentRef.current = null;
      }
    };
  }, [pdfUrl]);

  // Renderizar página quando currentPage mudar
  useEffect(() => {
    if (pdfDocumentRef.current && currentPage > 0 && currentPage <= totalPages) {
      renderPage(currentPage);
    }
  }, [currentPage]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="w-full">
      <div ref={containerRef} className={`relative w-full flex justify-center ${className}`} style={{ minHeight: '600px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">Carregando PDF...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block"
          style={{ display: loading || error ? 'none' : 'block', maxWidth: '100%', height: 'auto' }}
        />
      </div>
      
      {/* Controles de navegação */}
      {totalPages > 1 && !loading && !error && (
        <div className="flex items-center justify-center gap-4 mt-4 p-2 bg-muted/50 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground min-w-[100px] text-center">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-2"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PdfCanvasViewer;
