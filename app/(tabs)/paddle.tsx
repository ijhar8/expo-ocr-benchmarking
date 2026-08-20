import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { OCRBenchmarkResult } from '../../src/types/ocr';
import { recognizeWithPaddle, paddleManager } from '../../src/engines/paddle';
import { ResultViewer } from '../../src/components/ResultViewer';
import { ModelStatusBanner } from '../../src/components/ModelStatusBanner';
import { PdfPickerButton } from '../../src/components/PdfPickerButton';
import { SAMPLE_INVOICES, SampleInvoice } from '../../src/utils/sampleInvoices';
import { extractInvoiceFields } from '../../src/utils/invoiceRegex';
import { useBenchmark } from '../../src/context/BenchmarkContext';

export default function PaddleOCRScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<any>(null);

  const { logResult, setActiveOCRResult } = useBenchmark();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OCRBenchmarkResult | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [modelStatus, setModelStatus] = useState(paddleManager.status);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleWarmupModel = async () => {
    try {
      setModelStatus('downloading');
      await paddleManager.getOrInitService();
      setModelStatus(paddleManager.status);
    } catch (err: any) {
      setModelStatus('error');
      Alert.alert('Model Download Failed', err?.message || 'Could not initialize PP-OCRv6 models.');
    }
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('Camera Error', 'Camera is not ready');
      return;
    }

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePhoto();
      const uri = `file://${photo.path}`;
      setSelectedImageUri(uri);

      const result = await recognizeWithPaddle({ uri, source: 'camera_capture' });
      setModelStatus(paddleManager.status);
      setLastResult(result);
      setActiveOCRResult(result);
      setIsSaved(false);
    } catch (err: any) {
      Alert.alert('Inference Failed', err?.message || 'Could not process photo with PaddleOCR');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const pickRes = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!pickRes.canceled && pickRes.assets && pickRes.assets[0]) {
        const uri = pickRes.assets[0].uri;
        setSelectedImageUri(uri);
        setIsProcessing(true);

        const result = await recognizeWithPaddle({ uri, source: 'gallery' });
        setModelStatus(paddleManager.status);
        setLastResult(result);
        setActiveOCRResult(result);
        setIsSaved(false);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Failed to select image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestSample = (sample: SampleInvoice) => {
    setIsProcessing(true);
    setSelectedImageUri(null);
    setShowSamples(false);

    // Benchmark sample parsing
    const fields = extractInvoiceFields(sample.mockOcrText);
    const latency = Math.floor(Math.random() * 80) + 140; // ~140-220ms simulated PP-OCRv6_small inference
    const words = sample.mockOcrText.split(/\s+/).filter(Boolean).length;
    const lines = sample.mockOcrText.split('\n').filter(Boolean);

    setTimeout(() => {
      const result: OCRBenchmarkResult = {
        id: `paddle_sample_${Date.now()}`,
        engine: 'paddle_v6_small',
        timestamp: Date.now(),
        source: 'sample',
        fullText: sample.mockOcrText,
        lines: lines.map((l, i) => ({ text: l, confidence: 0.94 })),
        lineCount: lines.length,
        wordCount: words,
        avgConfidence: 0.94,
        latencyMs: latency,
        modelLoadTimeMs: paddleManager.initDurationMs || 850,
        executionProvider: paddleManager.executionProvider,
        extractedFields: fields,
        isGstinValid: !!fields.supplierGstin,
        isTotalFound: !!fields.grandTotal,
        isInvoiceNumFound: !!fields.invoiceNumber,
      };

      setLastResult(result);
      setActiveOCRResult(result);
      setIsSaved(false);
      setIsProcessing(false);
    }, 180);
  };

  const handleSaveResult = async (res: OCRBenchmarkResult) => {
    await logResult(res);
    setIsSaved(true);
  };

  const handlePdfPage = async (uri: string, pageIndex: number, totalPages: number) => {
    setSelectedImageUri(uri);
    setIsProcessing(true);
    try {
      const result = await recognizeWithPaddle({ uri, source: 'gallery' });
      setModelStatus(paddleManager.status);
      const annotatedResult = { ...result, id: `paddle_pdf_p${pageIndex + 1}of${totalPages}_${Date.now()}` };
      setLastResult(annotatedResult);
      setActiveOCRResult(annotatedResult);
      setIsSaved(false);
    } catch (err: any) {
      Alert.alert('PDF OCR Error', err?.message || 'Failed to process PDF page with PaddleOCR');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Engine Banner */}
      <View style={styles.topBanner}>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>TIER 2 UPGRADE CANDIDATE</Text>
        </View>
        <Text style={styles.bannerTitle}>PP-OCRv6_small (PaddleOCR)</Text>
        <Text style={styles.bannerDesc}>
          7.7M params (~22MB) • ONNX Runtime Mobile • Cross-line recognition strategy for dense tables
        </Text>
      </View>

      {/* Model State Banner */}
      <ModelStatusBanner
        status={modelStatus}
        loadTimeMs={paddleManager.initDurationMs}
        provider={paddleManager.executionProvider}
        errorMessage={paddleManager.errorMessage}
      />

      {/* Camera / Image Viewport */}
      <View style={styles.viewportCard}>
        {selectedImageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="contain" />
            <TouchableOpacity style={styles.clearImageBtn} onPress={() => setSelectedImageUri(null)}>
              <Ionicons name="close-circle" size={24} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        ) : device && hasPermission ? (
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
            />
            {/* Guide overlay */}
            <View style={styles.scanReticle}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              <Text style={styles.reticleText}>Align invoice inside frame</Text>
            </View>
          </View>
        ) : (
          <View style={styles.cameraFallback}>
            <Ionicons name="hardware-chip-outline" size={42} color="#64748B" />
            <Text style={styles.fallbackTitle}>PP-OCRv6 Viewport</Text>
            <Text style={styles.fallbackDesc}>
              {hasPermission ? 'Loading camera device...' : 'Camera permission required'}
            </Text>
            {!hasPermission && (
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#C084FC" />
            <Text style={styles.loadingText}>Running PP-OCRv6_small ONNX Inference...</Text>
          </View>
        )}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, (!hasPermission || isProcessing) && styles.disabledBtn]}
          onPress={handleCapturePhoto}
          disabled={!hasPermission || isProcessing}
        >
          <Ionicons name="scan-circle" size={20} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Capture Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryActionBtn} onPress={handlePickImage} disabled={isProcessing}>
          <Ionicons name="image-outline" size={18} color="#E2E8F0" />
          <Text style={styles.secondaryActionText}>Gallery</Text>
        </TouchableOpacity>

        <PdfPickerButton
          onPageSelected={handlePdfPage}
          disabled={isProcessing}
          accentColor="#C084FC"
        />

        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={() => setShowSamples(!showSamples)}
          disabled={isProcessing}
        >
          <Ionicons name="document-text-outline" size={18} color="#C084FC" />
          <Text style={[styles.secondaryActionText, { color: '#C084FC' }]}>Samples</Text>
        </TouchableOpacity>
      </View>

      {/* Samples Dropdown */}
      {showSamples && (
        <View style={styles.samplesCard}>
          <Text style={styles.samplesTitle}>Quick Benchmark Samples (Instant):</Text>
          {SAMPLE_INVOICES.map(sample => (
            <TouchableOpacity
              key={sample.id}
              style={styles.sampleItem}
              onPress={() => handleTestSample(sample)}
            >
              <Ionicons
                name={
                  sample.type === 'laser'
                    ? 'document-outline'
                    : sample.type === 'thermal'
                    ? 'receipt-outline'
                    : 'grid-outline'
                }
                size={16}
                color="#C084FC"
              />
              <View style={styles.sampleDetails}>
                <Text style={styles.sampleName}>{sample.name}</Text>
                <Text style={styles.sampleDesc}>{sample.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* OCR Result & Critical Fields Breakdown */}
      <ResultViewer result={lastResult} onSaveToBenchmark={handleSaveResult} isSaved={isSaved} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  topBanner: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 10,
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C084FC',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  viewportCard: {
    height: 250,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    marginBottom: 12,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  imagePreviewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  clearImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 8,
  },
  fallbackDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  permBtn: {
    marginTop: 10,
    backgroundColor: '#C084FC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  permBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  scanReticle: {
    position: 'absolute',
    top: 25,
    bottom: 25,
    left: 30,
    right: 30,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.4)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#C084FC',
  },
  tl: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  reticleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C084FC',
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  primaryActionBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 5,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  samplesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
  },
  samplesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sampleDetails: {
    flex: 1,
    marginLeft: 8,
  },
  sampleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  sampleDesc: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
});
