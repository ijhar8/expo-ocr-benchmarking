import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import ExpoOcrPdfRasterizer from '../../modules/expo-ocr-pdf-rasterizer';

export interface PdfPageInfo {
  /** file:// URI of the rasterised JPEG for this page */
  uri: string;
  /** 0-based page index */
  pageIndex: number;
  /** total pages in document */
  totalPages: number;
}

/**
 * Opens the system document picker filtered to PDF files.
 * Returns null if user cancelled.
 */
export async function pickPdfDocument(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Returns the total page count of a PDF given its file:// URI.
 * Throws on Android (not yet supported).
 */
export async function getPdfPageCount(fileUri: string): Promise<number> {
  if (Platform.OS !== 'ios') {
    throw new Error('PDF rasterization is only supported on iOS currently.');
  }
  return ExpoOcrPdfRasterizer.getPageCount(fileUri);
}

/**
 * Rasterises a single PDF page to a JPEG and returns its file:// URI.
 * @param fileUri  - file:// URI of the PDF
 * @param pageIndex - 0-based page index
 * @param scale - render scale (default 2.0 — good quality/speed balance for OCR)
 */
export async function rasterisePdfPage(
  fileUri: string,
  pageIndex: number,
  scale = 2.0,
): Promise<PdfPageInfo> {
  if (Platform.OS !== 'ios') {
    throw new Error('PDF rasterization is only supported on iOS currently.');
  }

  const totalPages = await ExpoOcrPdfRasterizer.getPageCount(fileUri);
  const uri = await ExpoOcrPdfRasterizer.renderPage(fileUri, pageIndex, scale);

  return { uri, pageIndex, totalPages };
}

/**
 * Rasterises ALL pages of a PDF and returns an array of file:// URIs.
 * For large PDFs (>10 pages) prefer rasterising page-by-page.
 */
export async function rasteriseAllPages(
  fileUri: string,
  scale = 2.0,
): Promise<PdfPageInfo[]> {
  if (Platform.OS !== 'ios') {
    throw new Error('PDF rasterization is only supported on iOS currently.');
  }

  const uris = await ExpoOcrPdfRasterizer.renderAllPages(fileUri, scale);
  return uris.map((uri, i) => ({ uri, pageIndex: i, totalPages: uris.length }));
}
