import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBenchmark } from '../src/context/BenchmarkContext';
import { StructuredResultView } from '../src/components/StructuredResultView';
import { MetricBadge } from '../src/components/MetricBadge';

export default function StandaloneResultScreen() {
  const router = useRouter();
  const { activeResult, activeStructuredData, updateActiveField, logResult } = useBenchmark();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleShare = async () => {
    if (!activeStructuredData) return;
    try {
      await Share.share({
        title: 'Structured Invoice Data (JSON)',
        message: JSON.stringify(activeStructuredData, null, 2),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getEngineColor = () => {
    if (!activeResult) return '#38BDF8';
    switch (activeResult.engine) {
      case 'mlkit':
        return '#38BDF8';
      case 'paddle_v6_small':
        return '#C084FC';
      case 'doctr_onnx':
        return '#34D399';
      default:
        return '#38BDF8';
    }
  };

  const getEngineName = () => {
    if (!activeResult) return 'Structured Extractor';
    switch (activeResult.engine) {
      case 'mlkit':
        return 'ML Kit (Native)';
      case 'paddle_v6_small':
        return 'PP-OCRv6 (ONNX)';
      case 'doctr_onnx':
        return 'docTR (ONNX)';
      default:
        return activeResult.engine;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Navigation Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#F8FAFC" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Extracted Key-Value Result</Text>
          <View style={styles.engineBadge}>
            <View style={[styles.engineDot, { backgroundColor: getEngineColor() }]} />
            <Text style={[styles.engineText, { color: getEngineColor() }]}>{getEngineName()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Metric Summary Bar */}
      {activeResult && (
        <View style={styles.metricSummaryBar}>
          <MetricBadge
            label="Latency"
            value={activeResult.latencyMs}
            unit="ms"
            icon="timer-outline"
            variant={activeResult.latencyMs <= 1000 ? 'success' : activeResult.latencyMs <= 2500 ? 'warning' : 'default'}
          />
          <MetricBadge
            label="Confidence"
            value={`${Math.round(activeResult.avgConfidence * 100)}%`}
            icon="shield-checkmark-outline"
            variant={activeResult.avgConfidence >= 0.85 ? 'success' : 'warning'}
          />
          <MetricBadge
            label="Keys Extracted"
            value={activeStructuredData?.keyValuePairs.length || 0}
            icon="pricetag-outline"
          />
          <MetricBadge
            label="Lines"
            value={activeResult.lineCount}
            icon="list-outline"
          />
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeStructuredData ? (
          <StructuredResultView
            data={activeStructuredData}
            onUpdateField={updateActiveField}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="scan-outline" size={54} color="#475569" />
            <Text style={styles.emptyTitle}>No Active Scan Result</Text>
            <Text style={styles.emptySubtitle}>
              Please scan or test an invoice in any of the OCR tabs (ML Kit, PaddleOCR, or docTR) to view structured key-value pairs here.
            </Text>
            <TouchableOpacity style={styles.goToScanBtn} onPress={handleBack}>
              <Ionicons name="arrow-back-circle-outline" size={20} color="#0F172A" />
              <Text style={styles.goToScanBtnText}>Go to OCR Scanners</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    gap: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shareBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricSummaryBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  content: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  goToScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 14,
    gap: 6,
  },
  goToScanBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
