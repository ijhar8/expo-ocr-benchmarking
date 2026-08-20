import { StructuredInvoiceData } from '../types/structuredInvoice';
import { parseStructuredInvoice } from './structuredParser';

export interface AIExtractorConfig {
  mode: 'offline_heuristic' | 'apple_foundation' | 'custom_slm';
  customEndpoint?: string;
  apiKey?: string;
}

/**
 * Standard System Prompt for Small Language Models (SLMs) to parse OCR Text into Structured JSON
 */
export const SLM_SYSTEM_PROMPT = `You are a precision Document Information Extraction model.
Given raw, noisy OCR text of an invoice, receipt, or bill, extract all data and output ONLY valid JSON matching this schema:

{
  "document_type": "Tax Invoice | Retail Bill | Receipt",
  "invoice_number": string | null,
  "invoice_date": "DD/MM/YYYY" | null,
  "due_date": "DD/MM/YYYY" | null,
  "po_number": string | null,
  "place_of_supply": string | null,
  "supplier": {
    "name": string | null,
    "gstin": string | null,
    "pan": string | null,
    "phone": string | null,
    "email": string | null,
    "address": string | null
  },
  "customer": {
    "name": string | null,
    "gstin": string | null,
    "phone": string | null,
    "address": string | null
  },
  "financials": {
    "currency": "INR | USD | EUR",
    "taxable_subtotal": number | null,
    "cgst": number | null,
    "sgst": number | null,
    "igst": number | null,
    "discount": number | null,
    "round_off": number | null,
    "grand_total": number | null,
    "amount_in_words": string | null
  },
  "line_items": [
    {
      "item_no": number,
      "description": string,
      "hsn_sac": string | null,
      "quantity": number | null,
      "unit_price": number | null,
      "total_amount": number | null
    }
  ],
  "payment_info": {
    "bank_name": string | null,
    "account_number": string | null,
    "ifsc": string | null,
    "upi_id": string | null
  }
}
Return only JSON with no markdown wrapping.`;

/**
 * Executes structured extraction pipeline. Uses high-performance local parser with optional SLM integration.
 */
export async function extractStructuredJSON(
  rawOcrText: string,
  config: AIExtractorConfig = { mode: 'offline_heuristic' }
): Promise<StructuredInvoiceData> {
  // 1. Fast local deterministic parse (0ms, 100% offline)
  const localParsed = parseStructuredInvoice(rawOcrText);

  if (config.mode === 'offline_heuristic') {
    return localParsed;
  }

  // 2. If user configured external custom SLM / LLM endpoint
  if (config.mode === 'custom_slm' && config.customEndpoint) {
    try {
      const response = await fetch(config.customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SLM_SYSTEM_PROMPT },
            { role: 'user', content: `Extract invoice JSON from:\n\n${rawOcrText}` },
          ],
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const jsonRes = await response.json();
        const content = jsonRes.choices?.[0]?.message?.content || jsonRes.text;
        if (content) {
          const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          // Return merged structured data
          return {
            ...localParsed,
            invoiceNumber: parsed.invoice_number || localParsed.invoiceNumber,
            invoiceDate: parsed.invoice_date || localParsed.invoiceDate,
            supplierName: parsed.supplier?.name || localParsed.supplierName,
            supplierGstin: parsed.supplier?.gstin || localParsed.supplierGstin,
            grandTotal: parsed.financials?.grand_total || localParsed.grandTotal,
            taxableAmount: parsed.financials?.taxable_subtotal || localParsed.taxableAmount,
            // Recompute key-values
            ...parseStructuredInvoice(rawOcrText),
          };
        }
      }
    } catch (e) {
      console.warn('SLM Endpoint request failed, using local offline parser fallback:', e);
    }
  }

  return localParsed;
}
