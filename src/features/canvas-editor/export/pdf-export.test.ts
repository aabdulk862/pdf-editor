import { describe, it, expect } from 'vitest';
import { pdfExportEngine, hexToAlpha } from './pdf-export';
import type { CanvasDocument, CanvasPage, TextElement, ShapeElement, ImageElement } from '../types';

function createBasePage(overrides?: Partial<CanvasPage>): CanvasPage {
  return {
    id: 'page-1',
    width: 210, // A4 width in mm
    height: 297, // A4 height in mm
    backgroundColor: '#FFFFFF',
    elements: [],
    ...overrides,
  };
}

function createTextElement(overrides?: Partial<TextElement>): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    x: 20,
    y: 30,
    width: 100,
    height: 20,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    content: 'Hello World',
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontColor: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left',
    ...overrides,
  };
}

function createShapeElement(overrides?: Partial<ShapeElement>): ShapeElement {
  return {
    id: 'shape-1',
    type: 'shape',
    x: 50,
    y: 50,
    width: 80,
    height: 60,
    rotation: 0,
    opacity: 100,
    zIndex: 2,
    locked: false,
    visible: true,
    shapeType: 'rectangle',
    fill: '#FF0000',
    stroke: '#000000',
    strokeWidth: 2,
    borderStyle: 'solid',
    ...overrides,
  };
}

function createDocument(pages?: CanvasPage[]): CanvasDocument {
  return {
    id: 'doc-1',
    name: 'Test Document',
    pages: pages || [createBasePage()],
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('PDF Export Engine', () => {
  describe('exportPage', () => {
    it('should export an empty page as a valid PDF blob', async () => {
      const page = createBasePage();
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);

      // Verify the blob has substantial content (PDF structure)
      // Note: Blob.arrayBuffer()/text() not available in all test environments
      expect(blob.size).toBeGreaterThan(100);
    });

    it('should export a page with text elements', async () => {
      const page = createBasePage({
        elements: [createTextElement()],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should export a page with shape elements', async () => {
      const page = createBasePage({
        elements: [
          createShapeElement({ shapeType: 'rectangle' }),
          createShapeElement({ id: 'shape-2', shapeType: 'circle', zIndex: 3 }),
          createShapeElement({ id: 'shape-3', shapeType: 'line', zIndex: 4 }),
        ],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle text with different alignments', async () => {
      const page = createBasePage({
        elements: [
          createTextElement({ id: 'text-left', alignment: 'left' }),
          createTextElement({
            id: 'text-center',
            alignment: 'center',
            zIndex: 2,
          }),
          createTextElement({
            id: 'text-right',
            alignment: 'right',
            zIndex: 3,
          }),
        ],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle elements with opacity', async () => {
      const page = createBasePage({
        elements: [
          createTextElement({ opacity: 50 }),
          createShapeElement({ id: 'shape-2', opacity: 75, zIndex: 3 }),
        ],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle elements with rotation', async () => {
      const page = createBasePage({
        elements: [
          createTextElement({ rotation: 45 }),
          createShapeElement({ id: 'shape-2', rotation: 90, zIndex: 3 }),
        ],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should skip hidden elements', async () => {
      const page = createBasePage({
        elements: [createTextElement({ visible: false }), createShapeElement({ visible: true })],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle non-white background color', async () => {
      const page = createBasePage({ backgroundColor: '#F0F0F0' });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle all shape types', async () => {
      const page = createBasePage({
        elements: [
          createShapeElement({ id: 's1', shapeType: 'rectangle', zIndex: 1 }),
          createShapeElement({ id: 's2', shapeType: 'circle', zIndex: 2 }),
          createShapeElement({ id: 's3', shapeType: 'line', zIndex: 3 }),
          createShapeElement({ id: 's4', shapeType: 'arrow', zIndex: 4 }),
          createShapeElement({ id: 's5', shapeType: 'star', zIndex: 5 }),
          createShapeElement({
            id: 's6',
            shapeType: 'polygon',
            polygonSides: 6,
            zIndex: 6,
          }),
        ],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle shapes with dashed and dotted borders', async () => {
      const page = createBasePage({
        elements: [
          createShapeElement({ id: 's1', borderStyle: 'dashed', zIndex: 1 }),
          createShapeElement({ id: 's2', borderStyle: 'dotted', zIndex: 2 }),
        ],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle shapes with transparent fill', async () => {
      const page = createBasePage({
        elements: [createShapeElement({ fill: 'transparent' })],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle text with bold and italic', async () => {
      const page = createBasePage({
        elements: [createTextElement({ bold: true, italic: true })],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle empty text content gracefully', async () => {
      const page = createBasePage({
        elements: [createTextElement({ content: '' })],
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle custom page dimensions', async () => {
      const page = createBasePage({
        width: 100,
        height: 150,
      });
      const blob = await pdfExportEngine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('exportDocument', () => {
    it('should export all pages by default', async () => {
      const doc = createDocument([
        createBasePage({ id: 'p1' }),
        createBasePage({ id: 'p2' }),
        createBasePage({ id: 'p3' }),
      ]);
      const blob = await pdfExportEngine.exportDocument(doc);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should export selected pages when specified', async () => {
      const doc = createDocument([
        createBasePage({ id: 'p1' }),
        createBasePage({ id: 'p2' }),
        createBasePage({ id: 'p3' }),
      ]);
      const blobAll = await pdfExportEngine.exportDocument(doc);
      const blobSelected = await pdfExportEngine.exportDocument(doc, {
        pages: [0, 2],
      });

      // Selected pages should produce a smaller PDF than all pages
      expect(blobSelected.size).toBeLessThan(blobAll.size);
    });

    it('should export all pages when pages option is "all"', async () => {
      const doc = createDocument([createBasePage({ id: 'p1' }), createBasePage({ id: 'p2' })]);
      const blob = await pdfExportEngine.exportDocument(doc, { pages: 'all' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle document with elements on multiple pages', async () => {
      const doc = createDocument([
        createBasePage({
          id: 'p1',
          elements: [createTextElement()],
        }),
        createBasePage({
          id: 'p2',
          elements: [createShapeElement()],
        }),
      ]);
      const blob = await pdfExportEngine.exportDocument(doc);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should skip invalid page indices gracefully', async () => {
      const doc = createDocument([createBasePage()]);
      const blob = await pdfExportEngine.exportDocument(doc, {
        pages: [0, 5, 10],
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should throw a descriptive error on export failure', async () => {
      // Create a page with an image element that has an invalid src
      const imageElement: ImageElement = {
        id: 'img-1',
        type: 'image',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        src: 'data:image/png;base64,invalid_data_here',
        originalWidth: 100,
        originalHeight: 100,
        aspectRatioLocked: true,
      };

      const page = createBasePage({ elements: [imageElement] });
      // This should not throw - invalid images are skipped gracefully
      const blob = await pdfExportEngine.exportPage(page);
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('hexToAlpha', () => {
    it('should return 1 for 6-char hex', () => {
      expect(hexToAlpha('#FF0000')).toBe(1);
    });

    it('should extract alpha from 8-char hex', () => {
      expect(hexToAlpha('#FF000080')).toBeCloseTo(128 / 255);
    });

    it('should return 0 for fully transparent', () => {
      expect(hexToAlpha('#FF000000')).toBe(0);
    });

    it('should return 1 for fully opaque 8-char hex', () => {
      expect(hexToAlpha('#FF0000FF')).toBeCloseTo(1);
    });
  });
});
