import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  pushGraphicsState,
  popGraphicsState,
  setGraphicsState,
  PDFName,
} from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import type {
  CanvasDocument,
  CanvasPage,
  CanvasElement,
  TextElement,
  ImageElement,
  ShapeElement,
  GroupElement,
  ExportOptions,
} from '../types';

// Conversion factor: 1mm = 2.835 points (72pt/inch ÷ 25.4mm/inch)
const MM_TO_PT = 72 / 25.4;

/**
 * ExportEngine interface for PDF export.
 * Generates valid PDF files from canvas documents using pdf-lib.
 */
export interface PdfExportEngine {
  exportPage(page: CanvasPage, options?: Partial<ExportOptions>): Promise<Blob>;
  exportDocument(document: CanvasDocument, options?: Partial<ExportOptions>): Promise<Blob>;
}

/**
 * Convert a hex color string to pdf-lib rgb color.
 * Supports 3-char (#RGB), 6-char (#RRGGBB), and 8-char (#RRGGBBAA) hex.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');

  // Handle 8-char hex (with alpha) - strip alpha for color
  if (cleanHex.length === 8) {
    cleanHex = cleanHex.slice(0, 6);
  }

  // Handle 3-char shorthand
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  return { r, g, b };
}

/**
 * Extract opacity from an 8-char hex color string.
 * Returns 1 if no alpha channel present.
 */
export function hexToAlpha(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 8) {
    return parseInt(cleanHex.slice(6, 8), 16) / 255;
  }
  return 1;
}

/**
 * Map a font family name to a pdf-lib StandardFont.
 * Falls back to Helvetica for unknown fonts.
 */
function mapToStandardFont(fontFamily: string, bold: boolean, italic: boolean): StandardFonts {
  const family = fontFamily.toLowerCase().trim();

  if (family.includes('courier') || family.includes('mono')) {
    if (bold && italic) return StandardFonts.CourierBoldOblique;
    if (bold) return StandardFonts.CourierBold;
    if (italic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  if (family.includes('times') || family.includes('serif')) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
    if (bold) return StandardFonts.TimesRomanBold;
    if (italic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  // Default to Helvetica (sans-serif)
  if (bold && italic) return StandardFonts.HelveticaBoldOblique;
  if (bold) return StandardFonts.HelveticaBold;
  if (italic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

/**
 * Apply opacity to a PDF page using a graphics state with the given opacity.
 */
function applyOpacity(pdfDoc: PDFDocument, page: PDFPage, opacity: number): void {
  if (opacity >= 100) return;

  const normalizedOpacity = Math.max(0, Math.min(1, opacity / 100));
  const extGState = pdfDoc.context.obj({
    Type: 'ExtGState',
    ca: normalizedOpacity, // Non-stroking alpha
    CA: normalizedOpacity, // Stroking alpha
  });

  const extGStateRef = pdfDoc.context.register(extGState);
  const gsName = `GS_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Add the graphics state to the page's resources
  const resources = page.node.get(PDFName.of('Resources'));
  if (resources) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extGStates = (resources as any).get(PDFName.of('ExtGState'));
    if (!extGStates) {
      extGStates = pdfDoc.context.obj({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (resources as any).set(PDFName.of('ExtGState'), extGStates);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extGStates as any).set(PDFName.of(gsName), extGStateRef);
  }

  page.pushOperators(pushGraphicsState(), setGraphicsState(PDFName.of(gsName)));
}

/**
 * Restore graphics state after opacity application.
 */
function restoreOpacity(page: PDFPage, opacity: number): void {
  if (opacity >= 100) return;
  page.pushOperators(popGraphicsState());
}

/**
 * Render a text element onto a PDF page as vector text.
 */
async function renderTextElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  element: TextElement,
  pageHeight: number,
  fontCache: Map<string, PDFFont>,
): Promise<void> {
  if (!element.content || element.content.trim().length === 0) return;

  const fontKey = mapToStandardFont(element.fontFamily, element.bold, element.italic);
  let font = fontCache.get(fontKey);
  if (!font) {
    font = await pdfDoc.embedFont(fontKey);
    fontCache.set(fontKey, font);
  }

  const { r, g, b } = hexToRgb(element.fontColor);
  const fontSize = element.fontSize; // already in points
  const xPt = element.x * MM_TO_PT;
  // PDF coordinate system has origin at bottom-left, so flip Y
  const yPt = pageHeight - element.y * MM_TO_PT;
  const widthPt = element.width * MM_TO_PT;

  // Apply opacity
  applyOpacity(pdfDoc, page, element.opacity);

  // Rotation is handled per-line via drawText options below

  // Split content into lines and render each
  const lines = wrapText(element.content, font, fontSize, widthPt);
  const lineHeight = fontSize * 1.2; // Standard line height

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = yPt - fontSize - i * lineHeight;

    // Calculate x position based on alignment
    let lineX = xPt;
    if (element.alignment === 'center') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      lineX = xPt + (widthPt - lineWidth) / 2;
    } else if (element.alignment === 'right') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      lineX = xPt + widthPt - lineWidth;
    }

    const drawOptions: Parameters<PDFPage['drawText']>[1] = {
      x: lineX,
      y: lineY,
      size: fontSize,
      font,
      color: rgb(r, g, b),
    };

    if (element.rotation !== 0) {
      const centerX = xPt + widthPt / 2;
      const centerY = yPt - (element.height * MM_TO_PT) / 2;
      drawOptions.rotate = degrees(-element.rotation);
      drawOptions.x = lineX;
      drawOptions.y = lineY;
      // Apply rotation around element center
      const cos = Math.cos((-element.rotation * Math.PI) / 180);
      const sin = Math.sin((-element.rotation * Math.PI) / 180);
      const dx = lineX - centerX;
      const dy = lineY - centerY;
      drawOptions.x = centerX + dx * cos - dy * sin;
      drawOptions.y = centerY + dx * sin + dy * cos;
    }

    page.drawText(line, drawOptions);
  }

  restoreOpacity(page, element.opacity);
}

/**
 * Simple word-wrapping for text within a given width.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
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
  }

  return lines;
}

/**
 * Render a shape element onto a PDF page as vector paths.
 */
function renderShapeElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  element: ShapeElement,
  pageHeight: number,
): void {
  const xPt = element.x * MM_TO_PT;
  const yPt = pageHeight - (element.y + element.height) * MM_TO_PT;
  const widthPt = element.width * MM_TO_PT;
  const heightPt = element.height * MM_TO_PT;

  const fillColor = element.fill === 'transparent' ? undefined : hexToRgb(element.fill);
  const strokeColor = hexToRgb(element.stroke);
  const strokeWidthPt = element.strokeWidth * MM_TO_PT;

  // Apply opacity
  applyOpacity(pdfDoc, page, element.opacity);

  // Set up dash pattern for border style
  const dashArray =
    element.borderStyle === 'dashed'
      ? [6, 3]
      : element.borderStyle === 'dotted'
        ? [2, 2]
        : undefined;

  // Handle rotation - compute center for rotation
  const centerX = xPt + widthPt / 2;
  const centerY = yPt + heightPt / 2;
  const rotationDeg = element.rotation;

  switch (element.shapeType) {
    case 'rectangle': {
      page.drawRectangle({
        x: xPt,
        y: yPt,
        width: widthPt,
        height: heightPt,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: strokeWidthPt,
        rotate: rotationDeg !== 0 ? degrees(rotationDeg) : undefined,
        borderDashArray: dashArray,
        opacity: element.opacity / 100,
        borderOpacity: element.opacity / 100,
      });
      break;
    }

    case 'circle': {
      page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: widthPt / 2,
        yScale: heightPt / 2,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
        borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        borderWidth: strokeWidthPt,
        rotate: rotationDeg !== 0 ? degrees(rotationDeg) : undefined,
        borderDashArray: dashArray,
        opacity: element.opacity / 100,
        borderOpacity: element.opacity / 100,
      });
      break;
    }

    case 'line': {
      const startX = xPt;
      const startY = yPt + heightPt;
      const endX = xPt + widthPt;
      const endY = yPt;

      if (rotationDeg !== 0) {
        // Rotate line endpoints around center
        const cos = Math.cos((rotationDeg * Math.PI) / 180);
        const sin = Math.sin((rotationDeg * Math.PI) / 180);

        const rotatePoint = (px: number, py: number) => ({
          x: centerX + (px - centerX) * cos - (py - centerY) * sin,
          y: centerY + (px - centerX) * sin + (py - centerY) * cos,
        });

        const rStart = rotatePoint(startX, startY);
        const rEnd = rotatePoint(endX, endY);

        page.drawLine({
          start: { x: rStart.x, y: rStart.y },
          end: { x: rEnd.x, y: rEnd.y },
          thickness: strokeWidthPt,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          dashArray: dashArray,
          opacity: element.opacity / 100,
        });
      } else {
        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness: strokeWidthPt,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          dashArray: dashArray,
          opacity: element.opacity / 100,
        });
      }
      break;
    }

    case 'arrow': {
      // Draw line with arrowhead
      const arrowStartX = xPt;
      const arrowStartY = yPt + heightPt;
      const arrowEndX = xPt + widthPt;
      const arrowEndY = yPt;

      page.drawLine({
        start: { x: arrowStartX, y: arrowStartY },
        end: { x: arrowEndX, y: arrowEndY },
        thickness: strokeWidthPt,
        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        dashArray: dashArray,
        opacity: element.opacity / 100,
      });

      // Draw arrowhead as a small triangle at the end
      const arrowSize = Math.max(strokeWidthPt * 3, 6);
      const angle = Math.atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
      const ax1 = arrowEndX - arrowSize * Math.cos(angle - Math.PI / 6);
      const ay1 = arrowEndY - arrowSize * Math.sin(angle - Math.PI / 6);
      const ax2 = arrowEndX - arrowSize * Math.cos(angle + Math.PI / 6);
      const ay2 = arrowEndY - arrowSize * Math.sin(angle + Math.PI / 6);

      page.drawLine({
        start: { x: arrowEndX, y: arrowEndY },
        end: { x: ax1, y: ay1 },
        thickness: strokeWidthPt,
        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        opacity: element.opacity / 100,
      });
      page.drawLine({
        start: { x: arrowEndX, y: arrowEndY },
        end: { x: ax2, y: ay2 },
        thickness: strokeWidthPt,
        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        opacity: element.opacity / 100,
      });
      break;
    }

    case 'star': {
      // Draw a 5-pointed star using line segments
      const outerRadius = Math.min(widthPt, heightPt) / 2;
      const innerRadius = outerRadius * 0.4;
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        let px = centerX + radius * Math.cos(angle);
        let py = centerY + radius * Math.sin(angle);

        // Apply rotation
        if (rotationDeg !== 0) {
          const cos = Math.cos((rotationDeg * Math.PI) / 180);
          const sin = Math.sin((rotationDeg * Math.PI) / 180);
          const dx = px - centerX;
          const dy = py - centerY;
          px = centerX + dx * cos - dy * sin;
          py = centerY + dx * sin + dy * cos;
        }

        points.push({ x: px, y: py });
      }

      // Draw star edges
      for (let i = 0; i < points.length; i++) {
        const next = points[(i + 1) % points.length];
        page.drawLine({
          start: points[i],
          end: next,
          thickness: strokeWidthPt,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: element.opacity / 100,
        });
      }
      break;
    }

    case 'polygon': {
      const sides = element.polygonSides || 6;
      const polyRadius = Math.min(widthPt, heightPt) / 2;
      const polyPoints: { x: number; y: number }[] = [];

      for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        let px = centerX + polyRadius * Math.cos(angle);
        let py = centerY + polyRadius * Math.sin(angle);

        // Apply rotation
        if (rotationDeg !== 0) {
          const cos = Math.cos((rotationDeg * Math.PI) / 180);
          const sin = Math.sin((rotationDeg * Math.PI) / 180);
          const dx = px - centerX;
          const dy = py - centerY;
          px = centerX + dx * cos - dy * sin;
          py = centerY + dx * sin + dy * cos;
        }

        polyPoints.push({ x: px, y: py });
      }

      // Draw polygon edges
      for (let i = 0; i < polyPoints.length; i++) {
        const next = polyPoints[(i + 1) % polyPoints.length];
        page.drawLine({
          start: polyPoints[i],
          end: next,
          thickness: strokeWidthPt,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: element.opacity / 100,
        });
      }
      break;
    }
  }

  restoreOpacity(page, element.opacity);
}

/**
 * Render an image element onto a PDF page at original resolution.
 */
async function renderImageElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  element: ImageElement,
  pageHeight: number,
): Promise<void> {
  if (!element.src) return;

  try {
    // Fetch image data
    const imageData = await fetchImageData(element.src);
    if (!imageData) return;

    // Embed image based on format
    let embeddedImage;
    if (isPng(imageData)) {
      embeddedImage = await pdfDoc.embedPng(imageData);
    } else {
      // Default to JPEG for non-PNG images
      embeddedImage = await pdfDoc.embedJpg(imageData);
    }

    const xPt = element.x * MM_TO_PT;
    const yPt = pageHeight - (element.y + element.height) * MM_TO_PT;
    const widthPt = element.width * MM_TO_PT;
    const heightPt = element.height * MM_TO_PT;

    // Apply opacity
    applyOpacity(pdfDoc, page, element.opacity);

    page.drawImage(embeddedImage, {
      x: xPt,
      y: yPt,
      width: widthPt,
      height: heightPt,
      rotate: element.rotation !== 0 ? degrees(element.rotation) : undefined,
      opacity: element.opacity / 100,
    });

    restoreOpacity(page, element.opacity);
  } catch (error) {
    // Skip image if it can't be embedded (e.g., corrupted data)
    // eslint-disable-next-line no-console
    console.warn(`Failed to embed image element ${element.id}:`, error);
  }
}

/**
 * Fetch image data from a src string (data URI or object URL).
 */
async function fetchImageData(src: string): Promise<Uint8Array | null> {
  try {
    if (src.startsWith('data:')) {
      // Data URI - extract base64 content
      const base64 = src.split(',')[1];
      if (!base64) return null;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      // Object URL or regular URL - fetch it
      const response = await fetch(src);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch {
    return null;
  }
}

/**
 * Check if image data is PNG format by checking magic bytes.
 */
function isPng(data: Uint8Array): boolean {
  // PNG magic bytes: 137 80 78 71 13 10 26 10
  return (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  );
}

/**
 * Render a group element by recursively rendering its children.
 */
async function renderGroupElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  element: GroupElement,
  pageHeight: number,
  fontCache: Map<string, PDFFont>,
): Promise<void> {
  // Apply group-level opacity
  applyOpacity(pdfDoc, page, element.opacity);

  // Sort children by z-index and render each
  const sortedChildren = [...element.children].sort((a, b) => a.zIndex - b.zIndex);

  for (const child of sortedChildren) {
    await renderElement(pdfDoc, page, child, pageHeight, fontCache);
  }

  restoreOpacity(page, element.opacity);
}

/**
 * Render a single element onto a PDF page, dispatching by type.
 */
async function renderElement(
  pdfDoc: PDFDocument,
  page: PDFPage,
  element: CanvasElement,
  pageHeight: number,
  fontCache: Map<string, PDFFont>,
): Promise<void> {
  // Skip hidden elements
  if (!element.visible) return;

  switch (element.type) {
    case 'text':
      await renderTextElement(pdfDoc, page, element, pageHeight, fontCache);
      break;
    case 'image':
      await renderImageElement(pdfDoc, page, element, pageHeight);
      break;
    case 'shape':
      renderShapeElement(pdfDoc, page, element, pageHeight);
      break;
    case 'group':
      await renderGroupElement(pdfDoc, page, element, pageHeight, fontCache);
      break;
  }
}

/**
 * Render a single canvas page to a PDF page.
 */
async function renderCanvasPage(
  pdfDoc: PDFDocument,
  canvasPage: CanvasPage,
  fontCache: Map<string, PDFFont>,
): Promise<void> {
  const widthPt = canvasPage.width * MM_TO_PT;
  const heightPt = canvasPage.height * MM_TO_PT;

  const page = pdfDoc.addPage([widthPt, heightPt]);

  // Draw page background if not white
  if (canvasPage.backgroundColor && canvasPage.backgroundColor.toLowerCase() !== '#ffffff') {
    const bgColor = hexToRgb(canvasPage.backgroundColor);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });
  }

  // Sort elements by z-index (ascending - back to front)
  const sortedElements = [...canvasPage.elements].sort((a, b) => a.zIndex - b.zIndex);

  // Render each visible element
  for (const element of sortedElements) {
    await renderElement(pdfDoc, page, element, heightPt, fontCache);
  }
}

/**
 * PDF Export Engine implementation.
 * Generates valid PDF files from canvas documents using pdf-lib.
 */
export const pdfExportEngine: PdfExportEngine = {
  /**
   * Export a single canvas page as a PDF blob.
   */
  async exportPage(page: CanvasPage, _options?: Partial<ExportOptions>): Promise<Blob> {
    try {
      const pdfDoc = await PDFDocument.create();
      const fontCache = new Map<string, PDFFont>();

      await renderCanvasPage(pdfDoc, page, fontCache);

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `PDF export failed: ${message}. Please try reducing the number of elements or image sizes.`,
      );
    }
  },

  /**
   * Export a full canvas document (all or selected pages) as a PDF blob.
   */
  async exportDocument(document: CanvasDocument, options?: Partial<ExportOptions>): Promise<Blob> {
    try {
      const pdfDoc = await PDFDocument.create();
      const fontCache = new Map<string, PDFFont>();

      // Determine which pages to export
      const pageIndices =
        options?.pages === 'all' || !options?.pages
          ? document.pages.map((_, i) => i)
          : options.pages;

      for (const pageIndex of pageIndices) {
        const page = document.pages[pageIndex];
        if (page) {
          await renderCanvasPage(pdfDoc, page, fontCache);
        }
      }

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `PDF export failed: ${message}. Please try reducing the number of elements or image sizes.`,
      );
    }
  },
};
