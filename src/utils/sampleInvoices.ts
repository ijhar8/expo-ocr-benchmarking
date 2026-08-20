export interface SampleInvoice {
  id: string;
  name: string;
  type: 'laser' | 'thermal' | 'dot_matrix';
  documentType: string;
  description: string;
  mockOcrText: string;
}

export const SAMPLE_INVOICES: SampleInvoice[] = [
  {
    id: 'inv_laser_1',
    name: 'Standard GST Tax Invoice (Laser)',
    type: 'laser',
    documentType: 'Tax Invoice',
    description: 'Clean print, standard layout with clear GSTIN and HSN table',
    mockOcrText: `TAX INVOICE
Acme Solutions Private Limited
Plot No. 42, Okhla Industrial Area Phase-III, New Delhi 110020
GSTIN: 07AAAAA1234A1Z5
PAN: AAAAA1234A
Phone: +91 9876543210
Email: billing@acmesolutions.in

Billed To / Buyer:
Bharat Enterprises Corp
24/A MG Road, Bengaluru, Karnataka 560001
GSTIN: 29BBBBB5678B2Z9

Invoice No: INV-2024-9041
Invoice Date: 15/07/2026
Due Date: 15/08/2026
PO Number: PO-882190
Place of Supply: 29-Karnataka

--------------------------------------------------------------
Item Description        HSN/SAC   Qty   Rate     Amount
--------------------------------------------------------------
Enterprise Software Lic 997331     1    45,000.00 45,000.00
Cloud Server Provision  998315     2    12,500.00 25,000.00
--------------------------------------------------------------
Taxable Value:                                    70,000.00
IGST @ 18%:                                       12,600.00
Grand Total:                                    ₹ 82,600.00
--------------------------------------------------------------
Amount in words: Eighty Two Thousand Six Hundred Rupees Only

Bank Details:
Bank Name: HDFC Bank Ltd
Account Number: 50200012345678
IFSC: HDFC0001234
UPI ID: acmepay@okaxis`,
  },
  {
    id: 'inv_thermal_2',
    name: 'Retail Thermal Receipt',
    type: 'thermal',
    documentType: 'Retail Receipt',
    description: 'Small thermal print with CGST/SGST breakdown',
    mockOcrText: `SUPER MART RETAIL
Shop 12, Phoenix Marketcity, Kurla, Mumbai 400070
GSTIN: 27AABCS1429B1Z2
Phone: 022-25001234

Bill No: POS/2026/04112
Date: 04-08-2026 18:42

Items:
1. Basmati Rice 5kg (HSN: 1006)       ₹ 520.00
2. Organic Cooking Oil 2L (HSN: 1512)  ₹ 380.00
3. Grocery Essentials                 ₹ 450.00

Sub Total:                            ₹ 1,350.00
CGST @ 2.5%:                            ₹ 33.75
SGST @ 2.5%:                            ₹ 33.75
Total Amount:                         ₹ 1,417.50

UPI: supermart@icici
Thank You! Visit Again.`,
  },
  {
    id: 'inv_dotmatrix_3',
    name: 'Wholesale Invoice (Dot-Matrix)',
    type: 'dot_matrix',
    documentType: 'Wholesale Tax Invoice',
    description: 'Low-contrast 9-pin dot matrix print',
    mockOcrText: `SRI LAKSHMI DISTRIBUTORS
WHOLESALE GRAIN & SPICE MERCHANTS
APMC YARD, YESHWANTHPUR, BENGALURU 560022
GSTIN : 29AAAPL9821K1ZM
PAN   : AAAPL9821K

BUYER : SHIVA TRADERS
GSTIN : 29AABCS8812D1Z0
INV NO: SLD/26-27/0891
DATE  : 28.07.2026

ITEM               HSN    BAGS   RATE     AMOUNT
WHEAT GRADE-A     1001    20    2100.00  42000.00
SUGAR M-30        1701    10    3800.00  38000.00

TAXABLE VALUE :                           80000.00
CGST @ 2.5%   :                            2000.00
SGST @ 2.5%   :                            2000.00
GRAND TOTAL   :                         ₹ 84000.00

BANK : CANARA BANK
A/C  : 0401101009821
IFSC : CNRB0000401`,
  },
];
