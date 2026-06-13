import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage, PDFImage } from 'pdf-lib';
import type {
  LetterheadTemplate,
  LetterheadPageTarget,
  LetterheadTextField,
  LetterheadLogo,
  LetterheadLayout,
  Alignment,
} from '../types';
import { getEffectiveLetterBody } from './defaults';

/** Horizontal margin in points */
const MARGIN = 40;

/** US Letter page dimensions in points (8.5 × 11 inches) */
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;

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
 * Word-wrap a line of text to fit within maxWidth using the given font and size.
 * Returns an array of wrapped lines.
 */
function wrapTextLine(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text.trim()) return [''];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/** Font cache helper for a single render pass */
class FontCache {
  private cache = new Map<string, PDFFont>();
  private pdfDoc: PDFDocument;

  constructor(pdfDoc: PDFDocument) {
    this.pdfDoc = pdfDoc;
  }

  async getFont(fontFamily: string): Promise<PDFFont> {
    const key = resolveFontKey(fontFamily);
    if (!this.cache.has(key)) {
      const font = await this.pdfDoc.embedFont(key);
      this.cache.set(key, font);
    }
    return this.cache.get(key)!;
  }
}

/**
 * Draw a text field onto a page at the specified Y position.
 * Returns the height consumed (fontSize + spacing).
 */
function drawTextField(
  page: PDFPage,
  field: LetterheadTextField,
  font: PDFFont,
  pageWidth: number,
  yBaseline: number,
): void {
  if (!field.content.trim()) return;

  const fontSize = Math.max(8, Math.min(24, field.fontSize));
  const textWidth = font.widthOfTextAtSize(field.content, fontSize);
  const x = getAlignedX(field.alignment, pageWidth, textWidth);
  const color = parseHexColor(field.color);

  page.drawText(field.content, {
    x,
    y: yBaseline,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Render the header using the 'logo-center' layout:
 * [Left Text] [Logo centered] [Right Text]
 */
async function renderLogoCenterLayout(
  pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
  fonts: FontCache,
  startY: number,
): Promise<number> {
  const { width: pageWidth } = page.getSize();
  let currentY = startY;

  // Draw logo centered
  let logoHeight = 0;
  if (template.logo) {
    const image = await embedLogoImage(pdfDoc, template.logo);
    const originalDims = image.scale(1);
    const targetWidth = Math.max(50, Math.min(300, template.logo.width));
    const scale = targetWidth / originalDims.width;
    const scaledHeight = originalDims.height * scale;
    logoHeight = scaledHeight;

    const x = pageWidth / 2 - targetWidth / 2;
    const y = currentY - scaledHeight;

    page.drawImage(image, { x, y, width: targetWidth, height: scaledHeight });
  }

  // Draw left text and right text at the vertical center of the logo
  const sideTextFont = await fonts.getFont('Helvetica');
  const sideTextSize = 10;
  const sideTextY = currentY - (logoHeight > 0 ? logoHeight / 2 + sideTextSize / 2 : sideTextSize);

  if (template.headerLeftText?.trim()) {
    const color = parseHexColor('#000000');
    const lines = template.headerLeftText.split('\n').filter((l) => l.trim());
    let lineY = sideTextY;
    for (const line of lines) {
      page.drawText(line, {
        x: MARGIN,
        y: lineY,
        size: sideTextSize,
        font: sideTextFont,
        color: rgb(color.r, color.g, color.b),
      });
      lineY -= sideTextSize + 2;
    }
  }

  if (template.headerRightText?.trim()) {
    const color = parseHexColor('#000000');
    const lines = template.headerRightText.split('\n').filter((l) => l.trim());
    let lineY = sideTextY;
    for (const line of lines) {
      const textWidth = sideTextFont.widthOfTextAtSize(line, sideTextSize);
      page.drawText(line, {
        x: pageWidth - MARGIN - textWidth,
        y: lineY,
        size: sideTextSize,
        font: sideTextFont,
        color: rgb(color.r, color.g, color.b),
      });
      lineY -= sideTextSize + 2;
    }
  }

  currentY -= Math.max(logoHeight, sideTextSize + 4) + 8;

  return currentY;
}

/**
 * Render the header using the 'logo-left' layout:
 * [Logo] [Company Name to the right of logo]
 */
async function renderLogoLeftLayout(
  pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
  fonts: FontCache,
  startY: number,
): Promise<number> {
  page.getSize(); // dimensions used implicitly via MARGIN constants
  let currentY = startY;
  let logoEndX = MARGIN;
  let logoHeight = 0;

  // Draw logo on the left
  if (template.logo) {
    const image = await embedLogoImage(pdfDoc, template.logo);
    const originalDims = image.scale(1);
    const targetWidth = Math.max(50, Math.min(300, template.logo.width));
    const scale = targetWidth / originalDims.width;
    const scaledHeight = originalDims.height * scale;
    logoHeight = scaledHeight;
    logoEndX = MARGIN + targetWidth + 12;

    const y = currentY - scaledHeight;
    page.drawImage(image, { x: MARGIN, y, width: targetWidth, height: scaledHeight });
  }

  // Company name to the right of logo, vertically centered with logo
  if (template.companyName.content.trim()) {
    const font = await fonts.getFont(template.companyName.fontFamily);
    const fontSize = Math.max(8, Math.min(24, template.companyName.fontSize));
    const color = parseHexColor(template.companyName.color);
    const textY = currentY - (logoHeight > 0 ? logoHeight / 2 + fontSize / 2 : fontSize);

    page.drawText(template.companyName.content, {
      x: logoEndX,
      y: textY,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  currentY -= Math.max(logoHeight, template.companyName.fontSize + 4) + 8;
  return currentY;
}

/**
 * Render the header using the 'logo-right' layout:
 * [Company Name on left] [Logo on right]
 */
async function renderLogoRightLayout(
  pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
  fonts: FontCache,
  startY: number,
): Promise<number> {
  const { width: pageWidth } = page.getSize();
  let currentY = startY;
  let logoHeight = 0;

  // Draw logo on the right
  if (template.logo) {
    const image = await embedLogoImage(pdfDoc, template.logo);
    const originalDims = image.scale(1);
    const targetWidth = Math.max(50, Math.min(300, template.logo.width));
    const scale = targetWidth / originalDims.width;
    const scaledHeight = originalDims.height * scale;
    logoHeight = scaledHeight;

    const logoX = pageWidth - MARGIN - targetWidth;
    const y = currentY - scaledHeight;
    page.drawImage(image, { x: logoX, y, width: targetWidth, height: scaledHeight });
  }

  // Company name on the left, vertically centered with logo
  if (template.companyName.content.trim()) {
    const font = await fonts.getFont(template.companyName.fontFamily);
    const fontSize = Math.max(8, Math.min(24, template.companyName.fontSize));
    const color = parseHexColor(template.companyName.color);
    const textY = currentY - (logoHeight > 0 ? logoHeight / 2 + fontSize / 2 : fontSize);

    page.drawText(template.companyName.content, {
      x: MARGIN,
      y: textY,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  currentY -= Math.max(logoHeight, template.companyName.fontSize + 4) + 8;
  return currentY;
}

/**
 * Render the header using the 'centered' layout:
 * Everything centered vertically (logo, name, tagline)
 */
async function renderCenteredLayout(
  pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
  fonts: FontCache,
  startY: number,
): Promise<number> {
  const { width: pageWidth } = page.getSize();
  let currentY = startY;

  // Logo centered
  if (template.logo) {
    const image = await embedLogoImage(pdfDoc, template.logo);
    const originalDims = image.scale(1);
    const targetWidth = Math.max(50, Math.min(300, template.logo.width));
    const scale = targetWidth / originalDims.width;
    const scaledHeight = originalDims.height * scale;

    const x = pageWidth / 2 - targetWidth / 2;
    const y = currentY - scaledHeight;
    page.drawImage(image, { x, y, width: targetWidth, height: scaledHeight });
    currentY -= scaledHeight + 8;
  }

  // Company name centered
  if (template.companyName.content.trim()) {
    const font = await fonts.getFont(template.companyName.fontFamily);
    const fontSize = Math.max(8, Math.min(24, template.companyName.fontSize));
    const textWidth = font.widthOfTextAtSize(template.companyName.content, fontSize);
    const color = parseHexColor(template.companyName.color);

    page.drawText(template.companyName.content, {
      x: pageWidth / 2 - textWidth / 2,
      y: currentY - fontSize,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    currentY -= fontSize + 4;
  }

  // Tagline centered
  if (template.tagline && template.tagline.content.trim()) {
    const font = await fonts.getFont(template.tagline.fontFamily);
    const fontSize = Math.max(8, Math.min(24, template.tagline.fontSize));
    const textWidth = font.widthOfTextAtSize(template.tagline.content, fontSize);
    const color = parseHexColor(template.tagline.color);

    page.drawText(template.tagline.content, {
      x: pageWidth / 2 - textWidth / 2,
      y: currentY - fontSize,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    currentY -= fontSize + 4;
  }

  return currentY;
}

/**
 * Render the header using the 'minimal' layout:
 * Just company name, no logo zone
 */
async function renderMinimalLayout(
  _pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
  fonts: FontCache,
  startY: number,
): Promise<number> {
  const { width: pageWidth } = page.getSize();
  let currentY = startY;

  // Company name only
  if (template.companyName.content.trim()) {
    const font = await fonts.getFont(template.companyName.fontFamily);
    drawTextField(
      page,
      template.companyName,
      font,
      pageWidth,
      currentY - template.companyName.fontSize,
    );
    currentY -= template.companyName.fontSize + 8;
  }

  return currentY;
}

/**
 * Render additional header fields (address, contact) below the layout-specific header.
 */
async function renderCommonHeaderFields(
  page: PDFPage,
  template: LetterheadTemplate,
  fonts: FontCache,
  pageWidth: number,
  startY: number,
): Promise<number> {
  let currentY = startY;

  // Address lines
  for (const addressLine of template.addressLines) {
    if (addressLine.content.trim()) {
      const font = await fonts.getFont(addressLine.fontFamily);
      drawTextField(page, addressLine, font, pageWidth, currentY);
      currentY -= addressLine.fontSize + 2;
    }
  }

  // Contact info: phone, email, website
  const contactFields = [template.phone, template.email, template.website];
  for (const field of contactFields) {
    if (field.content.trim()) {
      const font = await fonts.getFont(field.fontFamily);
      drawTextField(page, field, font, pageWidth, currentY);
      currentY -= field.fontSize + 2;
    }
  }

  return currentY;
}

/**
 * Render all letterhead elements (logo + text fields + separator + body) onto a single page.
 * Properly tracks Y position from top to bottom.
 * PDF coordinates: Y=0 is bottom, Y=pageHeight is top.
 * We start at pageHeight - MARGIN and decrease Y as we go down.
 */
async function renderLetterheadOnPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  template: LetterheadTemplate,
): Promise<void> {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const fonts = new FontCache(pdfDoc);

  // Start from the top of the page
  const startY = pageHeight - MARGIN;
  const layout: LetterheadLayout = template.layout ?? 'centered';

  // Render layout-specific header
  let currentY: number;
  switch (layout) {
    case 'logo-center':
      currentY = await renderLogoCenterLayout(pdfDoc, page, template, fonts, startY);
      break;
    case 'logo-left':
      currentY = await renderLogoLeftLayout(pdfDoc, page, template, fonts, startY);
      break;
    case 'logo-right':
      currentY = await renderLogoRightLayout(pdfDoc, page, template, fonts, startY);
      break;
    case 'centered':
      currentY = await renderCenteredLayout(pdfDoc, page, template, fonts, startY);
      break;
    case 'minimal':
      currentY = await renderMinimalLayout(pdfDoc, page, template, fonts, startY);
      break;
    default:
      currentY = await renderCenteredLayout(pdfDoc, page, template, fonts, startY);
      break;
  }

  // Render common fields (address, contact) for non-minimal layouts
  if (layout !== 'minimal') {
    currentY = await renderCommonHeaderFields(page, template, fonts, pageWidth, currentY);
  }

  // Draw separator line if enabled
  if (template.showSeparator) {
    currentY -= 8;
    const sepColor = parseHexColor(template.separatorColor ?? '#E5E7EB');
    page.drawLine({
      start: { x: MARGIN, y: currentY },
      end: { x: pageWidth - MARGIN, y: currentY },
      thickness: 1,
      color: rgb(sepColor.r, sepColor.g, sepColor.b),
    });
    currentY -= 12;
  } else {
    currentY -= 16;
  }

  // Render letter body text — use the same text the user sees in the editor
  const bodyText = getEffectiveLetterBody(template);
  if (bodyText.trim()) {
    const bodyFont = await fonts.getFont('Helvetica');
    const bodyFontSize = 12;
    const lineHeight = bodyFontSize + 4;
    const maxWidth = pageWidth - 2 * MARGIN;
    const bodyColor = parseHexColor('#000000');

    const paragraphs = bodyText.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        // Empty line — just add spacing
        currentY -= lineHeight;
        if (currentY < MARGIN) break;
        continue;
      }

      const wrappedLines = wrapTextLine(paragraph, bodyFont, bodyFontSize, maxWidth);
      for (const line of wrappedLines) {
        if (currentY < MARGIN) break;
        page.drawText(line, {
          x: MARGIN,
          y: currentY,
          size: bodyFontSize,
          font: bodyFont,
          color: rgb(bodyColor.r, bodyColor.g, bodyColor.b),
        });
        currentY -= lineHeight;
      }

      if (currentY < MARGIN) break;
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
 * Export a letterhead as a multi-page PDF.
 * Page 1: header + body text start
 * Pages 2+: body text continuation with page numbers
 */
export async function exportLetterheadAsPdf(template: LetterheadTemplate): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  const fonts = new FontCache(pdfDoc);
  const bodyFont = await fonts.getFont('Helvetica');
  const bodyFontSize = 12;
  const lineHeight = bodyFontSize + 5;
  const maxWidth = LETTER_WIDTH - 2 * MARGIN;
  const bodyColor = parseHexColor('#000000');
  const layout: LetterheadLayout = template.layout ?? 'centered';

  // ─── Page 1: Header + Body Start ─────────────────────────────────────────
  const page1 = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  const { width: pageWidth } = page1.getSize();
  const startY = LETTER_HEIGHT - MARGIN;

  let currentY: number;
  switch (layout) {
    case 'logo-center':
      currentY = await renderLogoCenterLayout(pdfDoc, page1, template, fonts, startY);
      break;
    case 'logo-left':
      currentY = await renderLogoLeftLayout(pdfDoc, page1, template, fonts, startY);
      break;
    case 'logo-right':
      currentY = await renderLogoRightLayout(pdfDoc, page1, template, fonts, startY);
      break;
    case 'centered':
      currentY = await renderCenteredLayout(pdfDoc, page1, template, fonts, startY);
      break;
    case 'minimal':
      currentY = await renderMinimalLayout(pdfDoc, page1, template, fonts, startY);
      break;
    default:
      currentY = await renderCenteredLayout(pdfDoc, page1, template, fonts, startY);
      break;
  }

  if (layout !== 'minimal') {
    currentY = await renderCommonHeaderFields(page1, template, fonts, pageWidth, currentY);
  }

  if (template.showSeparator) {
    currentY -= 8;
    const sepColor = parseHexColor(template.separatorColor ?? '#E5E7EB');
    page1.drawLine({
      start: { x: MARGIN, y: currentY },
      end: { x: pageWidth - MARGIN, y: currentY },
      thickness: 1,
      color: rgb(sepColor.r, sepColor.g, sepColor.b),
    });
    currentY -= 16;
  } else {
    currentY -= 20;
  }

  // ─── Body text across pages ──────────────────────────────────────────────
  const bodyText = getEffectiveLetterBody(template);
  const paragraphs = bodyText.split('\n');
  let currentPage = page1;
  let pageNum = 1;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      currentY -= lineHeight;
      if (currentY < MARGIN + 30) {
        // New page
        pageNum++;
        currentPage = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
        currentY = LETTER_HEIGHT - MARGIN;
        // Page number
        const numText = `Page ${pageNum}`;
        const numWidth = bodyFont.widthOfTextAtSize(numText, 9);
        currentPage.drawText(numText, {
          x: LETTER_WIDTH / 2 - numWidth / 2,
          y: MARGIN - 20,
          size: 9,
          font: bodyFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      continue;
    }

    const wrappedLines = wrapTextLine(paragraph, bodyFont, bodyFontSize, maxWidth);
    for (const line of wrappedLines) {
      if (currentY < MARGIN + 30) {
        // New page
        pageNum++;
        currentPage = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
        currentY = LETTER_HEIGHT - MARGIN;
        // Page number
        const numText = `Page ${pageNum}`;
        const numWidth = bodyFont.widthOfTextAtSize(numText, 9);
        currentPage.drawText(numText, {
          x: LETTER_WIDTH / 2 - numWidth / 2,
          y: MARGIN - 20,
          size: 9,
          font: bodyFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
      currentPage.drawText(line, {
        x: MARGIN,
        y: currentY,
        size: bodyFontSize,
        font: bodyFont,
        color: rgb(bodyColor.r, bodyColor.g, bodyColor.b),
      });
      currentY -= lineHeight;
    }
  }

  const savedBytes = await pdfDoc.save();
  return savedBytes.buffer as ArrayBuffer;
}
