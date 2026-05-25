import { describe, it, expect } from 'vitest';
import { calculateSnap, getSnapGuides } from './snap';
import type { CanvasElement } from '../types';

// Helper to create a minimal shape element for testing
function makeElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): CanvasElement {
  return {
    id,
    type: 'shape',
    shapeType: 'rectangle',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 100,
    zIndex: 0,
    locked: false,
    visible: true,
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 1,
    borderStyle: 'solid',
  };
}

describe('calculateSnap', () => {
  describe('when snap is disabled', () => {
    it('returns position unchanged with no guides', () => {
      const result = calculateSnap({ x: 17, y: 23 }, { width: 50, height: 30 }, [], 10, false);
      expect(result).toEqual({ snappedX: 17, snappedY: 23, guides: [] });
    });

    it('ignores nearby elements when disabled', () => {
      const elements = [makeElement('a', 17, 23, 50, 30)];
      const result = calculateSnap(
        { x: 18, y: 24 },
        { width: 50, height: 30 },
        elements,
        10,
        false,
      );
      expect(result).toEqual({ snappedX: 18, snappedY: 24, guides: [] });
    });
  });

  describe('grid snapping', () => {
    it('snaps to nearest grid intersection when within threshold', () => {
      const result = calculateSnap({ x: 22, y: 38 }, { width: 50, height: 30 }, [], 20, true);
      expect(result.snappedX).toBe(20);
      expect(result.snappedY).toBe(40);
    });

    it('does not snap when beyond threshold', () => {
      const result = calculateSnap({ x: 16, y: 34 }, { width: 50, height: 30 }, [], 20, true);
      // 16 is 4px from 20 (within 5px threshold) → snaps
      expect(result.snappedX).toBe(20);
      // 34 is 6px from both 20 and 40 → does not snap
      expect(result.snappedY).toBe(34);
    });

    it('snaps exactly at threshold boundary (5px)', () => {
      const result = calculateSnap({ x: 25, y: 25 }, { width: 50, height: 30 }, [], 20, true);
      // 25 is 5px from 20 → within threshold, snaps
      expect(result.snappedX).toBe(20);
      expect(result.snappedY).toBe(20);
    });

    it('does not snap when exactly at grid line', () => {
      const result = calculateSnap({ x: 40, y: 60 }, { width: 50, height: 30 }, [], 20, true);
      expect(result.snappedX).toBe(40);
      expect(result.snappedY).toBe(60);
    });
  });

  describe('smart alignment with other elements', () => {
    it('snaps left edge to left edge of another element', () => {
      const elements = [makeElement('target', 100, 50, 80, 40)];
      // Position at x=103 → left edge is 103, target left is 100, diff=3 → snaps
      const result = calculateSnap(
        { x: 103, y: 200 },
        { width: 60, height: 30 },
        elements,
        20,
        true,
      );
      expect(result.snappedX).toBe(100);
      expect(result.guides).toContainEqual({
        type: 'vertical',
        position: 100,
        sourceId: 'target',
      });
    });

    it('snaps right edge to right edge of another element', () => {
      const elements = [makeElement('target', 100, 50, 80, 40)];
      // target right = 180. Our element: x + width = right → x = 180 - 60 = 120
      // Position at x=118 → right edge = 178, target right = 180, diff=2 → snaps
      const result = calculateSnap(
        { x: 118, y: 200 },
        { width: 60, height: 30 },
        elements,
        20,
        true,
      );
      expect(result.snappedX).toBe(120);
      expect(result.guides).toContainEqual({
        type: 'vertical',
        position: 180,
        sourceId: 'target',
      });
    });

    it('snaps center to center of another element', () => {
      const elements = [makeElement('target', 100, 50, 80, 40)];
      // target centerX = 140, target centerY = 70
      // Our element: centerX = x + 30, so x = 140 - 30 = 110
      // Position at x=112 → centerX = 142, target centerX = 140, diff=2 → snaps
      const result = calculateSnap(
        { x: 112, y: 200 },
        { width: 60, height: 30 },
        elements,
        20,
        true,
      );
      expect(result.snappedX).toBe(110);
      expect(result.guides).toContainEqual({
        type: 'vertical',
        position: 140,
        sourceId: 'target',
      });
    });

    it('snaps top edge to top edge of another element', () => {
      // Use an element where top-top is the closest alignment
      // target at y=200, height=40 → top=200, bottom=240, centerY=220
      // Our element: y=203, height=30 → top=203, bottom=233, centerY=218
      // top-top: |203-200|=3, centerY-centerY: |218-220|=2 → centerY is closer
      // So use a position where top-top is uniquely closest:
      // target at y=200, height=100 → top=200, bottom=300, centerY=250
      // Our element: y=202, height=30 → top=202, bottom=232, centerY=217
      // top-top: |202-200|=2, bottom-top: |232-200|=32, centerY-centerY: |217-250|=33
      const elements = [makeElement('target', 100, 200, 80, 100)];
      const result = calculateSnap(
        { x: 300, y: 202 },
        { width: 60, height: 30 },
        elements,
        20,
        true,
      );
      expect(result.snappedY).toBe(200);
      expect(result.guides).toContainEqual({
        type: 'horizontal',
        position: 200,
        sourceId: 'target',
      });
    });

    it('snaps bottom edge to bottom edge of another element', () => {
      const elements = [makeElement('target', 100, 50, 80, 40)];
      // target bottom = 90. Our element: y + height = bottom → y = 90 - 30 = 60
      // Position at y=62 → bottom = 92, target bottom = 90, diff=2 → snaps
      const result = calculateSnap(
        { x: 200, y: 62 },
        { width: 60, height: 30 },
        elements,
        20,
        true,
      );
      expect(result.snappedY).toBe(60);
      expect(result.guides).toContainEqual({
        type: 'horizontal',
        position: 90,
        sourceId: 'target',
      });
    });

    it('does not snap when no element is within threshold', () => {
      const elements = [makeElement('far', 500, 500, 80, 40)];
      const result = calculateSnap({ x: 10, y: 10 }, { width: 60, height: 30 }, elements, 20, true);
      // Should only grid-snap (10 is on grid with spacing 20)
      expect(result.snappedX).toBe(10);
      expect(result.snappedY).toBe(10);
      expect(result.guides).toHaveLength(0);
    });

    it('element alignment overrides grid snap', () => {
      // Grid spacing 20, position at x=22 → grid snaps to 20
      // But element at x=23 → left-to-left diff from 22 is 1 (closer)
      const elements = [makeElement('close', 23, 50, 80, 40)];
      const result = calculateSnap(
        { x: 22, y: 200 },
        { width: 60, height: 30 },
        elements,
        20,
        true,
      );
      // Grid snap first moves to 20, then element alignment: left edge 20 vs 23, diff=3 → snaps to 23
      expect(result.snappedX).toBe(23);
    });
  });

  describe('with empty elements array', () => {
    it('only performs grid snapping', () => {
      const result = calculateSnap({ x: 42, y: 58 }, { width: 50, height: 30 }, [], 10, true);
      expect(result.snappedX).toBe(40);
      expect(result.snappedY).toBe(60);
      expect(result.guides).toHaveLength(0);
    });
  });
});

describe('getSnapGuides', () => {
  it('returns empty array when no elements nearby', () => {
    const elements = [makeElement('far', 500, 500, 80, 40)];
    const guides = getSnapGuides({ x: 10, y: 10 }, { width: 60, height: 30 }, elements);
    expect(guides).toHaveLength(0);
  });

  it('returns vertical guides for horizontal alignment', () => {
    const elements = [makeElement('target', 100, 50, 80, 40)];
    // Position at x=102 → left edge = 102, target left = 100, diff=2 → guide
    const guides = getSnapGuides({ x: 102, y: 200 }, { width: 60, height: 30 }, elements);
    expect(guides).toContainEqual({
      type: 'vertical',
      position: 100,
      sourceId: 'target',
    });
  });

  it('returns horizontal guides for vertical alignment', () => {
    const elements = [makeElement('target', 100, 50, 80, 40)];
    // Position at y=52 → top edge = 52, target top = 50, diff=2 → guide
    const guides = getSnapGuides({ x: 200, y: 52 }, { width: 60, height: 30 }, elements);
    expect(guides).toContainEqual({
      type: 'horizontal',
      position: 50,
      sourceId: 'target',
    });
  });

  it('returns multiple guides when aligned with multiple elements', () => {
    const elements = [makeElement('a', 100, 50, 80, 40), makeElement('b', 100, 150, 60, 60)];
    // Position at x=102 → left edge = 102, both targets have left = 100, diff=2
    const guides = getSnapGuides({ x: 102, y: 300 }, { width: 60, height: 30 }, elements);
    const verticalGuides = guides.filter((g) => g.type === 'vertical');
    expect(verticalGuides.length).toBeGreaterThanOrEqual(2);
  });

  it('returns guides for center alignment', () => {
    const elements = [makeElement('target', 100, 50, 80, 40)];
    // target centerX = 140. Our element: centerX = x + 30 = 140 → x = 110
    // Position at x=111 → centerX = 141, target centerX = 140, diff=1 → guide
    const guides = getSnapGuides({ x: 111, y: 200 }, { width: 60, height: 30 }, elements);
    expect(guides).toContainEqual({
      type: 'vertical',
      position: 140,
      sourceId: 'target',
    });
  });
});
