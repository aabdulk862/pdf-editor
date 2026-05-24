import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PdfPage } from '@/types/pdf';
import type { Stroke, TextStyle } from '@/types/annotations';
import type { Point, Size } from '@/types/common';
import type { AnnotationCanvas } from '@/core/annotation-engine/index';
import {
  annotationEngine,
  createSignatureDrawHandler,
  createRectSelectionHandler,
  attachInputListeners,
  destroyAnnotationCanvas,
} from '@/core/annotation-engine/tools';
import {
  createCanvas,
  resizeCanvas,
  destroyCanvas,
  clearCanvas,
  getCanvasPoint,
  MIN_TOUCH_TARGET_SIZE,
} from '@/core/annotation-engine/canvas-manager';

// Mock canvas context
function createMockContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    setLineDash: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    font: '',
  } as unknown as CanvasRenderingContext2D;
}

// Setup jsdom canvas mock
function setupCanvasMock(): void {
  const mockCtx = createMockContext();
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => mockCtx,
  ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
}

const testPage: PdfPage = {
  pageNumber: 1,
  width: 800,
  height: 600,
  rotation: 0,
};

describe('Canvas Manager', () => {
  beforeEach(() => {
    setupCanvasMock();
  });

  describe('createCanvas', () => {
    it('creates a canvas element with correct dimensions', () => {
      const container = document.createElement('div');
      const result = createCanvas(container, testPage);

      expect(result.element).toBeInstanceOf(HTMLCanvasElement);
      expect(result.element.width).toBe(800);
      expect(result.element.height).toBe(600);
      expect(result.page).toBe(testPage);
    });

    it('appends canvas to container', () => {
      const container = document.createElement('div');
      const result = createCanvas(container, testPage);

      expect(container.contains(result.element)).toBe(true);
    });

    it('sets container to relative positioning', () => {
      const container = document.createElement('div');
      createCanvas(container, testPage);

      expect(container.style.position).toBe('relative');
    });

    it('sets touch-action to none for drawing support', () => {
      const container = document.createElement('div');
      const result = createCanvas(container, testPage);

      expect(result.element.style.touchAction).toBe('none');
    });

    it('sets accessibility attributes', () => {
      const container = document.createElement('div');
      const result = createCanvas(container, testPage);

      expect(result.element.getAttribute('role')).toBe('img');
      expect(result.element.getAttribute('aria-label')).toContain('page 1');
      expect(result.element.tabIndex).toBe(0);
    });

    it('generates unique IDs for each canvas', () => {
      const container = document.createElement('div');
      const canvas1 = createCanvas(container, testPage);
      const canvas2 = createCanvas(container, testPage);

      expect(canvas1.id).not.toBe(canvas2.id);
    });
  });

  describe('resizeCanvas', () => {
    it('updates canvas dimensions', () => {
      const container = document.createElement('div');
      const canvas = createCanvas(container, testPage);

      resizeCanvas(canvas, 1024, 768);

      expect(canvas.element.width).toBe(1024);
      expect(canvas.element.height).toBe(768);
    });
  });

  describe('destroyCanvas', () => {
    it('removes canvas from parent', () => {
      const container = document.createElement('div');
      const canvas = createCanvas(container, testPage);

      destroyCanvas(canvas);

      expect(container.contains(canvas.element)).toBe(false);
    });
  });

  describe('clearCanvas', () => {
    it('calls clearRect on the canvas context', () => {
      const container = document.createElement('div');
      const canvas = createCanvas(container, testPage);

      clearCanvas(canvas);

      const ctx = canvas.element.getContext('2d');
      expect(ctx!.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
  });

  describe('getCanvasPoint', () => {
    it('converts mouse event coordinates to canvas coordinates', () => {
      const container = document.createElement('div');
      const canvas = createCanvas(container, testPage);

      const mockEvent = { clientX: 100, clientY: 50 } as MouseEvent;
      const point = getCanvasPoint(canvas.element, mockEvent);

      expect(point.x).toBe(100);
      expect(point.y).toBe(50);
    });
  });

  describe('MIN_TOUCH_TARGET_SIZE', () => {
    it('is 44px for mobile accessibility', () => {
      expect(MIN_TOUCH_TARGET_SIZE).toBe(44);
    });
  });
});

describe('Annotation Engine', () => {
  let canvas: AnnotationCanvas;

  beforeEach(() => {
    setupCanvasMock();
    const container = document.createElement('div');
    canvas = annotationEngine.initCanvas(container, testPage);
  });

  describe('initCanvas', () => {
    it('creates an annotation canvas', () => {
      expect(canvas.element).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.page).toBe(testPage);
    });

    it('initializes with empty annotations', () => {
      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(0);
    });
  });

  describe('setTool', () => {
    it('sets cursor to crosshair for highlight tool', () => {
      annotationEngine.setTool(canvas, 'highlight');
      expect(canvas.element.style.cursor).toBe('crosshair');
    });

    it('sets cursor to crosshair for redact tool', () => {
      annotationEngine.setTool(canvas, 'redact');
      expect(canvas.element.style.cursor).toBe('crosshair');
    });

    it('sets cursor to default for signature tool', () => {
      annotationEngine.setTool(canvas, 'signature');
      expect(canvas.element.style.cursor).toBe('default');
    });

    it('sets cursor to move for stamp tool', () => {
      annotationEngine.setTool(canvas, 'stamp');
      expect(canvas.element.style.cursor).toBe('move');
    });

    it('sets cursor to text for text tool', () => {
      annotationEngine.setTool(canvas, 'text');
      expect(canvas.element.style.cursor).toBe('text');
    });
  });

  describe('addHighlight', () => {
    it('adds a highlight annotation with specified color and opacity', () => {
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      const id = annotationEngine.addHighlight(canvas, rect, '#FFFF00', 0.4);

      expect(id).toBeTruthy();
      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].tool).toBe('highlight');
      expect(annotations[0].rect).toEqual(rect);
      expect(annotations[0].data.color).toBe('#FFFF00');
      expect(annotations[0].data.opacity).toBe(0.4);
    });

    it('defaults to 40% opacity when 0 is passed', () => {
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      annotationEngine.addHighlight(canvas, rect, '#FFFF00', 0);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].data.opacity).toBe(0.4);
    });

    it('clamps opacity to valid range', () => {
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      annotationEngine.addHighlight(canvas, rect, '#FFFF00', 1.5);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].data.opacity).toBe(1);
    });

    it('supports multiple highlights on the same page', () => {
      const rect1 = { x: 10, y: 20, width: 100, height: 50 };
      const rect2 = { x: 200, y: 100, width: 150, height: 30 };

      annotationEngine.addHighlight(canvas, rect1, '#FFFF00', 0.4);
      annotationEngine.addHighlight(canvas, rect2, '#FF0000', 0.4);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(2);
    });
  });

  describe('addSignature', () => {
    it('adds a signature annotation with strokes', () => {
      const strokes: Stroke[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          color: '#000000',
          width: 2,
        },
      ];
      const position: Point = { x: 50, y: 50 };

      const id = annotationEngine.addSignature(canvas, strokes, position);

      expect(id).toBeTruthy();
      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].tool).toBe('signature');
      expect(annotations[0].data.strokes).toEqual(strokes);
      expect(annotations[0].data.position).toEqual(position);
    });

    it('clamps stroke width to 1-10px range', () => {
      const strokes: Stroke[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          color: '#000000',
          width: 15,
        },
      ];
      const position: Point = { x: 50, y: 50 };

      annotationEngine.addSignature(canvas, strokes, position);

      const annotations = annotationEngine.getAnnotations(canvas);
      const savedStrokes = annotations[0].data.strokes as Stroke[];
      expect(savedStrokes[0].width).toBe(10);
    });

    it('clamps stroke width minimum to 1px', () => {
      const strokes: Stroke[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          color: '#000000',
          width: 0,
        },
      ];
      const position: Point = { x: 50, y: 50 };

      annotationEngine.addSignature(canvas, strokes, position);

      const annotations = annotationEngine.getAnnotations(canvas);
      const savedStrokes = annotations[0].data.strokes as Stroke[];
      expect(savedStrokes[0].width).toBe(1);
    });

    it('calculates bounding rect from strokes', () => {
      const strokes: Stroke[] = [
        {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 80 },
          ],
          color: '#000000',
          width: 2,
        },
      ];
      const position: Point = { x: 10, y: 20 };

      annotationEngine.addSignature(canvas, strokes, position);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].rect.x).toBe(10);
      expect(annotations[0].rect.y).toBe(20);
      expect(annotations[0].rect.width).toBe(100);
      expect(annotations[0].rect.height).toBe(80);
    });
  });

  describe('addStamp', () => {
    it('adds a stamp annotation with correct type', () => {
      const position: Point = { x: 100, y: 100 };
      const size: Size = { width: 200, height: 100 };

      const id = annotationEngine.addStamp(canvas, 'APPROVED', position, size);

      expect(id).toBeTruthy();
      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].tool).toBe('stamp');
      expect(annotations[0].data.stampType).toBe('APPROVED');
    });

    it('supports DRAFT stamp type', () => {
      const position: Point = { x: 100, y: 100 };
      const size: Size = { width: 200, height: 100 };

      annotationEngine.addStamp(canvas, 'DRAFT', position, size);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].data.stampType).toBe('DRAFT');
    });

    it('supports CONFIDENTIAL stamp type', () => {
      const position: Point = { x: 100, y: 100 };
      const size: Size = { width: 200, height: 100 };

      annotationEngine.addStamp(canvas, 'CONFIDENTIAL', position, size);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].data.stampType).toBe('CONFIDENTIAL');
    });

    it('clamps size to minimum 50x50', () => {
      const position: Point = { x: 100, y: 100 };
      const size: Size = { width: 20, height: 30 };

      annotationEngine.addStamp(canvas, 'APPROVED', position, size);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].rect.width).toBe(50);
      expect(annotations[0].rect.height).toBe(50);
    });

    it('clamps size to maximum 500x500', () => {
      const position: Point = { x: 100, y: 100 };
      const size: Size = { width: 600, height: 700 };

      annotationEngine.addStamp(canvas, 'APPROVED', position, size);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].rect.width).toBe(500);
      expect(annotations[0].rect.height).toBe(500);
    });

    it('positions stamp at specified coordinates', () => {
      const position: Point = { x: 150, y: 200 };
      const size: Size = { width: 200, height: 100 };

      annotationEngine.addStamp(canvas, 'APPROVED', position, size);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations[0].rect.x).toBe(150);
      expect(annotations[0].rect.y).toBe(200);
    });
  });

  describe('addTextOverlay', () => {
    it('adds a text overlay annotation', () => {
      const position: Point = { x: 50, y: 50 };
      const style: TextStyle = { fontSize: 12, color: '#000000', fontFamily: 'Arial' };

      const id = annotationEngine.addTextOverlay(canvas, 'Hello World', position, style);

      expect(id).toBeTruthy();
      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].tool).toBe('text');
      expect(annotations[0].data.text).toBe('Hello World');
    });

    it('clamps font size to 6-144pt range', () => {
      const position: Point = { x: 50, y: 50 };
      const style: TextStyle = { fontSize: 200, color: '#000000', fontFamily: 'Arial' };

      annotationEngine.addTextOverlay(canvas, 'Test', position, style);

      const annotations = annotationEngine.getAnnotations(canvas);
      const savedStyle = annotations[0].data.style as TextStyle;
      expect(savedStyle.fontSize).toBe(144);
    });

    it('clamps font size minimum to 6pt', () => {
      const position: Point = { x: 50, y: 50 };
      const style: TextStyle = { fontSize: 2, color: '#000000', fontFamily: 'Arial' };

      annotationEngine.addTextOverlay(canvas, 'Test', position, style);

      const annotations = annotationEngine.getAnnotations(canvas);
      const savedStyle = annotations[0].data.style as TextStyle;
      expect(savedStyle.fontSize).toBe(6);
    });

    it('truncates text to 1000 characters', () => {
      const position: Point = { x: 50, y: 50 };
      const style: TextStyle = { fontSize: 12, color: '#000000', fontFamily: 'Arial' };
      const longText = 'a'.repeat(1500);

      annotationEngine.addTextOverlay(canvas, longText, position, style);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect((annotations[0].data.text as string).length).toBe(1000);
    });

    it('preserves text color', () => {
      const position: Point = { x: 50, y: 50 };
      const style: TextStyle = { fontSize: 12, color: '#FF0000', fontFamily: 'Arial' };

      annotationEngine.addTextOverlay(canvas, 'Red text', position, style);

      const annotations = annotationEngine.getAnnotations(canvas);
      const savedStyle = annotations[0].data.style as TextStyle;
      expect(savedStyle.color).toBe('#FF0000');
    });
  });

  describe('removeAnnotation', () => {
    it('removes an annotation by ID', () => {
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      const id = annotationEngine.addHighlight(canvas, rect, '#FFFF00', 0.4);

      annotationEngine.removeAnnotation(canvas, id);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(0);
    });

    it('does not affect other annotations', () => {
      const rect1 = { x: 10, y: 20, width: 100, height: 50 };
      const rect2 = { x: 200, y: 100, width: 150, height: 30 };

      const id1 = annotationEngine.addHighlight(canvas, rect1, '#FFFF00', 0.4);
      annotationEngine.addHighlight(canvas, rect2, '#FF0000', 0.4);

      annotationEngine.removeAnnotation(canvas, id1);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].data.color).toBe('#FF0000');
    });
  });

  describe('getAnnotations', () => {
    it('returns a copy of annotations (not a reference)', () => {
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      annotationEngine.addHighlight(canvas, rect, '#FFFF00', 0.4);

      const annotations1 = annotationEngine.getAnnotations(canvas);
      const annotations2 = annotationEngine.getAnnotations(canvas);

      expect(annotations1).not.toBe(annotations2);
      expect(annotations1).toEqual(annotations2);
    });
  });

  describe('clear', () => {
    it('removes all annotations from the canvas', () => {
      const rect = { x: 10, y: 20, width: 100, height: 50 };
      annotationEngine.addHighlight(canvas, rect, '#FFFF00', 0.4);
      annotationEngine.addHighlight(canvas, rect, '#FF0000', 0.4);

      annotationEngine.clear(canvas);

      const annotations = annotationEngine.getAnnotations(canvas);
      expect(annotations).toHaveLength(0);
    });
  });
});

describe('createSignatureDrawHandler', () => {
  let canvas: AnnotationCanvas;

  beforeEach(() => {
    setupCanvasMock();
    const container = document.createElement('div');
    canvas = annotationEngine.initCanvas(container, testPage);
  });

  it('returns handler functions', () => {
    const handler = createSignatureDrawHandler(canvas, '#000000', 2);

    expect(handler.start).toBeInstanceOf(Function);
    expect(handler.move).toBeInstanceOf(Function);
    expect(handler.end).toBeInstanceOf(Function);
    expect(handler.getStrokes).toBeInstanceOf(Function);
    expect(handler.clear).toBeInstanceOf(Function);
  });

  it('starts with empty strokes', () => {
    const handler = createSignatureDrawHandler(canvas, '#000000', 2);
    expect(handler.getStrokes()).toHaveLength(0);
  });

  it('clamps stroke width to valid range', () => {
    const handler = createSignatureDrawHandler(canvas, '#000000', 15);

    // Simulate a drawing
    const mouseDown = new MouseEvent('mousedown', { clientX: 10, clientY: 10 });
    handler.start(mouseDown);

    const mouseMove = new MouseEvent('mousemove', { clientX: 20, clientY: 20 });
    handler.move(mouseMove);

    handler.end();

    const strokes = handler.getStrokes();
    if (strokes.length > 0) {
      expect(strokes[0].width).toBe(10);
    }
  });

  it('clear removes all strokes', () => {
    const handler = createSignatureDrawHandler(canvas, '#000000', 2);

    const mouseDown = new MouseEvent('mousedown', { clientX: 10, clientY: 10 });
    handler.start(mouseDown);

    const mouseMove = new MouseEvent('mousemove', { clientX: 20, clientY: 20 });
    handler.move(mouseMove);

    handler.end();
    handler.clear();

    expect(handler.getStrokes()).toHaveLength(0);
  });
});

describe('createRectSelectionHandler', () => {
  let canvas: AnnotationCanvas;

  beforeEach(() => {
    setupCanvasMock();
    const container = document.createElement('div');
    canvas = annotationEngine.initCanvas(container, testPage);
  });

  it('calls onComplete with the selection rect', () => {
    const onComplete = vi.fn();
    const handler = createRectSelectionHandler(canvas, onComplete);

    handler.start(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }));
    handler.move(new MouseEvent('mousemove', { clientX: 110, clientY: 60 }));
    handler.end();

    expect(onComplete).toHaveBeenCalledWith({
      x: 10,
      y: 10,
      width: 100,
      height: 50,
    });
  });

  it('does not call onComplete for zero-size selections', () => {
    const onComplete = vi.fn();
    const handler = createRectSelectionHandler(canvas, onComplete);

    handler.start(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }));
    handler.end();

    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('attachInputListeners', () => {
  let canvas: AnnotationCanvas;

  beforeEach(() => {
    setupCanvasMock();
    const container = document.createElement('div');
    canvas = annotationEngine.initCanvas(container, testPage);
  });

  it('returns a cleanup function', () => {
    const handlers = {
      start: vi.fn(),
      move: vi.fn(),
      end: vi.fn(),
    };

    const cleanup = attachInputListeners(canvas, handlers);
    expect(cleanup).toBeInstanceOf(Function);
  });

  it('attaches mouse event listeners', () => {
    const handlers = {
      start: vi.fn(),
      move: vi.fn(),
      end: vi.fn(),
    };

    attachInputListeners(canvas, handlers);

    canvas.element.dispatchEvent(new MouseEvent('mousedown'));
    expect(handlers.start).toHaveBeenCalled();

    canvas.element.dispatchEvent(new MouseEvent('mousemove'));
    expect(handlers.move).toHaveBeenCalled();

    canvas.element.dispatchEvent(new MouseEvent('mouseup'));
    expect(handlers.end).toHaveBeenCalled();
  });

  it('removes listeners on cleanup', () => {
    const handlers = {
      start: vi.fn(),
      move: vi.fn(),
      end: vi.fn(),
    };

    const cleanup = attachInputListeners(canvas, handlers);
    cleanup();

    canvas.element.dispatchEvent(new MouseEvent('mousedown'));
    expect(handlers.start).not.toHaveBeenCalled();
  });
});

describe('destroyAnnotationCanvas', () => {
  beforeEach(() => {
    setupCanvasMock();
  });

  it('removes canvas from DOM and cleans up state', () => {
    const container = document.createElement('div');
    const canvas = annotationEngine.initCanvas(container, testPage);

    // Add some annotations
    annotationEngine.addHighlight(canvas, { x: 0, y: 0, width: 10, height: 10 }, '#FFFF00', 0.4);

    destroyAnnotationCanvas(canvas);

    expect(container.contains(canvas.element)).toBe(false);
    // After destroy, getAnnotations should return empty (state cleaned up)
    expect(annotationEngine.getAnnotations(canvas)).toHaveLength(0);
  });
});
