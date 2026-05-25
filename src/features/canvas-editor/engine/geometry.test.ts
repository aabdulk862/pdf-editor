import { describe, it, expect } from 'vitest';
import {
  screenToDocument,
  documentToScreen,
  transformToLocal,
  getElementEdges,
  getBoundingBox,
  isPointInRect,
} from './geometry';
import { MM_TO_PX } from '../constants';

describe('screenToDocument', () => {
  // Formula: docMm = (screenPos / zoom + panOffset) / MM_TO_PX
  it('converts screen pixels to document mm with default viewport', () => {
    const result = screenToDocument({ x: 100, y: 200 }, { panX: 0, panY: 0, zoom: 1 });
    expect(result.x).toBeCloseTo(100 / MM_TO_PX);
    expect(result.y).toBeCloseTo(200 / MM_TO_PX);
  });

  it('accounts for zoom level', () => {
    const result = screenToDocument({ x: 200, y: 400 }, { panX: 0, panY: 0, zoom: 2 });
    expect(result.x).toBeCloseTo(200 / 2 / MM_TO_PX);
    expect(result.y).toBeCloseTo(400 / 2 / MM_TO_PX);
  });

  it('accounts for pan offset', () => {
    const result = screenToDocument({ x: 100, y: 100 }, { panX: 50, panY: 30, zoom: 1 });
    expect(result.x).toBeCloseTo((100 + 50) / MM_TO_PX);
    expect(result.y).toBeCloseTo((100 + 30) / MM_TO_PX);
  });

  it('accounts for both zoom and pan', () => {
    const result = screenToDocument({ x: 200, y: 400 }, { panX: 10, panY: 20, zoom: 2 });
    expect(result.x).toBeCloseTo((200 / 2 + 10) / MM_TO_PX);
    expect(result.y).toBeCloseTo((400 / 2 + 20) / MM_TO_PX);
  });
});

describe('documentToScreen', () => {
  // Formula: screenPos = (docMm * MM_TO_PX - panOffset) * zoom
  it('converts document mm to screen pixels with default viewport', () => {
    const result = documentToScreen({ x: 100, y: 200 }, { panX: 0, panY: 0, zoom: 1 });
    expect(result.x).toBeCloseTo(100 * MM_TO_PX);
    expect(result.y).toBeCloseTo(200 * MM_TO_PX);
  });

  it('accounts for zoom level', () => {
    const result = documentToScreen({ x: 100, y: 200 }, { panX: 0, panY: 0, zoom: 2 });
    expect(result.x).toBeCloseTo(100 * MM_TO_PX * 2);
    expect(result.y).toBeCloseTo(200 * MM_TO_PX * 2);
  });

  it('accounts for pan offset', () => {
    const result = documentToScreen({ x: 150, y: 130 }, { panX: 50, panY: 30, zoom: 1 });
    expect(result.x).toBeCloseTo(150 * MM_TO_PX - 50);
    expect(result.y).toBeCloseTo(130 * MM_TO_PX - 30);
  });

  it('is the inverse of screenToDocument', () => {
    const viewport = { panX: 15, panY: 25, zoom: 1.5 };
    const original = { x: 42, y: 73 };
    const screen = documentToScreen(original, viewport);
    const roundTrip = screenToDocument(screen, viewport);
    expect(roundTrip.x).toBeCloseTo(original.x);
    expect(roundTrip.y).toBeCloseTo(original.y);
  });
});

describe('transformToLocal', () => {
  it('returns point relative to element top-left when no rotation', () => {
    const element = { x: 10, y: 20, width: 100, height: 50, rotation: 0 };
    const point = { x: 60, y: 45 };
    const local = transformToLocal(point, element);
    expect(local.x).toBeCloseTo(50);
    expect(local.y).toBeCloseTo(25);
  });

  it('handles 90-degree rotation', () => {
    const element = { x: 0, y: 0, width: 100, height: 100, rotation: 90 };
    // Point at element center should map to center of local space
    const center = transformToLocal({ x: 50, y: 50 }, element);
    expect(center.x).toBeCloseTo(50);
    expect(center.y).toBeCloseTo(50);
  });

  it('handles 180-degree rotation', () => {
    const element = { x: 0, y: 0, width: 100, height: 100, rotation: 180 };
    // Point at top-left corner in document space maps to bottom-right in local space
    const local = transformToLocal({ x: 0, y: 0 }, element);
    expect(local.x).toBeCloseTo(100);
    expect(local.y).toBeCloseTo(100);
  });

  it('handles 45-degree rotation', () => {
    const element = { x: 0, y: 0, width: 100, height: 100, rotation: 45 };
    // Center point should remain at center
    const local = transformToLocal({ x: 50, y: 50 }, element);
    expect(local.x).toBeCloseTo(50);
    expect(local.y).toBeCloseTo(50);
  });
});

describe('getElementEdges', () => {
  it('computes edges for a basic element', () => {
    const edges = getElementEdges({ x: 10, y: 20 }, { width: 100, height: 50 });
    expect(edges).toEqual({
      left: 10,
      right: 110,
      top: 20,
      bottom: 70,
      centerX: 60,
      centerY: 45,
    });
  });

  it('handles zero position', () => {
    const edges = getElementEdges({ x: 0, y: 0 }, { width: 200, height: 300 });
    expect(edges).toEqual({
      left: 0,
      right: 200,
      top: 0,
      bottom: 300,
      centerX: 100,
      centerY: 150,
    });
  });
});

describe('getBoundingBox', () => {
  it('returns element rect when no rotation', () => {
    const bbox = getBoundingBox({ x: 10, y: 20, width: 100, height: 50, rotation: 0 });
    expect(bbox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('computes larger bounding box for 45-degree rotation', () => {
    const bbox = getBoundingBox({ x: 0, y: 0, width: 100, height: 100, rotation: 45 });
    // A 100x100 square rotated 45° has a bounding box of ~141x141
    const diagonal = Math.sqrt(2) * 100;
    expect(bbox.width).toBeCloseTo(diagonal);
    expect(bbox.height).toBeCloseTo(diagonal);
  });

  it('computes bounding box for 90-degree rotation', () => {
    const bbox = getBoundingBox({ x: 0, y: 0, width: 200, height: 100, rotation: 90 });
    // 200x100 rotated 90° becomes 100x200
    expect(bbox.width).toBeCloseTo(100);
    expect(bbox.height).toBeCloseTo(200);
  });

  it('preserves center point after rotation', () => {
    const element = { x: 50, y: 30, width: 120, height: 80, rotation: 30 };
    const bbox = getBoundingBox(element);
    const originalCenterX = element.x + element.width / 2;
    const originalCenterY = element.y + element.height / 2;
    const bboxCenterX = bbox.x + bbox.width / 2;
    const bboxCenterY = bbox.y + bbox.height / 2;
    expect(bboxCenterX).toBeCloseTo(originalCenterX);
    expect(bboxCenterY).toBeCloseTo(originalCenterY);
  });
});

describe('isPointInRect', () => {
  const rect = { x: 10, y: 20, width: 100, height: 50 };

  it('returns true for point inside rect', () => {
    expect(isPointInRect({ x: 50, y: 40 }, rect)).toBe(true);
  });

  it('returns true for point on boundary', () => {
    expect(isPointInRect({ x: 10, y: 20 }, rect)).toBe(true); // top-left
    expect(isPointInRect({ x: 110, y: 70 }, rect)).toBe(true); // bottom-right
  });

  it('returns false for point outside rect', () => {
    expect(isPointInRect({ x: 5, y: 40 }, rect)).toBe(false); // left
    expect(isPointInRect({ x: 115, y: 40 }, rect)).toBe(false); // right
    expect(isPointInRect({ x: 50, y: 15 }, rect)).toBe(false); // above
    expect(isPointInRect({ x: 50, y: 75 }, rect)).toBe(false); // below
  });
});
