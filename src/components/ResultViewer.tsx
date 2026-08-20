import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OCRBenchmarkResult } from '../types/ocr';
import { MetricBadge } from './MetricBadge';
import { StructuredResultView } from './StructuredResultView';
import { parseStructuredInvoice } from '../utils/structuredParser';
import { StructuredInvoiceData } from '../types/structuredInvoice';

import { useRouter } from 'expo-router';
import { useBenchmark } from '../context/BenchmarkContext';

interface ResultViewerProps {
  result: OCRBenchmarkResult | null;
  onSaveToBenchmark?: (result: OCRBenchmarkResult) => void;
  isSaved?: boolean;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({
  result,
  onSaveToBenchmark,
  isSaved,
}) => {
  const router = useRouter();
  const { setActiveOCRResult, updateActiveField } = useBenchmark();
  const [activeTab, setActiveTab] = useState<'structured' | 'fields' | 'text' | 'lines'>('structured');
  const [isFullScreenModal, setIsFullScreenModal] = useState(false);
  const [localStructuredData, setLocalStructuredData] = useState<StructuredInvoiceData | null>(null);

  // Compute structured JSON data whenever result changes
  const structuredData = useMemo(() => {
    if (!result) return null;
    return localStructuredData || parseStructuredInvoice(result.fullText);
  }, [result, localStructuredData]);

  const handleUpdateField = (key: string, newValue: string) => {
    if (!structuredData) return;
    const updatedKeyValues = structuredData.keyValuePairs.map(f =>
      f.key === key ? { ...f, value: newValue } : f
    );
    setLocalStructuredData({
      ...structuredData,
      keyValuePairs: updatedKeyValues,
    });
    updateActiveField(key, newValue);
  };

  if (!result || !structuredData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="scan-outline" size={36} color="#475569" />
        <Text style={styles.emptyTitle}>No OCR Output Yet</Text>
        <Text style={styles.emptySubtitle}>
          Capture an invoice or pick a sample from gallery / PDF to extract structured JSON
        </Text>
      </View>
    );
  }

  const { extractedFields, latencyMs, avgConfidence, wordCount, lineCount, fullText, lines, engine } = result;

  const handleOpenStandaloneResult = () => {
    setActiveOCRResult(result);
    router.push('/result');
  };

  const handleShareText = async () => {
    try {
      await Share.share({
        message: `[${engine.toUpperCase()} OCR Output]\n\n${fullText}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getEngineColor = () => {
    if (engine === 'mlkit') return '#38BDF8';
    if (engine === 'paddle_v6_small') return '#C084FC';
    if (engine === 'doctr_onnx') return '#34D399';
    return '#38BDF8';
  };

  const getEngineName = () => {
    if (engine === 'mlkit') return 'ML Kit (Native)';
    if (engine === 'paddle_v6_small') return 'PP-OCRv6_small (ONNX)';
    if (engine === 'doctr_onnx') return 'docTR (ONNX)';
    return engine;
  };

  return (
    <View style={styles.card}>
      {/* Top Header & Metrics Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.engineDot, { backgroundColor: getEngineColor() }]} />
          <Text style={styles.engineTitle}>{getEngineName()}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.openResultBtn}
            onPress={handleOpenStandaloneResult}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={13} color="#0F172A" />
            <Text style={styles.openResultBtnText}>View Result</Text>
          </TouchableOpacity>

          {onSaveToBenchmark && (
            <TouchableOpacity
              style={[styles.actionBtn, isSaved && styles.actionBtnSaved]}
              onPress={() => onSaveToBenchmark(result)}
              disabled={isSaved}
            >
              <Ionicons
                name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                size={14}
                color={isSaved ? '#4ADE80' : '#E2E8F0'}
              />
              <Text style={[styles.actionBtnText, isSaved && { color: '#4ADE80' }]}>
                {isSaved ? 'Logged' : 'Log'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.iconActionBtn} onPress={handleShareText}>
            <Ionicons name="share-outline" size={15} color="#E2E8F0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics Badges Row */}
      <View style={styles.metricsRow}>
        <MetricBadge
          label="Latency"
          value={latencyMs}
          unit="ms"
          icon="timer-outline"
          variant={latencyMs <= 1000 ? 'success' : latencyMs <= 2500 ? 'warning' : 'default'}
        />
        <MetricBadge
          label="Confidence"
          value={`${Math.round(avgConfidence * 100)}%`}
          icon="shield-checkmark-outline"
          variant={avgConfidence >= 0.85 ? 'success' : 'warning'}
        />
        <MetricBadge label="Words" value={wordCount} icon="text-outline" />
        <MetricBadge label="Keys" value={structuredData.keyValuePairs.length} icon="pricetag-outline" />
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'structured' && styles.subTabActive]}
          onPress={() => setActiveTab('structured')}
        >
          <Ionicons
            name="flash"
            size={13}
            color={activeTab === 'structured' ? '#38BDF8' : '#64748B'}
          />
          <Text style={[styles.subTabText, activeTab === 'structured' && styles.subTabTextActive]}>
            Key-Value JSON ({structuredData.keyValuePairs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeTab === 'fields' && styles.subTabActive]}
          onPress={() => setActiveTab('fields')}
        >
          <Text style={[styles.subTabText, activeTab === 'fields' && styles.subTabTextActive]}>
            Summary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeTab === 'text' && styles.subTabActive]}
          onPress={() => setActiveTab('text')}
        >
          <Text style={[styles.subTabText, activeTab === 'text' && styles.subTabTextActive]}>
            Raw Text
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, activeTab === 'lines' && styles.subTabActive]}
          onPress={() => setActiveTab('lines')}
        >
          <Text style={[styles.subTabText, activeTab === 'lines' && styles.subTabTextActive]}>
            Boxes ({lines.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'structured' && (
        <View style={styles.structuredWrap}>
          <StructuredResultView
            data={structuredData}
            onUpdateField={handleUpdateField}
          />
        </View>
      )}

      {activeTab === 'fields' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.fieldsContainer}>
            <FieldRow
              label="Supplier GSTIN"
              value={extractedFields.supplierGstin}
              isValid={!!extractedFields.supplierGstin}
              badge="Critical G2"
            />
            <FieldRow
              label="Recipient GSTIN"
              value={extractedFields.recipientGstin}
              isValid={!!extractedFields.recipientGstin}
            />
            <FieldRow
              label="Invoice Number"
              value={extractedFields.invoiceNumber}
              isValid={!!extractedFields.invoiceNumber}
            />
            <FieldRow
              label="Invoice Date"
              value={extractedFields.invoiceDate}
              isValid={!!extractedFields.invoiceDate}
            />
            <FieldRow
              label="Grand Total"
              value={extractedFields.grandTotal ? `₹ ${extractedFields.grandTotal}` : undefined}
              isValid={!!extractedFields.grandTotal}
              isHighlight
            />
            {extractedFields.taxableValue && (
              <FieldRow label="Taxable Value" value={`₹ ${extractedFields.taxableValue}`} isValid />
            )}
            {(extractedFields.cgstAmount || extractedFields.sgstAmount || extractedFields.igstAmount) && (
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>Taxes Detected:</Text>
                <Text style={styles.taxValue}>
                  {[
                    extractedFields.cgstAmount ? `CGST: ₹${extractedFields.cgstAmount}` : null,
                    extractedFields.sgstAmount ? `SGST: ₹${extractedFields.sgstAmount}` : null,
                    extractedFields.igstAmount ? `IGST: ₹${extractedFields.igstAmount}` : null,
                  ]
                    .filter(Boolean)
                    .join('  •  ')}
                </Text>
              </View>
            )}
            {extractedFields.hsnCodes.length > 0 && (
              <View style={styles.hsnContainer}>
                <Text style={styles.hsnLabel}>HSN/SAC Codes:</Text>
                <Text style={styles.hsnValue}>{extractedFields.hsnCodes.join(', ')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'text' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.textContainer}>
            <Text style={styles.rawText} selectable>
              {fullText || '(No text detected)'}
            </Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'lines' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.linesContainer}>
            {lines.length === 0 ? (
              <Text style={styles.dimText}>No bounding boxes available</Text>
            ) : (
              lines.map((l, idx) => (
                <View key={idx} style={styles.lineItem}>
                  <Text style={styles.lineNumber}>#{idx + 1}</Text>
                  <View style={styles.lineBody}>
                    <Text style={styles.lineText}>{l.text}</Text>
                    <Text style={styles.lineConf}>Conf: {Math.round(l.confidence * 100)}%</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Fullscreen Modal View */}
      <Modal visible={isFullScreenModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.fullModalWrap}>
          <View style={styles.fullModalHeader}>
            <Text style={styles.fullModalTitle}>Structured Invoice Extraction</Text>
            <TouchableOpacity
              style={styles.fullModalCloseBtn}
              onPress={() => setIsFullScreenModal(false)}
            >
              <Ionicons name="close" size={20} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
          <StructuredResultView
            data={structuredData}
            onUpdateField={handleUpdateField}
          />
        </View>
      </Modal>
    </View>
  );
};

interface FieldRowProps {
  label: string;
  value?: string;
  isValid?: boolean;
  badge?: string;
  isHighlight?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, isValid, badge, isHighlight }) => {
  return (
    <View style={[styles.fieldRow, isHighlight && styles.fieldRowHighlight]}>
      <View style={styles.fieldLabelContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {badge && <Text style={styles.fieldBadge}>{badge}</Text>}
      </View>
      <View style={styles.fieldValueContainer}>
        {value ? (
          <Text style={[styles.fieldValue, isHighlight && styles.fieldValueHighlight]}>{value}</Text>
        ) : (
          <Text style={styles.fieldMissing}>— Not Found —</Text>
        )}
        <Ionicons
          name={isValid ? 'checkmark-circle' : 'close-circle'}
          size={16}
          color={isValid ? '#4ADE80' : '#64748B'}
          style={{ marginLeft: 6 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  engineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  openResultBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnSaved: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    marginLeft: 4,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 6,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  subTabActive: {
    borderBottomColor: '#38BDF8',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  structuredWrap: {
    height: 480,
  },
  scrollArea: {
    maxHeight: 380,
  },
  scrollContent: {
    padding: 12,
  },
  fieldsContainer: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldRowHighlight: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  fieldBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  fieldValueHighlight: {
    color: '#38BDF8',
    fontSize: 15,
  },
  fieldMissing: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
  },
  taxRow: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  taxValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  hsnContainer: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hsnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  hsnValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  textContainer: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
  },
  rawText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
    fontFamily: 'Courier',
  },
  linesContainer: {
    gap: 6,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
  },
  lineNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    width: 30,
  },
  lineBody: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineText: {
    fontSize: 12,
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  lineConf: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
  },
  dimText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 14,
    marginBottom: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  fullModalWrap: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  fullModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  fullModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
});
