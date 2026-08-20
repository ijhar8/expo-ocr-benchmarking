import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { OCRBenchmarkResult, EngineComparisonSummary, OCREngineId } from '../types/ocr';

const BENCHMARK_STORAGE_KEY = '@docsbyira_ocr_benchmark_runs_v1';

export async function saveBenchmarkRun(run: OCRBenchmarkResult): Promise<void> {
  try {
    const existing = await getBenchmarkRuns();
    const updated = [run, ...existing];
    await AsyncStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save benchmark run:', err);
  }
}

export async function getBenchmarkRuns(): Promise<OCRBenchmarkResult[]> {
  try {
    const raw = await AsyncStorage.getItem(BENCHMARK_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OCRBenchmarkResult[];
  } catch (err) {
    console.error('Failed to load benchmark runs:', err);
    return [];
  }
}

export async function clearBenchmarkRuns(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BENCHMARK_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear benchmark runs:', err);
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function computeComparisonSummaries(runs: OCRBenchmarkResult[]): Record<OCREngineId, EngineComparisonSummary> {
  const engines: OCREngineId[] = ['mlkit', 'paddle_v6_small', 'doctr_onnx'];
  const summaries: Partial<Record<OCREngineId, EngineComparisonSummary>> = {};

  for (const eng of engines) {
    const engRuns = runs.filter(r => r.engine === eng);
    const count = engRuns.length;
    const latencies = engRuns.map(r => r.latencyMs);
    const p50 = calculatePercentile(latencies, 50);
    const p95 = calculatePercentile(latencies, 95);
    const avgConf = count > 0 ? engRuns.reduce((acc, r) => acc + r.avgConfidence, 0) / count : 0;
    const gstinCount = engRuns.filter(r => r.isGstinValid).length;
    const totalCount = engRuns.filter(r => r.isTotalFound).length;
    const invNumCount = engRuns.filter(r => r.isInvoiceNumFound).length;

    summaries[eng] = {
      engine: eng,
      sampleCount: count,
      p50LatencyMs: Math.round(p50),
      p95LatencyMs: Math.round(p95),
      avgConfidence: Number(avgConf.toFixed(3)),
      gstinDetectionRate: count > 0 ? Math.round((gstinCount / count) * 100) : 0,
      totalDetectionRate: count > 0 ? Math.round((totalCount / count) * 100) : 0,
      invoiceNumDetectionRate: count > 0 ? Math.round((invNumCount / count) * 100) : 0,
      estBinarySizeMb: eng === 'mlkit' ? 0.5 : eng === 'paddle_v6_small' ? 22.5 : 73.0,
    };
  }

  return summaries as Record<OCREngineId, EngineComparisonSummary>;
}

export async function exportBenchmarkResults(runs: OCRBenchmarkResult[]): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      alert('Sharing is not available on this device');
      return false;
    }

    const summaries = computeComparisonSummaries(runs);
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      summary: summaries,
      totalRuns: runs.length,
      runs,
    };

    const exportFile = new File(Paths.cache, `ocr_benchmark_export_${Date.now()}.json`);
    exportFile.create();
    exportFile.write(JSON.stringify(exportPayload, null, 2));

    await Sharing.shareAsync(exportFile.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export OCR Benchmark Logs',
      UTI: 'public.json',
    });

    return true;
  } catch (err) {
    console.error('Error exporting benchmark results:', err);
    return false;
  }
}
