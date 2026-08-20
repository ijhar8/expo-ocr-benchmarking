import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  pickPdfDocument,
  rasteriseAllPages,
  PdfPageInfo,
} from '../utils/pdfRasterizer';

interface PdfPickerButtonProps {
  /** Called with the rasterised image URI once a page is selected */
  onPageSelected: (uri: string, pageIndex: number, totalPages: number) => void;
  disabled?: boolean;
  /** Accent colour (defaults to ML Kit blue) */
  accentColor?: string;
}

type PickerState =
  | { phase: 'idle' }
  | { phase: 'picking' }
  | { phase: 'rasterising' }
  | { phase: 'selecting'; pages: PdfPageInfo[] }
  | { phase: 'error'; message: string };

export function PdfPickerButton({
  onPageSelected,
  disabled = false,
  accentColor = '#38BDF8',
}: PdfPickerButtonProps) {
  const [state, setState] = useState<PickerState>({ phase: 'idle' });
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not supported', 'PDF OCR is currently iOS-only.');
      return;
    }

    try {
      // 1. Pick document
      setState({ phase: 'picking' });
      const pdfUri = await pickPdfDocument();

      if (!pdfUri) {
        setState({ phase: 'idle' });
        return;
      }

      // 2. Rasterise all pages
      setState({ phase: 'rasterising' });
      const pages = await rasteriseAllPages(pdfUri, 2.0);

      if (pages.length === 0) {
        setState({ phase: 'error', message: 'PDF has no readable pages.' });
        return;
      }

      if (pages.length === 1) {
        // Single page — select immediately, no modal needed
        setState({ phase: 'idle' });
        onPageSelected(pages[0].uri, 0, 1);
        return;
      }

      // Multi-page — show picker modal
      setState({ phase: 'selecting', pages });
      setModalVisible(true);
    } catch (err: any) {
      setState({ phase: 'error', message: err?.message || 'Failed to open PDF' });
      Alert.alert('PDF Error', err?.message || 'Failed to process PDF');
    }
  }, [onPageSelected]);

  const handlePageSelect = useCallback(
    (page: PdfPageInfo) => {
      setModalVisible(false);
      setState({ phase: 'idle' });
      onPageSelected(page.uri, page.pageIndex, page.totalPages);
    },
    [onPageSelected],
  );

  const isLoading = state.phase === 'picking' || state.phase === 'rasterising';

  return (
    <>
      <TouchableOpacity
        style={[
          styles.btn,
          { borderColor: `${accentColor}55` },
          (disabled || isLoading) && styles.disabledBtn,
        ]}
        onPress={handlePress}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Ionicons name="document-attach-outline" size={18} color={accentColor} />
        )}
        <Text style={[styles.btnText, { color: accentColor }]}>
          {state.phase === 'rasterising' ? 'Loading…' : 'PDF'}
        </Text>
      </TouchableOpacity>

      {/* Page selector modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setState({ phase: 'idle' });
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Page</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setState({ phase: 'idle' });
                }}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {state.phase === 'selecting' ? `${state.pages.length} pages detected` : ''}
            </Text>

            {state.phase === 'selecting' && (
              <FlatList
                data={state.pages}
                keyExtractor={item => String(item.pageIndex)}
                numColumns={3}
                contentContainerStyle={styles.grid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pageCell}
                    onPress={() => handlePageSelect(item)}
                  >
                    {/* Page thumbnail placeholder — we render the number since Image loading
                        of many file:// pages can be slow; OCR itself shows the full image */}
                    <View style={[styles.pageThumbnail, { borderColor: accentColor }]}>
                      <Ionicons name="document-text" size={22} color={accentColor} />
                      <Text style={[styles.pageNum, { color: accentColor }]}>
                        {item.pageIndex + 1}
                      </Text>
                    </View>
                    <Text style={styles.pageCellLabel}>Page {item.pageIndex + 1}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 5,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  grid: {
    padding: 12,
  },
  pageCell: {
    flex: 1,
    alignItems: 'center',
    margin: 6,
  },
  pageThumbnail: {
    width: '100%',
    aspectRatio: 0.77,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pageNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  pageCellLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
});
