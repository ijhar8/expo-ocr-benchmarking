import { InvoiceExtractedFields } from '../types/ocr';

// Standard 15-character GSTIN Regex
// 2 digits state code + 5 letters PAN + 4 digits PAN + 1 letter PAN + 1 char entity + Z + 1 checksum char
export const GSTIN_REGEX = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/gi;

// Invoice number patterns
const INVOICE_NO_LABEL_REGEX = /(?:Invoice\s*(?:No|Number|#|Id)?|Inv\s*(?:No|\.?|#)|Bill\s*(?:No|\.?|#))\s*[:\-\.]?\s*([A-Za-z0-9\/\-_]+)/i;
const STANDALONE_INV_REGEX = /\b(?:INV|BILL|TAX|GST)[\/\-][0-9]{2,4}[\/\-][0-9A-Za-z\-]+\b/i;

// Date patterns (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MMM YYYY)
const DATE_LABEL_REGEX = /(?:Invoice\s*Date|Inv\s*Date|Date\s*of\s*Issue|Date)\s*[:\-\.]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3}|[0-3]?[0-9]\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[1-2][0-9]{3})/i;
const STANDALONE_DATE_REGEX = /\b([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.][1-2][0-9]{3})\b/;

// Amount patterns
const GRAND_TOTAL_REGEX = /(?:Grand\s*Total|Total\s*Amount|Net\s*Payable|Invoice\s*Total|Total\s*Invoice\s*Value|Total\s*Value|Total)\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2}|[\d,]{3,})/i;
const TAXABLE_VALUE_REGEX = /(?:Taxable\s*Value|Taxable\s*Amount|Sub\s*Total)\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2}|[\d,]{3,})/i;
const CGST_REGEX = /(?:CGST|Central\s*GST)\s*(?:\([^)]*\)|@\s*[\d\.]+%?)?\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;
const SGST_REGEX = /(?:SGST|UTGST|State\s*GST)\s*(?:\([^)]*\)|@\s*[\d\.]+%?)?\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;
const IGST_REGEX = /(?:IGST|Integrated\s*GST)\s*(?:\([^)]*\)|@\s*[\d\.]+%?)?\s*[:\-\.]?\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.\d{2})/i;

// HSN / SAC Code (4, 6 or 8 digits)
const HSN_REGEX = /\b(?:HSN|SAC)?\s*[:\-\.]?\s*([0-9]{4,8})\b/gi;

/**
 * Parses raw OCR text and extracts key critical fields for GST Indian Invoices
 */
export function extractInvoiceFields(rawText: string): InvoiceExtractedFields {
  const text = rawText.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  // 1. Extract GSTINs
  const gstinMatches = Array.from(text.matchAll(GSTIN_REGEX), m => m[1]?.toUpperCase()).filter(Boolean);
  const uniqueGstins = Array.from(new Set(gstinMatches));

  let supplierGstin: string | undefined = uniqueGstins[0];
  let recipientGstin: string | undefined = uniqueGstins.length > 1 ? uniqueGstins[1] : undefined;

  // Heuristic: check lines for "Buyer" or "Customer" or "Consignee" or "Billed To"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Billed\s*To|Buyer|Recipient|Consignee|Customer|Receiver)/i.test(line)) {
      // Look at current and next 3 lines for a GSTIN
      const snippet = lines.slice(i, i + 4).join(' ');
      const match = snippet.match(GSTIN_REGEX);
      if (match && match[0]) {
        recipientGstin = match[0].toUpperCase();
        if (supplierGstin === recipientGstin && uniqueGstins.length > 1) {
          supplierGstin = uniqueGstins.find(g => g !== recipientGstin);
        }
      }
    }
  }

  // 2. Extract Invoice Number
  let invoiceNumber: string | undefined;
  const invLabelMatch = text.match(INVOICE_NO_LABEL_REGEX);
  if (invLabelMatch && invLabelMatch[1] && invLabelMatch[1].length >= 3) {
    invoiceNumber = invLabelMatch[1].trim();
  } else {
    const standaloneInv = text.match(STANDALONE_INV_REGEX);
    if (standaloneInv && standaloneInv[0]) {
      invoiceNumber = standaloneInv[0].trim();
    }
  }

  // 3. Extract Invoice Date
  let invoiceDate: string | undefined;
  const dateLabelMatch = text.match(DATE_LABEL_REGEX);
  if (dateLabelMatch && dateLabelMatch[1]) {
    invoiceDate = dateLabelMatch[1].trim();
  } else {
    const standaloneDate = text.match(STANDALONE_DATE_REGEX);
    if (standaloneDate && standaloneDate[1]) {
      invoiceDate = standaloneDate[1].trim();
    }
  }

  // 4. Extract Grand Total
  let grandTotal: string | undefined;
  const totalMatch = text.match(GRAND_TOTAL_REGEX);
  if (totalMatch && totalMatch[1]) {
    grandTotal = totalMatch[1].replace(/,/g, '').trim();
  }

  // 5. Extract Tax Breakdown
  let taxableValue: string | undefined;
  const taxableMatch = text.match(TAXABLE_VALUE_REGEX);
  if (taxableMatch && taxableMatch[1]) {
    taxableValue = taxableMatch[1].replace(/,/g, '').trim();
  }

  let cgstAmount: string | undefined;
  const cgstMatch = text.match(CGST_REGEX);
  if (cgstMatch && cgstMatch[1]) {
    cgstAmount = cgstMatch[1].replace(/,/g, '').trim();
  }

  let sgstAmount: string | undefined;
  const sgstMatch = text.match(SGST_REGEX);
  if (sgstMatch && sgstMatch[1]) {
    sgstAmount = sgstMatch[1].replace(/,/g, '').trim();
  }

  let igstAmount: string | undefined;
  const igstMatch = text.match(IGST_REGEX);
  if (igstMatch && igstMatch[1]) {
    igstAmount = igstMatch[1].replace(/,/g, '').trim();
  }

  // 6. Extract HSN Codes
  const hsnCodes: string[] = [];
  const hsnMatches = text.matchAll(HSN_REGEX);
  for (const m of hsnMatches) {
    if (m[1] && m[1].length >= 4 && !hsnCodes.includes(m[1])) {
      hsnCodes.push(m[1]);
    }
  }

  return {
    supplierGstin,
    recipientGstin,
    invoiceNumber,
    invoiceDate,
    grandTotal,
    taxableValue,
    cgstAmount,
    sgstAmount,
    igstAmount,
    hsnCodes: hsnCodes.slice(0, 10),
  };
}
