import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage, PDFImage } from 'pdf-lib';
import type {
  LetterheadTemplate,
  LetterheadPageTarget,
  LetterheadTextField,
  LetterheadLogo,
  Alignment,
} from '../types';

/** Horizontal margin in points */
const MARGIN = 40;

/** A4 page dimensions in points */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/** Font mapping from user-facing names to pdf-lib StandardFonts */
const FONT_MAP: Record<string, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
  Helvetica: StandardFonts.Helvetica,
  Times: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

/**
 * Parse a hex color string (e.g., "#FF0000" or "#f00") to rgb values (0-1 range).
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

/**
 * Calculate the x position for an element based on alignment.
 */
function getAlignedX(alignment: Alignment, pageWidth: number, elementWidth: number): number {
  switch (alignment) {
    case 'left':
      return MARGIN;
    case 'center':
      return pageWidth / 2 - elementWidth / 2;
    case 'right':
      return pageWidth - MARGIN - elementWidth;
  }
}

/**
 * Resolve a font family string to a pdf-lib StandardFonts value.
 * Falls back to Helvetica if the font is not recognized.
 */
function resolveFontKey(fontFamily: string): (typeof StandardFonts)[keyof typeof StandardFonts] {
  return FONT_MAP[fontFamily] ?? StandardFonts.Helvetica;
}

/**
 * Determine which page indices (0-based) to target based on LetterheadPageTarget.
 */
function getTargetPageIndices(target: LetterheadPageTarget, totalPages: number): number[] {
  switch (target.type) {
    case 'first':
      return totalPages > 0 ? [0] : [];
    case 'all':
      return Array.from({ length: totalPages }, (_, i) => i);
    case 'custom':
      return target.pages.filter((p) => p >= 1 && p <= totalPages).map((p) => p - 1);
  }
}

/**
 * Embed a logo image into the PDF document based on its mimeType.
 * Only PNG and JPEG are supported by pdf-lib; SVG is not supported.
 */
async function embedLogoImage(pdfDoc: PDFDocument, logo: LetterheadLogo): Promise<PDFImage> {
  const logoBytes = new Uint8Array(logo.data);
  if (logo.mimeType === 'image/png') {
    return pdfDoc.embedPng(logoBytes);
  }
  // For JPEG and any other format, attempt embedJpg
  return pdfDoc.embedJpg(logoBytes);
}

/**
 * Draw a logo onto a page within the header area, preserving aspect ratio.
 */
function drawLogo(
  page: PDFPage,
  image: PDFImage,
  logo: LetterheadLogo,
  pageWidth: number,
  pageHeight: number,
): void {
  const originalDims = image.scale(1);
  const targetWidth = Math.max(50, Math.min(300, logo.width));
  const scale = targetWidth / originalDims.width;
  const scaledHeight = originalDims.height * scale;

  const x = getAlignedX(logo.alignment, pageWidth, targetWidth);
  // Position logo at the top of the header area (vertically centered in header)
  const y = pageHeight - MARGIN - scaledHeight;

  page.drawImage(image, {
    x,
    y,
    width: targetWidth,
    height: scaledHeight,
  });
}

/**
 * Draw a text field onto a page at the specified vertical position within the header area.
 */
function drawTextField(
  page: PDFPage,
  field: LetterheadTextField,
  font: PDFFont,
  pageWidth: number,
  yPosition: number,
): void {
  if (!field.content.trim()) return;

  const fontSize = Math.max(8, Math.min(24, field.fontSize));
  const textWidth = font.widthOfTextAtSize(field.content, fontSize);
  const x = getAlignedX(field.alignment, pageWidth, textWidth);
  const color = parseHexColor(field.color);

  page.drawText(field.content, {
    x,
    y: yPosition,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Render all letterhead elements (logo + text fields) onto a single page.
 */
async function renderLetterheadOnPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
): Promise<void> {
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Embed and draw logo if present
  if (template.logo) {
    const image = await embedLogoImage(pdfDoc, template.logo);
    drawLogo(page, image, template.logo, pageWidth, pageHeight);
  }

  // Embed fonts needed for text fields
  const fontsCache = new Map<string, PDFFont>();

  async function getFont(fontFamily: string): Promise<PDFFont> {
    const key = resolveFontKey(fontFamily);
    if (!fontsCache.has(key)) {
      const font = await pdfDoc.embedFont(key);
      fontsCache.set(key, font);
    }
    return fontsCache.get(key)!;
  }

  // Calculate text positions within the header area
  // Header area: from (pageHeight - HEADER_HEIGHT) to pageHeight
  // We lay out text fields vertically starting below any logo space
  const headerTop = pageHeight - MARGIN;
  let currentY = headerTop - 20; // Start below top margin for company name

  // Company name (largest, at top of text area)
  if (template.companyName.content.trim()) {
    const font = await getFont(template.companyName.fontFamily);
    drawTextField(page, template.companyName, font, pageWidth, currentY);
    currentY -= template.companyName.fontSize + 4;
  }

  // Tagline (right below company name if present)
  if (template.tagline && template.tagline.content.trim()) {
    const font = await getFont(template.tagline.fontFamily);
    drawTextField(page, template.tagline, font, pageWidth, currentY);
    currentY -= template.tagline.fontSize + 4;
  }

  // Address lines
  for (const addressLine of template.addressLines) {
    if (addressLine.content.trim()) {
      const font = await getFont(addressLine.fontFamily);
      drawTextField(page, addressLine, font, pageWidth, currentY);
      currentY -= addressLine.fontSize + 2;
    }
  }

  // Contact info: phone, email, website
  const contactFields = [template.phone, template.email, template.website];
  for (const field of contactFields) {
    if (field.content.trim()) {
      const font = await getFont(field.fontFamily);
      drawTextField(page, field, font, pageWidth, currentY);
      currentY -= field.fontSize + 2;
    }
  }
}

/**
 * Apply a letterhead template to a PDF document using pdf-lib.
 *
 * Overlays logo and text fields onto target pages without modifying existing content.
 * Target pages are determined by the LetterheadPageTarget (first, all, or custom pages).
 *
 * @param pdfData - The source PDF as an ArrayBuffer
 * @param template - The letterhead template to apply
 * @param target - Which pages to apply the letterhead to
 * @returns The modified PDF as an ArrayBuffer
 */
export async function applyLetterhead(
  pdfData: ArrayBuffer,
  template: LetterheadTemplate,
  target: LetterheadPageTarget,
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(pdfData);
  const pages = pdfDoc.getPages();
  const targetIndices = getTargetPageIndices(target, pages.length);

  for (const index of targetIndices) {
    const page = pages[index];
    await renderLetterheadOnPage(pdfDoc, page, template);
  }

  const savedBytes = await pdfDoc.save();
  return savedBytes.buffer as ArrayBuffer;
}

/**
 * Export a letterhead template as a standalone single-page A4 PDF.
 *
 * Creates a new PDF document with a blank A4 page and renders the letterhead
 * template onto it. Useful for sharing or using as a background in other applications.
 *
 * @param template - The letterhead template to export
 * @returns The generated PDF as an ArrayBuffer
 */
export async function exportLetterheadAsPdf(template: LetterheadTemplate): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  await renderLetterheadOnPage(pdfDoc, page, template);

  const savedBytes = await pdfDoc.save();
  return savedBytes.buffer as ArrayBuffer;
}
