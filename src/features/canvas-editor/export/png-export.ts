import type { CanvasDocument, CanvasPage, CanvasElement, Viewport } from '../types';
import { renderElement } from '../engine/renderer';

// === Types ===

export interface PngExportOptions {
  dpi: 72 | 150 | 300;
}

export interface PngExportEngine {
  exportPage(page: CanvasPage, options: PngExportOptions): Promise<Blob>;
  exportDocument(document: CanvasDocument, options: PngExportOptions): Promise<Blob[]>;
}

// === Constants ===

/** Maximum canvas dimension supported by most browsers */
const MAX_CANVAS_DIMENSION = 16384;

/** Millimeters per inch */
const MM_PER_INCH = 25.4;

// === Pixel Dimension Calculation ===

/**
 * Calculate pixel dimensions from page millimeters and DPI.
 * Formula: floor(pageMm / 25.4 * dpi)
 */
export function calculatePixelDimensions(
  widthMm: number,
  heightMm: number,
  dpi: number,
): { width: number; height: number } {
  const width = Math.floor((widthMm / MM_PER_INCH) * dpi);
  const height = Math.floor((heightMm / MM_PER_INCH) * dpi);
  return { width, height };
}

// === Rendering ===

/**
 * Render a page's visible elements onto an OffscreenCanvas context.
 * Uses the same renderer logic as the viewport but with a viewport
 * configured for full-page rendering at the target DPI.
 */
function renderPageToContext(
  ctx: OffscreenCanvasRenderingContext2D,
  page: CanvasPage,
  pixelWidth: number,
  pixelHeight: number,
): void {
  // The viewport for export: no pan offset, zoom maps mm → pixels
  // Renderer formula: screenX = (docX * MM_TO_PX - panX) * zoom
  // We want: docX (mm) * MM_TO_PX * zoom = pixelX
  // So: zoom = pixelWidth / (page.width * MM_TO_PX)
  const MM_TO_PX_LOCAL = 96 / 25.4;
  const scaleX = pixelWidth / (page.width * MM_TO_PX_LOCAL);
  const scaleY = pixelHeight / (page.height * MM_TO_PX_LOCAL);
  // Use uniform scale (should be the same for both axes given the formula)
  const scale = Math.min(scaleX, scaleY);

  const exportViewport: Viewport = {
    panX: 0,
    panY: 0,
    zoom: scale,
  };

  // Fill page background
  ctx.fillStyle = page.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  // Sort elements by z-index (ascending) and render visible ones
  const sortedElements = [...page.elements]
    .filter((el): el is CanvasElement => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sortedElements) {
    // Use the same renderElement function from the renderer engine
    // Cast the OffscreenCanvasRenderingContext2D to CanvasRenderingContext2D
    // since they share the same API surface for 2D drawing operations
    renderElement(ctx as unknown as CanvasRenderingContext2D, element, exportViewport);
  }
}

// === Validation ===

/**
 * Check if the calculated canvas dimensions exceed browser limits.
 * Throws an error if the canvas would be too large.
 */
function validateCanvasDimensions(width: number, height: number, dpi: number): void {
  if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
    throw new Error(
      `PNG export failed: canvas size ${width}×${height}px exceeds browser limits ` +
        `(max ${MAX_CANVAS_DIMENSION}px per axis). Try reducing DPI from ${dpi} or reducing page dimensions.`,
    );
  }

  // Check total pixel count (some browsers limit total pixels to ~268 million)
  const totalPixels = width * height;
  const MAX_TOTAL_PIXELS = 268_435_456; // 2^28
  if (totalPixels > MAX_TOTAL_PIXELS) {
    throw new Error(
      `PNG export failed: total pixel count ${totalPixels.toLocaleString()} exceeds browser memory limits. ` +
        `Try reducing DPI from ${dpi} or reducing page dimensions.`,
    );
  }
}

// === Export Engine ===

/**
 * Export a single page as a PNG blob.
 *
 * Creates an OffscreenCanvas at the target DPI resolution,
 * renders all visible elements, and exports as PNG with alpha transparency.
 */
async function exportPage(page: CanvasPage, options: PngExportOptions): Promise<Blob> {
  const { dpi } = options;

  // Calculate pixel dimensions: floor(pageMm / 25.4 * dpi)
  const { width: pixelWidth, height: pixelHeight } = calculatePixelDimensions(
    page.width,
    page.height,
    dpi,
  );

  // Validate canvas dimensions against browser limits
  validateCanvasDimensions(pixelWidth, pixelHeight, dpi);

  // Create off-screen canvas at target resolution
  let offscreen: OffscreenCanvas;
  try {
    offscreen = new OffscreenCanvas(pixelWidth, pixelHeight);
  } catch (error) {
    throw new Error(
      `PNG export failed: unable to create canvas of size ${pixelWidth}×${pixelHeight}px. ` +
        `Try reducing DPI or page dimensions.`,
    );
  }

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('PNG export failed: unable to get 2D rendering context from OffscreenCanvas.');
  }

  // Render the page content
  renderPageToContext(ctx, page, pixelWidth, pixelHeight);

  // Export as PNG blob (preserves alpha transparency)
  try {
    const blob = await offscreen.convertToBlob({ type: 'image/png' });
    return blob;
  } catch (error) {
    throw new Error(
      `PNG export failed: unable to convert canvas to PNG blob. ` +
        `The canvas size may exceed browser memory limits. ` +
        `Try reducing DPI from ${dpi} or reducing page count.`,
    );
  }
}

/**
 * Export a multi-page document as an array of PNG blobs (one per page).
 *
 * Each page is rendered independently at the specified DPI.
 * Pages that are not visible or have no elements still produce a PNG
 * with just the background color.
 */
async function exportDocument(
  document: CanvasDocument,
  options: PngExportOptions,
): Promise<Blob[]> {
  const blobs: Blob[] = [];

  for (const page of document.pages) {
    const blob = await exportPage(page, options);
    blobs.push(blob);
  }

  return blobs;
}

// === Factory ===

/**
 * Create a PNG export engine instance.
 */
export function createPngExportEngine(): PngExportEngine {
  return {
    exportPage,
    exportDocument,
  };
}
