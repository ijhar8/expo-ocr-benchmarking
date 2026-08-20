import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OCRBenchmarkResult } from '../types/ocr';
import { getBenchmarkRuns, saveBenchmarkRun } from '../utils/benchmarkStorage';

import { StructuredInvoiceData } from '../types/structuredInvoice';
import { parseStructuredInvoice } from '../utils/structuredParser';

interface BenchmarkContextType {
  runs: OCRBenchmarkResult[];
  refreshRuns: () => Promise<void>;
  logResult: (result: OCRBenchmarkResult) => Promise<void>;
  isModalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  activeResult: OCRBenchmarkResult | null;
  activeStructuredData: StructuredInvoiceData | null;
  setActiveOCRResult: (result: OCRBenchmarkResult | null) => void;
  setActiveStructuredData: (data: StructuredInvoiceData | null) => void;
  updateActiveField: (key: string, newValue: string) => void;
}

const BenchmarkContext = createContext<BenchmarkContextType | undefined>(undefined);

export const BenchmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runs, setRuns] = useState<OCRBenchmarkResult[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeResult, setActiveResult] = useState<OCRBenchmarkResult | null>(null);
  const [activeStructuredData, setActiveStructuredData] = useState<StructuredInvoiceData | null>(null);

  const refreshRuns = useCallback(async () => {
    const loaded = await getBenchmarkRuns();
    setRuns(loaded);
  }, []);

  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  const logResult = async (result: OCRBenchmarkResult) => {
    await saveBenchmarkRun(result);
    await refreshRuns();
  };

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  const handleSetActiveOCRResult = (result: OCRBenchmarkResult | null) => {
    setActiveResult(result);
    if (result && result.fullText) {
      setActiveStructuredData(parseStructuredInvoice(result.fullText));
    } else {
      setActiveStructuredData(null);
    }
  };

  const updateActiveField = (key: string, newValue: string) => {
    if (!activeStructuredData) return;
    const updatedKeyValues = activeStructuredData.keyValuePairs.map(f =>
      f.key === key ? { ...f, value: newValue } : f
    );
    setActiveStructuredData({
      ...activeStructuredData,
      keyValuePairs: updatedKeyValues,
    });
  };

  return (
    <BenchmarkContext.Provider
      value={{
        runs,
        refreshRuns,
        logResult,
        isModalVisible,
        openModal,
        closeModal,
        activeResult,
        activeStructuredData,
        setActiveOCRResult: handleSetActiveOCRResult,
        setActiveStructuredData,
        updateActiveField,
      }}
    >
      {children}
    </BenchmarkContext.Provider>
  );
};

export function useBenchmark() {
  const context = useContext(BenchmarkContext);
  if (!context) {
    throw new Error('useBenchmark must be used within a BenchmarkProvider');
  }
  return context;
}
