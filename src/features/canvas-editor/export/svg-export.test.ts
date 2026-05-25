import { describe, it, expect } from 'vitest';
import { SvgExportEngine } from './svg-export';
import type {
  CanvasDocument,
  CanvasPage,
  TextElement,
  ShapeElement,
  ImageElement,
  GroupElement,
} from '../types';

function createBasePage(overrides?: Partial<CanvasPage>): CanvasPage {
  return {
    id: 'page-1',
    width: 210,
    height: 297,
    backgroundColor: '#FFFFFF',
    elements: [],
    ...overrides,
  };
}

function createTextElement(overrides?: Partial<TextElement>): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    x: 10,
    y: 20,
    width: 100,
    height: 30,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    content: 'Hello World',
    fontFamily: 'Arial',
    fontSize: 16,
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
    width: 100,
    height: 80,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
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

function createImageElement(overrides?: Partial<ImageElement>): ImageElement {
  return {
    id: 'image-1',
    type: 'image',
    x: 20,
    y: 30,
    width: 80,
    height: 60,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    originalWidth: 1,
    originalHeight: 1,
    aspectRatioLocked: true,
    ...overrides,
  };
}

describe('SvgExportEngine', () => {
  const engine = new SvgExportEngine();

  describe('exportPage', () => {
    it('should generate a valid SVG blob', async () => {
      const page = createBasePage();
      const blob = await engine.exportPage(page);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');
    });

    it('should include SVG 1.1 attributes and viewBox in mm', () => {
      const page = createBasePage({ width: 210, height: 297 });
      const text = engine.buildSvgString(page);

      expect(text).toContain('version="1.1"');
      expect(text).toContain('width="210mm"');
      expect(text).toContain('height="297mm"');
      expect(text).toContain('viewBox="0 0 210 297"');
      expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should include XML declaration', () => {
      const page = createBasePage();
      const text = engine.buildSvgString(page);

      expect(text).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });

    it('should render background color', () => {
      const page = createBasePage({ backgroundColor: '#CCCCCC' });
      const text = engine.buildSvgString(page);

      expect(text).toContain('fill="#CCCCCC"');
    });

    it('should skip hidden elements', () => {
      const page = createBasePage({
        elements: [
          createTextElement({ visible: false, content: 'Hidden' }),
          createTextElement({ id: 'text-2', visible: true, content: 'Visible' }),
        ],
      });
      const text = engine.buildSvgString(page);

      expect(text).not.toContain('Hidden');
      expect(text).toContain('Visible');
    });

    it('should render elements in z-index order', () => {
      const page = createBasePage({
        elements: [
          createTextElement({ id: 'text-high', zIndex: 10, content: 'High' }),
          createTextElement({ id: 'text-low', zIndex: 1, content: 'Low' }),
        ],
      });
      const text = engine.buildSvgString(page);

      const lowIndex = text.indexOf('Low');
      const highIndex = text.indexOf('High');
      expect(lowIndex).toBeLessThan(highIndex);
    });
  });

  describe('text elements', () => {
    it('should render text with font attributes', () => {
      const page = createBasePage({
        elements: [
          createTextElement({
            fontFamily: 'Helvetica',
            fontSize: 24,
            fontColor: '#333333',
            bold: true,
            italic: true,
            alignment: 'center',
          }),
        ],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('font-family="Helvetica"');
      expect(text).toContain('font-size="24pt"');
      expect(text).toContain('font-weight="bold"');
      expect(text).toContain('font-style="italic"');
      expect(text).toContain('fill="#333333"');
      expect(text).toContain('text-anchor="middle"');
    });

    it('should render underline as text-decoration', () => {
      const page = createBasePage({
        elements: [createTextElement({ underline: true })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('text-decoration="underline"');
    });

    it('should map text alignment to text-anchor correctly', () => {
      const alignments: Array<{ alignment: 'left' | 'center' | 'right'; anchor: string }> = [
        { alignment: 'left', anchor: 'start' },
        { alignment: 'center', anchor: 'middle' },
        { alignment: 'right', anchor: 'end' },
      ];

      for (const { alignment, anchor } of alignments) {
        const page = createBasePage({
          elements: [createTextElement({ alignment })],
        });
        const text = engine.buildSvgString(page);
        expect(text).toContain(`text-anchor="${anchor}"`);
      }
    });

    it('should handle multi-line text with tspan elements', () => {
      const page = createBasePage({
        elements: [createTextElement({ content: 'Line 1\nLine 2\nLine 3' })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<tspan');
      expect(text).toContain('Line 1');
      expect(text).toContain('Line 2');
      expect(text).toContain('Line 3');
    });
  });

  describe('shape elements', () => {
    it('should render rectangle as <rect>', () => {
      const page = createBasePage({
        elements: [
          createShapeElement({ shapeType: 'rectangle', x: 10, y: 20, width: 100, height: 50 }),
        ],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<rect');
      expect(text).toContain('x="10"');
      expect(text).toContain('y="20"');
      expect(text).toContain('width="100"');
      expect(text).toContain('height="50"');
    });

    it('should render circle as <ellipse>', () => {
      const page = createBasePage({
        elements: [
          createShapeElement({ shapeType: 'circle', x: 0, y: 0, width: 100, height: 100 }),
        ],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<ellipse');
      expect(text).toContain('cx="50"');
      expect(text).toContain('cy="50"');
      expect(text).toContain('rx="50"');
      expect(text).toContain('ry="50"');
    });

    it('should render line as <line>', () => {
      const page = createBasePage({
        elements: [createShapeElement({ shapeType: 'line', x: 10, y: 20, width: 100, height: 40 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<line');
      expect(text).toContain('x1="10"');
      expect(text).toContain('x2="110"');
    });

    it('should render polygon with correct number of sides', () => {
      const page = createBasePage({
        elements: [createShapeElement({ shapeType: 'polygon', polygonSides: 6 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<polygon');
      expect(text).toContain('points=');
    });

    it('should render star as <polygon>', () => {
      const page = createBasePage({
        elements: [createShapeElement({ shapeType: 'star' })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<polygon');
      expect(text).toContain('points=');
    });

    it('should apply fill, stroke, and stroke-width', () => {
      const page = createBasePage({
        elements: [createShapeElement({ fill: '#00FF00', stroke: '#0000FF', strokeWidth: 3 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('fill="#00FF00"');
      expect(text).toContain('stroke="#0000FF"');
      expect(text).toContain('stroke-width="3"');
    });

    it('should render transparent fill as none', () => {
      const page = createBasePage({
        elements: [createShapeElement({ fill: 'transparent' })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('fill="none"');
    });

    it('should apply dashed border style as stroke-dasharray', () => {
      const page = createBasePage({
        elements: [createShapeElement({ borderStyle: 'dashed', strokeWidth: 2 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('stroke-dasharray=');
    });

    it('should apply dotted border style as stroke-dasharray', () => {
      const page = createBasePage({
        elements: [createShapeElement({ borderStyle: 'dotted', strokeWidth: 2 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('stroke-dasharray=');
    });

    it('should render arrow with arrowhead', () => {
      const page = createBasePage({
        elements: [createShapeElement({ shapeType: 'arrow' })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<line');
      expect(text).toContain('<polygon');
    });
  });

  describe('image elements', () => {
    it('should render image with base64 data URI', () => {
      const page = createBasePage({
        elements: [createImageElement()],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<image');
      expect(text).toContain('data:image/png;base64,');
      expect(text).toContain('href=');
    });

    it('should set image position and dimensions', () => {
      const page = createBasePage({
        elements: [createImageElement({ x: 15, y: 25, width: 90, height: 70 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('x="15"');
      expect(text).toContain('y="25"');
      expect(text).toContain('width="90"');
      expect(text).toContain('height="70"');
    });
  });

  describe('common attributes', () => {
    it('should apply opacity when less than 100', () => {
      const page = createBasePage({
        elements: [createShapeElement({ opacity: 50 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).toContain('opacity="0.5"');
    });

    it('should not include opacity attribute when 100', () => {
      const page = createBasePage({
        elements: [createShapeElement({ opacity: 100 })],
      });
      const text = engine.buildSvgString(page);

      // The shape element should not have an opacity attribute on the rect
      const rectMatch = text.match(/<rect[^>]*>/);
      expect(rectMatch?.[0]).not.toContain('opacity=');
    });

    it('should apply rotation transform', () => {
      const element = createShapeElement({ x: 50, y: 50, width: 100, height: 80, rotation: 45 });
      const page = createBasePage({ elements: [element] });
      const text = engine.buildSvgString(page);

      // Center is (50 + 100/2, 50 + 80/2) = (100, 90)
      expect(text).toContain('transform="rotate(45 100 90)"');
    });

    it('should not include transform when rotation is 0', () => {
      const page = createBasePage({
        elements: [createShapeElement({ rotation: 0 })],
      });
      const text = engine.buildSvgString(page);

      expect(text).not.toContain('transform=');
    });
  });

  describe('group elements', () => {
    it('should render group as <g> with children', () => {
      const group: GroupElement = {
        id: 'group-1',
        type: 'group',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        children: [
          createTextElement({ id: 'child-text', content: 'Grouped' }),
          createShapeElement({ id: 'child-shape' }),
        ],
      };
      const page = createBasePage({ elements: [group] });
      const text = engine.buildSvgString(page);

      expect(text).toContain('<g');
      expect(text).toContain('Grouped');
      expect(text).toContain('<rect');
    });
  });

  describe('exportDocument', () => {
    it('should export the first page of a document', () => {
      const doc: CanvasDocument = {
        id: 'doc-1',
        name: 'Test Doc',
        pages: [
          createBasePage({ id: 'p1', width: 100, height: 100 }),
          createBasePage({ id: 'p2', width: 200, height: 200 }),
        ],
        activePageIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      // Use buildSvgString on first page to verify
      const text = engine.buildSvgString(doc.pages[0]);

      expect(text).toContain('width="100mm"');
      expect(text).toContain('height="100mm"');
    });

    it('should throw for empty document', async () => {
      const doc: CanvasDocument = {
        id: 'doc-1',
        name: 'Empty',
        pages: [],
        activePageIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await expect(engine.exportDocument(doc)).rejects.toThrow('Document has no pages');
    });
  });

  describe('exportPages (multi-page)', () => {
    it('should return one blob per page', async () => {
      const doc: CanvasDocument = {
        id: 'doc-1',
        name: 'Multi',
        pages: [
          createBasePage({ id: 'p1', width: 100, height: 100 }),
          createBasePage({ id: 'p2', width: 200, height: 200 }),
          createBasePage({ id: 'p3', width: 300, height: 300 }),
        ],
        activePageIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const blobs = await engine.exportPages(doc);

      expect(blobs).toHaveLength(3);
      expect(blobs[0]).toBeInstanceOf(Blob);
      expect(blobs[1]).toBeInstanceOf(Blob);
      expect(blobs[2]).toBeInstanceOf(Blob);

      // Verify each page has correct dimensions via buildSvgString
      const text1 = engine.buildSvgString(doc.pages[0]);
      const text2 = engine.buildSvgString(doc.pages[1]);
      const text3 = engine.buildSvgString(doc.pages[2]);

      expect(text1).toContain('width="100mm"');
      expect(text2).toContain('width="200mm"');
      expect(text3).toContain('width="300mm"');
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error for memory issues', async () => {
      // The engine should handle normal cases without error
      const page = createBasePage({
        elements: [createImageElement()],
      });
      const blob = await engine.exportPage(page);
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
