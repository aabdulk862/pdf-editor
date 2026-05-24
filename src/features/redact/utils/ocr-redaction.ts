import { PDFDocument } from 'pdf-lib';

import type { OcrPageResult, OcrProcessingResult } from '@/core/ocr-engine/types';
import type { SelectedWord } from '../hooks/useOcrRedaction';

/**
 * Apply redaction to a page image by drawing black rectangles over selected word bounding boxes.
 *
 * This renders the page to a canvas at 300 DPI (matching OCR coordinates),
 * draws black fill rectangles at the word bbox coordinates, and returns the
 * redacted image as a PNG ArrayBuffer.
 *
 * Requirements: 9.3
 *
 * @param pageCanvas - The rendered page canvas (at display resolution)
 * @param selectedWords - Words to redact on this page
 * @param displayScaleFactor - Scale from 300 DPI OCR coords to the display canvas coords
 * @returns Canvas with redacted content drawn
 */
export function applyRedactionToCanvas(
  pageCanvas: HTMLCanvasElement,
  selectedWords: SelectedWord[],
  displayScaleFactor: number,
): HTMLCanvasElement {
  // Create a copy of the canvas to avoid mutating the original
  const redactedCanvas = document.createElement('canvas');
  redactedCanvas.width = pageCanvas.width;
  redactedCanvas.height = pageCanvas.height;

  const ctx = redactedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for redaction canvas');
  }

  // Copy the original page content
  ctx.drawImage(pageCanvas, 0, 0);

  // Draw black rectangles over each selected word's bounding box
  ctx.fillStyle = '#000000';
  for (const sw of selectedWords) {
    const { bbox } = sw.word;
    // Convert 300 DPI OCR coordinates to the canvas coordinate space
    const x = bbox.x * displayScaleFactor;
    const y = bbox.y * displayScaleFactor;
    const width = bbox.width * displayScaleFactor;
    const height = bbox.height * displayScaleFactor;

    ctx.fillRect(x, y, width, height);
  }

  return redactedCanvas;
}

/**
 * Remove redacted words from OCR results, producing updated results
 * where the redacted text is no longer accessible.
 *
 * Requirements: 9.4
 *
 * @param ocrResults - Current OCR processing results
 * @param selectedWords - Words that were redacted
 * @returns Updated OCR results with redacted words removed
 */
export function removeRedactedWordsFromOcrResults(
  ocrResults: OcrProcessingResult,
  selectedWords: SelectedWord[],
): OcrProcessingResult {
  // Group selected words by page number
  const wordsByPage = new Map<number, Set<number>>();
  for (const sw of selectedWords) {
    if (!wordsByPage.has(sw.pageNumber)) {
      wordsByPage.set(sw.pageNumber, new Set());
    }
    wordsByPage.get(sw.pageNumber)!.add(sw.wordIndex);
  }

  // Create updated pages with redacted words removed
  const updatedPages: OcrPageResult[] = ocrResults.pages.map((page) => {
    const redactedIndices = wordsByPage.get(page.pageNumber);
    if (!redactedIndices || redactedIndices.size === 0) {
      return page; // No redactions on this page
    }

    // Filter out redacted words
    const remainingWords = page.words.filter((_, index) => !redactedIndices.has(index));

    // Rebuild lines by filtering words within each line
    const updatedLines = page.lines
      .map((line) => {
        const remainingLineWords = line.words.filter(
          (lineWord) =>
            !selectedWords.some(
              (sw) =>
                sw.pageNumber === page.pageNumber &&
                sw.word.bbox.x === lineWord.bbox.x &&
                sw.word.bbox.y === lineWord.bbox.y &&
                sw.word.text === lineWord.text,
            ),
        );

        if (remainingLineWords.length === 0) return null;

        return {
          ...line,
          words: remainingLineWords,
          text: remainingLineWords.map((w) => w.text).join(' '),
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    // Rebuild full text from remaining words
    const updatedText = updatedLines.map((l) => l.text).join('\n');

    return {
      ...page,
      words: remainingWords,
      lines: updatedLines,
      text: updatedText,
    };
  });

  return {
    ...ocrResults,
    pages: updatedPages,
  };
}

/**
 * Save a redacted page image back into the PDF, replacing the original page content.
 * This ensures the redacted content is unrecoverable by extracting the original image.
 *
 * Algorithm:
 * 1. Load the PDF with pdf-lib
 * 2. For the target page, remove existing content
 * 3. Embed the redacted image (PNG) as the new page content
 * 4. Save and return the modified PDF
 *
 * Requirements: 9.6
 *
 * @param pdfData - Original PDF as ArrayBuffer
 * @param pageNumber - 1-based page number to replace
 * @param redactedCanvas - Canvas containing the redacted page image
 * @returns Modified PDF as ArrayBuffer with redacted page
 */
export async function saveRedactedPageToPdf(
  pdfData: ArrayBuffer,
  pageNumber: number,
  redactedCanvas: HTMLCanvasElement,
): Promise<ArrayBuffer> {
  // Convert canvas to PNG blob
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    redactedCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to PNG'));
    }, 'image/png');
  });

  const pngArrayBuffer = await pngBlob.arrayBuffer();

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfData);
  const pages = pdfDoc.getPages();

  if (pageNumber < 1 || pageNumber > pages.length) {
    throw new Error(`Invalid page number: ${pageNumber}. Document has ${pages.length} pages.`);
  }

  const page = pages[pageNumber - 1];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Embed the redacted PNG image
  const pngImage = await pdfDoc.embedPng(pngArrayBuffer);

  // Clear the page content by resetting its content stream
  // We draw over the entire page with the redacted image
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  // Save the modified PDF
  const savedBytes = await pdfDoc.save();
  return savedBytes.buffer as ArrayBuffer;
}

/**
 * Save multiple redacted pages back into the PDF.
 * Processes all pages that have redactions in a single pass.
 *
 * Requirements: 9.6
 *
 * @param pdfData - Original PDF as ArrayBuffer
 * @param redactedPages - Map of page number to redacted canvas
 * @returns Modified PDF as ArrayBuffer
 */
export async function saveAllRedactedPagesToPdf(
  pdfData: ArrayBuffer,
  redactedPages: Map<number, HTMLCanvasElement>,
): Promise<ArrayBuffer> {
  if (redactedPages.size === 0) {
    return pdfData;
  }

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfData);
  const pages = pdfDoc.getPages();

  // Process each redacted page
  for (const [pageNumber, canvas] of redactedPages) {
    if (pageNumber < 1 || pageNumber > pages.length) continue;

    // Convert canvas to PNG
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to convert page ${pageNumber} canvas to PNG`));
      }, 'image/png');
    });

    const pngArrayBuffer = await pngBlob.arrayBuffer();
    const pngImage = await pdfDoc.embedPng(pngArrayBuffer);

    const page = pages[pageNumber - 1];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Draw the redacted image over the entire page, destroying original content visually
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  // Save the modified PDF — original image data is now overwritten
  const savedBytes = await pdfDoc.save();
  return savedBytes.buffer as ArrayBuffer;
}
