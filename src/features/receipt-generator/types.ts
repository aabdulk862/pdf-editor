/** Receipt/Invoice type classification */
export type ReceiptType = 'donation' | 'invoice' | 'payment' | 'custom';

/** Supported payment methods */
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'zelle'
  | 'paypal'
  | 'check'
  | 'bank-transfer'
  | 'other';

/** Organization context — multi-tenant branding */
export interface OrganizationContext {
  name: string;
  logo: { data: ArrayBuffer; mimeType: 'image/png' | 'image/jpeg' } | null;
  address: string;
  footerText: string;
  taxDeductible: boolean;
  currency: string;
}

/** A single transaction/line item on a receipt */
export interface ReceiptTransaction {
  recipientName: string;
  email: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceId: string;
  notes: string;
}

/** Full receipt data combining org context + transaction + metadata */
export interface ReceiptData {
  organization: OrganizationContext;
  receiptType: ReceiptType;
  transaction: ReceiptTransaction;
}

/** Bulk input format options */
export type BulkInputFormat = 'csv' | 'json' | 'manual';

/** Bulk export format options */
export type BulkExportFormat = 'zip' | 'merged';
