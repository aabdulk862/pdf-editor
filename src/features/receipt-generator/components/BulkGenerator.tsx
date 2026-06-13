import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { parseBulkData } from '../utils/parse-bulk-data';
import { bulkExport } from '../utils/bulk-export';
import type {
  OrganizationContext,
  ReceiptType,
  ReceiptTransaction,
  BulkExportFormat,
} from '../types';

interface Props {
  organization: OrganizationContext;
}

export function BulkGenerator({ organization }: Props) {
  const [rawInput, setRawInput] = useState('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('donation');
  const [exportFormat, setExportFormat] = useState<BulkExportFormat>('zip');
  const [parsed, setParsed] = useState<ReceiptTransaction[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleParse = () => {
    setError('');
    try {
      const results = parseBulkData(rawInput);
      if (results.length === 0) {
        setError('No valid transactions found. Ensure data has name and amount columns.');
        return;
      }
      setParsed(results);
    } catch (e) {
      setError('Failed to parse input. Check your CSV or JSON format.');
    }
  };

  const handleGenerate = async () => {
    if (parsed.length === 0) return;
    setGenerating(true);
    try {
      const receipts = parsed.map((t) => ({ organization, receiptType, transaction: t }));
      const { blob, filename } = await bulkExport(receipts, exportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const sampleCsv = `name,amount,date,method,notes
John Doe,100,2024-01-15,zelle,Annual donation
Jane Smith,250,2024-01-16,card,Monthly gift`;

  return (
    <div className="space-y-4">
      {/* Receipt Type */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Receipt Type (applied to all)
        </label>
        <select
          value={receiptType}
          onChange={(e) => setReceiptType(e.target.value as ReceiptType)}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm"
        >
          <option value="donation">Donation Receipt</option>
          <option value="invoice">Invoice</option>
          <option value="payment">Payment Receipt</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Data Input */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
          Paste CSV or JSON Data
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => {
            setRawInput(e.target.value);
            setParsed([]);
          }}
          rows={8}
          className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2 text-sm font-mono resize-y"
          placeholder={sampleCsv}
        />
        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
          Supports CSV (with headers) or JSON array. Required: name + amount.
        </p>
      </div>

      {/* Parse Button */}
      <Button variant="secondary" onClick={handleParse} disabled={!rawInput.trim()}>
        Parse Data
      </Button>

      {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}

      {/* Parsed Preview */}
      {parsed.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
            {parsed.length} transaction{parsed.length > 1 ? 's' : ''} found
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-secondary-200 dark:border-secondary-700">
            <table className="w-full text-xs">
              <thead className="bg-secondary-50 dark:bg-secondary-800 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-right">Amount</th>
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Method</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((t, i) => (
                  <tr key={i} className="border-t border-secondary-100 dark:border-secondary-700">
                    <td className="px-2 py-1">{t.recipientName}</td>
                    <td className="px-2 py-1 text-right">{t.amount}</td>
                    <td className="px-2 py-1">{t.date}</td>
                    <td className="px-2 py-1">{t.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Export Format
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="exportFormat"
                  value="zip"
                  checked={exportFormat === 'zip'}
                  onChange={() => setExportFormat('zip')}
                />
                ZIP (individual PDFs)
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="exportFormat"
                  value="merged"
                  checked={exportFormat === 'merged'}
                  onChange={() => setExportFormat('merged')}
                />
                Merged PDF
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <Button variant="primary" fullWidth loading={generating} onClick={handleGenerate}>
            Generate {parsed.length} Receipt{parsed.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
