import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculatePixelDimensions, createPngExportEngine } from './png-export';
import type { CanvasPage, CanvasDocument } from '../types';

// === Mock OffscreenCanvas ===

class MockOffscreenCanvas {
  width: number;
  height: number;
  private ctx: MockCanvasContext;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ctx = new MockCanvasContext();
  }

  getContext(_type: string) {
    return this.ctx;
  }

  async convertToBlob(options?: { type?: string }): Promise<Blob> {
    return new Blob(['mock-png-data'], { type: options?.type || 'image/png' });
  }
}

class MockCanvasContext {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  globalAlpha = 1;
  font = '';
  textAlign = 'left';
  textBaseline = 'top';
  shadowColor = '';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;

  fillRect = vi.fn();
  clearRect = vi.fn();
  beginPath = vi.fn();
  closePath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  rect = vi.fn();
  ellipse = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  rotate = vi.fn();
  clip = vi.fn();
  setLineDash = vi.fn();
  fillText = vi.fn();
  measureText = vi.fn().mockReturnValue({ width: 50 });
  drawImage = vi.fn();
}

// Set up global OffscreenCanvas mock
beforeEach(() => {
  vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);
});

// === Test Helpers ===

function createTestPage(overrides?: Partial<CanvasPage>): CanvasPage {
  return {
    id: 'page-1',
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
    backgroundColor: '#FFFFFF',
    elements: [],
    ...overrides,
  };
}

function createTestDocument(pages?: CanvasPage[]): CanvasDocument {
  return {
    id: 'doc-1',
    name: 'Test Document',
    pages: pages || [createTestPage()],
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// === Tests ===

describe('calculatePixelDimensions', () => {
  it('calculates correct pixel dimensions for A4 at 72 DPI', () => {
    const result = calculatePixelDimensions(210, 297, 72);
    // 210 / 25.4 * 72 = 595.27... → floor = 595
    // 297 / 25.4 * 72 = 841.88... → floor = 841
    expect(result.width).toBe(595);
    expect(result.height).toBe(841);
  });

  it('calculates correct pixel dimensions for A4 at 150 DPI', () => {
    const result = calculatePixelDimensions(210, 297, 150);
    // 210 / 25.4 * 150 = 1240.15... → floor = 1240
    // 297 / 25.4 * 150 = 1753.93... → floor = 1753
    expect(result.width).toBe(1240);
    expect(result.height).toBe(1753);
  });

  it('calculates correct pixel dimensions for A4 at 300 DPI', () => {
    const result = calculatePixelDimensions(210, 297, 300);
    // 210 / 25.4 * 300 = 2480.31... → floor = 2480
    // 297 / 25.4 * 300 = 3507.87... → floor = 3507
    expect(result.width).toBe(2480);
    expect(result.height).toBe(3507);
  });

  it('calculates correct pixel dimensions for Letter at 72 DPI', () => {
    const result = calculatePixelDimensions(215.9, 279.4, 72);
    // 215.9 / 25.4 * 72 = 612.0 → floor = 612
    // 279.4 / 25.4 * 72 = 792.0 → floor = 792
    expect(result.width).toBe(612);
    expect(result.height).toBe(792);
  });

  it('uses floor for non-integer results', () => {
    const result = calculatePixelDimensions(100, 100, 72);
    // 100 / 25.4 * 72 = 283.46... → floor = 283
    expect(result.width).toBe(283);
    expect(result.height).toBe(283);
  });
});

describe('PngExportEngine', () => {
  let engine: ReturnType<typeof createPngExportEngine>;

  beforeEach(() => {
    engine = createPngExportEngine();
  });

  describe('exportPage', () => {
    it('exports a blank page as a PNG blob', async () => {
      const page = createTestPage();
      const blob = await engine.exportPage(page, { dpi: 72 });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('exports a page with elements', async () => {
      const page = createTestPage({
        elements: [
          {
            id: 'rect-1',
            type: 'shape',
            shapeType: 'rectangle',
            x: 10,
            y: 10,
            width: 50,
            height: 50,
            rotation: 0,
            opacity: 100,
            zIndex: 1,
            locked: false,
            visible: true,
            fill: '#FF0000',
            stroke: '#000000',
            strokeWidth: 2,
            borderStyle: 'solid',
          },
        ],
      });

      const blob = await engine.exportPage(page, { dpi: 150 });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('skips hidden elements during rendering', async () => {
      const page = createTestPage({
        elements: [
          {
            id: 'hidden-1',
            type: 'shape',
            shapeType: 'rectangle',
            x: 10,
            y: 10,
            width: 50,
            height: 50,
            rotation: 0,
            opacity: 100,
            zIndex: 1,
            locked: false,
            visible: false,
            fill: '#FF0000',
            stroke: '#000000',
            strokeWidth: 2,
            borderStyle: 'solid',
          },
        ],
      });

      const blob = await engine.exportPage(page, { dpi: 72 });
      expect(blob).toBeInstanceOf(Blob);
    });

    it('throws error when canvas dimensions exceed browser limits', async () => {
      // A page so large that at 300 DPI it exceeds 16384px
      const page = createTestPage({
        width: 5000, // 5000 / 25.4 * 300 = 59055px > 16384
        height: 5000,
      });

      await expect(engine.exportPage(page, { dpi: 300 })).rejects.toThrow(/exceeds browser/i);
    });

    it('preserves alpha transparency via PNG format', async () => {
      const page = createTestPage({
        elements: [
          {
            id: 'semi-transparent',
            type: 'shape',
            shapeType: 'circle',
            x: 20,
            y: 20,
            width: 40,
            height: 40,
            rotation: 0,
            opacity: 50, // 50% opacity
            zIndex: 1,
            locked: false,
            visible: true,
            fill: '#0000FF',
            stroke: '#000000',
            strokeWidth: 1,
            borderStyle: 'solid',
          },
        ],
      });

      const blob = await engine.exportPage(page, { dpi: 72 });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });
  });

  describe('exportDocument', () => {
    it('generates one PNG per page for multi-page documents', async () => {
      const doc = createTestDocument([
        createTestPage({ id: 'page-1' }),
        createTestPage({ id: 'page-2' }),
        createTestPage({ id: 'page-3' }),
      ]);

      const blobs = await engine.exportDocument(doc, { dpi: 72 });

      expect(blobs).toHaveLength(3);
      blobs.forEach((blob) => {
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
      });
    });

    it('generates a single PNG for single-page documents', async () => {
      const doc = createTestDocument([createTestPage()]);

      const blobs = await engine.exportDocument(doc, { dpi: 150 });

      expect(blobs).toHaveLength(1);
      expect(blobs[0]).toBeInstanceOf(Blob);
    });

    it('handles empty document with no pages', async () => {
      const doc = createTestDocument([]);

      const blobs = await engine.exportDocument(doc, { dpi: 72 });

      expect(blobs).toHaveLength(0);
    });
  });
});
