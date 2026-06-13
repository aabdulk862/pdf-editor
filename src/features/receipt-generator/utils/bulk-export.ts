import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { generateReceiptPdf } from './receipt-pdf';
import type { ReceiptData, BulkExportFormat } from '../types';

/** Generate multiple receipt PDFs and export as ZIP or merged PDF */
export async function bulkExport(
  receipts: ReceiptData[],
  format: BulkExportFormat,
): Promise<{ blob: Blob; filename: string }> {
  if (format === 'zip') {
    return exportAsZip(receipts);
  }
  return exportAsMerged(receipts);
}

async function exportAsZip(receipts: ReceiptData[]): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  for (let i = 0; i < receipts.length; i++) {
    const pdfBytes = await generateReceiptPdf(receipts[i]);
    const name = sanitizeFilename(receipts[i].transaction.recipientName || `receipt-${i + 1}`);
    zip.file(`${name}.pdf`, pdfBytes);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, filename: 'receipts.zip' };
}

async function exportAsMerged(receipts: ReceiptData[]): Promise<{ blob: Blob; filename: string }> {
  const merged = await PDFDocument.create();

  for (const receipt of receipts) {
    const pdfBytes = await generateReceiptPdf(receipt);
    const source = await PDFDocument.load(pdfBytes);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const bytes = await merged.save();
  return {
    blob: new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }),
    filename: 'receipts-merged.pdf',
  };
}

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .trim()
      .substring(0, 50) || 'receipt'
  );
}
