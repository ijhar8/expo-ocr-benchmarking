import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BenchmarkProvider, useBenchmark } from '../src/context/BenchmarkContext';
import { BenchmarkComparisonModal } from '../src/components/BenchmarkComparisonModal';

function RootNavigator() {
  const { isModalVisible, closeModal, runs, refreshRuns } = useBenchmark();

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B1120' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="result"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>

      <BenchmarkComparisonModal
        visible={isModalVisible}
        onClose={closeModal}
        runs={runs}
        onRefreshRuns={refreshRuns}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <BenchmarkProvider>
      <RootNavigator />
    </BenchmarkProvider>
  );
}
