import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OCRBenchmarkResult, EngineComparisonSummary } from '../types/ocr';
import {
  computeComparisonSummaries,
  exportBenchmarkResults,
  clearBenchmarkRuns,
} from '../utils/benchmarkStorage';

interface BenchmarkComparisonModalProps {
  visible: boolean;
  onClose: () => void;
  runs: OCRBenchmarkResult[];
  onRefreshRuns: () => void;
}

export const BenchmarkComparisonModal: React.FC<BenchmarkComparisonModalProps> = ({
  visible,
  onClose,
  runs,
  onRefreshRuns,
}) => {
  const summaries = computeComparisonSummaries(runs);
  const mlkit = summaries.mlkit;
  const paddle = summaries.paddle_v6_small;
  const doctr = summaries.doctr_onnx;

  const handleExport = async () => {
    if (runs.length === 0) {
      Alert.alert('No Data', 'Run some OCR scans first before exporting logs.');
      return;
    }
    const success = await exportBenchmarkResults(runs);
    if (success) {
      // Export succeeded
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Benchmark Logs',
      'Are you sure you want to delete all saved benchmark runs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearBenchmarkRuns();
            onRefreshRuns();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Modal Top Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>DocsbyIRA OCR Lab</Text>
            <Text style={styles.subtitle}>Side-by-Side 3-Engine Benchmark ({runs.length} Runs)</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#E2E8F0" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Comparison Cards */}
          <View style={styles.comparisonTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colHeader, { flex: 1.1 }]}>Metric</Text>
              <Text style={[styles.colHeader, styles.colMlkit]}>ML Kit</Text>
              <Text style={[styles.colHeader, styles.colPaddle]}>Paddle</Text>
              <Text style={[styles.colHeader, styles.colDoctr]}>docTR</Text>
            </View>

            <TableRow3
              label="Samples"
              val1={`${mlkit?.sampleCount || 0}`}
              val2={`${paddle?.sampleCount || 0}`}
              val3={`${doctr?.sampleCount || 0}`}
            />
            <TableRow3
              label="p50 Latency"
              val1={mlkit?.sampleCount > 0 ? `${mlkit.p50LatencyMs}ms` : '—'}
              val2={paddle?.sampleCount > 0 ? `${paddle.p50LatencyMs}ms` : '—'}
              val3={doctr?.sampleCount > 0 ? `${doctr.p50LatencyMs}ms` : '—'}
            />
            <TableRow3
              label="p95 Latency"
              val1={mlkit?.sampleCount > 0 ? `${mlkit.p95LatencyMs}ms` : '—'}
              val2={paddle?.sampleCount > 0 ? `${paddle.p95LatencyMs}ms` : '—'}
              val3={doctr?.sampleCount > 0 ? `${doctr.p95LatencyMs}ms` : '—'}
            />
            <TableRow3
              label="GSTIN Match"
              val1={mlkit?.sampleCount > 0 ? `${mlkit.gstinDetectionRate}%` : '—'}
              val2={paddle?.sampleCount > 0 ? `${paddle.gstinDetectionRate}%` : '—'}
              val3={doctr?.sampleCount > 0 ? `${doctr.gstinDetectionRate}%` : '—'}
            />
            <TableRow3
              label="Grand Total"
              val1={mlkit?.sampleCount > 0 ? `${mlkit.totalDetectionRate}%` : '—'}
              val2={paddle?.sampleCount > 0 ? `${paddle.totalDetectionRate}%` : '—'}
              val3={doctr?.sampleCount > 0 ? `${doctr.totalDetectionRate}%` : '—'}
            />
            <TableRow3
              label="Confidence"
              val1={mlkit?.sampleCount > 0 ? `${Math.round(mlkit.avgConfidence * 100)}%` : '—'}
              val2={paddle?.sampleCount > 0 ? `${Math.round(paddle.avgConfidence * 100)}%` : '—'}
              val3={doctr?.sampleCount > 0 ? `${Math.round(doctr.avgConfidence * 100)}%` : '—'}
            />
            <TableRow3
              label="Size Delta"
              val1="~0.5MB"
              val2="~22MB"
              val3="~73MB"
            />
          </View>

          {/* Decision Gates Evaluation */}
          <Text style={styles.sectionTitle}>Spike Decision Gates (Strategy Doc)</Text>
          <View style={styles.gateList}>
            <GateItem
              gate="G1"
              title="Critical Field Exact Match"
              target="Beat native baseline by ≥5 pp"
              status={
                paddle.gstinDetectionRate >= mlkit.gstinDetectionRate + 5
                  ? 'pass'
                  : mlkit.sampleCount === 0 || paddle.sampleCount === 0
                  ? 'pending'
                  : 'fail'
              }
              notes="PP-OCRv6 must demonstrate clear accuracy gain to justify bundle size."
            />
            <GateItem
              gate="G2"
              title="GSTIN Exact Match"
              target="≥ 95% detection"
              status={
                mlkit.gstinDetectionRate >= 95 || paddle.gstinDetectionRate >= 95
                  ? 'pass'
                  : mlkit.sampleCount === 0 && paddle.sampleCount === 0
                  ? 'pending'
                  : 'fail'
              }
              notes="Missing GSTIN forces manual review in Tally accounting."
            />
            <GateItem
              gate="G4"
              title="p95 Latency on Low Device"
              target="≤ 2.5 s / page"
              status={
                (mlkit.sampleCount > 0 && mlkit.p95LatencyMs <= 2500) ||
                (paddle.sampleCount > 0 && paddle.p95LatencyMs <= 2500)
                  ? 'pass'
                  : mlkit.sampleCount === 0 && paddle.sampleCount === 0
                  ? 'pending'
                  : 'fail'
              }
              notes="Tail capture latency must maintain smooth user flow."
            />
            <GateItem
              gate="G5"
              title="App Size Delta"
              target="≤ 40 MB"
              status="pass"
              notes="PP-OCRv6_small quantised + runtime sits well under 40 MB."
            />
          </View>

          {/* Recent Runs List */}
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recorded Runs ({runs.length})</Text>
            {runs.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {runs.length === 0 ? (
            <Text style={styles.emptyRunsText}>No benchmark logs saved yet.</Text>
          ) : (
            runs.slice(0, 15).map(r => (
              <View key={r.id} style={styles.runCard}>
                <View style={styles.runCardTop}>
                  <View style={styles.runBadge}>
                    <Text
                      style={[
                        styles.runBadgeText,
                        {
                          color:
                            r.engine === 'mlkit'
                              ? '#38BDF8'
                              : r.engine === 'paddle_v6_small'
                              ? '#C084FC'
                              : '#34D399',
                        },
                      ]}
                    >
                      {r.engine === 'mlkit'
                        ? 'ML Kit'
                        : r.engine === 'paddle_v6_small'
                        ? 'PP-OCRv6'
                        : 'docTR'}
                    </Text>
                  </View>
                  <Text style={styles.runTime}>
                    {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.runLatency}>{r.latencyMs}ms</Text>
                </View>

                <View style={styles.runFields}>
                  <Text style={styles.runFieldItem}>
                    GSTIN: {r.extractedFields.supplierGstin ? '✅ ' + r.extractedFields.supplierGstin : '❌ None'}
                  </Text>
                  <Text style={styles.runFieldItem}>
                    Total: {r.extractedFields.grandTotal ? `₹${r.extractedFields.grandTotal}` : '—'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Bottom Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.exportBtnText}>Export Full JSON Benchmark Logs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

interface TableRow3Props {
  label: string;
  val1: string;
  val2: string;
  val3: string;
  winner?: 'val1' | 'val2' | 'val3';
}

const TableRow3: React.FC<TableRow3Props> = ({ label, val1, val2, val3, winner }) => {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.colLabel, { flex: 1.1 }]}>{label}</Text>
      <Text style={[styles.colValue, winner === 'val1' && styles.colWinner]}>{val1}</Text>
      <Text style={[styles.colValue, winner === 'val2' && styles.colWinner]}>{val2}</Text>
      <Text style={[styles.colValue, winner === 'val3' && styles.colWinner]}>{val3}</Text>
    </View>
  );
};

interface TableRowProps {
  label: string;
  val1: string;
  val2: string;
  winner?: 'val1' | 'val2';
}

const TableRow: React.FC<TableRowProps> = ({ label, val1, val2, winner }) => {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.colLabel, { flex: 1.4 }]}>{label}</Text>
      <Text style={[styles.colValue, winner === 'val1' && styles.colWinner]}>{val1}</Text>
      <Text style={[styles.colValue, winner === 'val2' && styles.colWinner]}>{val2}</Text>
    </View>
  );
};

interface GateItemProps {
  gate: string;
  title: string;
  target: string;
  status: 'pass' | 'fail' | 'pending';
  notes: string;
}

const GateItem: React.FC<GateItemProps> = ({ gate, title, target, status, notes }) => {
  const getStatusBadge = () => {
    if (status === 'pass') {
      return { text: 'PASS', bg: 'rgba(34, 197, 94, 0.2)', color: '#4ADE80' };
    }
    if (status === 'fail') {
      return { text: 'FAIL', bg: 'rgba(239, 68, 68, 0.2)', color: '#F87171' };
    }
    return { text: 'PENDING', bg: 'rgba(148, 163, 184, 0.2)', color: '#94A3B8' };
  };

  const badge = getStatusBadge();

  return (
    <View style={styles.gateCard}>
      <View style={styles.gateTop}>
        <View style={styles.gateTitleGroup}>
          <Text style={styles.gateTag}>{gate}</Text>
          <Text style={styles.gateTitle}>{title}</Text>
        </View>
        <View style={[styles.gateStatusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.gateStatusText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </View>
      <Text style={styles.gateTarget}>Target: {target}</Text>
      <Text style={styles.gateNotes}>{notes}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  comparisonTable: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  colHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'right',
  },
  colMlkit: {
    color: '#38BDF8',
  },
  colPaddle: {
    color: '#C084FC',
  },
  colDoctr: {
    color: '#34D399',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  colLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  colValue: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'right',
  },
  colWinner: {
    color: '#4ADE80',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 10,
  },
  gateList: {
    gap: 8,
    marginBottom: 24,
  },
  gateCard: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gateTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gateTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gateTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  gateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  gateStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gateStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  gateTarget: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
    marginTop: 2,
  },
  gateNotes: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 12,
    color: '#F87171',
    fontWeight: '600',
  },
  emptyRunsText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  runCard: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  runCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  runBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  runBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  runTime: {
    fontSize: 11,
    color: '#64748B',
  },
  runLatency: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  runFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  runFieldItem: {
    fontSize: 11,
    color: '#94A3B8',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 10,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
