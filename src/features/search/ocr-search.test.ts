import { describe, it, expect } from 'vitest';

import {
  searchOcrText,
  searchOcrPage,
  searchNativeText,
  searchDocument,
  hasUnprocessedScannedPages,
} from './ocr-search';
import type { OcrPageResult, OcrProcessingResult } from '../../core/ocr-engine/types';

function makeOcrWord(text: string, x = 0, y = 0, width = 50, height = 20) {
  return {
    text,
    bbox: { x, y, width, height },
    confidence: 95,
  };
}

function makeOcrPage(pageNumber: number, words: ReturnType<typeof makeOcrWord>[]): OcrPageResult {
  return {
    pageNumber,
    text: words.map((w) => w.text).join(' '),
    lines: [],
    words,
    confidence: 95,
    processingTimeMs: 1000,
  };
}

function makeOcrResults(pages: OcrPageResult[]): OcrProcessingResult {
  return {
    pages,
    failedPages: [],
    totalPagesProcessed: pages.length,
    totalPagesFailed: 0,
    averageConfidence: 95,
    totalProcessingTimeMs: pages.length * 1000,
  };
}

describe('searchOcrPage', () => {
  it('finds words matching the query (case-insensitive)', () => {
    const page = makeOcrPage(1, [
      makeOcrWord('Hello', 0, 0),
      makeOcrWord('World', 60, 0),
      makeOcrWord('hello', 0, 30),
    ]);

    const matches = searchOcrPage(page, 'hello');
    expect(matches).toHaveLength(2);
    expect(matches[0].word.text).toBe('Hello');
    expect(matches[1].word.text).toBe('hello');
  });

  it('returns empty array when no words match', () => {
    const page = makeOcrPage(1, [makeOcrWord('Hello'), makeOcrWord('World')]);
    const matches = searchOcrPage(page, 'xyz');
    expect(matches).toHaveLength(0);
  });

  it('matches partial words (substring match)', () => {
    const page = makeOcrPage(1, [makeOcrWord('JavaScript'), makeOcrWord('TypeScript')]);
    const matches = searchOcrPage(page, 'script');
    expect(matches).toHaveLength(2);
  });

  it('includes correct page number and word index', () => {
    const page = makeOcrPage(3, [makeOcrWord('foo'), makeOcrWord('bar'), makeOcrWord('foo')]);
    const matches = searchOcrPage(page, 'foo');
    expect(matches).toHaveLength(2);
    expect(matches[0].pageNumber).toBe(3);
    expect(matches[0].wordIndex).toBe(0);
    expect(matches[1].wordIndex).toBe(2);
  });
});

describe('searchOcrText', () => {
  it('returns empty array when ocrResults is null', () => {
    const matches = searchOcrText(null, 'hello');
    expect(matches).toHaveLength(0);
  });

  it('returns empty array when query is empty', () => {
    const results = makeOcrResults([makeOcrPage(1, [makeOcrWord('Hello')])]);
    const matches = searchOcrText(results, '');
    expect(matches).toHaveLength(0);
  });

  it('returns empty array when query is whitespace only', () => {
    const results = makeOcrResults([makeOcrPage(1, [makeOcrWord('Hello')])]);
    const matches = searchOcrText(results, '   ');
    expect(matches).toHaveLength(0);
  });

  it('searches across multiple pages', () => {
    const results = makeOcrResults([
      makeOcrPage(1, [makeOcrWord('Hello'), makeOcrWord('World')]),
      makeOcrPage(2, [makeOcrWord('Hello'), makeOcrWord('Again')]),
    ]);

    const matches = searchOcrText(results, 'hello');
    expect(matches).toHaveLength(2);
    expect(matches[0].pageNumber).toBe(1);
    expect(matches[1].pageNumber).toBe(2);
  });
});

describe('searchNativeText', () => {
  it('returns empty array when query is empty', () => {
    const matches = searchNativeText(['Hello world'], '');
    expect(matches).toHaveLength(0);
  });

  it('returns empty array when nativeTexts is empty', () => {
    const matches = searchNativeText([], 'hello');
    expect(matches).toHaveLength(0);
  });

  it('finds all occurrences in a page (case-insensitive)', () => {
    const matches = searchNativeText(['Hello hello HELLO'], 'hello');
    expect(matches).toHaveLength(3);
    expect(matches[0].startOffset).toBe(0);
    expect(matches[1].startOffset).toBe(6);
    expect(matches[2].startOffset).toBe(12);
  });

  it('searches across multiple pages with correct page numbers', () => {
    const matches = searchNativeText(['Page one text', 'Page two text'], 'text');
    expect(matches).toHaveLength(2);
    expect(matches[0].pageNumber).toBe(1);
    expect(matches[1].pageNumber).toBe(2);
  });

  it('returns correct start and end offsets', () => {
    const matches = searchNativeText(['The quick brown fox'], 'quick');
    expect(matches).toHaveLength(1);
    expect(matches[0].startOffset).toBe(4);
    expect(matches[0].endOffset).toBe(9);
    expect(matches[0].text).toBe('quick');
  });

  it('skips empty page texts', () => {
    const matches = searchNativeText(['', 'hello world', ''], 'hello');
    expect(matches).toHaveLength(1);
    expect(matches[0].pageNumber).toBe(2);
  });
});

describe('searchDocument', () => {
  it('returns empty results for empty query', () => {
    const results = searchDocument(['Hello'], null, '');
    expect(results.totalMatches).toBe(0);
    expect(results.nativeMatches).toHaveLength(0);
    expect(results.ocrMatches).toHaveLength(0);
  });

  it('searches native text when no OCR results available', () => {
    const results = searchDocument(['Hello world', 'Another page'], null, 'hello');
    expect(results.nativeMatches).toHaveLength(1);
    expect(results.ocrMatches).toHaveLength(0);
    expect(results.totalMatches).toBe(1);
  });

  it('searches both native and OCR text when OCR results are available', () => {
    const ocrResults = makeOcrResults([makeOcrPage(3, [makeOcrWord('Hello'), makeOcrWord('OCR')])]);

    const results = searchDocument(['Hello native', 'Page two'], ocrResults, 'hello');
    expect(results.nativeMatches).toHaveLength(1);
    expect(results.ocrMatches).toHaveLength(1);
    expect(results.totalMatches).toBe(2);
  });

  it('preserves the query in results', () => {
    const results = searchDocument(['test'], null, 'test');
    expect(results.query).toBe('test');
  });
});

describe('hasUnprocessedScannedPages', () => {
  it('returns false when there are no scanned pages', () => {
    expect(hasUnprocessedScannedPages([], null)).toBe(false);
  });

  it('returns true when there are scanned pages but no OCR results', () => {
    expect(hasUnprocessedScannedPages([1, 2, 3], null)).toBe(true);
  });

  it('returns false when all scanned pages have been processed', () => {
    const ocrResults = makeOcrResults([
      makeOcrPage(1, [makeOcrWord('text')]),
      makeOcrPage(2, [makeOcrWord('text')]),
    ]);
    expect(hasUnprocessedScannedPages([1, 2], ocrResults)).toBe(false);
  });

  it('returns true when some scanned pages have not been processed', () => {
    const ocrResults = makeOcrResults([makeOcrPage(1, [makeOcrWord('text')])]);
    expect(hasUnprocessedScannedPages([1, 2, 3], ocrResults)).toBe(true);
  });
});
