import type {
  CanvasDocument,
  CanvasElement,
  CanvasPage,
  Viewport,
  BoundingBox,
  TextElement,
  ImageElement,
  ShapeElement,
  GroupElement,
  ShadowConfig,
  BorderStyle,
} from '../types';
import { MM_TO_PX } from '../constants';
import { renderTextElement } from './text-layout';

// === Types ===

export interface RenderState {
  document: CanvasDocument;
  viewport: Viewport;
  activePage: CanvasPage;
  ghostElement?: CanvasElement | null;
}

export interface CanvasRenderer {
  render(ctx: CanvasRenderingContext2D, state: RenderState): void;
  renderElement(ctx: CanvasRenderingContext2D, element: CanvasElement, viewport: Viewport): void;
  invalidate(region?: BoundingBox): void;
}

// === Internal State ===

let dirtyRegion: BoundingBox | null = null;
let frameRequested = false;
let pendingRenderCallback: (() => void) | null = null;

// === Image Cache ===

const imageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    if (img.complete && img.naturalWidth > 0) {
      return img;
    }
  }
  // Start loading
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img.complete && img.naturalWidth > 0 ? img : null;
}

// === Dirty-Rect Optimization ===

/**
 * Mark a region as needing redraw. During drag operations, only the
 * affected region is redrawn for performance.
 */
export function invalidate(region?: BoundingBox): void {
  if (!region) {
    dirtyRegion = null; // null means full redraw
    return;
  }

  if (dirtyRegion === null) {
    // Already marked for full redraw
    return;
  }

  // Expand dirty region to include new region
  if (dirtyRegion.width === 0 && dirtyRegion.height === 0) {
    dirtyRegion = { ...region };
  } else {
    const minX = Math.min(dirtyRegion.x, region.x);
    const minY = Math.min(dirtyRegion.y, region.y);
    const maxX = Math.max(dirtyRegion.x + dirtyRegion.width, region.x + region.width);
    const maxY = Math.max(dirtyRegion.y + dirtyRegion.height, region.y + region.height);
    dirtyRegion = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}

/**
 * Schedule a render on the next animation frame. Multiple calls within
 * the same frame are batched into a single render.
 */
export function scheduleRender(callback: () => void): void {
  pendingRenderCallback = callback;
  if (!frameRequested) {
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      if (pendingRenderCallback) {
        pendingRenderCallback();
        pendingRenderCallback = null;
      }
    });
  }
}

// === Main Render Function ===

/**
 * Render the full canvas state: clear, apply viewport transform,
 * render page background, then render all visible elements in z-order.
 */
export function render(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const { viewport, activePage } = state;
  const canvas = ctx.canvas;

  // Determine if we can use dirty-rect optimization
  const useDirtyRect = dirtyRegion !== null && dirtyRegion.width > 0 && dirtyRegion.height > 0;

  if (useDirtyRect && dirtyRegion) {
    // Only clear the dirty region (in screen coordinates)
    const screenX = (dirtyRegion.x - viewport.panX) * viewport.zoom;
    const screenY = (dirtyRegion.y - viewport.panY) * viewport.zoom;
    const screenW = dirtyRegion.width * viewport.zoom;
    const screenH = dirtyRegion.height * viewport.zoom;

    ctx.save();
    ctx.beginPath();
    ctx.rect(screenX, screenY, screenW, screenH);
    ctx.clip();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render page background within clip
    renderPageBackground(ctx, activePage, viewport);

    // Render elements in z-order within clip
    renderElementsInOrder(ctx, activePage.elements, viewport);

    ctx.restore();
  } else {
    // Full redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render page background
    renderPageBackground(ctx, activePage, viewport);

    // Render elements in ascending z-order
    renderElementsInOrder(ctx, activePage.elements, viewport);
  }

  // Render ghost element (drag-create preview) if present
  if (state.ghostElement) {
    renderGhostElement(ctx, state.ghostElement, viewport);
  }

  // Reset dirty region after render
  dirtyRegion = { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Render the page background (white surface with shadow).
 */
function renderPageBackground(
  ctx: CanvasRenderingContext2D,
  page: CanvasPage,
  viewport: Viewport,
): void {
  const pageScreenX = (0 * MM_TO_PX - viewport.panX) * viewport.zoom;
  const pageScreenY = (0 * MM_TO_PX - viewport.panY) * viewport.zoom;
  const pageScreenW = page.width * MM_TO_PX * viewport.zoom;
  const pageScreenH = page.height * MM_TO_PX * viewport.zoom;

  // Page shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = page.backgroundColor || '#FFFFFF';
  ctx.fillRect(pageScreenX, pageScreenY, pageScreenW, pageScreenH);
  ctx.restore();
}

/**
 * Sort elements by z-index (ascending) and render each visible element.
 */
function renderElementsInOrder(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  viewport: Viewport,
): void {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sorted) {
    if (!element.visible) continue;
    renderElement(ctx, element, viewport);
  }
}

// === Ghost Element Rendering ===

/**
 * Render a ghost element (drag-create preview) with semi-transparent fill
 * and dashed border to indicate it is not yet committed.
 */
function renderGhostElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport,
): void {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.setLineDash([6, 4]);
  renderElement(ctx, element, viewport);
  ctx.restore();
}

// === Element Dispatch ===

/**
 * Render a single element by dispatching to the type-specific renderer.
 * Applies common transforms (opacity, shadow) before type-specific rendering.
 */
export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport,
): void {
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = element.opacity / 100;

  // Apply shadow if configured
  if (element.shadow) {
    applyShadow(ctx, element.shadow, viewport.zoom);
  }

  // Dispatch to type-specific renderer
  switch (element.type) {
    case 'text':
      renderTextElementWrapper(ctx, element, viewport);
      break;
    case 'image':
      renderImageElement(ctx, element, viewport);
      break;
    case 'shape':
      renderShapeElement(ctx, element, viewport);
      break;
    case 'group':
      renderGroupElement(ctx, element, viewport);
      break;
  }

  ctx.restore();
}

// === Shadow ===

function applyShadow(ctx: CanvasRenderingContext2D, shadow: ShadowConfig, zoom: number): void {
  ctx.shadowOffsetX = shadow.offsetX * zoom;
  ctx.shadowOffsetY = shadow.offsetY * zoom;
  ctx.shadowBlur = shadow.blur * zoom;
  ctx.shadowColor = shadow.color;
}

// === Text Rendering ===

/**
 * Render a text element using the text-layout engine.
 */
function renderTextElementWrapper(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  viewport: Viewport,
): void {
  renderTextElement(ctx, element, viewport);
}

// === Image Rendering ===

/**
 * Render an image element with rotation, opacity, and crop rect support.
 */
function renderImageElement(
  ctx: CanvasRenderingContext2D,
  element: ImageElement,
  viewport: Viewport,
): void {
  const img = getCachedImage(element.src);
  if (!img) return; // Image not loaded yet

  const screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
  const screenY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
  const screenW = element.width * MM_TO_PX * viewport.zoom;
  const screenH = element.height * MM_TO_PX * viewport.zoom;

  ctx.save();

  // Apply rotation around element center
  if (element.rotation !== 0) {
    const centerX = screenX + screenW / 2;
    const centerY = screenY + screenH / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Draw image with optional crop
  if (element.cropRect) {
    const { cropRect } = element;
    const srcX = cropRect.x * element.originalWidth;
    const srcY = cropRect.y * element.originalHeight;
    const srcW = cropRect.width * element.originalWidth;
    const srcH = cropRect.height * element.originalHeight;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, screenX, screenY, screenW, screenH);
  } else {
    ctx.drawImage(img, screenX, screenY, screenW, screenH);
  }

  ctx.restore();
}

// === Shape Rendering ===

/**
 * Render a shape element using the canvas path API.
 * Supports: rectangle, circle, line, arrow, star, polygon.
 */
function renderShapeElement(
  ctx: CanvasRenderingContext2D,
  element: ShapeElement,
  viewport: Viewport,
): void {
  const screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
  const screenY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
  const screenW = element.width * MM_TO_PX * viewport.zoom;
  const screenH = element.height * MM_TO_PX * viewport.zoom;
  const scaledStrokeWidth = element.strokeWidth * viewport.zoom;

  ctx.save();

  // Apply rotation around element center
  if (element.rotation !== 0) {
    const centerX = screenX + screenW / 2;
    const centerY = screenY + screenH / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Apply border style
  applyBorderStyle(ctx, element.borderStyle);

  // Set stroke and fill
  ctx.fillStyle = element.fill;
  ctx.strokeStyle = element.stroke;
  ctx.lineWidth = scaledStrokeWidth;

  // Draw shape based on type
  switch (element.shapeType) {
    case 'rectangle':
      drawRectangle(ctx, screenX, screenY, screenW, screenH, element);
      break;
    case 'circle':
      drawEllipse(ctx, screenX, screenY, screenW, screenH, element);
      break;
    case 'line':
      drawLine(ctx, screenX, screenY, screenW, screenH, element);
      break;
    case 'arrow':
      drawArrow(ctx, screenX, screenY, screenW, screenH, element);
      break;
    case 'star':
      drawStar(ctx, screenX, screenY, screenW, screenH, element);
      break;
    case 'polygon':
      drawPolygon(ctx, screenX, screenY, screenW, screenH, element);
      break;
  }

  ctx.restore();
}

/**
 * Apply border style (solid, dashed, dotted) to the context.
 */
function applyBorderStyle(ctx: CanvasRenderingContext2D, style: BorderStyle): void {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([8, 4]);
      break;
    case 'dotted':
      ctx.setLineDash([2, 2]);
      break;
    case 'solid':
    default:
      ctx.setLineDash([]);
      break;
  }
}

function drawRectangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  element: ShapeElement,
): void {
  ctx.beginPath();
  ctx.rect(x, y, w, h);

  if (element.fill !== 'transparent') {
    ctx.fill();
  }
  if (element.strokeWidth > 0) {
    ctx.stroke();
  }
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  element: ShapeElement,
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

  if (element.fill !== 'transparent') {
    ctx.fill();
  }
  if (element.strokeWidth > 0) {
    ctx.stroke();
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _element: ShapeElement,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  element: ShapeElement,
): void {
  const startX = x;
  const startY = y + h / 2;
  const endX = x + w;
  const endY = y + h / 2;

  // Draw line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Draw arrowhead
  const headLength = Math.min(15 * (element.strokeWidth || 1), w * 0.3);
  const angle = Math.atan2(endY - startY, endX - startX);

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = element.stroke;
  ctx.fill();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  element: ShapeElement,
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outerRadius = Math.min(w, h) / 2;
  const innerRadius = outerRadius * 0.4;
  const points = 5; // 5-pointed star
  const step = Math.PI / points;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  if (element.fill !== 'transparent') {
    ctx.fill();
  }
  if (element.strokeWidth > 0) {
    ctx.stroke();
  }
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  element: ShapeElement,
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = Math.min(w, h) / 2;
  const sides = element.polygonSides || 6;
  const angleStep = (Math.PI * 2) / sides;

  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  if (element.fill !== 'transparent') {
    ctx.fill();
  }
  if (element.strokeWidth > 0) {
    ctx.stroke();
  }
}

// === Group Rendering ===

/**
 * Render a group element by recursively rendering its children
 * with the group's transform applied.
 */
function renderGroupElement(
  ctx: CanvasRenderingContext2D,
  element: GroupElement,
  viewport: Viewport,
): void {
  ctx.save();

  // Apply group rotation around group center
  if (element.rotation !== 0) {
    const screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
    const screenY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
    const screenW = element.width * MM_TO_PX * viewport.zoom;
    const screenH = element.height * MM_TO_PX * viewport.zoom;
    const centerX = screenX + screenW / 2;
    const centerY = screenY + screenH / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Create a modified viewport that offsets children by group position
  const childViewport: Viewport = {
    panX: viewport.panX - element.x * MM_TO_PX,
    panY: viewport.panY - element.y * MM_TO_PX,
    zoom: viewport.zoom,
  };

  // Render children in z-order using the offset viewport
  const sortedChildren = [...element.children].sort((a, b) => a.zIndex - b.zIndex);
  for (const child of sortedChildren) {
    if (!child.visible) continue;
    renderElement(ctx, child, childViewport);
  }

  ctx.restore();
}

// === Exported Renderer Object ===

/**
 * Create a CanvasRenderer instance that manages rendering state
 * and provides the public API.
 */
export function createRenderer(): CanvasRenderer {
  return {
    render(ctx: CanvasRenderingContext2D, state: RenderState): void {
      render(ctx, state);
    },

    renderElement(ctx: CanvasRenderingContext2D, element: CanvasElement, viewport: Viewport): void {
      renderElement(ctx, element, viewport);
    },

    invalidate(region?: BoundingBox): void {
      invalidate(region);
    },
  };
}
