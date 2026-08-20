import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { OCRBenchmarkResult, OCRLine } from '../types/ocr';
import { extractInvoiceFields } from '../utils/invoiceRegex';

export type PaddleModelStatus = 'uninitialized' | 'downloading' | 'ready' | 'error';

class PaddleManager {
  private service: any = null;
  public status: PaddleModelStatus = 'uninitialized';
  public initDurationMs: number = 0;
  public errorMessage: string | null = null;
  public executionProvider: string = Platform.OS === 'android' ? 'NNAPI (ONNX)' : 'CoreML (ONNX)';

  async getOrInitService(): Promise<any> {
    if (this.service && this.status === 'ready') {
      return this.service;
    }

    this.status = 'downloading';
    const startTime = Date.now();

    try {
      // Dynamic import from ppu-paddle-ocr/mobile
      const { PaddleOcrService, V6_SMALL_MODEL } = await import('ppu-paddle-ocr/mobile');

      const providers = Platform.OS === 'android' ? ['nnapi', 'cpu'] : ['coreml', 'cpu'];

      this.service = new PaddleOcrService({
        model: V6_SMALL_MODEL,
        session: {
          executionProviders: providers,
        },
      });

      await this.service.initialize();
      this.initDurationMs = Date.now() - startTime;
      this.status = 'ready';
      return this.service;
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err?.message || 'Failed to initialize PP-OCRv6_small';
      console.error('PaddleOCR initialization failed:', err);
      throw err;
    }
  }
}

export const paddleManager = new PaddleManager();

export interface PaddleRecognizeOptions {
  uri: string;
  source?: 'camera_capture' | 'gallery' | 'sample';
}

/**
 * Executes PP-OCRv6_small on-device OCR on an image URI
 */
export async function recognizeWithPaddle(options: PaddleRecognizeOptions): Promise<OCRBenchmarkResult> {
  const overallStart = Date.now();

  try {
    const service = await paddleManager.getOrInitService();

    // 1. Read image as ArrayBuffer directly via Expo File API
    const file = new File(options.uri);
    const imageBuffer = await file.arrayBuffer();

    const inferenceStart = Date.now();
    const rawResult = await service.recognize(imageBuffer, {
      flatten: true,
      strategy: 'cross-line', // Optimized for multi-column dense invoice tables
    });
    const latencyMs = Date.now() - inferenceStart;

    const fullText = (typeof rawResult === 'string' ? rawResult : rawResult?.text || '').trim();

    // 2. Parse lines and confidence
    const lines: OCRLine[] = [];
    let totalConf = 0;
    let counted = 0;

    if (rawResult?.lines && Array.isArray(rawResult.lines)) {
      for (const l of rawResult.lines) {
        const conf = typeof l.confidence === 'number' ? l.confidence : 0.88;
        totalConf += conf;
        counted++;

        lines.push({
          text: l.text || '',
          confidence: Number(conf.toFixed(3)),
          box: l.box
            ? {
                x: l.box[0]?.[0] || 0,
                y: l.box[0]?.[1] || 0,
                width: (l.box[1]?.[0] || 0) - (l.box[0]?.[0] || 0),
                height: (l.box[2]?.[1] || 0) - (l.box[0]?.[1] || 0),
              }
            : undefined,
        });
      }
    } else if (fullText) {
      const splitLines = fullText.split('\n');
      for (const line of splitLines) {
        if (line.trim()) {
          totalConf += 0.88;
          counted++;
          lines.push({
            text: line.trim(),
            confidence: 0.88,
          });
        }
      }
    }

    const avgConfidence = counted > 0 ? totalConf / counted : (fullText.length > 0 ? 0.85 : 0);
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const extractedFields = extractInvoiceFields(fullText);

    return {
      id: `paddle_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      engine: 'paddle_v6_small',
      timestamp: Date.now(),
      source: options.source || 'gallery',
      imageUri: options.uri,
      fullText,
      lines,
      lineCount: lines.length,
      wordCount,
      avgConfidence: Number(avgConfidence.toFixed(3)),
      latencyMs,
      modelLoadTimeMs: paddleManager.initDurationMs,
      executionProvider: paddleManager.executionProvider,
      extractedFields,
      isGstinValid: !!extractedFields.supplierGstin,
      isTotalFound: !!extractedFields.grandTotal,
      isInvoiceNumFound: !!extractedFields.invoiceNumber,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - overallStart;
    console.error('PaddleOCR recognize error:', err);

    return {
      id: `paddle_err_${Date.now()}`,
      engine: 'paddle_v6_small',
      timestamp: Date.now(),
      source: options.source || 'gallery',
      imageUri: options.uri,
      fullText: `PaddleOCR Error: ${err?.message || 'Inference failed'}`,
      lines: [],
      lineCount: 0,
      wordCount: 0,
      avgConfidence: 0,
      latencyMs,
      modelLoadTimeMs: paddleManager.initDurationMs,
      executionProvider: `${paddleManager.executionProvider} (Error)`,
      extractedFields: { hsnCodes: [] },
      isGstinValid: false,
      isTotalFound: false,
      isInvoiceNumFound: false,
    };
  }
}
