import { getSignedPdfUrl, downloadSignedPdf } from './supabaseService';

/**
 * Obtém a URL do PDF assinado, seja do Storage ou data URL
 * @param signedPdfUrl - URL do PDF (pode ser data URL, referência ao Storage ou caminho direto)
 * @returns URL pública do PDF
 */
export async function getPdfUrl(signedPdfUrl?: string): Promise<string | undefined> {
  if (!signedPdfUrl) return undefined;

  // Se for uma referência ao Storage (formato: storage:path/to/file.pdf)
  if (signedPdfUrl.startsWith('storage:')) {
    const storagePath = signedPdfUrl.replace('storage:', '');
    try {
      return await getSignedPdfUrl(storagePath);
    } catch (error) {
      console.error('Erro ao obter URL do Storage:', error);
      return undefined;
    }
  }

  // Se for uma URL HTTP/HTTPS, verificar se é do Supabase Storage
  // URLs do Supabase Storage geralmente contêm 'storage.supabase.co'
  if (signedPdfUrl.startsWith('http://') || signedPdfUrl.startsWith('https://')) {
    // Se já é uma URL pública, retornar diretamente
    return signedPdfUrl;
  }

  // Se for um caminho do Storage (sem prefixo), tentar obter a URL pública
  // Caminhos do Storage geralmente têm formato: documentId/filename.pdf ou signatures/userId/file.png
  if (!signedPdfUrl.includes('://') && !signedPdfUrl.startsWith('data:')) {
    try {
      // Assumir que é um caminho do Storage
      return await getSignedPdfUrl(signedPdfUrl);
    } catch (error) {
      console.warn('Tentativa de obter URL do Storage falhou, usando como está:', error);
      // Se falhar, retornar como está (pode ser um caminho relativo)
      return signedPdfUrl;
    }
  }

  // Se for data URL ou URL pública, retornar como está
  return signedPdfUrl;
}

/**
 * Faz download do PDF assinado do Storage
 * @param signedPdfUrl - URL do PDF (pode ser data URL ou referência ao Storage)
 * @returns Bytes do PDF
 */
export async function downloadPdf(signedPdfUrl?: string): Promise<Uint8Array | null> {
  if (!signedPdfUrl) return null;

  // Se for uma referência ao Storage
  if (signedPdfUrl.startsWith('storage:')) {
    const storagePath = signedPdfUrl.replace('storage:', '');
    try {
      return await downloadSignedPdf(storagePath);
    } catch (error) {
      console.error('Erro ao fazer download do Storage:', error);
      return null;
    }
  }

  // Se for data URL, converter para bytes
  if (signedPdfUrl.startsWith('data:')) {
    try {
      const base64 = signedPdfUrl.split(',')[1];
      if (base64) {
        return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      }
    } catch (error) {
      console.error('Erro ao converter data URL:', error);
    }
  }

  // Se for URL pública, fazer fetch
  try {
    const response = await fetch(signedPdfUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch (error) {
    console.error('Erro ao fazer fetch do PDF:', error);
  }

  return null;
}
