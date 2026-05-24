import type { PdfPage } from '@/types/pdf';
import type { AnnotationCanvas } from './index';

let canvasCounter = 0;

/**
 * Minimum touch target size in pixels for mobile annotation controls.
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Creates and initializes an annotation canvas overlaid on the given container.
 * The canvas matches the page dimensions and supports both mouse and touch input.
 */
export function createCanvas(container: HTMLElement, page: PdfPage): AnnotationCanvas {
  const id = `annotation-canvas-${++canvasCounter}`;

  const canvas = document.createElement('canvas');
  canvas.id = id;
  canvas.width = page.width;
  canvas.height = page.height;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none'; // Prevent browser touch gestures for drawing
  canvas.style.cursor = 'crosshair';

  // Accessibility attributes
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Annotation canvas for page ${page.pageNumber}`);
  canvas.tabIndex = 0;

  container.style.position = 'relative';
  container.appendChild(canvas);

  return {
    id,
    element: canvas,
    page,
  };
}

/**
 * Resizes the canvas to match new page dimensions (e.g., on zoom or viewport change).
 */
export function resizeCanvas(
  annotationCanvas: AnnotationCanvas,
  width: number,
  height: number,
): void {
  const { element } = annotationCanvas;
  element.width = width;
  element.height = height;
}

/**
 * Removes the canvas element from the DOM and cleans up resources.
 */
export function destroyCanvas(annotationCanvas: AnnotationCanvas): void {
  const { element } = annotationCanvas;
  const parent = element.parentElement;
  if (parent) {
    parent.removeChild(element);
  }
}

/**
 * Clears all drawn content from the canvas.
 */
export function clearCanvas(annotationCanvas: AnnotationCanvas): void {
  const ctx = annotationCanvas.element.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, annotationCanvas.element.width, annotationCanvas.element.height);
  }
}

/**
 * Gets the position of a pointer event (mouse or touch) relative to the canvas.
 */
export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: MouseEvent | Touch,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
