import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReceiptData } from '../types';

const MARGIN = 50;
const PAGE_W = 612;
const PAGE_H = 792;

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { organization, receiptType, transaction } = data;
  const right = PAGE_W - MARGIN;
  const contentW = PAGE_W - MARGIN * 2;
  let y = PAGE_H - MARGIN;

  // ─── Brand color accent bar at top ───────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 8,
    width: PAGE_W,
    height: 8,
    color: rgb(0.12, 0.23, 0.37),
  });

  // ─── Logo ────────────────────────────────────────────────────────────────
  if (organization.logo) {
    try {
      const embedFn = organization.logo.mimeType === 'image/png' ? doc.embedPng : doc.embedJpg;
      const img = await embedFn.call(doc, organization.logo.data);
      const scale = Math.min(80 / img.width, 50 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 24;
    } catch {
      /* skip logo on error */
    }
  }

  // ─── Organization name (top-left) ────────────────────────────────────────
  page.drawText(organization.name, {
    x: MARGIN,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.37),
  });

  // ─── Receipt title (top-right) ───────────────────────────────────────────
  const titleMap: Record<string, string> = {
    donation: 'DONATION RECEIPT',
    invoice: 'INVOICE',
    payment: 'PAYMENT RECEIPT',
    custom: 'RECEIPT',
  };
  const title = titleMap[receiptType] || 'RECEIPT';
  const titleW = fontBold.widthOfTextAtSize(title, 14);
  page.drawText(title, {
    x: right - titleW,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.37),
  });
  y -= 16;

  // ─── Organization address ────────────────────────────────────────────────
  if (organization.address) {
    page.drawText(organization.address, {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // ─── Receipt # (right-aligned below title) ───────────────────────────────
  const refText = `# ${transaction.referenceId}`;
  const refW = font.widthOfTextAtSize(refText, 9);
  page.drawText(refText, {
    x: right - refW,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 12;

  // Date right-aligned
  const dateText = `Date: ${transaction.date}`;
  const dateW = font.widthOfTextAtSize(dateText, 9);
  page.drawText(dateText, {
    x: right - dateW,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  // ─── Separator line ──────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 30;

  // ─── "Bill To" / Recipient section ───────────────────────────────────────
  page.drawText('RECEIVED FROM', {
    x: MARGIN,
    y,
    size: 8,
    font: fontBold,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 18;
  page.drawText(transaction.recipientName, {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 14;
  if (transaction.email) {
    page.drawText(transaction.email, {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 12;
  }
  y -= 24;

  // ─── Transaction table header ────────────────────────────────────────────
  const tableTop = y;
  page.drawRectangle({
    x: MARGIN,
    y: tableTop - 14,
    width: contentW,
    height: 18,
    color: rgb(0.96, 0.96, 0.97),
  });
  page.drawText('Description', {
    x: MARGIN + 8,
    y: tableTop - 10,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText('Method', {
    x: MARGIN + 260,
    y: tableTop - 10,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });
  const amtLabel = 'Amount';
  const amtLabelW = fontBold.widthOfTextAtSize(amtLabel, 8);
  page.drawText(amtLabel, {
    x: right - 8 - amtLabelW,
    y: tableTop - 10,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });
  y = tableTop - 32;

  // ─── Transaction row ─────────────────────────────────────────────────────
  const description = transaction.notes || `${titleMap[receiptType] || 'Payment'}`;
  page.drawText(description, { x: MARGIN + 8, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(transaction.paymentMethod.replace(/-/g, ' '), {
    x: MARGIN + 260,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  const amtText = formatCurrency(transaction.amount, organization.currency);
  const amtW = fontBold.widthOfTextAtSize(amtText, 11);
  page.drawText(amtText, {
    x: right - 8 - amtW,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  // ─── Row separator ───────────────────────────────────────────────────────
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: right, y },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });
  y -= 20;

  // ─── Total section (right-aligned, prominent) ────────────────────────────
  const totalLabel = 'TOTAL';
  page.drawText(totalLabel, {
    x: right - 120,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });
  const totalText = formatCurrency(transaction.amount, organization.currency);
  const totalW = fontBold.widthOfTextAtSize(totalText, 16);
  page.drawText(totalText, {
    x: right - 8 - totalW,
    y: y - 2,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.37),
  });
  y -= 60;

  // ─── Footer ──────────────────────────────────────────────────────────────
  const footerY = MARGIN + 50;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 16 },
    end: { x: right, y: footerY + 16 },
    thickness: 0.5,
    color: rgb(0.88, 0.88, 0.88),
  });

  page.drawText('This is a system-generated receipt. No signature required.', {
    x: MARGIN,
    y: footerY,
    size: 8,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });

  if (organization.taxDeductible) {
    page.drawText(
      'This contribution is tax-deductible. No goods or services were provided in exchange.',
      { x: MARGIN, y: footerY - 12, size: 8, font, color: rgb(0.55, 0.55, 0.55) },
    );
  }

  if (organization.footerText) {
    page.drawText(organization.footerText, {
      x: MARGIN,
      y: footerY - 24,
      size: 8,
      font,
      color: rgb(0.55, 0.55, 0.55),
    });
  }

  // ─── Bottom accent bar ───────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: 4,
    color: rgb(0.12, 0.23, 0.37),
  });

  return doc.save();
}
