import type { ReceiptTransaction } from '../types';

/** Generate a unique reference ID */
function generateRefId(): string {
  return `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/** Parse CSV text into ReceiptTransaction array */
export function parseCsv(text: string): ReceiptTransaction[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex(
    (h) => h.includes('name') || h.includes('recipient') || h.includes('donor'),
  );
  const amountIdx = headers.findIndex((h) => h.includes('amount'));
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const emailIdx = headers.findIndex((h) => h.includes('email'));
  const methodIdx = headers.findIndex((h) => h.includes('method') || h.includes('payment'));
  const refIdx = headers.findIndex((h) => h.includes('ref') || h.includes('id'));
  const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('purpose'));

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return {
        recipientName: cols[nameIdx] || '',
        email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
        amount: amountIdx >= 0 ? parseFloat(cols[amountIdx]) || 0 : 0,
        date:
          dateIdx >= 0
            ? cols[dateIdx] || new Date().toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        paymentMethod: (methodIdx >= 0
          ? cols[methodIdx] || 'other'
          : 'other') as ReceiptTransaction['paymentMethod'],
        referenceId: refIdx >= 0 && cols[refIdx] ? cols[refIdx] : generateRefId(),
        notes: notesIdx >= 0 ? cols[notesIdx] || '' : '',
      };
    })
    .filter((t) => t.recipientName && t.amount > 0);
}

/** Parse JSON text into ReceiptTransaction array */
export function parseJson(text: string): ReceiptTransaction[] {
  const raw = JSON.parse(text);
  const arr: unknown[] = Array.isArray(raw) ? raw : [raw];

  return arr
    .map((item: any) => ({
      recipientName: item.recipientName || item.name || item.donor || '',
      email: item.email || '',
      amount: parseFloat(item.amount) || 0,
      date: item.date || new Date().toISOString().split('T')[0],
      paymentMethod: item.paymentMethod || item.method || 'other',
      referenceId: item.referenceId || item.ref || generateRefId(),
      notes: item.notes || item.purpose || '',
    }))
    .filter((t) => t.recipientName && t.amount > 0) as ReceiptTransaction[];
}

/** Auto-detect format and parse */
export function parseBulkData(text: string): ReceiptTransaction[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJson(trimmed);
  }
  return parseCsv(trimmed);
}
