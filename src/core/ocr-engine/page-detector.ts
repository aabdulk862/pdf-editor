import { PdfjsRenderEngine } from '../render-engine/renderer';

/**
 * Minimum number of non-whitespace characters for a page to be classified as text-bearing.
 * Pages with fewer non-whitespace characters are classified as scanned.
 */
const SCANNED_PAGE_TEXT_THRESHOLD = 10;

export interface PageDetectionResult {
  /** 1-indexed page numbers classified as scanned (image-only) */
  scannedPages: number[];
  /** 1-indexed page numbers classified as text-bearing */
  textPages: number[];
  /** Total number of pages in the document */
  totalPages: number;
}

/**
 * Analyze a PDF document to classify pages as scanned or text-bearing.
 * Uses PdfjsRenderEngine.extractText() for each page.
 *
 * Algorithm:
 * 1. Load document via the render engine
 * 2. For each page, extract text using the render engine's extractText method
 * 3. Count non-whitespace characters in extracted text
 * 4. If count < 10 → classify as scanned
 * 5. If extractText throws → classify as scanned (Req 2.6)
 * 6. Return arrays of scanned page numbers and text page numbers (1-indexed)
 *
 * Performance: Must complete 50 pages within 5 seconds (Req 2.4)
 * pdfjs text extraction is fast (~50-100ms/page) so this is achievable.
 *
 * @param pdfData - The raw PDF file data as an ArrayBuffer
 * @returns Classification of pages as scanned or text-bearing
 */
export async function detectScannedPages(pdfData: ArrayBuffer): Promise<PageDetectionResult> {
  const renderEngine = new PdfjsRenderEngine();
  const doc = await renderEngine.loadDocument(pdfData);
  const totalPages = doc.pageCount;

  const scannedPages: number[] = [];
  const textPages: number[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    let isScanned: boolean;

    try {
      const text = await renderEngine.extractText(doc, pageNum);
      const nonWhitespaceCount = text.replace(/\s/g, '').length;
      isScanned = nonWhitespaceCount < SCANNED_PAGE_TEXT_THRESHOLD;
    } catch {
      // Render failures are treated as scanned pages (Req 2.6)
      isScanned = true;
    }

    if (isScanned) {
      scannedPages.push(pageNum);
    } else {
      textPages.push(pageNum);
    }
  }

  return { scannedPages, textPages, totalPages };
}
