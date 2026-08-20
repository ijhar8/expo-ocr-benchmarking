import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StructuredInvoiceData, StructuredField } from '../types/structuredInvoice';

interface StructuredResultViewProps {
  data: StructuredInvoiceData;
  onUpdateField?: (key: string, newValue: string) => void;
}

type DisplayView = 'key_value' | 'line_items' | 'all_lines' | 'json' | 'csv';
type CategoryFilter = 'all' | 'core' | 'custom_pairs' | 'raw_lines';

export const StructuredResultView: React.FC<StructuredResultViewProps> = ({
  data,
  onUpdateField,
}) => {
  const [currentView, setCurrentView] = useState<DisplayView>('key_value');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Inline editing modal state
  const [editingField, setEditingField] = useState<StructuredField | null>(null);
  const [editValue, setEditValue] = useState('');

  // Group fields by category
  const categories = useMemo(() => {
    const list = data.keyValuePairs.filter(field => {
      // Category filter
      if (categoryFilter === 'core' && (field.category === 'raw_line' || field.category === 'extracted_pair')) {
        return false;
      }
      if (categoryFilter === 'custom_pairs' && field.category !== 'extracted_pair') {
        return false;
      }
      if (categoryFilter === 'raw_lines' && field.category !== 'raw_line') {
        return false;
      }

      // Search query filter
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        field.label.toLowerCase().includes(q) ||
        field.key.toLowerCase().includes(q) ||
        field.value.toString().toLowerCase().includes(q)
      );
    });

    const groups: { [cat: string]: StructuredField[] } = {
      document: [],
      supplier: [],
      customer: [],
      financial: [],
      payment: [],
      extracted_pair: [],
      raw_line: [],
      other: [],
    };

    list.forEach(field => {
      const cat = field.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(field);
    });

    return groups;
  }, [data.keyValuePairs, searchQuery, categoryFilter]);

  const categoryLabels: { [key: string]: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string } } = {
    document: { label: 'Document Details', icon: 'document-text-outline', color: '#38BDF8' },
    supplier: { label: 'Vendor / Supplier', icon: 'business-outline', color: '#F59E0B' },
    customer: { label: 'Customer / Buyer', icon: 'person-outline', color: '#A855F7' },
    financial: { label: 'Financials & Taxes', icon: 'cash-outline', color: '#4ADE80' },
    payment: { label: 'Bank & Payment Details', icon: 'card-outline', color: '#60A5FA' },
    extracted_pair: { label: 'Detected Key-Value Pairs', icon: 'pricetag-outline', color: '#EC4899' },
    raw_line: { label: 'All OCR Extracted Lines', icon: 'list-outline', color: '#CBD5E1' },
    other: { label: 'Additional Extracted Text', icon: 'albums-outline', color: '#94A3B8' },
  };

  const handleCopyValue = async (field: StructuredField) => {
    try {
      setCopiedKey(field.key);
      await Share.share({
        message: `${field.label} (${field.key}): ${field.value}`,
      });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareJSON = async () => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      await Share.share({
        title: `Invoice_${data.invoiceNumber || 'Data'}.json`,
        message: jsonStr,
      });
    } catch (e) {
      Alert.alert('Share Failed', 'Unable to share JSON');
    }
  };

  const handleShareCSV = async () => {
    try {
      let csv = 'Key,Label,Value,Category\n';
      data.keyValuePairs.forEach(f => {
        csv += `"${f.key}","${f.label}","${f.value.toString().replace(/"/g, '""')}","${f.category}"\n`;
      });
      if (data.items.length > 0) {
        csv += '\nItem #,Description,HSN/SAC,Qty,Rate,Total\n';
        data.items.forEach(it => {
          csv += `"${it.itemNumber}","${it.description}","${it.hsnSac || ''}","${it.quantity || ''}","${it.unitPrice || ''}","${it.totalAmount || ''}"\n`;
        });
      }
      await Share.share({
        title: `Invoice_${data.invoiceNumber || 'Export'}.csv`,
        message: csv,
      });
    } catch (e) {
      Alert.alert('Export Failed', 'Unable to export CSV');
    }
  };

  const openEditModal = (field: StructuredField) => {
    setEditingField(field);
    setEditValue(field.value.toString());
  };

  const saveEdit = () => {
    if (editingField && onUpdateField) {
      onUpdateField(editingField.key, editValue);
    }
    setEditingField(null);
  };

  // Counts
  const totalCount = data.keyValuePairs.length;
  const rawLinesCount = data.allExtractedLines?.length || 0;
  const structuredFieldsCount = totalCount - rawLinesCount;

  return (
    <View style={styles.container}>
      {/* Top Quality Verification & Stats Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View style={styles.docTypeBadge}>
            <Ionicons name="receipt-outline" size={14} color="#38BDF8" />
            <Text style={styles.docTypeText}>{data.documentType || 'Tax Invoice'}</Text>
          </View>
          <View style={styles.confBadge}>
            <Ionicons name="sparkles" size={13} color="#4ADE80" />
            <Text style={styles.confText}>{totalCount} Extracted Items</Text>
          </View>
        </View>

        {/* Verification & Element Counts */}
        <View style={styles.flagsRow}>
          <View style={[styles.flagPill, data.verification.isGstinValid ? styles.flagValid : styles.flagWarning]}>
            <Ionicons
              name={data.verification.isGstinValid ? 'checkmark-circle' : 'alert-circle-outline'}
              size={12}
              color={data.verification.isGstinValid ? '#4ADE80' : '#F59E0B'}
            />
            <Text style={[styles.flagText, { color: data.verification.isGstinValid ? '#4ADE80' : '#F59E0B' }]}>
              {data.verification.isGstinValid ? 'GSTIN Valid' : 'GST Check'}
            </Text>
          </View>

          <View style={[styles.flagPill, data.verification.isMathValid ? styles.flagValid : styles.flagDefault]}>
            <Ionicons
              name={data.verification.isMathValid ? 'calculator' : 'calculator-outline'}
              size={12}
              color={data.verification.isMathValid ? '#4ADE80' : '#94A3B8'}
            />
            <Text style={[styles.flagText, { color: data.verification.isMathValid ? '#4ADE80' : '#94A3B8' }]}>
              {data.verification.isMathValid ? 'Math Verified' : 'Math OK'}
            </Text>
          </View>

          <View style={[styles.flagPill, styles.flagValid]}>
            <Ionicons name="layers-outline" size={12} color="#38BDF8" />
            <Text style={[styles.flagText, { color: '#38BDF8' }]}>
              {structuredFieldsCount} Fields + {rawLinesCount} Lines
            </Text>
          </View>
        </View>
      </View>

      {/* Main View Mode Selector Tabs */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navTab, currentView === 'key_value' && styles.navTabActive]}
          onPress={() => setCurrentView('key_value')}
        >
          <Ionicons
            name="pricetags-outline"
            size={14}
            color={currentView === 'key_value' ? '#38BDF8' : '#94A3B8'}
          />
          <Text style={[styles.navTabText, currentView === 'key_value' && styles.navTabTextActive]}>
            All Extracted ({totalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, currentView === 'line_items' && styles.navTabActive]}
          onPress={() => setCurrentView('line_items')}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={currentView === 'line_items' ? '#38BDF8' : '#94A3B8'}
          />
          <Text style={[styles.navTabText, currentView === 'line_items' && styles.navTabTextActive]}>
            Line Items ({data.items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, currentView === 'all_lines' && styles.navTabActive]}
          onPress={() => setCurrentView('all_lines')}
        >
          <Ionicons
            name="reader-outline"
            size={14}
            color={currentView === 'all_lines' ? '#38BDF8' : '#94A3B8'}
          />
          <Text style={[styles.navTabText, currentView === 'all_lines' && styles.navTabTextActive]}>
            Raw Lines ({rawLinesCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, currentView === 'json' && styles.navTabActive]}
          onPress={() => setCurrentView('json')}
        >
          <Ionicons
            name="code-slash-outline"
            size={14}
            color={currentView === 'json' ? '#38BDF8' : '#94A3B8'}
          />
          <Text style={[styles.navTabText, currentView === 'json' && styles.navTabTextActive]}>
            JSON
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area: Key-Value View */}
      {currentView === 'key_value' && (
        <View style={styles.contentWrap}>
          {/* Quick Search & Filter Chips */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search any extracted key or value..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[styles.filterChip, categoryFilter === 'all' && styles.filterChipActive]}
              onPress={() => setCategoryFilter('all')}
            >
              <Text style={[styles.filterChipText, categoryFilter === 'all' && styles.filterChipTextActive]}>
                Everything ({totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, categoryFilter === 'core' && styles.filterChipActive]}
              onPress={() => setCategoryFilter('core')}
            >
              <Text style={[styles.filterChipText, categoryFilter === 'core' && styles.filterChipTextActive]}>
                Structured Fields ({structuredFieldsCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, categoryFilter === 'custom_pairs' && styles.filterChipActive]}
              onPress={() => setCategoryFilter('custom_pairs')}
            >
              <Text style={[styles.filterChipText, categoryFilter === 'custom_pairs' && styles.filterChipTextActive]}>
                Detected Pairs ({categories.extracted_pair?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, categoryFilter === 'raw_lines' && styles.filterChipActive]}
              onPress={() => setCategoryFilter('raw_lines')}
            >
              <Text style={[styles.filterChipText, categoryFilter === 'raw_lines' && styles.filterChipTextActive]}>
                OCR Lines ({rawLinesCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {Object.keys(categories).map(catKey => {
              const fields = categories[catKey];
              if (!fields || fields.length === 0) return null;
              const meta = categoryLabels[catKey] || categoryLabels.other;

              return (
                <View key={catKey} style={styles.categoryCard}>
                  {/* Category Header */}
                  <View style={styles.catHeader}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                    <Text style={[styles.catTitle, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={styles.catCount}>({fields.length})</Text>
                  </View>

                  {/* Field Pairs */}
                  <View style={styles.fieldList}>
                    {fields.map((field, idx) => {
                      const isCopied = copiedKey === field.key;
                      return (
                        <View key={field.key} style={[styles.fieldRow, idx > 0 && styles.fieldBorderTop]}>
                          <View style={styles.fieldMetaCol}>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <Text style={styles.fieldKeyName}>{field.key}</Text>
                            {field.badge && (
                              <View style={styles.badgePill}>
                                <Text style={styles.badgePillText}>{field.badge}</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.fieldValueCol}>
                            <Text
                              style={[
                                styles.fieldValueText,
                                field.isCritical && styles.fieldValueHighlight,
                              ]}
                              selectable
                            >
                              {field.value.toString()}
                            </Text>

                            <View style={styles.fieldBtnRow}>
                              <TouchableOpacity
                                style={styles.fieldActionBtn}
                                onPress={() => handleCopyValue(field)}
                              >
                                <Ionicons
                                  name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                                  size={13}
                                  color={isCopied ? '#4ADE80' : '#94A3B8'}
                                />
                                <Text style={[styles.fieldActionText, isCopied && { color: '#4ADE80' }]}>
                                  {isCopied ? 'Copied' : 'Share'}
                                </Text>
                              </TouchableOpacity>

                              {onUpdateField && (
                                <TouchableOpacity
                                  style={styles.fieldActionBtn}
                                  onPress={() => openEditModal(field)}
                                >
                                  <Ionicons name="pencil-outline" size={13} color="#38BDF8" />
                                  <Text style={[styles.fieldActionText, { color: '#38BDF8' }]}>Edit</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* View: Line Items Table */}
      {currentView === 'line_items' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {data.items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="file-tray-outline" size={32} color="#475569" />
              <Text style={styles.emptyText}>No tabular line items detected in OCR output</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 30 }]}>#</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Description</Text>
                <Text style={[styles.th, { width: 60, textAlign: 'center' }]}>HSN/SAC</Text>
                <Text style={[styles.th, { width: 45, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Rate</Text>
                <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Total</Text>
              </View>

              {data.items.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.td, { width: 30, color: '#94A3B8' }]}>{item.itemNumber}</Text>
                  <Text style={[styles.td, { flex: 1.5, color: '#F8FAFC', fontWeight: '600' }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.td, { width: 60, textAlign: 'center', color: '#38BDF8' }]}>
                    {item.hsnSac || '—'}
                  </Text>
                  <Text style={[styles.td, { width: 45, textAlign: 'center', color: '#E2E8F0' }]}>
                    {item.quantity ?? '—'}
                  </Text>
                  <Text style={[styles.td, { width: 70, textAlign: 'right', color: '#E2E8F0' }]}>
                    {item.unitPrice ? `₹${item.unitPrice.toFixed(2)}` : '—'}
                  </Text>
                  <Text style={[styles.td, { width: 80, textAlign: 'right', color: '#4ADE80', fontWeight: '700' }]}>
                    {item.totalAmount ? `₹${item.totalAmount.toFixed(2)}` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* View: All OCR Raw Lines */}
      {currentView === 'all_lines' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.allLinesCard}>
            {data.allExtractedLines.map((lineItem, idx) => (
              <View key={idx} style={[styles.rawLineRow, idx > 0 && styles.fieldBorderTop]}>
                <Text style={styles.rawLineNum}>#{lineItem.lineNumber}</Text>
                <Text style={styles.rawLineText} selectable>{lineItem.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* View: Raw JSON Tree */}
      {currentView === 'json' && (
        <View style={styles.jsonWrap}>
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            <View style={styles.jsonCard}>
              <Text style={styles.jsonCode} selectable>
                {JSON.stringify(data, null, 2)}
              </Text>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Bottom Floating Export Actions */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.primaryExportBtn} onPress={handleShareJSON}>
          <Ionicons name="share-social-outline" size={16} color="#0F172A" />
          <Text style={styles.primaryExportText}>Share Full JSON ({totalCount})</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryExportBtn} onPress={handleShareCSV}>
          <Ionicons name="download-outline" size={16} color="#38BDF8" />
          <Text style={styles.secondaryExportText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Field Modal */}
      <Modal visible={!!editingField} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit {editingField?.label}</Text>
            <Text style={styles.modalKeyLabel}>Key: {editingField?.key}</Text>

            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder="Enter new value..."
              placeholderTextColor="#64748B"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingField(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEdit}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  banner: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  docTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  docTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginLeft: 6,
  },
  confBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
    marginLeft: 4,
  },
  flagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
  },
  flagValid: {
    borderColor: 'rgba(74, 222, 128, 0.3)',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  flagWarning: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  flagDefault: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  flagText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 10,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  navTabActive: {
    borderBottomColor: '#38BDF8',
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navTabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  contentWrap: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    padding: 0,
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 80,
  },
  categoryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  catTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  catCount: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  fieldList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  fieldBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  fieldMetaCol: {
    flex: 1.1,
    paddingRight: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  fieldKeyName: {
    fontSize: 10,
    fontFamily: 'Courier',
    color: '#64748B',
    marginTop: 2,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },
  fieldValueCol: {
    flex: 1.4,
    alignItems: 'flex-end',
  },
  fieldValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'right',
  },
  fieldValueHighlight: {
    color: '#4ADE80',
    fontWeight: '800',
    fontSize: 14,
  },
  fieldBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  fieldActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 3,
  },
  tableCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  td: {
    fontSize: 11,
  },
  allLinesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rawLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 10,
  },
  rawLineNum: {
    fontSize: 11,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: '#38BDF8',
    width: 35,
  },
  rawLineText: {
    flex: 1,
    fontSize: 12,
    color: '#F8FAFC',
    lineHeight: 18,
    fontFamily: 'Courier',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  jsonWrap: {
    flex: 1,
  },
  jsonCard: {
    backgroundColor: '#050B14',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  jsonCode: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#38BDF8',
    lineHeight: 16,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  primaryExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  primaryExportText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
    gap: 6,
  },
  secondaryExportText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalKeyLabel: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
    padding: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#38BDF8',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
