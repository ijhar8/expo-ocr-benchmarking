export type OCREngineId = 'mlkit' | 'paddle_v6_small' | 'doctr_onnx';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRLine {
  text: string;
  confidence: number; // 0 to 1
  box?: BoundingBox;
}

export interface InvoiceExtractedFields {
  supplierGstin?: string;
  recipientGstin?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  grandTotal?: string;
  taxableValue?: string;
  cgstAmount?: string;
  sgstAmount?: string;
  igstAmount?: string;
  hsnCodes: string[];
}

export interface OCRBenchmarkResult {
  id: string;
  engine: OCREngineId;
  timestamp: number;
  source: 'camera_capture' | 'gallery' | 'sample';
  imageUri?: string;
  fullText: string;
  lines: OCRLine[];
  lineCount: number;
  wordCount: number;
  avgConfidence: number;
  latencyMs: number;
  modelLoadTimeMs?: number;
  executionProvider?: string;
  extractedFields: InvoiceExtractedFields;
  // Verification flags
  isGstinValid: boolean;
  isTotalFound: boolean;
  isInvoiceNumFound: boolean;
}

export interface EngineComparisonSummary {
  engine: OCREngineId;
  sampleCount: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgConfidence: number;
  gstinDetectionRate: number; // 0 - 100%
  totalDetectionRate: number;
  invoiceNumDetectionRate: number;
  estBinarySizeMb: number;
}
