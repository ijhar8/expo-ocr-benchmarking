import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBenchmark } from '../../src/context/BenchmarkContext';

export default function TabLayout() {
  const { openModal, runs } = useBenchmark();

  const renderHeaderRight = () => (
    <TouchableOpacity style={styles.headerBtn} onPress={openModal}>
      <Ionicons name="bar-chart-outline" size={16} color="#38BDF8" />
      <Text style={styles.headerBtnText}>Compare ({runs.length})</Text>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0F172A',
          borderBottomWidth: 1,
          borderBottomColor: '#1E293B',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '800',
          color: '#F8FAFC',
          letterSpacing: 0.2,
        },
        headerRight: renderHeaderRight,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopWidth: 1,
          borderTopColor: '#1E293B',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ML Kit (Native)',
          tabBarLabel: '1. ML Kit',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'camera' : 'camera-outline'}
              size={size}
              color={focused ? '#38BDF8' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="paddle"
        options={{
          title: 'PP-OCRv6_small (ONNX)',
          tabBarLabel: '2. PaddleOCR',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
              size={size}
              color={focused ? '#C084FC' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="doctr"
        options={{
          title: 'docTR Fast+PARSeq (ONNX)',
          tabBarLabel: '3. docTR',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={size}
              color={focused ? '#34D399' : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 14,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    marginLeft: 5,
  },
});
