import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectScannedPages } from './page-detector';

// Mock the render engine module
vi.mock('../render-engine/renderer', () => {
  return {
    PdfjsRenderEngine: vi.fn(),
  };
});

import { PdfjsRenderEngine } from '../render-engine/renderer';

describe('detectScannedPages', () => {
  let mockExtractText: ReturnType<typeof vi.fn>;
  let mockLoadDocument: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractText = vi.fn();
    mockLoadDocument = vi.fn();

    (PdfjsRenderEngine as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      loadDocument: mockLoadDocument,
      extractText: mockExtractText,
    }));
  });

  it('classifies pages with fewer than 10 non-whitespace chars as scanned', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 3 });
    mockExtractText
      .mockResolvedValueOnce('Hello World! This is a text page with plenty of content.')
      .mockResolvedValueOnce('   \n\n  ')
      .mockResolvedValueOnce('short');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.totalPages).toBe(3);
    expect(result.textPages).toEqual([1]);
    expect(result.scannedPages).toEqual([2, 3]);
  });

  it('classifies pages with exactly 10 non-whitespace chars as text pages', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 1 });
    // "1234567890" has exactly 10 non-whitespace chars
    mockExtractText.mockResolvedValueOnce('1234567890');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.textPages).toEqual([1]);
    expect(result.scannedPages).toEqual([]);
  });

  it('classifies pages with 9 non-whitespace chars as scanned', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 1 });
    // "123456789" has 9 non-whitespace chars
    mockExtractText.mockResolvedValueOnce('123456789');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.textPages).toEqual([]);
    expect(result.scannedPages).toEqual([1]);
  });

  it('treats render failures as scanned pages (Req 2.6)', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 3 });
    mockExtractText
      .mockResolvedValueOnce('This page has text content that is long enough.')
      .mockRejectedValueOnce(new Error('Rendering failed'))
      .mockResolvedValueOnce('Another page with enough text content here.');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.textPages).toEqual([1, 3]);
    expect(result.scannedPages).toEqual([2]);
  });

  it('handles empty document with zero pages', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 0 });

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.totalPages).toBe(0);
    expect(result.textPages).toEqual([]);
    expect(result.scannedPages).toEqual([]);
  });

  it('handles all pages being scanned', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 2 });
    mockExtractText.mockResolvedValueOnce('').mockResolvedValueOnce('   ');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.textPages).toEqual([]);
    expect(result.scannedPages).toEqual([1, 2]);
  });

  it('handles all pages being text pages', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 2 });
    mockExtractText
      .mockResolvedValueOnce('This is a full text page with lots of content.')
      .mockResolvedValueOnce('Another page with sufficient text content.');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.textPages).toEqual([1, 2]);
    expect(result.scannedPages).toEqual([]);
  });

  it('counts only non-whitespace characters (ignores spaces, tabs, newlines)', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 1 });
    // "a b c d e" has 5 non-whitespace chars (spaces don't count)
    mockExtractText.mockResolvedValueOnce('a b c d e');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.scannedPages).toEqual([1]);
  });

  it('returns 1-indexed page numbers', async () => {
    mockLoadDocument.mockResolvedValue({ pageCount: 4 });
    mockExtractText
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('Enough text content for this page to be classified as text.')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('More text content here that is sufficient.');

    const result = await detectScannedPages(new ArrayBuffer(10));

    expect(result.scannedPages).toEqual([1, 3]);
    expect(result.textPages).toEqual([2, 4]);
  });
});
