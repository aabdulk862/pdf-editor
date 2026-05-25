import { describe, it, expect } from 'vitest';
import { hitTest, hitTestHandle, getElementsInRect, isPointInShape } from './hit-test';
import type { CanvasElement, ShapeElement, SelectionState, Viewport } from '../types';
import type { Rect } from './geometry';
import { MM_TO_PX } from '../constants';

// === Test Helpers ===

function makeViewport(overrides: Partial<Viewport> = {}): Viewport {
  return { panX: 0, panY: 0, zoom: 1, ...overrides };
}

function makeRectElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: 'rect-1',
    type: 'shape',
    shapeType: 'rectangle',
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 1,
    borderStyle: 'solid',
    ...overrides,
  };
}

function makeCircleElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: 'circle-1',
    type: 'shape',
    shapeType: 'circle',
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    fill: '#00ff00',
    stroke: '#000000',
    strokeWidth: 1,
    borderStyle: 'solid',
    ...overrides,
  };
}

function makeTextElement(overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: 'text-1',
    type: 'text',
    x: 20,
    y: 20,
    width: 200,
    height: 30,
    rotation: 0,
    opacity: 100,
    zIndex: 2,
    locked: false,
    visible: true,
    content: 'Hello',
    fontFamily: 'Arial',
    fontSize: 16,
    fontColor: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left',
    ...overrides,
  } as CanvasElement;
}

// === hitTest ===

describe('hitTest', () => {
  it('returns null for empty elements array', () => {
    const result = hitTest({ x: 50, y: 50 }, [], makeViewport());
    expect(result).toBeNull();
  });

  it('returns null when point is outside all elements', () => {
    const elements = [makeRectElement()];
    // Point at (0, 0) is outside the rect at (10, 10, 100, 50)
    const result = hitTest({ x: 5, y: 5 }, elements, makeViewport());
    expect(result).toBeNull();
  });

  it('returns the element when point is inside', () => {
    const element = makeRectElement();
    const elements = [element];
    // Element is at (10, 10) with size (100, 50) in mm
    // Point at center of element in screen coords: (60 * MM_TO_PX, 35 * MM_TO_PX)
    const result = hitTest({ x: 60 * MM_TO_PX, y: 35 * MM_TO_PX }, elements, makeViewport());
    expect(result).toBe(element);
  });

  it('skips hidden elements', () => {
    const element = makeRectElement({ visible: false });
    const result = hitTest({ x: 50, y: 30 }, [element], makeViewport());
    expect(result).toBeNull();
  });

  it('skips locked elements', () => {
    const element = makeRectElement({ locked: true });
    const result = hitTest({ x: 50, y: 30 }, [element], makeViewport());
    expect(result).toBeNull();
  });

  it('returns the front-most element (highest z-index) when overlapping', () => {
    const back = makeRectElement({ id: 'back', zIndex: 1, x: 10, y: 10, width: 100, height: 100 });
    const front = makeRectElement({
      id: 'front',
      zIndex: 5,
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    });
    const result = hitTest({ x: 50, y: 50 }, [back, front], makeViewport());
    expect(result?.id).toBe('front');
  });

  it('applies viewport transform (zoom and pan)', () => {
    const element = makeRectElement({ x: 100, y: 100, width: 50, height: 50 });
    // With zoom=2, panX=50, panY=50: screenToDocument gives (screenX/zoom + panX) / MM_TO_PX
    // We want doc point inside element, e.g. (125, 125) in mm
    // screenX = (125 * MM_TO_PX - 50) * 2
    const screenX = (125 * MM_TO_PX - 50) * 2;
    const screenY = (125 * MM_TO_PX - 50) * 2;
    const viewport = makeViewport({ zoom: 2, panX: 50, panY: 50 });
    const result = hitTest({ x: screenX, y: screenY }, [element], viewport);
    expect(result).toBe(element);
  });

  it('handles rotated elements correctly', () => {
    // A 100x20 element at (0, 0) rotated 90 degrees
    const element = makeRectElement({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      rotation: 90,
    });
    // Center of element is at (50, 10) in mm. After 90° rotation, a point at center should still hit.
    // Screen coords for center: (50 * MM_TO_PX, 10 * MM_TO_PX)
    const result = hitTest({ x: 50 * MM_TO_PX, y: 10 * MM_TO_PX }, [element], makeViewport());
    expect(result).toBe(element);
  });

  it('performs shape-specific test for circle elements', () => {
    // Circle at (50, 50) with width=100, height=100 in mm
    const circle = makeCircleElement();
    // Point at corner of bounding box (50, 50) in mm is outside the circle
    const cornerResult = hitTest({ x: 50 * MM_TO_PX, y: 50 * MM_TO_PX }, [circle], makeViewport());
    expect(cornerResult).toBeNull();

    // Point at center (100, 100) in mm is inside the circle
    const centerResult = hitTest(
      { x: 100 * MM_TO_PX, y: 100 * MM_TO_PX },
      [circle],
      makeViewport(),
    );
    expect(centerResult).toBe(circle);
  });

  it('hits text elements with simple AABB test', () => {
    const text = makeTextElement();
    // Text element at (20, 20) with size (200, 30) in mm
    // Point inside text bounds in screen coords: (100 * MM_TO_PX, 30 * MM_TO_PX)
    const result = hitTest({ x: 100 * MM_TO_PX, y: 30 * MM_TO_PX }, [text], makeViewport());
    expect(result).toBe(text);
  });
});

// === hitTestHandle ===

describe('hitTestHandle', () => {
  const selectionBounds = { x: 50, y: 50, width: 100, height: 80 };

  function makeSelection(overrides: Partial<SelectionState> = {}): SelectionState {
    return {
      selectedIds: ['elem-1'],
      selectionBounds,
      activeHandle: null,
      ...overrides,
    };
  }

  it('returns null when no selection bounds', () => {
    const selection = makeSelection({ selectionBounds: null });
    const result = hitTestHandle({ x: 50, y: 50 }, selection);
    expect(result).toBeNull();
  });

  it('returns null when no selected ids', () => {
    const selection = makeSelection({ selectedIds: [] });
    const result = hitTestHandle({ x: 50, y: 50 }, selection);
    expect(result).toBeNull();
  });

  it('detects nw handle', () => {
    const result = hitTestHandle({ x: 50, y: 50 }, makeSelection());
    expect(result).toBe('nw');
  });

  it('detects ne handle', () => {
    const result = hitTestHandle({ x: 150, y: 50 }, makeSelection());
    expect(result).toBe('ne');
  });

  it('detects se handle', () => {
    const result = hitTestHandle({ x: 150, y: 130 }, makeSelection());
    expect(result).toBe('se');
  });

  it('detects sw handle', () => {
    const result = hitTestHandle({ x: 50, y: 130 }, makeSelection());
    expect(result).toBe('sw');
  });

  it('detects n handle (top center)', () => {
    const result = hitTestHandle({ x: 100, y: 50 }, makeSelection());
    expect(result).toBe('n');
  });

  it('detects s handle (bottom center)', () => {
    const result = hitTestHandle({ x: 100, y: 130 }, makeSelection());
    expect(result).toBe('s');
  });

  it('detects e handle (right center)', () => {
    const result = hitTestHandle({ x: 150, y: 90 }, makeSelection());
    expect(result).toBe('e');
  });

  it('detects w handle (left center)', () => {
    const result = hitTestHandle({ x: 50, y: 90 }, makeSelection());
    expect(result).toBe('w');
  });

  it('detects rotate handle (above top center)', () => {
    // Rotate handle is at (100, 50 - 20) = (100, 30)
    const result = hitTestHandle({ x: 100, y: 30 }, makeSelection());
    expect(result).toBe('rotate');
  });

  it('returns null when point is not near any handle', () => {
    // Point in the middle of the selection (not near any handle)
    const result = hitTestHandle({ x: 100, y: 90 }, makeSelection());
    expect(result).toBeNull();
  });
});

// === getElementsInRect ===

describe('getElementsInRect', () => {
  it('returns empty array for empty elements', () => {
    const rect: Rect = { x: 0, y: 0, width: 500, height: 500 };
    const result = getElementsInRect(rect, []);
    expect(result).toEqual([]);
  });

  it('returns elements fully contained within rect', () => {
    const element = makeRectElement({ x: 20, y: 20, width: 50, height: 30 });
    const rect: Rect = { x: 0, y: 0, width: 200, height: 200 };
    const result = getElementsInRect(rect, [element]);
    expect(result).toContain(element);
  });

  it('excludes elements partially outside rect', () => {
    const element = makeRectElement({ x: 180, y: 20, width: 50, height: 30 });
    const rect: Rect = { x: 0, y: 0, width: 200, height: 200 };
    // Element extends from 180 to 230, rect ends at 200
    const result = getElementsInRect(rect, [element]);
    expect(result).not.toContain(element);
  });

  it('excludes hidden elements', () => {
    const element = makeRectElement({ x: 20, y: 20, width: 50, height: 30, visible: false });
    const rect: Rect = { x: 0, y: 0, width: 200, height: 200 };
    const result = getElementsInRect(rect, [element]);
    expect(result).not.toContain(element);
  });

  it('includes locked elements (they can be marquee-selected)', () => {
    const element = makeRectElement({ x: 20, y: 20, width: 50, height: 30, locked: true });
    const rect: Rect = { x: 0, y: 0, width: 200, height: 200 };
    const result = getElementsInRect(rect, [element]);
    expect(result).toContain(element);
  });

  it('handles rotated elements using their bounding box', () => {
    // A 100x20 element at (50, 50) rotated 45 degrees
    // Its bounding box will be larger than the original
    const element = makeRectElement({
      x: 50,
      y: 50,
      width: 100,
      height: 20,
      rotation: 45,
    });
    // The bounding box of a 100x20 rect rotated 45° is approximately 84.85 x 84.85
    // centered at (100, 60). So it extends roughly from (57, 17) to (143, 103)
    // A large rect should contain it
    const largeRect: Rect = { x: 0, y: 0, width: 500, height: 500 };
    const result = getElementsInRect(largeRect, [element]);
    expect(result).toContain(element);

    // A small rect that doesn't contain the rotated bounding box
    const smallRect: Rect = { x: 50, y: 50, width: 100, height: 20 };
    const result2 = getElementsInRect(smallRect, [element]);
    expect(result2).not.toContain(element);
  });
});

// === isPointInShape ===

describe('isPointInShape', () => {
  describe('rectangle', () => {
    it('returns true for any point in AABB (rectangle is trivial)', () => {
      const element = makeRectElement({ width: 100, height: 50 });
      expect(isPointInShape({ x: 50, y: 25 }, element)).toBe(true);
      expect(isPointInShape({ x: 0, y: 0 }, element)).toBe(true);
      expect(isPointInShape({ x: 100, y: 50 }, element)).toBe(true);
    });
  });

  describe('circle', () => {
    it('returns true for point at center', () => {
      const element = makeCircleElement({ x: 0, y: 0, width: 100, height: 100 });
      expect(isPointInShape({ x: 50, y: 50 }, element)).toBe(true);
    });

    it('returns false for point at corner of bounding box', () => {
      const element = makeCircleElement({ x: 0, y: 0, width: 100, height: 100 });
      expect(isPointInShape({ x: 0, y: 0 }, element)).toBe(false);
    });

    it('handles elliptical shapes', () => {
      const element = makeCircleElement({ x: 0, y: 0, width: 200, height: 100 });
      // Center is at (100, 50)
      expect(isPointInShape({ x: 100, y: 50 }, element)).toBe(true);
      // Point on the edge of the wider axis
      expect(isPointInShape({ x: 199, y: 50 }, element)).toBe(true);
    });
  });

  describe('line', () => {
    it('returns true for point on the line', () => {
      const element: ShapeElement = {
        ...makeRectElement(),
        shapeType: 'line',
        width: 100,
        height: 100,
        strokeWidth: 4,
      };
      // Point on the diagonal
      expect(isPointInShape({ x: 50, y: 50 }, element)).toBe(true);
    });

    it('returns false for point far from the line', () => {
      const element: ShapeElement = {
        ...makeRectElement(),
        shapeType: 'line',
        width: 100,
        height: 100,
        strokeWidth: 2,
      };
      // Point far from the diagonal
      expect(isPointInShape({ x: 0, y: 100 }, element)).toBe(false);
    });
  });

  describe('polygon', () => {
    it('returns true for point at center of a hexagon', () => {
      const element: ShapeElement = {
        ...makeRectElement(),
        shapeType: 'polygon',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        polygonSides: 6,
      };
      expect(isPointInShape({ x: 50, y: 50 }, element)).toBe(true);
    });

    it('returns false for point at corner of bounding box of a triangle', () => {
      const element: ShapeElement = {
        ...makeRectElement(),
        shapeType: 'polygon',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        polygonSides: 3,
      };
      // Bottom-left corner of bounding box is outside a triangle
      expect(isPointInShape({ x: 1, y: 99 }, element)).toBe(false);
    });
  });
});
