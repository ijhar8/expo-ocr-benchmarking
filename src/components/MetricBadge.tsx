import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MetricBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  label,
  value,
  unit,
  icon,
  variant = 'default',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)' };
      case 'warning':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#FACC15', border: 'rgba(234, 179, 8, 0.3)' };
      case 'info':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'purple':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.07)', text: '#E2E8F0', border: 'rgba(255, 255, 255, 0.12)' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {icon && <Ionicons name={icon} size={13} color={colors.text} style={styles.icon} />}
      <Text style={styles.label}>{label}: </Text>
      <Text style={[styles.value, { color: colors.text }]}>
        {value}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
  unit: {
    fontSize: 10,
    fontWeight: '400',
    color: '#94A3B8',
  },
});
