import { StructuredInvoiceData, StructuredField, StructuredLineItem } from '../types/structuredInvoice';
import { GSTIN_REGEX } from './invoiceRegex';

// Regex patterns for entity extraction
const PAN_REGEX = /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/g;
const IFSC_REGEX = /\b([A-Z]{4}0[A-Z0-9]{6})\b/gi;
const UPI_REGEX = /\b([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})\b/g;
const PHONE_REGEX = /(?:(?:\+?91[\s-]?)?[6-9]\d{9}|\b0\d{2,4}[-\s]?\d{6,8}\b)/g;
const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;

// Invoice & Document patterns
const INVOICE_NO_REGEX = /(?:Invoice\s*(?:No|Number|#|Id)?|Inv\s*(?:No|\.?|#)|Bill\s*(?:No|\.?|#)|Tax\s*Invoice\s*No)\s*[:\-\.]?\s*([A-Za-z0-9\/\-_]+)/i;
const PO_NO_REGEX = /(?:P\.?O\.?\s*(?:No|Number|#)|Purchase\s*Order\s*(?:No|#)?|Order\s*(?:No|#))\s*[:\-\.]?\s*([A-Za-z0-9\/\-_]+)/i;
const DATE_REGEX = /(?:Invoice\s*Date|Inv\s*Date|Date\s*of\s*Issue|Date|Dated)\s*[:\-\.]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3}|[0-3]?[0-9]\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[1-2][0-9]{3})/i;
const DUE_DATE_REGEX = /(?:Due\s*Date|Payment\s*Due|Pay\s*By)\s*[:\-\.]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3}|[0-3]?[0-9]\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[1-2][0-9]{3})/i;
const PLACE_OF_SUPPLY_REGEX = /(?:Place\s*of\s*Supply|State\s*Name|State\s*Code|POS)\s*[:\-\.]?\s*([A-Za-z\s]+(?:\([0-9]{2}\))?|[0-9]{2}\s*-\s*[A-Za-z\s]+)/i;

// Financial patterns
const GRAND_TOTAL_REGEX = /(?:Grand\s*Total|Total\s*Amount|Net\s*Payable|Invoice\s*Total|Total\s*Invoice\s*Value|Total\s*Value|Net\s*Amount|Final\s*Total)\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2}|[\d,]{3,})/i;
const TAXABLE_VALUE_REGEX = /(?:Taxable\s*Value|Taxable\s*Amount|Sub\s*Total|Total\s*Before\s*Tax|Net\s*Taxable)\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2}|[\d,]{3,})/i;
const CGST_REGEX = /(?:CGST|Central\s*GST)\s*(?:\([^)]*\)|@\s*[\d\.]+%?)?\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;
const SGST_REGEX = /(?:SGST|UTGST|State\s*GST)\s*(?:\([^)]*\)|@\s*[\d\.]+%?)?\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;
const IGST_REGEX = /(?:IGST|Integrated\s*GST)\s*(?:\([^)]*\)|@\s*[\d\.]+%?)?\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;
const DISCOUNT_REGEX = /(?:Discount|Less\s*Discount|Trade\s*Discount)\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;
const ROUND_OFF_REGEX = /(?:Round\s*Off|Rounding)\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([+\-]?\s*[\d,]+\.\d{2})/i;
const AMOUNT_IN_WORDS_REGEX = /(?:Amount\s*in\s*Words|Total\s*in\s*Words|Rupees\s*in\s*Words|Rupees)\s*[:\-\.]?\s*([A-Za-z\s]+(?:Only|Rupees|Paisa))/i;

// Bank Details patterns
const BANK_NAME_REGEX = /(?:Bank\s*Name|Bank)\s*[:\-\.]?\s*([A-Za-z\s&]{3,40}(?:Bank|Ltd|Limited|Corporation|Co-op)?)/i;
const ACCOUNT_NO_REGEX = /(?:Account\s*(?:No|Number|#)|A\/c\s*(?:No|Number|#)|Current\s*A\/c\s*No)\s*[:\-\.]?\s*([0-9]{9,18})/i;

/**
 * Validates 15-character GSTIN checksum (India GST standard)
 */
export function validateGSTINChecksum(gstin: string): boolean {
  if (!gstin || gstin.length !== 15) return false;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 1;
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const codePoint = chars.indexOf(gstin[i]);
    if (codePoint === -1) return false;
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return chars[checkCodePoint] === gstin[14];
}

/**
 * Parse line items from raw OCR lines using spatial tabular heuristics
 */
function parseLineItems(lines: string[]): StructuredLineItem[] {
  const items: StructuredLineItem[] = [];
  let isInItemSection = false;
  let itemCounter = 1;

  // Patterns for table header detection
  const headerKeywords = /(?:Description|Particulars|Item|Goods|Services|HSN|SAC|Qty|Quantity|Rate|Unit\s*Price|Amount|Total)/i;
  // Patterns for table termination
  const footerKeywords = /(?:Total|Subtotal|Taxable\s*Amount|CGST|SGST|IGST|Grand\s*Total|Terms\s*&|Bank\s*Details|Authorized)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (!isInItemSection && headerKeywords.test(line) && (line.includes('Rate') || line.includes('Qty') || line.includes('Amount') || line.includes('HSN'))) {
      isInItemSection = true;
      continue;
    }

    if (isInItemSection && footerKeywords.test(line) && (line.toLowerCase().startsWith('total') || line.toLowerCase().startsWith('grand') || line.toLowerCase().startsWith('subtotal') || line.toLowerCase().startsWith('taxable'))) {
      break;
    }

    if (isInItemSection) {
      const numberMatches = Array.from(line.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)).map(m => parseFloat(m[1]));
      const hsnMatch = line.match(/\b([0-9]{4,8})\b/);
      
      if (numberMatches.length >= 2) {
        const desc = line
          .replace(/\b[0-9]{4,8}\b/g, '')
          .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
          .replace(/[|:_\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const amounts = numberMatches.filter(n => n > 0);
        const total = amounts.length > 0 ? amounts[amounts.length - 1] : undefined;
        const rate = amounts.length > 1 ? amounts[amounts.length - 2] : undefined;
        const qty = amounts.length > 2 ? amounts[0] : 1;

        if (desc.length >= 2 || total) {
          items.push({
            itemNumber: itemCounter++,
            description: desc || `Item #${itemCounter}`,
            hsnSac: hsnMatch ? hsnMatch[1] : undefined,
            quantity: qty,
            unitPrice: rate,
            totalAmount: total,
            taxableAmount: total,
          });
        }
      }
    }
  }

  return items;
}

/**
 * Intelligent Structured Parser: Extracts 100% of OCR content into complete Key-Value Structured JSON
 */
export function parseStructuredInvoice(rawText: string): StructuredInvoiceData {
  const text = rawText.replace(/\r\n/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Indexed representation of all raw OCR lines
  const allExtractedLines = lines.map((l, idx) => ({
    lineNumber: idx + 1,
    text: l,
    confidence: 0.95,
  }));

  // 1. Identify Document Type
  let documentType = 'Tax Invoice';
  if (/Retail\s*Invoice|Cash\s*Receipt|Cash\s*Memo/i.test(text)) {
    documentType = 'Retail Invoice / Receipt';
  } else if (/Bill\s*of\s*Supply/i.test(text)) {
    documentType = 'Bill of Supply';
  } else if (/Delivery\s*Challan/i.test(text)) {
    documentType = 'Delivery Challan';
  } else if (/Purchase\s*Order/i.test(text)) {
    documentType = 'Purchase Order';
  }

  // 2. GSTINs & PANs
  const gstinMatches = Array.from(text.matchAll(GSTIN_REGEX), m => m[1]?.toUpperCase()).filter(Boolean);
  const uniqueGstins = Array.from(new Set(gstinMatches));

  let supplierGstin: string | undefined = uniqueGstins[0];
  let customerGstin: string | undefined = uniqueGstins.length > 1 ? uniqueGstins[1] : undefined;

  // Refine Supplier vs Customer by contextual keywords
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Billed\s*To|Buyer|Recipient|Consignee|Customer|Receiver|Client)/i.test(line)) {
      const snippet = lines.slice(i, i + 5).join(' ');
      const match = snippet.match(GSTIN_REGEX);
      if (match && match[0]) {
        customerGstin = match[0].toUpperCase();
        if (supplierGstin === customerGstin && uniqueGstins.length > 1) {
          supplierGstin = uniqueGstins.find(g => g !== customerGstin);
        }
      }
    }
  }

  // PANs
  const panMatches = Array.from(text.matchAll(PAN_REGEX), m => m[1]?.toUpperCase()).filter(Boolean);
  const supplierPan = supplierGstin ? supplierGstin.substring(2, 12) : panMatches[0];

  // 3. Names & Addresses
  let supplierName: string | undefined;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (
      !/(?:Tax\s*Invoice|Invoice|Bill|Original|Duplicate|GSTIN|Date)/i.test(line) &&
      line.length > 3 &&
      !/^\d+$/.test(line)
    ) {
      supplierName = line;
      break;
    }
  }

  let customerName: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Billed\s*To|Buyer|Customer|Consignee|M\/s|Party\s*Name)\s*[:\-\.]?\s*(.+)/i.test(line)) {
      const match = line.match(/(?:Billed\s*To|Buyer|Customer|Consignee|M\/s|Party\s*Name)\s*[:\-\.]?\s*(.+)/i);
      if (match && match[1] && match[1].trim().length > 2) {
        customerName = match[1].trim();
      } else if (i + 1 < lines.length) {
        customerName = lines[i + 1].trim();
      }
      break;
    }
  }

  // Contact Info
  const phones = Array.from(text.matchAll(PHONE_REGEX), m => m[0].trim());
  const emails = Array.from(text.matchAll(EMAIL_REGEX), m => m[0].trim());
  const supplierPhone = phones[0];
  const supplierEmail = emails[0];
  const customerPhone = phones.length > 1 ? phones[1] : undefined;
  const customerEmail = emails.length > 1 ? emails[1] : undefined;

  // 4. Invoice Number & Dates
  let invoiceNumber: string | undefined;
  const invMatch = text.match(INVOICE_NO_REGEX);
  if (invMatch && invMatch[1] && invMatch[1].length >= 2) {
    invoiceNumber = invMatch[1].trim();
  }

  let invoiceDate: string | undefined;
  const dateMatch = text.match(DATE_REGEX);
  if (dateMatch && dateMatch[1]) {
    invoiceDate = dateMatch[1].trim();
  }

  let dueDate: string | undefined;
  const dueMatch = text.match(DUE_DATE_REGEX);
  if (dueMatch && dueMatch[1]) {
    dueDate = dueMatch[1].trim();
  }

  let poNumber: string | undefined;
  const poMatch = text.match(PO_NO_REGEX);
  if (poMatch && poMatch[1]) {
    poNumber = poMatch[1].trim();
  }

  let placeOfSupply: string | undefined;
  const posMatch = text.match(PLACE_OF_SUPPLY_REGEX);
  if (posMatch && posMatch[1]) {
    placeOfSupply = posMatch[1].trim();
  }

  // 5. Financials
  const parseNum = (str?: string) => (str ? parseFloat(str.replace(/,/g, '').trim()) : undefined);

  const grandTotalMatch = text.match(GRAND_TOTAL_REGEX);
  const grandTotal = parseNum(grandTotalMatch ? grandTotalMatch[1] : undefined);

  const taxableMatch = text.match(TAXABLE_VALUE_REGEX);
  const taxableAmount = parseNum(taxableMatch ? taxableMatch[1] : undefined);

  const cgstMatch = text.match(CGST_REGEX);
  const cgstAmount = parseNum(cgstMatch ? cgstMatch[1] : undefined);

  const sgstMatch = text.match(SGST_REGEX);
  const sgstAmount = parseNum(sgstMatch ? sgstMatch[1] : undefined);

  const igstMatch = text.match(IGST_REGEX);
  const igstAmount = parseNum(igstMatch ? igstMatch[1] : undefined);

  const discountMatch = text.match(DISCOUNT_REGEX);
  const discountAmount = parseNum(discountMatch ? discountMatch[1] : undefined);

  const roundOffMatch = text.match(ROUND_OFF_REGEX);
  const roundOff = parseNum(roundOffMatch ? roundOffMatch[1] : undefined);

  const wordsMatch = text.match(AMOUNT_IN_WORDS_REGEX);
  const amountInWords = wordsMatch ? wordsMatch[1].trim() : undefined;

  // 6. Bank Details
  const ifscMatches = Array.from(text.matchAll(IFSC_REGEX), m => m[1].toUpperCase());
  const bankIfsc = ifscMatches[0];

  const upiMatches = Array.from(text.matchAll(UPI_REGEX), m => m[1]);
  const upiId = upiMatches[0];

  const bankNameMatch = text.match(BANK_NAME_REGEX);
  const bankName = bankNameMatch ? bankNameMatch[1].trim() : undefined;

  const accMatch = text.match(ACCOUNT_NO_REGEX);
  const bankAccountNo = accMatch ? accMatch[1].trim() : undefined;

  // 7. Line Items Table
  const items = parseLineItems(lines);

  // 8. Quality & Verification Checks
  const isGstinValid = supplierGstin ? validateGSTINChecksum(supplierGstin) : false;
  
  let isMathValid = false;
  if (grandTotal && taxableAmount) {
    const computedTotal =
      taxableAmount +
      (cgstAmount || 0) +
      (sgstAmount || 0) +
      (igstAmount || 0) -
      (discountAmount || 0) +
      (roundOff || 0);
    isMathValid = Math.abs(computedTotal - grandTotal) <= 2.0;
  }

  let isLineItemsSumMatched = false;
  if (items.length > 0) {
    const itemsSum = items.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    if (taxableAmount && Math.abs(itemsSum - taxableAmount) <= 2.0) {
      isLineItemsSumMatched = true;
    } else if (grandTotal && Math.abs(itemsSum - grandTotal) <= 2.0) {
      isLineItemsSumMatched = true;
    }
  }

  const flags: string[] = [];
  let score = 0;
  if (invoiceNumber) score += 15; else flags.push('Missing Invoice Number');
  if (invoiceDate) score += 15; else flags.push('Missing Invoice Date');
  if (supplierGstin) score += 20; else flags.push('Missing Supplier GSTIN');
  if (grandTotal) score += 20; else flags.push('Missing Grand Total');
  if (taxableAmount) score += 10;
  if (cgstAmount || sgstAmount || igstAmount) score += 10;
  if (items.length > 0) score += 10;
  if (isMathValid) score += 10;
  if (isGstinValid) score += 10;
  const confidenceScore = Math.min(100, Math.round(score * 0.9));

  // 9. Build Complete Key-Value List
  const keyValuePairs: StructuredField[] = [];
  const registeredKeys = new Set<string>();

  const addField = (
    key: string,
    label: string,
    value: string | number | undefined,
    category: StructuredField['category'],
    isCritical = false,
    isValid = true,
    badge?: string,
    lineNumber?: number
  ) => {
    if (value !== undefined && value !== null && value !== '') {
      registeredKeys.add(key.toLowerCase());
      keyValuePairs.push({
        key,
        label,
        value: typeof value === 'number' ? value.toString() : value,
        category,
        isCritical,
        isValid,
        badge,
        lineNumber,
      });
    }
  };

  // Category: Document Details
  addField('document_type', 'Document Type', documentType, 'document', false, true);
  addField('invoice_number', 'Invoice Number', invoiceNumber, 'document', true, !!invoiceNumber, 'Critical');
  addField('invoice_date', 'Invoice Date', invoiceDate, 'document', true, !!invoiceDate);
  addField('due_date', 'Due Date', dueDate, 'document');
  addField('po_number', 'PO / Order No', poNumber, 'document');
  addField('place_of_supply', 'Place of Supply', placeOfSupply, 'document');

  // Category: Supplier / Vendor
  addField('supplier_name', 'Vendor / Supplier Name', supplierName, 'supplier', false, true);
  addField(
    'supplier_gstin',
    'Supplier GSTIN',
    supplierGstin,
    'supplier',
    true,
    isGstinValid,
    isGstinValid ? 'GST Verified' : 'GST Check'
  );
  addField('supplier_pan', 'Supplier PAN', supplierPan, 'supplier');
  addField('supplier_phone', 'Supplier Phone', supplierPhone, 'supplier');
  addField('supplier_email', 'Supplier Email', supplierEmail, 'supplier');

  // Category: Customer / Buyer
  addField('customer_name', 'Customer / Billed To', customerName, 'customer');
  addField('customer_gstin', 'Customer GSTIN', customerGstin, 'customer', false, !!customerGstin);
  addField('customer_phone', 'Customer Phone', customerPhone, 'customer');
  addField('customer_email', 'Customer Email', customerEmail, 'customer');

  // Category: Financials & Taxes
  addField('currency', 'Currency', 'INR (₹)', 'financial');
  addField('taxable_amount', 'Taxable Subtotal', taxableAmount ? `₹ ${taxableAmount.toFixed(2)}` : undefined, 'financial');
  addField('cgst_amount', 'CGST Amount', cgstAmount ? `₹ ${cgstAmount.toFixed(2)}` : undefined, 'financial');
  addField('sgst_amount', 'SGST Amount', sgstAmount ? `₹ ${sgstAmount.toFixed(2)}` : undefined, 'financial');
  addField('igst_amount', 'IGST Amount', igstAmount ? `₹ ${igstAmount.toFixed(2)}` : undefined, 'financial');
  addField('discount', 'Discount', discountAmount ? `₹ ${discountAmount.toFixed(2)}` : undefined, 'financial');
  addField('round_off', 'Round Off', roundOff ? `₹ ${roundOff.toFixed(2)}` : undefined, 'financial');
  addField('grand_total', 'Grand Total', grandTotal ? `₹ ${grandTotal.toFixed(2)}` : undefined, 'financial', true, !!grandTotal, 'Key Total');
  addField('amount_in_words', 'Amount in Words', amountInWords, 'financial');

  // Category: Bank & Payment
  addField('bank_name', 'Bank Name', bankName, 'payment');
  addField('bank_account_no', 'Bank Account No', bankAccountNo, 'payment');
  addField('bank_ifsc', 'Bank IFSC Code', bankIfsc, 'payment', false, true);
  addField('upi_id', 'UPI / VPA ID', upiId, 'payment', false, true);

  // 10. Extract ALL Generic Key-Value Pairs from remaining OCR Lines
  // Pattern: "Label : Value", "Label - Value", "Label = Value"
  const genericPairRegex = /^([A-Za-z0-9\s/&#._-]{2,35})\s*[:\-=]\s*(.+)$/;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const match = line.match(genericPairRegex);
    if (match) {
      const rawKey = match[1].trim();
      const rawVal = match[2].trim();
      const normalizedKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '_');

      // Only add if not already captured as a standard field and value is meaningful
      if (
        !registeredKeys.has(normalizedKey) &&
        rawVal.length > 0 &&
        !/^(invoice|inv|date|gstin|pan|cgst|sgst|igst|taxable|total|bank|account|ifsc|upi)$/i.test(rawKey)
      ) {
        addField(
          normalizedKey,
          rawKey,
          rawVal,
          'extracted_pair',
          false,
          true,
          'Detected Pair',
          idx + 1
        );
      }
    }
  }

  // 11. Capture ALL Raw OCR Lines so that 100% of OCR output is available as Key-Value
  lines.forEach((line, idx) => {
    const lineKey = `ocr_line_${idx + 1}`;
    addField(
      lineKey,
      `Line #${idx + 1}`,
      line,
      'raw_line',
      false,
      true,
      undefined,
      idx + 1
    );
  });

  return {
    documentType,
    invoiceNumber,
    invoiceDate,
    dueDate,
    poNumber,
    placeOfSupply,
    supplierName,
    supplierGstin,
    supplierPan,
    supplierPhone,
    supplierEmail,
    customerName,
    customerGstin,
    customerPhone,
    customerEmail,
    currency: 'INR',
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    discountAmount,
    roundOff,
    grandTotal,
    amountInWords,
    items,
    bankName,
    bankAccountNo,
    bankIfsc,
    upiId,
    keyValuePairs,
    allExtractedLines,
    verification: {
      isGstinValid,
      isMathValid,
      isLineItemsSumMatched,
      confidenceScore,
      totalElementsCount: keyValuePairs.length,
      flags,
    },
    rawText,
  };
}
