/**
 * Unit tests for the OCR worker's recognize handler logic.
 *
 * Since the worker runs in a Web Worker context, we test the mapping logic
 * by extracting and testing the core functions directly.
 */
import { describe, it, expect } from 'vitest';
import type { OcrBoundingBox, OcrWord, OcrLine, OcrPageResult } from './types';

/**
 * Convert Tesseract.js bbox (x0, y0, x1, y1) to OcrBoundingBox (x, y, width, height).
 * Extracted from ocr-worker.ts for testability.
 */
function convertBbox(bbox: { x0: number; y0: number; x1: number; y1: number }): OcrBoundingBox {
  return {
    x: bbox.x0,
    y: bbox.y0,
    width: bbox.x1 - bbox.x0,
    height: bbox.y1 - bbox.y0,
  };
}

/**
 * Map Tesseract.js recognition output to OcrPageResult format.
 * Extracted from ocr-worker.ts for testability.
 */
function mapTesseractOutput(
  pageNumber: number,
  data: {
    blocks:
      | {
          paragraphs: {
            lines: {
              text: string;
              words: {
                text: string;
                bbox: { x0: number; y0: number; x1: number; y1: number };
                confidence: number;
              }[];
              bbox: { x0: number; y0: number; x1: number; y1: number };
              confidence: number;
            }[];
          }[];
        }[]
      | null;
  },
  processingTimeMs: number,
): OcrPageResult {
  const allWords: OcrWord[] = [];
  const allLines: OcrLine[] = [];
  const paragraphTexts: string[] = [];

  if (data.blocks) {
    for (const block of data.blocks) {
      for (const paragraph of block.paragraphs) {
        const paragraphLineTexts: string[] = [];

        for (const line of paragraph.lines) {
          const lineWords: OcrWord[] = [];

          for (const word of line.words) {
            const ocrWord: OcrWord = {
              text: word.text,
              bbox: convertBbox(word.bbox),
              confidence: word.confidence,
            };
            lineWords.push(ocrWord);
            allWords.push(ocrWord);
          }

          const ocrLine: OcrLine = {
            text: line.text,
            words: lineWords,
            bbox: convertBbox(line.bbox),
            confidence: line.confidence,
          };
          allLines.push(ocrLine);
          paragraphLineTexts.push(line.text);
        }

        paragraphTexts.push(paragraphLineTexts.join('\n'));
      }
    }
  }

  const fullText = paragraphTexts.join('\n\n');

  const confidence =
    allWords.length > 0 ? allWords.reduce((sum, w) => sum + w.confidence, 0) / allWords.length : 0;

  return {
    pageNumber,
    text: fullText,
    lines: allLines,
    words: allWords,
    confidence,
    processingTimeMs,
  };
}

describe('convertBbox', () => {
  it('converts Tesseract x0,y0,x1,y1 to x,y,width,height format', () => {
    const result = convertBbox({ x0: 10, y0: 20, x1: 110, y1: 50 });
    expect(result).toEqual({ x: 10, y: 20, width: 100, height: 30 });
  });

  it('handles zero-size bounding box', () => {
    const result = convertBbox({ x0: 0, y0: 0, x1: 0, y1: 0 });
    expect(result).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('handles large coordinates (300 DPI full page)', () => {
    // US Letter at 300 DPI: 2550 x 3300 pixels
    const result = convertBbox({ x0: 100, y0: 200, x1: 2450, y1: 3100 });
    expect(result).toEqual({ x: 100, y: 200, width: 2350, height: 2900 });
  });
});

describe('mapTesseractOutput', () => {
  it('maps a single word correctly', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'Hello',
                  words: [
                    { text: 'Hello', bbox: { x0: 50, y0: 100, x1: 200, y1: 130 }, confidence: 95 },
                  ],
                  bbox: { x0: 50, y0: 100, x1: 200, y1: 130 },
                  confidence: 95,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(1, data, 500);

    expect(result.pageNumber).toBe(1);
    expect(result.text).toBe('Hello');
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toEqual({
      text: 'Hello',
      bbox: { x: 50, y: 100, width: 150, height: 30 },
      confidence: 95,
    });
    expect(result.lines).toHaveLength(1);
    expect(result.confidence).toBe(95);
    expect(result.processingTimeMs).toBe(500);
  });

  it('maps multiple words in a line', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'Hello World',
                  words: [
                    { text: 'Hello', bbox: { x0: 50, y0: 100, x1: 150, y1: 130 }, confidence: 90 },
                    { text: 'World', bbox: { x0: 160, y0: 100, x1: 260, y1: 130 }, confidence: 80 },
                  ],
                  bbox: { x0: 50, y0: 100, x1: 260, y1: 130 },
                  confidence: 85,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(1, data, 300);

    expect(result.words).toHaveLength(2);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].text).toBe('Hello World');
    expect(result.lines[0].words).toHaveLength(2);
    // Average confidence: (90 + 80) / 2 = 85
    expect(result.confidence).toBe(85);
  });

  it('separates lines within a paragraph with newlines', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'Line one',
                  words: [
                    { text: 'Line', bbox: { x0: 50, y0: 100, x1: 120, y1: 130 }, confidence: 92 },
                    { text: 'one', bbox: { x0: 130, y0: 100, x1: 180, y1: 130 }, confidence: 88 },
                  ],
                  bbox: { x0: 50, y0: 100, x1: 180, y1: 130 },
                  confidence: 90,
                },
                {
                  text: 'Line two',
                  words: [
                    { text: 'Line', bbox: { x0: 50, y0: 140, x1: 120, y1: 170 }, confidence: 91 },
                    { text: 'two', bbox: { x0: 130, y0: 140, x1: 180, y1: 170 }, confidence: 89 },
                  ],
                  bbox: { x0: 50, y0: 140, x1: 180, y1: 170 },
                  confidence: 90,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(2, data, 400);

    expect(result.text).toBe('Line one\nLine two');
    expect(result.lines).toHaveLength(2);
    expect(result.words).toHaveLength(4);
  });

  it('separates paragraphs with blank lines', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'First paragraph',
                  words: [
                    { text: 'First', bbox: { x0: 50, y0: 100, x1: 120, y1: 130 }, confidence: 95 },
                    {
                      text: 'paragraph',
                      bbox: { x0: 130, y0: 100, x1: 250, y1: 130 },
                      confidence: 93,
                    },
                  ],
                  bbox: { x0: 50, y0: 100, x1: 250, y1: 130 },
                  confidence: 94,
                },
              ],
            },
            {
              lines: [
                {
                  text: 'Second paragraph',
                  words: [
                    { text: 'Second', bbox: { x0: 50, y0: 200, x1: 140, y1: 230 }, confidence: 91 },
                    {
                      text: 'paragraph',
                      bbox: { x0: 150, y0: 200, x1: 270, y1: 230 },
                      confidence: 89,
                    },
                  ],
                  bbox: { x0: 50, y0: 200, x1: 270, y1: 230 },
                  confidence: 90,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(1, data, 600);

    expect(result.text).toBe('First paragraph\n\nSecond paragraph');
  });

  it('handles multiple blocks with paragraphs', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'Block one',
                  words: [
                    { text: 'Block', bbox: { x0: 50, y0: 100, x1: 120, y1: 130 }, confidence: 90 },
                    { text: 'one', bbox: { x0: 130, y0: 100, x1: 180, y1: 130 }, confidence: 88 },
                  ],
                  bbox: { x0: 50, y0: 100, x1: 180, y1: 130 },
                  confidence: 89,
                },
              ],
            },
          ],
        },
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'Block two',
                  words: [
                    { text: 'Block', bbox: { x0: 50, y0: 300, x1: 120, y1: 330 }, confidence: 85 },
                    { text: 'two', bbox: { x0: 130, y0: 300, x1: 180, y1: 330 }, confidence: 82 },
                  ],
                  bbox: { x0: 50, y0: 300, x1: 180, y1: 330 },
                  confidence: 83,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(1, data, 700);

    // Each paragraph from each block is separated by blank lines
    expect(result.text).toBe('Block one\n\nBlock two');
    expect(result.words).toHaveLength(4);
    expect(result.lines).toHaveLength(2);
  });

  it('handles null blocks gracefully', () => {
    const data = { blocks: null };

    const result = mapTesseractOutput(1, data, 100);

    expect(result.text).toBe('');
    expect(result.words).toHaveLength(0);
    expect(result.lines).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('handles empty blocks array', () => {
    const data = { blocks: [] };

    const result = mapTesseractOutput(1, data, 50);

    expect(result.text).toBe('');
    expect(result.words).toHaveLength(0);
    expect(result.lines).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('calculates average confidence correctly across all words', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'a b c',
                  words: [
                    { text: 'a', bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, confidence: 60 },
                    { text: 'b', bbox: { x0: 20, y0: 0, x1: 30, y1: 10 }, confidence: 80 },
                    { text: 'c', bbox: { x0: 40, y0: 0, x1: 50, y1: 10 }, confidence: 100 },
                  ],
                  bbox: { x0: 0, y0: 0, x1: 50, y1: 10 },
                  confidence: 80,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(1, data, 200);

    // Average: (60 + 80 + 100) / 3 = 80
    expect(result.confidence).toBe(80);
  });

  it('preserves processingTimeMs in the result', () => {
    const data = {
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: 'test',
                  words: [{ text: 'test', bbox: { x0: 0, y0: 0, x1: 50, y1: 20 }, confidence: 99 }],
                  bbox: { x0: 0, y0: 0, x1: 50, y1: 20 },
                  confidence: 99,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = mapTesseractOutput(3, data, 1234);

    expect(result.processingTimeMs).toBe(1234);
    expect(result.pageNumber).toBe(3);
  });
});
