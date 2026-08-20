import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export interface PdfRasterizerModule {
  getPageCount(fileUri: string): Promise<number>;
  renderPage(fileUri: string, pageIndex: number, scale: number): Promise<string>;
  renderAllPages(fileUri: string, scale: number): Promise<string[]>;
}

function getNativeModule(): PdfRasterizerModule {
  if (Platform.OS === 'ios') {
    const mod = requireOptionalNativeModule<PdfRasterizerModule>('ExpoOcrPdfRasterizer');
    if (mod) return mod;
  }
  return {
    getPageCount: () => Promise.reject(new Error('PDF rasterizer native module is not available. Please rebuild the native iOS app.')),
    renderPage: () => Promise.reject(new Error('PDF rasterizer native module is not available. Please rebuild the native iOS app.')),
    renderAllPages: () => Promise.reject(new Error('PDF rasterizer native module is not available. Please rebuild the native iOS app.')),
  };
}

const ExpoOcrPdfRasterizer: PdfRasterizerModule = {
  getPageCount: (uri) => getNativeModule().getPageCount(uri),
  renderPage: (uri, idx, scale) => getNativeModule().renderPage(uri, idx, scale),
  renderAllPages: (uri, scale) => getNativeModule().renderAllPages(uri, scale),
};

export default ExpoOcrPdfRasterizer;
