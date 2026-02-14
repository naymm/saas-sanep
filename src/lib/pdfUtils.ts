import { PDFDocument, PDFPage } from 'pdf-lib';

export interface SignaturePosition {
  x: number; // Posição X em pixels do container
  y: number; // Posição Y em pixels do container
  width?: number; // Largura da assinatura em pixels
  height?: number; // Altura da assinatura em pixels
  containerWidth?: number; // Largura do container em pixels (para conversão)
  containerHeight?: number; // Altura do container em pixels (para conversão)
  pdfScale?: number; // Escala usada para renderizar o PDF no canvas
  pdfPageWidth?: number; // Largura da página PDF em pontos
  pdfPageHeight?: number; // Altura da página PDF em pontos
}

/**
 * Aplica uma assinatura em um PDF na posição especificada
 * @param pdfBytes - Bytes do PDF original
 * @param signatureImageUrl - URL da imagem da assinatura (data URL ou URL)
 * @param position - Posição da assinatura no PDF (em pixels, será convertido para pontos PDF)
 * @param pageIndex - Índice da página onde aplicar a assinatura (padrão: 0)
 * @returns Bytes do PDF com a assinatura aplicada
 */
export async function applySignatureToPdf(
  pdfBytes: Uint8Array,
  signatureImageUrl: string,
  position: SignaturePosition,
  pageIndex: number = 0
): Promise<Uint8Array> {
  // Carregar o PDF
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes);
  } catch (error) {
    console.error('Erro ao carregar PDF:', error);
    throw new Error(`Não foi possível carregar o PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }

  // Obter a página onde aplicar a assinatura
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('O PDF não possui páginas');
  }
  if (pageIndex >= pages.length) {
    throw new Error(`Página ${pageIndex} não existe no PDF`);
  }
  const page = pages[pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Carregar a imagem da assinatura
  let signatureImage;
  try {
    // Se for uma data URL, extrair os bytes
    if (signatureImageUrl.startsWith('data:')) {
      const base64 = signatureImageUrl.split(',')[1];
      if (!base64) {
        throw new Error('Data URL da assinatura inválida');
      }
      const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      signatureImage = await pdfDoc.embedPng(imageBytes);
    } else {
      // Se for uma URL, fazer fetch
      const response = await fetch(signatureImageUrl);
      if (!response.ok) {
        throw new Error(`Erro ao buscar assinatura: ${response.statusText}`);
      }
      const imageBytes = await response.arrayBuffer();
      signatureImage = await pdfDoc.embedPng(new Uint8Array(imageBytes));
    }
  } catch (error) {
    console.error('Erro ao carregar imagem da assinatura:', error);
    throw new Error(`Não foi possível carregar a imagem da assinatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }

  // Obter dimensões da assinatura em pixels (do canvas)
  const signatureWidth = position.width || 200;
  const signatureHeight = position.height || 100;

  // Converter posição de pixels do canvas para pontos PDF
  // Agora temos informações precisas do canvas renderizado com pdf.js
  let scaleFactor: number;
  
  if (position.pdfScale && position.pdfPageWidth && position.pdfPageHeight) {
    // Usar informações precisas do canvas renderizado
    // O scaleFactor já está calculado corretamente pelo PdfCanvasViewer
    scaleFactor = position.pdfScale;
    
    // Verificar se as dimensões da página correspondem
    // (podem ter pequenas diferenças devido a arredondamentos)
    const widthMatch = Math.abs(position.pdfPageWidth - pageWidth) < 10;
    const heightMatch = Math.abs(position.pdfPageHeight - pageHeight) < 10;
    
    if (!widthMatch || !heightMatch) {
      console.warn('Dimensões da página não correspondem exatamente:', {
        pdfInfo: { width: position.pdfPageWidth, height: position.pdfPageHeight },
        actual: { width: pageWidth, height: pageHeight },
      });
    }
    
    console.log('Usando escala precisa do canvas:', scaleFactor);
  } else {
    // Fallback: calcular baseado no container (método antigo)
    const containerWidth = position.containerWidth || 800;
    const containerHeight = position.containerHeight || 600;
    
    const pageAspectRatio = pageWidth / pageHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    if (containerAspectRatio > pageAspectRatio) {
      scaleFactor = containerHeight / pageHeight;
    } else {
      scaleFactor = containerWidth / pageWidth;
    }
    
    if (!isFinite(scaleFactor) || scaleFactor <= 0 || scaleFactor === Infinity || isNaN(scaleFactor)) {
      scaleFactor = 96 / 72; // ≈ 1.333
    }
    console.warn('Usando cálculo de escala (fallback):', scaleFactor);
  }
  
  // Obter dimensões reais da imagem da assinatura
  const signatureDims = signatureImage.scale(1);
  const actualSignatureWidth = signatureDims.width;
  const actualSignatureHeight = signatureDims.height;
  
  // Calcular tamanho da assinatura em pontos PDF
  // O tamanho visual em pixels precisa ser convertido para pontos PDF
  const signatureWidthInPoints = signatureWidth / scaleFactor;
  const signatureHeightInPoints = signatureHeight / scaleFactor;
  
  // Manter proporção da imagem original da assinatura
  const imageAspectRatio = actualSignatureWidth / actualSignatureHeight;
  let finalWidth = signatureWidthInPoints;
  let finalHeight = signatureWidthInPoints / imageAspectRatio;
  
  // Se a altura calculada for maior que a desejada, usar altura como base
  if (finalHeight > signatureHeightInPoints) {
    finalHeight = signatureHeightInPoints;
    finalWidth = signatureHeightInPoints * imageAspectRatio;
  }
  
  // Converter posição X: posição relativa ao container
  const x = position.x / scaleFactor;
  
  // Converter posição Y: 
  // - No container, Y=0 é no topo
  // - No PDF, Y=0 é na parte inferior
  // - Precisamos inverter e ajustar pela altura da assinatura
  const yFromTopInPoints = position.y / scaleFactor;
  const y = pageHeight - yFromTopInPoints - finalHeight;
  
  // Debug detalhado
  console.log('=== Cálculo de Posicionamento ===');
  console.log('Container:', { width: position.containerWidth, height: position.containerHeight });
  console.log('PDF Page (pontos):', { width: pageWidth, height: pageHeight });
  if (position.pdfPageWidth && position.pdfPageHeight) {
    console.log('PDF Info do Canvas:', { width: position.pdfPageWidth, height: position.pdfPageHeight, scale: position.pdfScale });
  }
  console.log('Posição em pixels (canvas):', { x: position.x, y: position.y });
  console.log('ScaleFactor usado:', scaleFactor);
  console.log('Posição em pontos PDF:', { x, y });
  console.log('Tamanho da assinatura (pixels):', { width: signatureWidth, height: signatureHeight });
  console.log('Tamanho da assinatura (pontos PDF):', { width: finalWidth, height: finalHeight });
  console.log('================================');
  
  // Aplicar a assinatura na página
  page.drawImage(signatureImage, {
    x: Math.max(0, Math.min(x, pageWidth - finalWidth)),
    y: Math.max(0, Math.min(y, pageHeight - finalHeight)),
    width: Math.min(finalWidth, pageWidth),
    height: Math.min(finalHeight, pageHeight),
  });

  // Salvar o PDF modificado
  const pdfBytesWithSignature = await pdfDoc.save();
  return pdfBytesWithSignature;
}

/**
 * Aplica um carimbo em um PDF na posição especificada
 * Similar a applySignatureToPdf, mas para carimbos
 * @param pdfBytes - Bytes do PDF (pode já ter assinaturas)
 * @param stampImageUrl - URL da imagem do carimbo (data URL ou URL)
 * @param position - Posição do carimbo no PDF (em pixels, será convertido para pontos PDF)
 * @param pageIndex - Índice da página onde aplicar o carimbo (padrão: 0)
 * @returns Bytes do PDF com o carimbo aplicado
 */
export async function applyStampToPdf(
  pdfBytes: Uint8Array,
  stampImageUrl: string,
  position: SignaturePosition,
  pageIndex: number = 0
): Promise<Uint8Array> {
  // Carregar o PDF
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes);
  } catch (error) {
    console.error('Erro ao carregar PDF:', error);
    throw new Error(`Não foi possível carregar o PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }

  // Obter a página onde aplicar o carimbo
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('O PDF não possui páginas');
  }
  if (pageIndex >= pages.length) {
    throw new Error(`Página ${pageIndex} não existe no PDF`);
  }
  const page = pages[pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Carregar a imagem do carimbo
  let stampImage;
  try {
    // Se for uma data URL, extrair os bytes
    if (stampImageUrl.startsWith('data:')) {
      const base64 = stampImageUrl.split(',')[1];
      if (!base64) {
        throw new Error('Data URL do carimbo inválida');
      }
      const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      stampImage = await pdfDoc.embedPng(imageBytes);
    } else {
      // Se for uma URL, fazer fetch
      const response = await fetch(stampImageUrl);
      if (!response.ok) {
        throw new Error(`Erro ao buscar carimbo: ${response.statusText}`);
      }
      const imageBytes = await response.arrayBuffer();
      stampImage = await pdfDoc.embedPng(new Uint8Array(imageBytes));
    }
  } catch (error) {
    console.error('Erro ao carregar imagem do carimbo:', error);
    throw new Error(`Não foi possível carregar a imagem do carimbo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }

  // Obter dimensões do carimbo em pixels (do canvas)
  const stampWidth = position.width || 150;
  const stampHeight = position.height || 150;

  // Converter posição de pixels do canvas para pontos PDF
  let scaleFactor: number;
  
  if (position.pdfScale && position.pdfPageWidth && position.pdfPageHeight) {
    scaleFactor = position.pdfScale;
    
    const widthMatch = Math.abs(position.pdfPageWidth - pageWidth) < 10;
    const heightMatch = Math.abs(position.pdfPageHeight - pageHeight) < 10;
    
    if (!widthMatch || !heightMatch) {
      console.warn('Dimensões da página não correspondem exatamente:', {
        pdfInfo: { width: position.pdfPageWidth, height: position.pdfPageHeight },
        actual: { width: pageWidth, height: pageHeight },
      });
    }
    
    console.log('Usando escala precisa do canvas para carimbo:', scaleFactor);
  } else {
    const containerWidth = position.containerWidth || 800;
    const containerHeight = position.containerHeight || 600;
    
    const pageAspectRatio = pageWidth / pageHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    if (containerAspectRatio > pageAspectRatio) {
      scaleFactor = containerHeight / pageHeight;
    } else {
      scaleFactor = containerWidth / pageWidth;
    }
    
    if (!isFinite(scaleFactor) || scaleFactor <= 0 || scaleFactor === Infinity || isNaN(scaleFactor)) {
      scaleFactor = 96 / 72;
    }
    console.warn('Usando cálculo de escala (fallback) para carimbo:', scaleFactor);
  }
  
  // Obter dimensões reais da imagem do carimbo
  const stampDims = stampImage.scale(1);
  const actualStampWidth = stampDims.width;
  const actualStampHeight = stampDims.height;
  
  // Calcular tamanho do carimbo em pontos PDF
  const stampWidthInPoints = stampWidth / scaleFactor;
  const stampHeightInPoints = stampHeight / scaleFactor;
  
  // Manter proporção da imagem original do carimbo
  const imageAspectRatio = actualStampWidth / actualStampHeight;
  let finalWidth = stampWidthInPoints;
  let finalHeight = stampWidthInPoints / imageAspectRatio;
  
  if (finalHeight > stampHeightInPoints) {
    finalHeight = stampHeightInPoints;
    finalWidth = stampHeightInPoints * imageAspectRatio;
  }
  
  // Converter posição X
  const x = position.x / scaleFactor;
  
  // Converter posição Y (inverter do topo para baixo)
  const yFromTopInPoints = position.y / scaleFactor;
  const y = pageHeight - yFromTopInPoints - finalHeight;
  
  console.log('=== Cálculo de Posicionamento do Carimbo ===');
  console.log('Posição em pixels (canvas):', { x: position.x, y: position.y });
  console.log('ScaleFactor usado:', scaleFactor);
  console.log('Posição em pontos PDF:', { x, y });
  console.log('Tamanho do carimbo (pixels):', { width: stampWidth, height: stampHeight });
  console.log('Tamanho do carimbo (pontos PDF):', { width: finalWidth, height: finalHeight });
  console.log('==========================================');
  
  // Aplicar o carimbo na página
  page.drawImage(stampImage, {
    x: Math.max(0, Math.min(x, pageWidth - finalWidth)),
    y: Math.max(0, Math.min(y, pageHeight - finalHeight)),
    width: Math.min(finalWidth, pageWidth),
    height: Math.min(finalHeight, pageHeight),
  });

  // Salvar o PDF modificado
  const pdfBytesWithStamp = await pdfDoc.save();
  return pdfBytesWithStamp;
}

/**
 * Converte um PDF em bytes a partir de uma URL
 */
export async function fetchPdfAsBytes(pdfUrl: string): Promise<Uint8Array> {
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Erro ao carregar PDF: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Converte bytes de PDF em data URL base64 para download/exibição
 * Usa base64 para garantir persistência (blob URLs são temporários)
 */
export function pdfBytesToDataUrl(pdfBytes: Uint8Array): string {
  // Converter para base64 de forma mais eficiente para PDFs grandes
  try {
    // Usar chunking para evitar problemas com PDFs muito grandes
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    return `data:application/pdf;base64,${base64}`;
  } catch (error) {
    console.error('Erro ao converter PDF para base64:', error);
    throw new Error('Não foi possível converter o PDF para base64');
  }
}
