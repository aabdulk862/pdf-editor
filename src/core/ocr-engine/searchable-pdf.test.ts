import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateSearchablePdf, generateOutputFilename } from './searchable-pdf';
import type { OcrProcessingResult, OcrPageResult } from './types';

function createMockOcrResults(pageCount: number, wordsPerPage: number): OcrProcessingResult {
  const pages: OcrPageResult[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const words = Array.from({ length: wordsPerPage }, (_, j) => ({
      text: `word${j}`,
      bbox: { x: 100 + j * 200, y: 100, width: 150, height: 40 },
      confidence: 95,
    }));
    pages.push({
      pageNumber: i,
      text: words.map((w) => w.text).join(' '),
      lines: [],
      words,
      confidence: 95,
      processingTimeMs: 1000,
    });
  }
  return {
    pages,
    failedPages: [],
    totalPagesProcessed: pageCount,
    totalPagesFailed: 0,
    averageConfidence: 95,
    totalProcessingTimeMs: pageCount * 1000,
  };
}

async function createTestPdf(pageCount: number): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    pdfDoc.addPage([612, 792]); // US Letter size
  }
  const bytes = await pdfDoc.save();
  return bytes.buffer as ArrayBuffer;
}

describe('generateSearchablePdf', () => {
  it('should load PDF and return valid PDF data', async () => {
    const pdfData = await createTestPdf(2);
    const ocrResults = createMockOcrResults(2, 3);

    const result = await generateSearchablePdf(pdfData, ocrResults, 'test.pdf');

    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.data.byteLength).toBeGreaterThan(0);

    // Verify the output is a valid PDF
    const outputDoc = await PDFDocument.load(result.data);
    expect(outputDoc.getPageCount()).toBe(2);
  });

  it('should calculate size increase percentage correctly', async () => {
    const pdfData = await createTestPdf(1);
    const ocrResults = createMockOcrResults(1, 5);

    const result = await generateSearchablePdf(pdfData, ocrResults, 'test.pdf');

    // Size should increase since we're adding text content
    expect(result.sizeIncrease).toBeGreaterThan(0);
    // Verify the formula: (newSize - originalSize) / originalSize * 100
    const expectedIncrease =
      ((result.data.byteLength - pdfData.byteLength) / pdfData.byteLength) * 100;
    expect(result.sizeIncrease).toBeCloseTo(expectedIncrease, 5);
  });

  it('should preserve pages without OCR results', async () => {
    const pdfData = await createTestPdf(3);
    // Only provide OCR results for page 2
    const ocrResults: OcrProcessingResult = {
      pages: [
        {
          pageNumber: 2,
          text: 'hello world',
          lines: [],
          words: [
            { text: 'hello', bbox: { x: 100, y: 100, width: 200, height: 40 }, confidence: 95 },
            { text: 'world', bbox: { x: 350, y: 100, width: 200, height: 40 }, confidence: 90 },
          ],
          confidence: 92.5,
          processingTimeMs: 1000,
        },
      ],
      failedPages: [],
      totalPagesProcessed: 1,
      totalPagesFailed: 0,
      averageConfidence: 92.5,
      totalProcessingTimeMs: 1000,
    };

    const result = await generateSearchablePdf(pdfData, ocrResults, 'multi-page.pdf');

    // All 3 pages should still be present
    const outputDoc = await PDFDocument.load(result.data);
    expect(outputDoc.getPageCount()).toBe(3);
  });

  it('should skip pages with empty words array', async () => {
    const pdfData = await createTestPdf(2);
    const ocrResults: OcrProcessingResult = {
      pages: [
        {
          pageNumber: 1,
          text: '',
          lines: [],
          words: [],
          confidence: 0,
          processingTimeMs: 500,
        },
      ],
      failedPages: [],
      totalPagesProcessed: 1,
      totalPagesFailed: 0,
      averageConfidence: 0,
      totalProcessingTimeMs: 500,
    };

    // Should not throw even with empty words
    const result = await generateSearchablePdf(pdfData, ocrResults, 'empty.pdf');
    expect(result.data.byteLength).toBeGreaterThan(0);
  });

  it('should generate correct output filename', async () => {
    const pdfData = await createTestPdf(1);
    const ocrResults = createMockOcrResults(1, 1);

    const result = await generateSearchablePdf(pdfData, ocrResults, 'report.pdf');
    expect(result.outputFilename).toBe('report_searchable.pdf');
  });

  it('should handle words with whitespace-only text', async () => {
    const pdfData = await createTestPdf(1);
    const ocrResults: OcrProcessingResult = {
      pages: [
        {
          pageNumber: 1,
          text: '  ',
          lines: [],
          words: [
            { text: '   ', bbox: { x: 100, y: 100, width: 50, height: 30 }, confidence: 10 },
            { text: 'valid', bbox: { x: 200, y: 100, width: 100, height: 30 }, confidence: 95 },
          ],
          confidence: 52.5,
          processingTimeMs: 800,
        },
      ],
      failedPages: [],
      totalPagesProcessed: 1,
      totalPagesFailed: 0,
      averageConfidence: 52.5,
      totalProcessingTimeMs: 800,
    };

    // Should not throw — whitespace words are skipped
    const result = await generateSearchablePdf(pdfData, ocrResults, 'whitespace.pdf');
    expect(result.data.byteLength).toBeGreaterThan(0);
  });
});

describe('generateOutputFilename', () => {
  it('should insert _searchable before .pdf extension', () => {
    expect(generateOutputFilename('report.pdf')).toBe('report_searchable.pdf');
  });

  it('should handle filenames with multiple dots', () => {
    expect(generateOutputFilename('my.document.pdf')).toBe('my.document_searchable.pdf');
  });

  it('should handle case-insensitive .PDF extension', () => {
    expect(generateOutputFilename('REPORT.PDF')).toBe('REPORT_searchable.pdf');
  });

  it('should append _searchable.pdf if no .pdf extension', () => {
    expect(generateOutputFilename('file')).toBe('file_searchable.pdf');
  });

  it('should return default filename when no original provided', () => {
    expect(generateOutputFilename()).toBe('document_searchable.pdf');
    expect(generateOutputFilename(undefined)).toBe('document_searchable.pdf');
  });

  it('should handle empty string', () => {
    expect(generateOutputFilename('')).toBe('document_searchable.pdf');
  });
});
