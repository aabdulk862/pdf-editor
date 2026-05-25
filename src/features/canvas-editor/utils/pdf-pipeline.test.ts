import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CanvasPage } from '../types';

import {
  setPendingMergePdf,
  consumePendingMergePdf,
  insertIntoPdf,
  openPdfPageInCanvas,
} from './pdf-pipeline';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock pdfjs-dist since jsdom doesn't support canvas rendering
vi.mock('pdfjs-dist', () => {
  const mockRenderPromise = { promise: Promise.resolve() };
  const mockPage = {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 595 * scale,
      height: 842 * scale,
    }),
    render: () => mockRenderPromise,
  };

  const mockDoc = {
    numPages: 3,
    getPage: vi.fn().mockResolvedValue(mockPage),
    destroy: vi.fn(),
  };

  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn().mockReturnValue({ promise: Promise.resolve(mockDoc) }),
  };
});

// Mock the pdf export engine
vi.mock('../export/pdf-export', () => ({
  pdfExportEngine: {
    exportPage: vi.fn().mockResolvedValue(new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' })),
    exportDocument: vi
      .fn()
      .mockResolvedValue(new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' })),
  },
}));

// Mock canvas context
const mockContext = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
};

// Mock HTMLCanvasElement.prototype methods
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'canvas') {
    const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,mockPngData');
    return canvas;
  }
  return originalCreateElement(tag);
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PDF Pipeline - Pending Merge PDF Store', () => {
  beforeEach(() => {
    // Clear any pending file
    consumePendingMergePdf();
  });

  it('should store and retrieve a pending PDF file', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    setPendingMergePdf(file);

    const retrieved = consumePendingMergePdf();
    expect(retrieved).toBe(file);
    expect(retrieved?.name).toBe('test.pdf');
  });

  it('should return null when no file is pending', () => {
    const result = consumePendingMergePdf();
    expect(result).toBeNull();
  });

  it('should clear the pending file after consumption', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    setPendingMergePdf(file);

    consumePendingMergePdf(); // First call retrieves
    const second = consumePendingMergePdf(); // Second call should be null
    expect(second).toBeNull();
  });

  it('should overwrite a previously stored file', () => {
    const file1 = new File(['first'], 'first.pdf', { type: 'application/pdf' });
    const file2 = new File(['second'], 'second.pdf', { type: 'application/pdf' });

    setPendingMergePdf(file1);
    setPendingMergePdf(file2);

    const retrieved = consumePendingMergePdf();
    expect(retrieved?.name).toBe('second.pdf');
  });
});

describe('PDF Pipeline - Insert into PDF', () => {
  const mockPage: CanvasPage = {
    id: 'page-1',
    width: 210,
    height: 297,
    backgroundColor: '#FFFFFF',
    elements: [],
  };

  beforeEach(() => {
    consumePendingMergePdf();
  });

  it('should export the page as PDF and navigate to /merge', async () => {
    const navigate = vi.fn();

    await insertIntoPdf({ page: mockPage, navigate });

    // Should have navigated to merge
    expect(navigate).toHaveBeenCalledWith('/merge');

    // Should have stored a pending file
    const pending = consumePendingMergePdf();
    expect(pending).not.toBeNull();
    expect(pending?.type).toBe('application/pdf');
    expect(pending?.name).toMatch(/^canvas-page-\d+\.pdf$/);
  });

  it('should create a File with correct type from the exported blob', async () => {
    const navigate = vi.fn();

    await insertIntoPdf({ page: mockPage, navigate });

    const pending = consumePendingMergePdf();
    expect(pending).toBeInstanceOf(File);
    expect(pending?.type).toBe('application/pdf');
  });
});

describe('PDF Pipeline - Open PDF Page in Canvas', () => {
  it('should render a PDF page and return a locked ImageElement', async () => {
    const pdfData = new ArrayBuffer(10);

    const result = await openPdfPageInCanvas(pdfData, 1, 2);

    expect(result.backgroundElement).toBeDefined();
    expect(result.backgroundElement.type).toBe('image');
    expect(result.backgroundElement.locked).toBe(true);
    expect(result.backgroundElement.zIndex).toBe(0);
    expect(result.backgroundElement.visible).toBe(true);
    expect(result.backgroundElement.x).toBe(0);
    expect(result.backgroundElement.y).toBe(0);
    expect(result.backgroundElement.aspectRatioLocked).toBe(true);
  });

  it('should set page dimensions in mm from PDF point dimensions', async () => {
    const pdfData = new ArrayBuffer(10);

    const result = await openPdfPageInCanvas(pdfData, 1, 2);

    // PDF A4 is 595 x 842 points. In mm: 595 * (25.4/72) ≈ 209.9, 842 * (25.4/72) ≈ 297.0
    const expectedWidth = 595 * (25.4 / 72);
    const expectedHeight = 842 * (25.4 / 72);

    expect(result.pageWidth).toBeCloseTo(expectedWidth, 1);
    expect(result.pageHeight).toBeCloseTo(expectedHeight, 1);
  });

  it('should set the image src as a PNG data URL', async () => {
    const pdfData = new ArrayBuffer(10);

    const result = await openPdfPageInCanvas(pdfData, 1, 2);

    expect(result.backgroundElement.src).toBe('data:image/png;base64,mockPngData');
  });

  it('should set original dimensions based on scaled viewport', async () => {
    const pdfData = new ArrayBuffer(10);
    const scale = 2;

    const result = await openPdfPageInCanvas(pdfData, 1, scale);

    // At scale 2, viewport is 595*2 x 842*2
    expect(result.backgroundElement.originalWidth).toBe(595 * scale);
    expect(result.backgroundElement.originalHeight).toBe(842 * scale);
  });

  it('should throw a user-friendly error for corrupted PDFs', async () => {
    const pdfjsLib = await import('pdfjs-dist');
    vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
      promise: Promise.reject(new Error('Invalid PDF structure')),
    } as unknown as ReturnType<typeof pdfjsLib.getDocument>);

    const pdfData = new ArrayBuffer(10);

    await expect(openPdfPageInCanvas(pdfData, 1)).rejects.toThrow(
      /The PDF page could not be loaded/,
    );
  });

  it('should throw for invalid page numbers', async () => {
    const pdfData = new ArrayBuffer(10);

    // Page 5 doesn't exist (mock has 3 pages)
    await expect(openPdfPageInCanvas(pdfData, 5)).rejects.toThrow(/Page 5 does not exist/);
  });

  it('should use default scale of 2 when not specified', async () => {
    const pdfData = new ArrayBuffer(10);

    const result = await openPdfPageInCanvas(pdfData, 1);

    // Default scale is 2, so original dimensions should be 595*2 x 842*2
    expect(result.backgroundElement.originalWidth).toBe(595 * 2);
    expect(result.backgroundElement.originalHeight).toBe(842 * 2);
  });

  it('should generate a unique ID for the background element', async () => {
    const pdfData = new ArrayBuffer(10);

    const result1 = await openPdfPageInCanvas(pdfData, 1);
    const result2 = await openPdfPageInCanvas(pdfData, 1);

    expect(result1.backgroundElement.id).not.toBe(result2.backgroundElement.id);
    expect(result1.backgroundElement.id).toMatch(/^pdf-bg-/);
  });
});
