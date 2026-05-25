import type { Viewport, ResizeHandle } from '../types';
import { MM_TO_PX } from '../constants';

// Inline types (geometry.ts may not be ready yet)
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Convert a document-space position to screen-space position.
 * Applies the viewport affine transform: screenPos = (docPos * MM_TO_PX - panOffset) * zoomLevel
 */
export function documentToScreen(docPos: Point, viewport: Viewport): Point {
  return {
    x: (docPos.x * MM_TO_PX - viewport.panX) * viewport.zoom,
    y: (docPos.y * MM_TO_PX - viewport.panY) * viewport.zoom,
  };
}

/**
 * Convert a screen-space position to document-space position.
 * Inverse of the viewport affine transform: docPos = (screenPos / zoomLevel + panOffset) / MM_TO_PX
 */
export function screenToDocument(screenPos: Point, viewport: Viewport): Point {
  return {
    x: (screenPos.x / viewport.zoom + viewport.panX) / MM_TO_PX,
    y: (screenPos.y / viewport.zoom + viewport.panY) / MM_TO_PX,
  };
}

/**
 * Snap rotation angle to 15° increments when Shift is held.
 * When Shift is not held, normalizes the angle to [0, 360).
 */
export function snapRotation(angle: number, shiftHeld: boolean): number {
  if (!shiftHeld) return ((angle % 360) + 360) % 360;
  const increment = 15;
  return (((Math.round(angle / increment) * increment) % 360) + 360) % 360;
}

/**
 * Resize an element with optional aspect ratio lock.
 *
 * When locked: uses the dominant axis (larger absolute delta) to determine
 * the new size while maintaining the original aspect ratio.
 *
 * When not locked: applies the drag delta directly based on handle direction.
 *
 * Minimum size of 1 for both dimensions.
 */
export function resizeWithAspectLock(
  original: Size,
  dragDelta: Point,
  handle: ResizeHandle,
  locked: boolean,
): Size {
  if (!locked) {
    return applyFreeDelta(original, dragDelta, handle);
  }

  const aspectRatio = original.width / original.height;

  // Determine effective deltas based on handle
  const { dx, dy } = getEffectiveDeltas(dragDelta, handle);

  // Use dominant axis to determine new size
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let newWidth: number;
  let newHeight: number;

  if (absDx >= absDy) {
    // Width is dominant
    newWidth = original.width + dx;
    newHeight = newWidth / aspectRatio;
  } else {
    // Height is dominant
    newHeight = original.height + dy;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.max(1, newWidth),
    height: Math.max(1, newHeight),
  };
}

/**
 * Calculate placement for an image dropped onto the canvas.
 * Scales to fit within 80% of the viewport while maintaining aspect ratio.
 * Never upscales (scale capped at 1).
 * Centers in the visible viewport area (converted to document coords).
 */
export function calculateImagePlacement(
  imageSize: Size,
  viewportSize: Size,
  viewport: Viewport,
): { x: number; y: number; width: number; height: number } {
  // Scale to fit within 80% of viewport while maintaining aspect ratio
  const scale = Math.min(
    (viewportSize.width * 0.8) / imageSize.width,
    (viewportSize.height * 0.8) / imageSize.height,
    1, // never upscale
  );

  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  // Center in visible viewport area (convert to document mm coords)
  // panX/panY are in pixel space, viewportSize is in CSS pixels
  // centerPx = panX + viewportSize / zoom / 2 (center of visible area in px)
  // centerMm = centerPx / MM_TO_PX
  const centerX = (viewport.panX + viewportSize.width / viewport.zoom / 2) / MM_TO_PX;
  const centerY = (viewport.panY + viewportSize.height / viewport.zoom / 2) / MM_TO_PX;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

// === Internal helpers ===

/**
 * Get effective delta values based on which handle is being dragged.
 * Corner handles use both axes, edge handles use only one axis.
 */
function getEffectiveDeltas(dragDelta: Point, handle: ResizeHandle): { dx: number; dy: number } {
  switch (handle) {
    case 'e':
      return { dx: dragDelta.x, dy: 0 };
    case 'w':
      return { dx: -dragDelta.x, dy: 0 };
    case 's':
      return { dx: 0, dy: dragDelta.y };
    case 'n':
      return { dx: 0, dy: -dragDelta.y };
    case 'se':
      return { dx: dragDelta.x, dy: dragDelta.y };
    case 'sw':
      return { dx: -dragDelta.x, dy: dragDelta.y };
    case 'ne':
      return { dx: dragDelta.x, dy: -dragDelta.y };
    case 'nw':
      return { dx: -dragDelta.x, dy: -dragDelta.y };
    default:
      return { dx: dragDelta.x, dy: dragDelta.y };
  }
}

/**
 * Apply drag delta freely (no aspect ratio lock) based on handle direction.
 * Minimum size of 1 for both dimensions.
 */
function applyFreeDelta(original: Size, dragDelta: Point, handle: ResizeHandle): Size {
  let newWidth = original.width;
  let newHeight = original.height;

  switch (handle) {
    case 'e':
      newWidth += dragDelta.x;
      break;
    case 'w':
      newWidth -= dragDelta.x;
      break;
    case 's':
      newHeight += dragDelta.y;
      break;
    case 'n':
      newHeight -= dragDelta.y;
      break;
    case 'se':
      newWidth += dragDelta.x;
      newHeight += dragDelta.y;
      break;
    case 'sw':
      newWidth -= dragDelta.x;
      newHeight += dragDelta.y;
      break;
    case 'ne':
      newWidth += dragDelta.x;
      newHeight -= dragDelta.y;
      break;
    case 'nw':
      newWidth -= dragDelta.x;
      newHeight -= dragDelta.y;
      break;
  }

  return {
    width: Math.max(1, newWidth),
    height: Math.max(1, newHeight),
  };
}
