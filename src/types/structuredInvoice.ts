export interface StructuredField<T = string> {
  key: string;
  label: string;
  value: T;
  category: 'document' | 'supplier' | 'customer' | 'financial' | 'payment' | 'extracted_pair' | 'raw_line' | 'other';
  confidence?: number;
  isCritical?: boolean;
  isValid?: boolean;
  badge?: string;
  lineNumber?: number;
}

export interface StructuredLineItem {
  itemNumber: number;
  description: string;
  hsnSac?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  taxRatePercent?: number;
  taxableAmount?: number;
  totalAmount?: number;
}

export interface StructuredInvoiceData {
  // Document Metadata
  documentType?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  poNumber?: string;
  placeOfSupply?: string;

  // Supplier / Vendor
  supplierName?: string;
  supplierGstin?: string;
  supplierPan?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;

  // Customer / Buyer
  customerName?: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;

  // Financials & Taxes
  currency: string;
  taxableAmount?: number;
  cgstAmount?: number;
  cgstRate?: number;
  sgstAmount?: number;
  sgstRate?: number;
  igstAmount?: number;
  igstRate?: number;
  discountAmount?: number;
  roundOff?: number;
  grandTotal?: number;
  amountInWords?: string;

  // Line Items
  items: StructuredLineItem[];

  // Bank & Payment
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  upiId?: string;
  paymentMode?: string;

  // Complete List of All Extracted Key-Values (100% of OCR content)
  keyValuePairs: StructuredField[];

  // All Raw OCR Lines indexed
  allExtractedLines: { lineNumber: number; text: string; confidence?: number }[];

  // Quality & Verification
  verification: {
    isGstinValid: boolean;
    isMathValid: boolean;
    isLineItemsSumMatched: boolean;
    confidenceScore: number; // 0 - 100
    totalElementsCount: number;
    flags: string[];
  };

  // Raw source text
  rawText: string;
}
