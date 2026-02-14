import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Stamp, X, Move } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PdfCanvasViewer from './PdfCanvasViewer';

interface PdfViewerWithStampProps {
  pdfUrl: string;
  stampUrl?: string; // Carimbo selecionado
  onStampChange: (stampUrl: string, position?: { x: number; y: number; width?: number; height?: number; containerWidth?: number; containerHeight?: number; pdfScale?: number; pdfPageWidth?: number; pdfPageHeight?: number; pageNumber?: number }) => void;
  onRemoveStamp?: () => void;
}

const PdfViewerWithStamp = ({
  pdfUrl,
  stampUrl,
  onStampChange,
  onRemoveStamp,
}: PdfViewerWithStampProps) => {
  const [stampPosition, setStampPosition] = useState({ x: 50, y: 50 });
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [stampSize, setStampSize] = useState({ width: 150, height: 150 });
  const [pdfInfo, setPdfInfo] = useState<{ scale: number; pageWidth: number; pageHeight: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stampPage, setStampPage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLImageElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handlePdfLoaded = useCallback((pageWidth: number, pageHeight: number, scale: number, canvasWidth: number, canvasHeight: number, pageNumber?: number, totalPages?: number) => {
    setPdfInfo({ scale, pageWidth, pageHeight });
    if (pageNumber) {
      setCurrentPage(pageNumber);
    }
    if (canvasContainerRef.current) {
      canvasContainerRef.current.style.width = `${canvasWidth}px`;
      canvasContainerRef.current.style.height = `${canvasHeight}px`;
    }
  }, []);

  const handleStampMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!stampRef.current) return;
      e.preventDefault();
      setIsDraggingStamp(true);
      const rect = stampRef.current.getBoundingClientRect();
      const containerRect = canvasContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingStamp || !canvasContainerRef.current || !stampRef.current) return;

      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const stampRect = stampRef.current.getBoundingClientRect();
      
      const newX = e.clientX - containerRect.left - dragOffset.x;
      const newY = e.clientY - containerRect.top - dragOffset.y;

      const stampWidth = stampRect.width || 150;
      const stampHeight = stampRect.height || 150;
      const maxX = containerRect.width - stampWidth;
      const maxY = containerRect.height - stampHeight;

      const newPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };
      setStampPosition(newPosition);
    },
    [isDraggingStamp, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingStamp(false);
    if (stampUrl && stampPosition && canvasContainerRef.current && stampRef.current) {
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
  }, [stampUrl, stampPosition, onStampChange, pdfInfo, currentPage]);

  useEffect(() => {
    if (isDraggingStamp) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingStamp, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!stampUrl) {
      setStampPage(null);
    }
  }, [stampUrl]);

  // Quando o carimbo é definido, posicionar automaticamente
  useEffect(() => {
    if (stampUrl && canvasContainerRef.current && !stampPage) {
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const initialPosition = { x: 50, y: 50 };
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
          <Stamp className="h-5 w-5" />
          Posicionar Carimbo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stampUrl ? (
          <>
            {/* Visualizador de PDF com carimbo usando Canvas */}
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
                
                {/* Carimbo sobreposto - apenas na página onde foi posicionado */}
                {stampUrl && stampPage === currentPage && (
                  <div
                    ref={stampRef}
                    style={{
                      position: 'absolute',
                      left: `${stampPosition.x}px`,
                      top: `${stampPosition.y}px`,
                      cursor: isDraggingStamp ? 'grabbing' : 'grab',
                      zIndex: 10,
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
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Arraste o carimbo para reposicioná-lo no documento
              </p>
              {onRemoveStamp && (
                <div className="flex justify-center">
                  <button
                    onClick={onRemoveStamp}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remover carimbo
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <Stamp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Selecione uma empresa e um carimbo acima para posicioná-lo no documento
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfViewerWithStamp;
