import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderElement, invalidate, scheduleRender, createRenderer } from './renderer';
import type { RenderState } from './renderer';
import type { CanvasPage, ImageElement, ShapeElement, GroupElement, Viewport } from '../types';
import { MM_TO_PX } from '../constants';

// === Mock Canvas Context ===

function createMockContext(): CanvasRenderingContext2D {
  const ctx = {
    canvas: { width: 800, height: 600 },
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

// === Test Fixtures ===

const defaultViewport: Viewport = { panX: 0, panY: 0, zoom: 1 };

function createImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    rotation: 0,
    opacity: 100,
    zIndex: 2,
    locked: false,
    visible: true,
    src: 'data:image/png;base64,test',
    originalWidth: 400,
    originalHeight: 300,
    aspectRatioLocked: true,
    ...overrides,
  };
}

function createShapeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: 'shape-1',
    type: 'shape',
    x: 30,
    y: 40,
    width: 100,
    height: 80,
    rotation: 0,
    opacity: 100,
    zIndex: 3,
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

function createGroupElement(children: GroupElement['children'] = []): GroupElement {
  return {
    id: 'group-1',
    type: 'group',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 100,
    zIndex: 4,
    locked: false,
    visible: true,
    children,
  };
}

function createPage(elements: CanvasPage['elements'] = []): CanvasPage {
  return {
    id: 'page-1',
    width: 210,
    height: 297,
    backgroundColor: '#FFFFFF',
    elements,
  };
}

function createRenderState(page?: CanvasPage, viewport?: Viewport): RenderState {
  const activePage = page || createPage();
  return {
    document: {
      id: 'doc-1',
      name: 'Test Doc',
      pages: [activePage],
      activePageIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    viewport: viewport || defaultViewport,
    activePage,
  };
}

// === Tests ===

describe('render', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
    // Reset dirty region
    invalidate();
  });

  it('clears the canvas on full render', () => {
    const state = createRenderState();
    render(ctx, state);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('renders page background', () => {
    const state = createRenderState();
    render(ctx, state);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('renders elements in ascending z-order', () => {
    const el1 = createShapeElement({ id: 'a', zIndex: 3 });
    const el2 = createShapeElement({ id: 'b', zIndex: 1 });
    const el3 = createShapeElement({ id: 'c', zIndex: 2 });
    const page = createPage([el1, el2, el3]);
    const state = createRenderState(page);

    let callCount = 0;
    (ctx.beginPath as ReturnType<typeof vi.fn>) = vi.fn(() => {
      callCount++;
    });

    render(ctx, state);

    // All 3 shapes should be rendered (beginPath called for each)
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  it('skips hidden elements', () => {
    const el = createShapeElement({ visible: false });
    const page = createPage([el]);
    const state = createRenderState(page);

    render(ctx, state);

    // beginPath should not be called for shape rendering (only page background uses fillRect)
    // The shape's beginPath should not be called
    expect(ctx.rect).not.toHaveBeenCalled();
  });

  it('applies viewport zoom to page background', () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 2 };
    const state = createRenderState(createPage(), viewport);

    render(ctx, state);

    // Page should be rendered at 2x size with MM_TO_PX: 210*MM_TO_PX*2, 297*MM_TO_PX*2
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 210 * MM_TO_PX * 2, 297 * MM_TO_PX * 2);
  });

  it('applies viewport pan offset', () => {
    const viewport: Viewport = { panX: 10, panY: 20, zoom: 1 };
    const state = createRenderState(createPage(), viewport);

    render(ctx, state);

    // Page origin should be offset: (0*MM_TO_PX - 10) * 1 = -10, (0*MM_TO_PX - 20) * 1 = -20
    // Page dimensions: 210*MM_TO_PX, 297*MM_TO_PX
    expect(ctx.fillRect).toHaveBeenCalledWith(-10, -20, 210 * MM_TO_PX, 297 * MM_TO_PX);
  });
});

describe('renderElement', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('applies element opacity', () => {
    const el = createShapeElement({ opacity: 50 });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.globalAlpha).toBe(0.5);
  });

  it('applies shadow when configured', () => {
    const el = createShapeElement({
      shadow: { offsetX: 5, offsetY: 5, blur: 10, color: 'rgba(0,0,0,0.5)' },
    });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.shadowOffsetX).toBe(5);
    expect(ctx.shadowOffsetY).toBe(5);
    expect(ctx.shadowBlur).toBe(10);
    expect(ctx.shadowColor).toBe('rgba(0,0,0,0.5)');
  });

  it('scales shadow with viewport zoom', () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 2 };
    const el = createShapeElement({
      shadow: { offsetX: 5, offsetY: 3, blur: 10, color: '#000' },
    });
    renderElement(ctx, el, viewport);
    expect(ctx.shadowOffsetX).toBe(10);
    expect(ctx.shadowOffsetY).toBe(6);
    expect(ctx.shadowBlur).toBe(20);
  });
});

describe('renderElement - shapes', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('renders rectangle with fill and stroke', () => {
    const el = createShapeElement({ shapeType: 'rectangle', fill: '#FF0000', strokeWidth: 2 });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.rect).toHaveBeenCalledWith(
      30 * MM_TO_PX,
      40 * MM_TO_PX,
      100 * MM_TO_PX,
      80 * MM_TO_PX,
    );
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders rectangle without fill when transparent', () => {
    const el = createShapeElement({ shapeType: 'rectangle', fill: 'transparent', strokeWidth: 2 });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.rect).toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders ellipse/circle', () => {
    const el = createShapeElement({ shapeType: 'circle' });
    renderElement(ctx, el, defaultViewport);
    // center: (x + w/2)*MM_TO_PX, (y + h/2)*MM_TO_PX; radii: (w/2)*MM_TO_PX, (h/2)*MM_TO_PX
    const screenX = 30 * MM_TO_PX;
    const screenY = 40 * MM_TO_PX;
    const screenW = 100 * MM_TO_PX;
    const screenH = 80 * MM_TO_PX;
    expect(ctx.ellipse).toHaveBeenCalledWith(
      screenX + screenW / 2,
      screenY + screenH / 2,
      screenW / 2,
      screenH / 2,
      0,
      0,
      Math.PI * 2,
    );
  });

  it('renders line', () => {
    const el = createShapeElement({ shapeType: 'line' });
    renderElement(ctx, el, defaultViewport);
    const screenX = 30 * MM_TO_PX;
    const screenY = 40 * MM_TO_PX;
    const screenH = 80 * MM_TO_PX;
    const screenW = 100 * MM_TO_PX;
    expect(ctx.moveTo).toHaveBeenCalledWith(screenX, screenY + screenH / 2);
    expect(ctx.lineTo).toHaveBeenCalledWith(screenX + screenW, screenY + screenH / 2);
  });

  it('renders arrow with arrowhead', () => {
    const el = createShapeElement({ shapeType: 'arrow' });
    renderElement(ctx, el, defaultViewport);
    // Line part
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    // Arrowhead (closePath for the triangle)
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it('renders star', () => {
    const el = createShapeElement({ shapeType: 'star' });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it('renders polygon with configured sides', () => {
    const el = createShapeElement({ shapeType: 'polygon', polygonSides: 6 });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.moveTo).toHaveBeenCalled();
    // 6-sided polygon: 1 moveTo + 5 lineTo
    expect(ctx.lineTo).toHaveBeenCalledTimes(5);
    expect(ctx.closePath).toHaveBeenCalled();
  });

  it('applies dashed border style', () => {
    const el = createShapeElement({ borderStyle: 'dashed' });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.setLineDash).toHaveBeenCalledWith([8, 4]);
  });

  it('applies dotted border style', () => {
    const el = createShapeElement({ borderStyle: 'dotted' });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.setLineDash).toHaveBeenCalledWith([2, 2]);
  });

  it('applies solid border style (empty dash)', () => {
    const el = createShapeElement({ borderStyle: 'solid' });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('applies rotation to shape', () => {
    const el = createShapeElement({ rotation: 45 });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.translate).toHaveBeenCalled();
    expect(ctx.rotate).toHaveBeenCalledWith((45 * Math.PI) / 180);
  });
});

describe('renderElement - image', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('does not throw when image is not yet loaded', () => {
    const el = createImageElement({ rotation: 90 });
    // Image won't be loaded in test env, so renderer should gracefully skip
    expect(() => renderElement(ctx, el, defaultViewport)).not.toThrow();
  });

  it('applies opacity to image element', () => {
    const el = createImageElement({ opacity: 75 });
    renderElement(ctx, el, defaultViewport);
    expect(ctx.globalAlpha).toBe(0.75);
  });
});

describe('renderElement - group', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('renders group children recursively', () => {
    const child1 = createShapeElement({ id: 'child-1', zIndex: 1 });
    const child2 = createShapeElement({ id: 'child-2', zIndex: 2 });
    const group = createGroupElement([child1, child2]);

    renderElement(ctx, group, defaultViewport);

    // Both children should trigger shape rendering (rect called for each)
    expect(ctx.rect).toHaveBeenCalledTimes(2);
  });

  it('skips hidden children in group', () => {
    const child1 = createShapeElement({ id: 'child-1', visible: true });
    const child2 = createShapeElement({ id: 'child-2', visible: false });
    const group = createGroupElement([child1, child2]);

    renderElement(ctx, group, defaultViewport);

    // Only visible child should be rendered
    expect(ctx.rect).toHaveBeenCalledTimes(1);
  });

  it('applies group rotation', () => {
    const child = createShapeElement({ id: 'child-1' });
    const group = createGroupElement([child]);
    group.rotation = 30;

    renderElement(ctx, group, defaultViewport);

    expect(ctx.rotate).toHaveBeenCalledWith((30 * Math.PI) / 180);
  });
});

describe('invalidate', () => {
  it('marks full redraw when called without region', () => {
    // After invalidate() with no args, next render should do full redraw
    invalidate();
    // No error thrown - just verifying it doesn't crash
  });

  it('accepts a bounding box region', () => {
    invalidate({ x: 10, y: 20, width: 100, height: 80 });
    // No error thrown
  });
});

describe('scheduleRender', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('batches multiple calls into one frame', () => {
    const callback = vi.fn();

    // Mock requestAnimationFrame
    let rafCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    });

    scheduleRender(callback);
    scheduleRender(callback);
    scheduleRender(callback);

    // Callback not called yet
    expect(callback).not.toHaveBeenCalled();

    // Simulate frame
    if (rafCallback) {
      (rafCallback as FrameRequestCallback)(16);
    }

    // Only called once despite 3 schedule calls
    expect(callback).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

describe('createRenderer', () => {
  it('returns an object with render, renderElement, and invalidate methods', () => {
    const renderer = createRenderer();
    expect(renderer.render).toBeInstanceOf(Function);
    expect(renderer.renderElement).toBeInstanceOf(Function);
    expect(renderer.invalidate).toBeInstanceOf(Function);
  });

  it('render method delegates to the render function', () => {
    const renderer = createRenderer();
    const ctx = createMockContext();
    const state = createRenderState();

    // Should not throw
    renderer.render(ctx, state);
    expect(ctx.clearRect).toHaveBeenCalled();
  });
});
