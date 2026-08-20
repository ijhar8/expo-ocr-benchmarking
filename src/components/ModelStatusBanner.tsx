import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaddleModelStatus } from '../engines/paddle';

interface ModelStatusBannerProps {
  status: PaddleModelStatus;
  loadTimeMs?: number;
  provider?: string;
  errorMessage?: string | null;
}

export const ModelStatusBanner: React.FC<ModelStatusBannerProps> = ({
  status,
  loadTimeMs,
  provider,
  errorMessage,
}) => {
  if (status === 'uninitialized') {
    return (
      <View style={[styles.container, styles.uninitialized]}>
        <Ionicons name="cloud-download-outline" size={14} color="#94A3B8" />
        <Text style={styles.text}>PP-OCRv6_small (~22MB) loads into memory on first scan</Text>
      </View>
    );
  }

  if (status === 'downloading') {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 6 }} />
        <Text style={[styles.text, { color: '#38BDF8', fontWeight: '600' }]}>
          Initializing PP-OCRv6 & ONNX runtime...
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, styles.error]}>
        <Ionicons name="alert-circle" size={14} color="#F87171" />
        <Text style={[styles.text, { color: '#F87171' }]} numberOfLines={1}>
          {errorMessage || 'Failed to load model'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.ready]}>
      <Ionicons name="checkmark-circle" size={14} color="#4ADE80" />
      <Text style={[styles.text, { color: '#4ADE80' }]}>
        PP-OCRv6 Ready {loadTimeMs ? `(${loadTimeMs}ms load)` : ''} • {provider || 'Accelerated'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  uninitialized: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  loading: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  ready: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  text: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
    flex: 1,
  },
});
