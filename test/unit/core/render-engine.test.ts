import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';

/**
 * Unit tests for the PdfjsRenderEngine.
 *
 * Note: pdfjs-dist requires a real browser environment with canvas support.
 * These tests verify the module structure and interface compliance.
 * Integration tests with actual PDF rendering would require a full browser context.
 */

async function createTestPdf(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  const bytes = await doc.save();
  return bytes.buffer as ArrayBuffer;
}

// Mock pdfjs-dist since jsdom doesn't support canvas rendering
vi.mock('pdfjs-dist', () => {
  const mockPage = {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 612 * scale,
      height: 792 * scale,
    }),
    render: () => ({ promise: Promise.resolve() }),
    getTextContent: () =>
      Promise.resolve({
        items: [
          { str: 'Hello', transform: [1, 0, 0, 1, 72, 720] },
          { str: ' ', transform: [1, 0, 0, 1, 110, 720] },
          { str: 'World', transform: [1, 0, 0, 1, 115, 720] },
          { str: 'Second line', transform: [1, 0, 0, 1, 72, 700] },
          { str: 'New paragraph', transform: [1, 0, 0, 1, 72, 670] },
        ],
      }),
    getOperatorList: () =>
      Promise.resolve({
        fnArray: [],
        argsArray: [],
      }),
    objs: {
      get: () => null,
    },
  };

  const mockDoc = {
    numPages: 5,
    getPage: () => Promise.resolve(mockPage),
  };

  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: Promise.resolve(mockDoc),
    }),
    OPS: {
      paintImageXObject: 85,
      paintInlineImageXObject: 86,
      paintXObject: 84,
    },
  };
});

// Mock document.createElement for canvas
const mockContext = {
  getImageData: () => ({
    data: new Uint8ClampedArray(612 * 792 * 4),
  }),
  putImageData: vi.fn(),
  createImageData: (w: number, h: number) => ({
    data: new Uint8ClampedArray(w * h * 4),
  }),
};

const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'canvas') {
    const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
    Object.defineProperty(canvas, 'getContext', {
      value: () => mockContext,
    });
    Object.defineProperty(canvas, 'toBlob', {
      value: (cb: (blob: Blob | null) => void) => {
        cb(new Blob([new Uint8Array(100)], { type: 'image/png' }));
      },
    });
    return canvas;
  }
  return originalCreateElement(tag);
});

describe('PdfjsRenderEngine', () => {
  let engine: Awaited<typeof import('@/core/render-engine/renderer')>['PdfjsRenderEngine']; // eslint-disable-line @typescript-eslint/consistent-type-imports

  beforeEach(async () => {
    const module = await import('@/core/render-engine/renderer');
    engine = module.PdfjsRenderEngine;
  });

  describe('loadDocument', () => {
    it('should load a PDF and return a RenderableDocument', async () => {
      const renderer = new engine();
      const data = await createTestPdf(5);
      const doc = await renderer.loadDocument(data);

      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.pageCount).toBe(5);
    });

    it('should return a document with getPage method', async () => {
      const renderer = new engine();
      const data = await createTestPdf(3);
      const doc = await renderer.loadDocument(data);

      expect(typeof doc.getPage).toBe('function');
    });
  });

  describe('getPageCount', () => {
    it('should return the correct page count', async () => {
      const renderer = new engine();
      const data = await createTestPdf(5);
      const doc = await renderer.loadDocument(data);

      expect(renderer.getPageCount(doc)).toBe(5);
    });
  });

  describe('renderPage', () => {
    it('should return a canvas element', async () => {
      const renderer = new engine();
      const data = await createTestPdf(3);
      const doc = await renderer.loadDocument(data);

      const canvas = await renderer.renderPage(doc, 1, 1.0);
      expect(canvas).toBeDefined();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should set canvas dimensions based on scale', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      const canvas = await renderer.renderPage(doc, 1, 2.0);
      // 612 * 2 = 1224, 792 * 2 = 1584
      expect(canvas.width).toBe(1224);
      expect(canvas.height).toBe(1584);
    });
  });

  describe('renderThumbnail', () => {
    it('should enforce minimum 150px width', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      // Request 100px width, should be bumped to 150px
      const canvas = await renderer.renderThumbnail(doc, 1, 100);
      expect(canvas).toBeDefined();
      // Scale = 150 / 612 ≈ 0.245
      const expectedWidth = Math.round(612 * (150 / 612));
      expect(canvas.width).toBeCloseTo(expectedWidth, 0);
    });

    it('should use requested width when >= 150px', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      const canvas = await renderer.renderThumbnail(doc, 1, 200);
      expect(canvas).toBeDefined();
      // Scale = 200 / 612 ≈ 0.327
      const expectedWidth = Math.round(612 * (200 / 612));
      expect(canvas.width).toBeCloseTo(expectedWidth, 0);
    });
  });

  describe('extractText', () => {
    it('should extract text from a single page', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      const text = await renderer.extractText(doc, 1);
      expect(text).toContain('Hello');
      expect(text).toContain('World');
    });

    it('should preserve reading order (top to bottom)', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      const text = await renderer.extractText(doc, 1);
      const helloIndex = text.indexOf('Hello');
      const secondLineIndex = text.indexOf('Second line');
      expect(helloIndex).toBeLessThan(secondLineIndex);
    });

    it('should separate paragraphs with empty lines', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      const text = await renderer.extractText(doc, 1);
      // The gap between y=700 and y=670 is 30 > PARAGRAPH_GAP_THRESHOLD (15)
      expect(text).toContain('\n\n');
    });

    it('should include page delimiters when extracting all pages', async () => {
      const renderer = new engine();
      const data = await createTestPdf(3);
      const doc = await renderer.loadDocument(data);

      const text = await renderer.extractText(doc);
      expect(text).toContain('--- Page Break ---');
    });
  });

  describe('extractImages', () => {
    it('should return an empty array when no images are present', async () => {
      const renderer = new engine();
      const data = await createTestPdf(1);
      const doc = await renderer.loadDocument(data);

      const images = await renderer.extractImages(doc);
      expect(images).toEqual([]);
    });
  });

  describe('comparePages', () => {
    it('should return true for identical pages', async () => {
      const renderer = new engine();
      const data = await createTestPdf(2);
      const doc1 = await renderer.loadDocument(data);
      const doc2 = await renderer.loadDocument(data);

      const result = await renderer.comparePages(doc1, doc2, 1);
      expect(result).toBe(true);
    });
  });

  describe('interface compliance', () => {
    it('should implement all IRenderEngine methods', () => {
      const renderer = new engine();

      expect(typeof renderer.loadDocument).toBe('function');
      expect(typeof renderer.renderPage).toBe('function');
      expect(typeof renderer.renderThumbnail).toBe('function');
      expect(typeof renderer.extractText).toBe('function');
      expect(typeof renderer.extractImages).toBe('function');
      expect(typeof renderer.getPageCount).toBe('function');
      expect(typeof renderer.comparePages).toBe('function');
    });
  });
});
