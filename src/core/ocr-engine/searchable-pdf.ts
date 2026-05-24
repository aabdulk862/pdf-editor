import {
  PDFDocument,
  StandardFonts,
  pushGraphicsState,
  popGraphicsState,
  beginText,
  endText,
  setFontAndSize,
  setTextRenderingMode,
  TextRenderingMode,
  moveText,
  showText,
} from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import type { OcrProcessingResult, OcrPageResult } from './types';

/** Scale factor to convert 300 DPI pixel coordinates to PDF points (72 DPI) */
const DPI_SCALE_FACTOR = 72 / 300;

/**
 * Generate a searchable PDF by embedding invisible text layers over the original pages.
 *
 * Algorithm:
 * 1. Load original PDF with PDFDocument.load(pdfData)
 * 2. Embed Helvetica font (standard, no subsetting needed)
 * 3. For each page with OCR results:
 *    a. Get page dimensions in PDF points
 *    b. Scale factor = 72/300 = 0.24
 *    c. For each recognized word:
 *       - x_pt = word.bbox.x * scaleFactor
 *       - y_pt = pageHeight - (word.bbox.y + word.bbox.height) * scaleFactor (PDF y-axis is bottom-up)
 *       - fontSize = word.bbox.height * scaleFactor (fit within bbox height)
 *       - Draw text with rendering mode 3 (invisible) at (x_pt, y_pt)
 * 4. Pages without OCR results are left untouched
 * 5. Save PDF, calculate size increase percentage
 * 6. Generate output filename by inserting "_searchable" before ".pdf"
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6
 */
export async function generateSearchablePdf(
  pdfData: ArrayBuffer,
  ocrResults: OcrProcessingResult,
  originalFilename?: string,
): Promise<{ data: ArrayBuffer; sizeIncrease: number; outputFilename: string }> {
  const originalSize = pdfData.byteLength;

  // 1. Load original PDF
  const pdfDoc = await PDFDocument.load(pdfData);

  // 2. Embed Helvetica font (standard font, no subsetting needed)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 3. Build a map of page number → OCR results for quick lookup
  const ocrPageMap = new Map<number, OcrPageResult>();
  for (const pageResult of ocrResults.pages) {
    ocrPageMap.set(pageResult.pageNumber, pageResult);
  }

  // 4. Iterate pages and embed text layers where OCR results exist
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const pageNumber = i + 1;
    const ocrPage = ocrPageMap.get(pageNumber);

    // Skip pages without OCR results — preserve original content (Req 6.4)
    if (!ocrPage || ocrPage.words.length === 0) {
      continue;
    }

    const page = pages[i];
    embedTextLayer(page, ocrPage, font);
  }

  // 5. Save the modified PDF
  const savedBytes = await pdfDoc.save();
  const newSize = savedBytes.byteLength;

  // Calculate size increase percentage (Req 6.6)
  const sizeIncrease = ((newSize - originalSize) / originalSize) * 100;

  // 6. Generate output filename with "_searchable" suffix (Req 6.5)
  const outputFilename = generateOutputFilename(originalFilename);

  return {
    data: savedBytes.buffer as ArrayBuffer,
    sizeIncrease,
    outputFilename,
  };
}

/**
 * Embed an invisible text layer on a PDF page using OCR word positions.
 * Uses PDF text rendering mode 3 (invisible) so the visual appearance
 * of the scanned page remains unchanged while enabling text selection and search.
 *
 * Requirements: 6.2, 6.3
 */
function embedTextLayer(page: PDFPage, ocrPage: OcrPageResult, font: PDFFont): void {
  const { height: pageHeight } = page.getSize();

  for (const word of ocrPage.words) {
    if (!word.text.trim()) continue;

    // Scale pixel coordinates to PDF points (Req 6.3)
    const x_pt = word.bbox.x * DPI_SCALE_FACTOR;
    const y_pt = pageHeight - (word.bbox.y + word.bbox.height) * DPI_SCALE_FACTOR;

    // Font size fits within the bounding box height
    const fontSize = word.bbox.height * DPI_SCALE_FACTOR;

    // Skip words with negligible font size
    if (fontSize < 1) continue;

    // Encode the text for PDF output
    const encodedText = font.encodeText(word.text);

    // Draw invisible text using rendering mode 3 (invisible)
    // This makes text selectable/searchable but visually transparent
    page.pushOperators(
      pushGraphicsState(),
      beginText(),
      setTextRenderingMode(TextRenderingMode.Invisible),
      setFontAndSize(font.name, fontSize),
      moveText(x_pt, y_pt),
      showText(encodedText),
      endText(),
      popGraphicsState(),
    );
  }
}

/**
 * Generate output filename by inserting "_searchable" before the .pdf extension.
 * If no filename is provided, returns "document_searchable.pdf".
 *
 * Requirement: 6.5
 *
 * Examples:
 *   "report.pdf" → "report_searchable.pdf"
 *   "my.document.pdf" → "my.document_searchable.pdf"
 *   "file" → "file_searchable.pdf"
 */
export function generateOutputFilename(originalFilename?: string): string {
  if (!originalFilename) {
    return 'document_searchable.pdf';
  }

  const lowerName = originalFilename.toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    const baseName = originalFilename.slice(0, -4);
    return `${baseName}_searchable.pdf`;
  }

  return `${originalFilename}_searchable.pdf`;
}
