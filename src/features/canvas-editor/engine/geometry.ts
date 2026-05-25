import type { Viewport, BaseElement } from '../types';
import { MM_TO_PX } from '../constants';

// === Utility Types ===

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// === Element Edges (for snap calculations) ===

export interface ElementEdges {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

// === Coordinate Transforms ===

/**
 * Convert screen coordinates (pixels on canvas) to document coordinates (mm).
 * Inverse of viewport transform: docPos = (screenPos / zoom + panOffset) / MM_TO_PX
 */
export function screenToDocument(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x / viewport.zoom + viewport.panX) / MM_TO_PX,
    y: (screenPoint.y / viewport.zoom + viewport.panY) / MM_TO_PX,
  };
}

/**
 * Convert document coordinates (mm) to screen coordinates (pixels on canvas).
 * Viewport transform: screenPos = (docPos * MM_TO_PX - panOffset) * zoom
 */
export function documentToScreen(docPoint: Point, viewport: Viewport): Point {
  return {
    x: (docPoint.x * MM_TO_PX - viewport.panX) * viewport.zoom,
    y: (docPoint.y * MM_TO_PX - viewport.panY) * viewport.zoom,
  };
}

// === Local Space Transform ===

/**
 * Apply inverse rotation around element center to convert a point into
 * element-local space (origin at element top-left, axes aligned with element).
 *
 * This is used for hit-testing rotated elements: transform the test point
 * into the element's local coordinate system, then do a simple AABB test.
 */
export function transformToLocal(
  point: Point,
  element: Pick<BaseElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>,
): Point {
  // Element center in document space
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  // Translate point so element center is at origin
  const dx = point.x - cx;
  const dy = point.y - cy;

  // Apply inverse rotation (negate the angle)
  const radians = (-element.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const rotatedX = dx * cos - dy * sin;
  const rotatedY = dx * sin + dy * cos;

  // Translate back so origin is at element top-left
  return {
    x: rotatedX + element.width / 2,
    y: rotatedY + element.height / 2,
  };
}

// === Element Edges ===

/**
 * Compute left, right, top, bottom, centerX, centerY for an element.
 * Used for snap-to-alignment calculations.
 */
export function getElementEdges(position: Point, size: Size): ElementEdges {
  return {
    left: position.x,
    right: position.x + size.width,
    top: position.y,
    bottom: position.y + size.height,
    centerX: position.x + size.width / 2,
    centerY: position.y + size.height / 2,
  };
}

// === Bounding Box ===

/**
 * Compute the axis-aligned bounding box for a rotated rectangle.
 * Takes the element's position, size, and rotation, and returns the
 * smallest axis-aligned rectangle that fully contains the rotated element.
 */
export function getBoundingBox(
  element: Pick<BaseElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>,
): Rect {
  const { x, y, width, height, rotation } = element;

  // If no rotation, bounding box is the element itself
  if (rotation === 0) {
    return { x, y, width, height };
  }

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Element center
  const cx = x + width / 2;
  const cy = y + height / 2;

  // Four corners relative to center
  const hw = width / 2;
  const hh = height / 2;

  const corners: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  // Rotate corners and find extents
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    const rx = corner.x * cos - corner.y * sin + cx;
    const ry = corner.x * sin + corner.y * cos + cy;

    if (rx < minX) minX = rx;
    if (ry < minY) minY = ry;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// === Point-in-Rect Test ===

/**
 * Axis-aligned point-in-rectangle test.
 * Returns true if the point is inside or on the boundary of the rectangle.
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// === Mobile Canvas Dimension Clamping ===

/**
 * Calculate canvas buffer dimensions, clamping to a maximum size on mobile
 * devices to prevent GPU memory issues while preserving aspect ratio.
 *
 * On mobile devices, canvas buffers exceeding 4096×4096 can cause rendering
 * failures or excessive memory usage. This function scales down the buffer
 * dimensions proportionally when they exceed the limit.
 *
 * @param pageWidth - The CSS pixel width of the canvas element
 * @param pageHeight - The CSS pixel height of the canvas element
 * @param dpr - Device pixel ratio (window.devicePixelRatio)
 * @param isMobile - Whether the device is mobile (viewport < 768px or touch device)
 * @param maxDimension - Maximum allowed dimension in pixels (default 4096)
 * @returns The clamped buffer width and height in pixels
 */
export function calculateCanvasDimensions(
  pageWidth: number,
  pageHeight: number,
  dpr: number,
  isMobile: boolean,
  maxDimension: number = 4096,
): { width: number; height: number } {
  let width = Math.floor(pageWidth * dpr);
  let height = Math.floor(pageHeight * dpr);

  if (isMobile && (width > maxDimension || height > maxDimension)) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  return { width, height };
}
