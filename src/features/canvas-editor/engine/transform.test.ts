import { describe, it, expect } from 'vitest';
import {
  documentToScreen,
  screenToDocument,
  snapRotation,
  resizeWithAspectLock,
  calculateImagePlacement,
} from './transform';
import type { Viewport } from '../types';
import { MM_TO_PX } from '../constants';

describe('documentToScreen', () => {
  // Formula: screenPos = (docMm * MM_TO_PX - panOffset) * zoom
  it('applies viewport transform: screenPos = (docMm * MM_TO_PX - panOffset) * zoom', () => {
    const viewport: Viewport = { panX: 10, panY: 20, zoom: 2 };
    const result = documentToScreen({ x: 50, y: 60 }, viewport);
    expect(result.x).toBeCloseTo((50 * MM_TO_PX - 10) * 2);
    expect(result.y).toBeCloseTo((60 * MM_TO_PX - 20) * 2);
  });

  it('handles zero pan offset', () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 1 };
    const result = documentToScreen({ x: 100, y: 200 }, viewport);
    expect(result.x).toBeCloseTo(100 * MM_TO_PX);
    expect(result.y).toBeCloseTo(200 * MM_TO_PX);
  });

  it('handles fractional zoom', () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 0.5 };
    const result = documentToScreen({ x: 100, y: 200 }, viewport);
    expect(result.x).toBeCloseTo(100 * MM_TO_PX * 0.5);
    expect(result.y).toBeCloseTo(200 * MM_TO_PX * 0.5);
  });
});

describe('screenToDocument', () => {
  // Formula: docMm = (screenPos / zoom + panOffset) / MM_TO_PX
  it('inverts the viewport transform: docMm = (screenPos / zoom + panOffset) / MM_TO_PX', () => {
    const viewport: Viewport = { panX: 10, panY: 20, zoom: 2 };
    const result = screenToDocument({ x: 80, y: 80 }, viewport);
    expect(result.x).toBeCloseTo((80 / 2 + 10) / MM_TO_PX);
    expect(result.y).toBeCloseTo((80 / 2 + 20) / MM_TO_PX);
  });

  it('is the inverse of documentToScreen', () => {
    const viewport: Viewport = { panX: 15, panY: 25, zoom: 1.5 };
    const original = { x: 42, y: 73 };
    const screen = documentToScreen(original, viewport);
    const roundTrip = screenToDocument(screen, viewport);
    expect(roundTrip.x).toBeCloseTo(original.x);
    expect(roundTrip.y).toBeCloseTo(original.y);
  });
});

describe('snapRotation', () => {
  it('normalizes angle to [0, 360) when Shift is not held', () => {
    expect(snapRotation(45, false)).toBe(45);
    expect(snapRotation(370, false)).toBe(10);
    expect(snapRotation(720, false)).toBe(0);
  });

  it('handles negative angles when Shift is not held', () => {
    expect(snapRotation(-10, false)).toBe(350);
    expect(snapRotation(-360, false)).toBe(0);
  });

  it('snaps to nearest 15° increment when Shift is held', () => {
    expect(snapRotation(0, true)).toBe(0);
    expect(snapRotation(7, true)).toBe(0);
    expect(snapRotation(8, true)).toBe(15);
    expect(snapRotation(15, true)).toBe(15);
    expect(snapRotation(22, true)).toBe(15);
    expect(snapRotation(23, true)).toBe(30);
    expect(snapRotation(90, true)).toBe(90);
    expect(snapRotation(350, true)).toBe(345);
  });

  it('wraps around 360 when Shift is held', () => {
    expect(snapRotation(360, true)).toBe(0);
    expect(snapRotation(375, true)).toBe(15);
  });

  it('handles negative angles when Shift is held', () => {
    expect(snapRotation(-7, true)).toBe(0);
    expect(snapRotation(-8, true)).toBe(345);
  });
});

describe('resizeWithAspectLock', () => {
  const squareOriginal = { width: 100, height: 100 };
  const wideOriginal = { width: 200, height: 100 };

  describe('when locked', () => {
    it('maintains aspect ratio using dominant axis (width dominant)', () => {
      const result = resizeWithAspectLock(wideOriginal, { x: 50, y: 10 }, 'se', true);
      // Width dominant: newWidth = 200 + 50 = 250, newHeight = 250 / 2 = 125
      expect(result.width).toBe(250);
      expect(result.height).toBe(125);
    });

    it('maintains aspect ratio using dominant axis (height dominant)', () => {
      const result = resizeWithAspectLock(wideOriginal, { x: 10, y: 50 }, 'se', true);
      // Height dominant: newHeight = 100 + 50 = 150, newWidth = 150 * 2 = 300
      expect(result.width).toBe(300);
      expect(result.height).toBe(150);
    });

    it('enforces minimum size of 1', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: -200, y: -200 }, 'se', true);
      expect(result.width).toBeGreaterThanOrEqual(1);
      expect(result.height).toBeGreaterThanOrEqual(1);
    });

    it('preserves aspect ratio for square', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: 50, y: 30 }, 'se', true);
      expect(result.width).toBeCloseTo(result.height);
    });
  });

  describe('when not locked', () => {
    it('applies delta freely for SE handle', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: 30, y: 20 }, 'se', false);
      expect(result.width).toBe(130);
      expect(result.height).toBe(120);
    });

    it('applies delta freely for E handle (width only)', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: 30, y: 20 }, 'e', false);
      expect(result.width).toBe(130);
      expect(result.height).toBe(100);
    });

    it('applies delta freely for S handle (height only)', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: 30, y: 20 }, 's', false);
      expect(result.width).toBe(100);
      expect(result.height).toBe(120);
    });

    it('applies inverted delta for W handle', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: -30, y: 0 }, 'w', false);
      expect(result.width).toBe(130); // width -= (-30) → 100 + 30
      expect(result.height).toBe(100);
    });

    it('applies inverted delta for N handle', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: 0, y: -20 }, 'n', false);
      expect(result.width).toBe(100);
      expect(result.height).toBe(120); // height -= (-20) → 100 + 20
    });

    it('enforces minimum size of 1', () => {
      const result = resizeWithAspectLock(squareOriginal, { x: -200, y: -200 }, 'se', false);
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
    });
  });
});

describe('calculateImagePlacement', () => {
  const defaultViewport: Viewport = { panX: 0, panY: 0, zoom: 1 };
  const viewportSize = { width: 1000, height: 800 };

  it('scales image to fit within 80% of viewport', () => {
    const imageSize = { width: 2000, height: 1000 };
    const result = calculateImagePlacement(imageSize, viewportSize, defaultViewport);

    // 80% of viewport: 800x640
    // Scale by width: 800/2000 = 0.4, by height: 640/1000 = 0.64
    // Min(0.4, 0.64, 1) = 0.4
    expect(result.width).toBe(2000 * 0.4); // 800
    expect(result.height).toBe(1000 * 0.4); // 400
  });

  it('never upscales (scale capped at 1)', () => {
    const imageSize = { width: 100, height: 50 };
    const result = calculateImagePlacement(imageSize, viewportSize, defaultViewport);

    // 80% of viewport: 800x640
    // Scale by width: 800/100 = 8, by height: 640/50 = 12.8
    // Min(8, 12.8, 1) = 1
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('centers image in visible viewport area', () => {
    const imageSize = { width: 100, height: 100 };
    const result = calculateImagePlacement(imageSize, viewportSize, defaultViewport);

    // Center of viewport in doc mm: (0 + 1000/1/2) / MM_TO_PX, (0 + 800/1/2) / MM_TO_PX
    // = 500 / MM_TO_PX, 400 / MM_TO_PX
    // Image is 100x100 (no upscale), so placed at (center - 50)
    const expectedX = 500 / MM_TO_PX - 50;
    const expectedY = 400 / MM_TO_PX - 50;
    expect(result.x).toBeCloseTo(expectedX);
    expect(result.y).toBeCloseTo(expectedY);
  });

  it('accounts for viewport pan and zoom when centering', () => {
    const viewport: Viewport = { panX: 100, panY: 50, zoom: 2 };
    const imageSize = { width: 100, height: 100 };
    const result = calculateImagePlacement(imageSize, viewportSize, viewport);

    // Center in doc mm: (100 + 1000/2/2) / MM_TO_PX, (50 + 800/2/2) / MM_TO_PX
    // = 350 / MM_TO_PX, 250 / MM_TO_PX
    const expectedX = 350 / MM_TO_PX - 50;
    const expectedY = 250 / MM_TO_PX - 50;
    expect(result.x).toBeCloseTo(expectedX);
    expect(result.y).toBeCloseTo(expectedY);
  });

  it('maintains aspect ratio', () => {
    const imageSize = { width: 1600, height: 900 };
    const result = calculateImagePlacement(imageSize, viewportSize, defaultViewport);

    const originalRatio = imageSize.width / imageSize.height;
    const resultRatio = result.width / result.height;
    expect(resultRatio).toBeCloseTo(originalRatio);
  });
});
