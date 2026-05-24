import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import { removeRedactedWordsFromOcrResults } from './ocr-redaction';
import type { OcrProcessingResult } from '@/core/ocr-engine/types';
import type { SelectedWord } from '../hooks/useOcrRedaction';

function createMockSelectedWord(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  pageNumber: number,
  wordIndex: number,
): SelectedWord {
  return {
    word: {
      text,
      bbox: { x, y, width, height },
      confidence: 95,
    },
    pageNumber,
    wordIndex,
  };
}

function createMockOcrResults(): OcrProcessingResult {
  return {
    pages: [
      {
        pageNumber: 1,
        text: 'Hello World Sensitive Data',
        lines: [
          {
            text: 'Hello World Sensitive Data',
            words: [
              { text: 'Hello', bbox: { x: 10, y: 10, width: 50, height: 20 }, confidence: 95 },
              { text: 'World', bbox: { x: 70, y: 10, width: 50, height: 20 }, confidence: 92 },
              {
                text: 'Sensitive',
                bbox: { x: 130, y: 10, width: 80, height: 20 },
                confidence: 88,
              },
              { text: 'Data', bbox: { x: 220, y: 10, width: 40, height: 20 }, confidence: 90 },
            ],
            bbox: { x: 10, y: 10, width: 250, height: 20 },
            confidence: 91,
          },
        ],
        words: [
          { text: 'Hello', bbox: { x: 10, y: 10, width: 50, height: 20 }, confidence: 95 },
          { text: 'World', bbox: { x: 70, y: 10, width: 50, height: 20 }, confidence: 92 },
          { text: 'Sensitive', bbox: { x: 130, y: 10, width: 80, height: 20 }, confidence: 88 },
          { text: 'Data', bbox: { x: 220, y: 10, width: 40, height: 20 }, confidence: 90 },
        ],
        confidence: 91,
        processingTimeMs: 1200,
      },
    ],
    failedPages: [],
    totalPagesProcessed: 1,
    totalPagesFailed: 0,
    averageConfidence: 91,
    totalProcessingTimeMs: 1200,
  };
}

describe('removeRedactedWordsFromOcrResults', () => {
  it('should remove redacted words from the page results', () => {
    const ocrResults = createMockOcrResults();
    const selectedWords: SelectedWord[] = [
      createMockSelectedWord('Sensitive', 130, 10, 80, 20, 1, 2),
      createMockSelectedWord('Data', 220, 10, 40, 20, 1, 3),
    ];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    expect(updated.pages[0].words).toHaveLength(2);
    expect(updated.pages[0].words[0].text).toBe('Hello');
    expect(updated.pages[0].words[1].text).toBe('World');
  });

  it('should update the text field to exclude redacted words', () => {
    const ocrResults = createMockOcrResults();
    const selectedWords: SelectedWord[] = [
      createMockSelectedWord('Sensitive', 130, 10, 80, 20, 1, 2),
    ];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    expect(updated.pages[0].text).not.toContain('Sensitive');
    expect(updated.pages[0].text).toContain('Hello');
    expect(updated.pages[0].text).toContain('World');
    expect(updated.pages[0].text).toContain('Data');
  });

  it('should not modify pages without redactions', () => {
    const ocrResults: OcrProcessingResult = {
      ...createMockOcrResults(),
      pages: [
        ...createMockOcrResults().pages,
        {
          pageNumber: 2,
          text: 'Page two content',
          lines: [
            {
              text: 'Page two content',
              words: [
                { text: 'Page', bbox: { x: 10, y: 10, width: 40, height: 20 }, confidence: 90 },
                { text: 'two', bbox: { x: 60, y: 10, width: 30, height: 20 }, confidence: 90 },
                {
                  text: 'content',
                  bbox: { x: 100, y: 10, width: 60, height: 20 },
                  confidence: 90,
                },
              ],
              bbox: { x: 10, y: 10, width: 150, height: 20 },
              confidence: 90,
            },
          ],
          words: [
            { text: 'Page', bbox: { x: 10, y: 10, width: 40, height: 20 }, confidence: 90 },
            { text: 'two', bbox: { x: 60, y: 10, width: 30, height: 20 }, confidence: 90 },
            { text: 'content', bbox: { x: 100, y: 10, width: 60, height: 20 }, confidence: 90 },
          ],
          confidence: 90,
          processingTimeMs: 1000,
        },
      ],
    };

    // Only redact on page 1
    const selectedWords: SelectedWord[] = [createMockSelectedWord('Hello', 10, 10, 50, 20, 1, 0)];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    // Page 2 should be unchanged
    expect(updated.pages[1].words).toHaveLength(3);
    expect(updated.pages[1].text).toBe('Page two content');
  });

  it('should handle empty selection gracefully', () => {
    const ocrResults = createMockOcrResults();
    const selectedWords: SelectedWord[] = [];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    expect(updated.pages[0].words).toHaveLength(4);
  });

  it('should preserve other OcrProcessingResult fields', () => {
    const ocrResults = createMockOcrResults();
    const selectedWords: SelectedWord[] = [createMockSelectedWord('Hello', 10, 10, 50, 20, 1, 0)];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    expect(updated.totalPagesProcessed).toBe(1);
    expect(updated.totalPagesFailed).toBe(0);
    expect(updated.averageConfidence).toBe(91);
    expect(updated.failedPages).toEqual([]);
  });

  it('should remove all words when all are selected', () => {
    const ocrResults = createMockOcrResults();
    const selectedWords: SelectedWord[] = [
      createMockSelectedWord('Hello', 10, 10, 50, 20, 1, 0),
      createMockSelectedWord('World', 70, 10, 50, 20, 1, 1),
      createMockSelectedWord('Sensitive', 130, 10, 80, 20, 1, 2),
      createMockSelectedWord('Data', 220, 10, 40, 20, 1, 3),
    ];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    expect(updated.pages[0].words).toHaveLength(0);
    expect(updated.pages[0].lines).toHaveLength(0);
    expect(updated.pages[0].text).toBe('');
  });

  it('should handle redactions across multiple pages', () => {
    const ocrResults: OcrProcessingResult = {
      pages: [
        {
          pageNumber: 1,
          text: 'Page one text',
          lines: [
            {
              text: 'Page one text',
              words: [
                { text: 'Page', bbox: { x: 10, y: 10, width: 40, height: 20 }, confidence: 90 },
                { text: 'one', bbox: { x: 60, y: 10, width: 30, height: 20 }, confidence: 90 },
                { text: 'text', bbox: { x: 100, y: 10, width: 40, height: 20 }, confidence: 90 },
              ],
              bbox: { x: 10, y: 10, width: 130, height: 20 },
              confidence: 90,
            },
          ],
          words: [
            { text: 'Page', bbox: { x: 10, y: 10, width: 40, height: 20 }, confidence: 90 },
            { text: 'one', bbox: { x: 60, y: 10, width: 30, height: 20 }, confidence: 90 },
            { text: 'text', bbox: { x: 100, y: 10, width: 40, height: 20 }, confidence: 90 },
          ],
          confidence: 90,
          processingTimeMs: 1000,
        },
        {
          pageNumber: 2,
          text: 'Secret info here',
          lines: [
            {
              text: 'Secret info here',
              words: [
                { text: 'Secret', bbox: { x: 10, y: 10, width: 50, height: 20 }, confidence: 88 },
                { text: 'info', bbox: { x: 70, y: 10, width: 35, height: 20 }, confidence: 92 },
                { text: 'here', bbox: { x: 115, y: 10, width: 35, height: 20 }, confidence: 91 },
              ],
              bbox: { x: 10, y: 10, width: 140, height: 20 },
              confidence: 90,
            },
          ],
          words: [
            { text: 'Secret', bbox: { x: 10, y: 10, width: 50, height: 20 }, confidence: 88 },
            { text: 'info', bbox: { x: 70, y: 10, width: 35, height: 20 }, confidence: 92 },
            { text: 'here', bbox: { x: 115, y: 10, width: 35, height: 20 }, confidence: 91 },
          ],
          confidence: 90,
          processingTimeMs: 1100,
        },
      ],
      failedPages: [],
      totalPagesProcessed: 2,
      totalPagesFailed: 0,
      averageConfidence: 90,
      totalProcessingTimeMs: 2100,
    };

    const selectedWords: SelectedWord[] = [
      createMockSelectedWord('one', 60, 10, 30, 20, 1, 1),
      createMockSelectedWord('Secret', 10, 10, 50, 20, 2, 0),
      createMockSelectedWord('info', 70, 10, 35, 20, 2, 1),
    ];

    const updated = removeRedactedWordsFromOcrResults(ocrResults, selectedWords);

    // Page 1: "one" removed, "Page" and "text" remain
    expect(updated.pages[0].words).toHaveLength(2);
    expect(updated.pages[0].words[0].text).toBe('Page');
    expect(updated.pages[0].words[1].text).toBe('text');

    // Page 2: "Secret" and "info" removed, "here" remains
    expect(updated.pages[1].words).toHaveLength(1);
    expect(updated.pages[1].words[0].text).toBe('here');
  });
});

describe('saveAllRedactedPagesToPdf', () => {
  it('should return original PDF data when no pages are redacted', async () => {
    const { saveAllRedactedPagesToPdf } = await import('./ocr-redaction');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([612, 792]);
    const pdfBytes = await pdfDoc.save();
    const pdfData = pdfBytes.buffer as ArrayBuffer;

    const redactedPages = new Map<number, HTMLCanvasElement>();
    const result = await saveAllRedactedPagesToPdf(pdfData, redactedPages);

    expect(result).toBe(pdfData);
  });
});
