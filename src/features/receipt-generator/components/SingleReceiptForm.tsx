import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { MiniEditor } from '../../../components/ui/MiniEditor';
import { generateReceiptPdf } from '../utils/receipt-pdf';
import type { OrganizationContext, ReceiptType, PaymentMethod, ReceiptTransaction } from '../types';

interface Props {
  organization: OrganizationContext;
}

export function SingleReceiptForm({ organization }: Props) {
  const [receiptType, setReceiptType] = useState<ReceiptType>('donation');
  const [transaction, setTransaction] = useState<ReceiptTransaction>({
    recipientName: '',
    email: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    referenceId: '',
    notes: '',
  });
  const [generating, setGenerating] = useState(false);

  const update = (field: keyof ReceiptTransaction, value: string | number) => {
    setTransaction((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!transaction.recipientName || !transaction.amount) return;
    setGenerating(true);
    try {
      const refId = transaction.referenceId || `RCP-${Date.now().toString(36).toUpperCase()}`;
      const pdfBytes = await generateReceiptPdf({
        organization,
        receiptType,
        transaction: { ...transaction, referenceId: refId },
      });
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${transaction.recipientName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  const paymentMethods: PaymentMethod[] = [
    'cash',
    'card',
    'zelle',
    'paypal',
    'check',
    'bank-transfer',
    'other',
  ];
  const receiptTypes: { value: ReceiptType; label: string }[] = [
    { value: 'donation', label: 'Donation Receipt' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'payment', label: 'Payment Receipt' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-4">
      {/* Receipt Type */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Receipt Type
        </label>
        <select
          value={receiptType}
          onChange={(e) => setReceiptType(e.target.value as ReceiptType)}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
        >
          {receiptTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Recipient Name */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Recipient / Donor Name *
        </label>
        <input
          type="text"
          value={transaction.recipientName}
          onChange={(e) => update('recipientName', e.target.value)}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
          placeholder="John Doe"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Email (optional)
        </label>
        <input
          type="email"
          value={transaction.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
          placeholder="john@example.com"
        />
      </div>

      {/* Amount + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Amount *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={transaction.amount || ''}
            onChange={(e) => update('amount', parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
            placeholder="100.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={transaction.date}
            onChange={(e) => update('date', e.target.value)}
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Payment Method
        </label>
        <select
          value={transaction.paymentMethod}
          onChange={(e) => update('paymentMethod', e.target.value)}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
        >
          {paymentMethods.map((m) => (
            <option key={m} value={m}>
              {m.replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Reference ID */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Reference ID (auto-generated if empty)
        </label>
        <input
          type="text"
          value={transaction.referenceId}
          onChange={(e) => update('referenceId', e.target.value)}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
          placeholder="Auto-generated"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Notes / Purpose
        </label>
        <MiniEditor
          content={transaction.notes}
          onChange={(html) => update('notes', html.replace(/<[^>]+>/g, ''))}
          placeholder="General donation, Annual fund, etc."
          minHeight={60}
        />
      </div>

      {/* Generate Button */}
      <Button
        variant="primary"
        fullWidth
        loading={generating}
        disabled={!transaction.recipientName || !transaction.amount}
        onClick={handleGenerate}
      >
        Generate Receipt PDF
      </Button>
    </div>
  );
}
