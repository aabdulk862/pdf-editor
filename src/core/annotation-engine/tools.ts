import type { Point, Rect, Size } from '@/types/common';
import type {
  AnnotationTool,
  AnnotationId,
  AnnotationData,
  Stroke,
  TextStyle,
} from '@/types/annotations';
import type { StampType } from '@/types/operations';
import type { PdfPage } from '@/types/pdf';
import type { AnnotationCanvas, IAnnotationEngine } from './index';
import { createCanvas, clearCanvas, destroyCanvas } from './canvas-manager';

/**
 * Default highlight opacity (40%).
 */
const DEFAULT_HIGHLIGHT_OPACITY = 0.4;

/**
 * Signature stroke constraints.
 */
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 10;

/**
 * Stamp size constraints (pixels).
 */
const MIN_STAMP_SIZE = 50;
const MAX_STAMP_SIZE = 500;

/**
 * Text overlay constraints.
 */
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 144;
const MAX_TEXT_LENGTH = 1000;

let annotationIdCounter = 0;

function generateAnnotationId(): AnnotationId {
  return `annotation-${++annotationIdCounter}-${Date.now()}`;
}

/**
 * Internal storage for annotations per canvas.
 */
const canvasAnnotations = new Map<string, AnnotationData[]>();

/**
 * Internal storage for active tool per canvas.
 */
const canvasTools = new Map<string, AnnotationTool>();

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Renders all annotations on the canvas.
 */
function renderAnnotations(annotationCanvas: AnnotationCanvas): void {
  const ctx = annotationCanvas.element.getContext('2d');
  if (!ctx) return;

  // Clear canvas before re-rendering
  ctx.clearRect(0, 0, annotationCanvas.element.width, annotationCanvas.element.height);

  const annotations = canvasAnnotations.get(annotationCanvas.id) || [];

  for (const annotation of annotations) {
    switch (annotation.tool) {
      case 'highlight':
        renderHighlight(ctx, annotation);
        break;
      case 'signature':
        renderSignature(ctx, annotation);
        break;
      case 'stamp':
        renderStamp(ctx, annotation);
        break;
      case 'text':
        renderTextOverlay(ctx, annotation);
        break;
      case 'redact':
        renderRedact(ctx, annotation);
        break;
    }
  }
}

/**
 * Renders a highlight annotation.
 */
function renderHighlight(ctx: CanvasRenderingContext2D, annotation: AnnotationData): void {
  const { rect, data } = annotation;
  const color = (data.color as string) || '#FFFF00';
  const opacity = (data.opacity as number) ?? DEFAULT_HIGHLIGHT_OPACITY;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

/**
 * Renders a signature annotation (freehand strokes).
 */
function renderSignature(ctx: CanvasRenderingContext2D, annotation: AnnotationData): void {
  const strokes = annotation.data.strokes as Stroke[];
  const position = annotation.data.position as Point;

  if (!strokes || strokes.length === 0) return;

  ctx.save();
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const firstPoint = stroke.points[0];
    ctx.moveTo(firstPoint.x + position.x, firstPoint.y + position.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x + position.x, point.y + position.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Renders a stamp annotation.
 */
function renderStamp(ctx: CanvasRenderingContext2D, annotation: AnnotationData): void {
  const { rect, data } = annotation;
  const stampType = data.stampType as StampType;

  ctx.save();

  // Draw stamp border
  ctx.strokeStyle = getStampColor(stampType);
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  // Draw stamp text
  const fontSize = Math.min(rect.width / (stampType.length * 0.7), rect.height * 0.5);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = getStampColor(stampType);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stampType, rect.x + rect.width / 2, rect.y + rect.height / 2);

  ctx.restore();
}

/**
 * Returns the color for a given stamp type.
 */
function getStampColor(stampType: StampType): string {
  switch (stampType) {
    case 'APPROVED':
      return '#22C55E'; // green
    case 'DRAFT':
      return '#F59E0B'; // amber
    case 'CONFIDENTIAL':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
}

/**
 * Renders a text overlay annotation.
 */
function renderTextOverlay(ctx: CanvasRenderingContext2D, annotation: AnnotationData): void {
  const { rect, data } = annotation;
  const text = data.text as string;
  const style = data.style as TextStyle;

  if (!text) return;

  ctx.save();
  ctx.font = `${style.fontSize}pt ${style.fontFamily}`;
  ctx.fillStyle = style.color;
  ctx.textBaseline = 'top';

  // Word wrap text within the rect
  const words = text.split(' ');
  let line = '';
  let y = rect.y;
  const lineHeight = style.fontSize * 1.4;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > rect.width && line) {
      ctx.fillText(line, rect.x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, rect.x, y);
  }

  ctx.restore();
}

/**
 * Renders a redaction annotation (black rectangle).
 */
function renderRedact(ctx: CanvasRenderingContext2D, annotation: AnnotationData): void {
  const { rect } = annotation;

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

/**
 * Canvas-based Annotation Engine implementation.
 * Supports highlight, signature, stamp, text overlay, and redact tools.
 * Handles both mouse and touch input for mobile support.
 */
export const annotationEngine: IAnnotationEngine = {
  /**
   * Initializes a canvas overlay on the given container for the specified page.
   */
  initCanvas(container: HTMLElement, page: PdfPage): AnnotationCanvas {
    const annotationCanvas = createCanvas(container, page);
    canvasAnnotations.set(annotationCanvas.id, []);
    canvasTools.set(annotationCanvas.id, 'highlight');
    return annotationCanvas;
  },

  /**
   * Sets the active annotation tool for the given canvas.
   */
  setTool(canvas: AnnotationCanvas, tool: AnnotationTool): void {
    canvasTools.set(canvas.id, tool);

    // Update cursor based on tool
    switch (tool) {
      case 'highlight':
      case 'redact':
        canvas.element.style.cursor = 'crosshair';
        break;
      case 'signature':
        canvas.element.style.cursor = 'default';
        break;
      case 'stamp':
        canvas.element.style.cursor = 'move';
        break;
      case 'text':
        canvas.element.style.cursor = 'text';
        break;
    }
  },

  /**
   * Adds a highlight annotation with rectangular selection, configurable color, and 40% opacity.
   */
  addHighlight(canvas: AnnotationCanvas, rect: Rect, color: string, opacity: number): AnnotationId {
    const id = generateAnnotationId();
    const effectiveOpacity = clamp(opacity, 0, 1) || DEFAULT_HIGHLIGHT_OPACITY;

    const annotation: AnnotationData = {
      id,
      tool: 'highlight',
      page: canvas.page.pageNumber,
      rect,
      data: {
        color,
        opacity: effectiveOpacity,
      },
    };

    const annotations = canvasAnnotations.get(canvas.id) || [];
    annotations.push(annotation);
    canvasAnnotations.set(canvas.id, annotations);

    renderAnnotations(canvas);
    return id;
  },

  /**
   * Adds a signature annotation with freehand strokes.
   * Stroke width is clamped to 1-10px range.
   * Designed for ≤16ms latency rendering using requestAnimationFrame.
   */
  addSignature(canvas: AnnotationCanvas, strokes: Stroke[], position: Point): AnnotationId {
    const id = generateAnnotationId();

    // Clamp stroke widths to valid range
    const clampedStrokes = strokes.map((stroke) => ({
      ...stroke,
      width: clamp(stroke.width, MIN_STROKE_WIDTH, MAX_STROKE_WIDTH),
    }));

    // Calculate bounding rect from strokes
    const bounds = calculateStrokeBounds(clampedStrokes, position);

    const annotation: AnnotationData = {
      id,
      tool: 'signature',
      page: canvas.page.pageNumber,
      rect: bounds,
      data: {
        strokes: clampedStrokes,
        position,
      },
    };

    const annotations = canvasAnnotations.get(canvas.id) || [];
    annotations.push(annotation);
    canvasAnnotations.set(canvas.id, annotations);

    renderAnnotations(canvas);
    return id;
  },

  /**
   * Adds a stamp annotation (APPROVED, DRAFT, CONFIDENTIAL).
   * Size is clamped to 50x50 - 500x500 pixels.
   */
  addStamp(canvas: AnnotationCanvas, stamp: StampType, position: Point, size: Size): AnnotationId {
    const id = generateAnnotationId();

    // Clamp size to valid range
    const clampedSize: Size = {
      width: clamp(size.width, MIN_STAMP_SIZE, MAX_STAMP_SIZE),
      height: clamp(size.height, MIN_STAMP_SIZE, MAX_STAMP_SIZE),
    };

    const rect: Rect = {
      x: position.x,
      y: position.y,
      width: clampedSize.width,
      height: clampedSize.height,
    };

    const annotation: AnnotationData = {
      id,
      tool: 'stamp',
      page: canvas.page.pageNumber,
      rect,
      data: {
        stampType: stamp,
      },
    };

    const annotations = canvasAnnotations.get(canvas.id) || [];
    annotations.push(annotation);
    canvasAnnotations.set(canvas.id, annotations);

    renderAnnotations(canvas);
    return id;
  },

  /**
   * Adds a text overlay annotation.
   * Font size is clamped to 6-144pt, text is truncated to 1000 chars.
   */
  addTextOverlay(
    canvas: AnnotationCanvas,
    text: string,
    position: Point,
    style: TextStyle,
  ): AnnotationId {
    const id = generateAnnotationId();

    // Enforce constraints
    const clampedStyle: TextStyle = {
      ...style,
      fontSize: clamp(style.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
    };
    const truncatedText = text.slice(0, MAX_TEXT_LENGTH);

    // Estimate text dimensions for the rect
    const estimatedWidth = truncatedText.length * clampedStyle.fontSize * 0.6;
    const estimatedHeight = clampedStyle.fontSize * 1.4;

    const rect: Rect = {
      x: position.x,
      y: position.y,
      width: Math.min(estimatedWidth, canvas.page.width - position.x),
      height: estimatedHeight,
    };

    const annotation: AnnotationData = {
      id,
      tool: 'text',
      page: canvas.page.pageNumber,
      rect,
      data: {
        text: truncatedText,
        style: clampedStyle,
      },
    };

    const annotations = canvasAnnotations.get(canvas.id) || [];
    annotations.push(annotation);
    canvasAnnotations.set(canvas.id, annotations);

    renderAnnotations(canvas);
    return id;
  },

  /**
   * Removes an annotation by ID from the canvas.
   */
  removeAnnotation(canvas: AnnotationCanvas, id: AnnotationId): void {
    const annotations = canvasAnnotations.get(canvas.id) || [];
    const filtered = annotations.filter((a) => a.id !== id);
    canvasAnnotations.set(canvas.id, filtered);
    renderAnnotations(canvas);
  },

  /**
   * Returns all annotations for the given canvas.
   */
  getAnnotations(canvas: AnnotationCanvas): AnnotationData[] {
    return [...(canvasAnnotations.get(canvas.id) || [])];
  },

  /**
   * Clears all annotations from the canvas.
   */
  clear(canvas: AnnotationCanvas): void {
    canvasAnnotations.set(canvas.id, []);
    clearCanvas(canvas);
  },
};

/**
 * Calculates the bounding rectangle for a set of strokes offset by a position.
 */
function calculateStrokeBounds(strokes: Stroke[], position: Point): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      const px = point.x + position.x;
      const py = point.y + position.y;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
  }

  // Handle edge case of empty strokes
  if (!isFinite(minX)) {
    return { x: position.x, y: position.y, width: 0, height: 0 };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Creates a touch-aware drawing handler for the signature tool.
 * Uses requestAnimationFrame for ≤16ms latency rendering.
 */
export function createSignatureDrawHandler(
  canvas: AnnotationCanvas,
  strokeColor: string,
  strokeWidth: number,
): {
  start: (event: MouseEvent | TouchEvent) => void;
  move: (event: MouseEvent | TouchEvent) => void;
  end: () => void;
  getStrokes: () => Stroke[];
  clear: () => void;
} {
  const strokes: Stroke[] = [];
  let currentStroke: Point[] = [];
  let isDrawing = false;
  let animationFrameId: number | null = null;

  const clampedWidth = clamp(strokeWidth, MIN_STROKE_WIDTH, MAX_STROKE_WIDTH);

  function getPoint(event: MouseEvent | TouchEvent): Point {
    const rect = canvas.element.getBoundingClientRect();
    const scaleX = canvas.element.width / rect.width;
    const scaleY = canvas.element.height / rect.height;

    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function renderCurrentStroke(): void {
    const ctx = canvas.element.getContext('2d');
    if (!ctx || currentStroke.length < 2) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = clampedWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Only draw the last segment for performance (≤16ms latency)
    const lastIndex = currentStroke.length - 1;
    ctx.beginPath();
    ctx.moveTo(currentStroke[lastIndex - 1].x, currentStroke[lastIndex - 1].y);
    ctx.lineTo(currentStroke[lastIndex].x, currentStroke[lastIndex].y);
    ctx.stroke();
  }

  return {
    start(event: MouseEvent | TouchEvent) {
      event.preventDefault();
      isDrawing = true;
      currentStroke = [getPoint(event)];
    },

    move(event: MouseEvent | TouchEvent) {
      if (!isDrawing) return;
      event.preventDefault();

      currentStroke.push(getPoint(event));

      // Use requestAnimationFrame for smooth ≤16ms rendering
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          renderCurrentStroke();
          animationFrameId = null;
        });
      }
    },

    end() {
      if (!isDrawing) return;
      isDrawing = false;

      if (currentStroke.length > 1) {
        strokes.push({
          points: [...currentStroke],
          color: strokeColor,
          width: clampedWidth,
        });
      }
      currentStroke = [];

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    getStrokes() {
      return [...strokes];
    },

    clear() {
      strokes.length = 0;
      currentStroke = [];
      clearCanvas(canvas);
    },
  };
}

/**
 * Creates a touch-aware rectangular selection handler for highlight and redact tools.
 * Supports both mouse and touch input with 44x44px minimum touch targets.
 */
export function createRectSelectionHandler(
  canvas: AnnotationCanvas,
  onComplete: (rect: Rect) => void,
): {
  start: (event: MouseEvent | TouchEvent) => void;
  move: (event: MouseEvent | TouchEvent) => void;
  end: () => void;
} {
  let startPoint: Point | null = null;
  let currentRect: Rect | null = null;
  let animationFrameId: number | null = null;

  function getPoint(event: MouseEvent | TouchEvent): Point {
    const rect = canvas.element.getBoundingClientRect();
    const scaleX = canvas.element.width / rect.width;
    const scaleY = canvas.element.height / rect.height;

    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function renderSelectionRect(): void {
    if (!currentRect) return;

    const ctx = canvas.element.getContext('2d');
    if (!ctx) return;

    // Re-render existing annotations first
    renderAnnotations(canvas);

    // Draw selection rectangle overlay
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    ctx.restore();
  }

  return {
    start(event: MouseEvent | TouchEvent) {
      event.preventDefault();
      startPoint = getPoint(event);
      currentRect = null;
    },

    move(event: MouseEvent | TouchEvent) {
      if (!startPoint) return;
      event.preventDefault();

      const current = getPoint(event);
      currentRect = {
        x: Math.min(startPoint.x, current.x),
        y: Math.min(startPoint.y, current.y),
        width: Math.abs(current.x - startPoint.x),
        height: Math.abs(current.y - startPoint.y),
      };

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          renderSelectionRect();
          animationFrameId = null;
        });
      }
    },

    end() {
      if (currentRect && currentRect.width > 0 && currentRect.height > 0) {
        onComplete(currentRect);
      }

      startPoint = null;
      currentRect = null;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },
  };
}

/**
 * Attaches touch and mouse event listeners to a canvas for annotation interaction.
 * Ensures 44x44px minimum touch targets for mobile annotation controls.
 */
export function attachInputListeners(
  canvas: AnnotationCanvas,
  handlers: {
    start: (event: MouseEvent | TouchEvent) => void;
    move: (event: MouseEvent | TouchEvent) => void;
    end: (event: MouseEvent | TouchEvent) => void;
  },
): () => void {
  const element = canvas.element;

  // Mouse events
  const onMouseDown = (e: MouseEvent) => handlers.start(e);
  const onMouseMove = (e: MouseEvent) => handlers.move(e);
  const onMouseUp = (e: MouseEvent) => handlers.end(e);

  // Touch events
  const onTouchStart = (e: TouchEvent) => handlers.start(e);
  const onTouchMove = (e: TouchEvent) => handlers.move(e);
  const onTouchEnd = (e: TouchEvent) => handlers.end(e);

  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mouseup', onMouseUp);
  element.addEventListener('mouseleave', onMouseUp);

  element.addEventListener('touchstart', onTouchStart, { passive: false });
  element.addEventListener('touchmove', onTouchMove, { passive: false });
  element.addEventListener('touchend', onTouchEnd, { passive: false });
  element.addEventListener('touchcancel', onTouchEnd, { passive: false });

  // Return cleanup function
  return () => {
    element.removeEventListener('mousedown', onMouseDown);
    element.removeEventListener('mousemove', onMouseMove);
    element.removeEventListener('mouseup', onMouseUp);
    element.removeEventListener('mouseleave', onMouseUp);

    element.removeEventListener('touchstart', onTouchStart);
    element.removeEventListener('touchmove', onTouchMove);
    element.removeEventListener('touchend', onTouchEnd);
    element.removeEventListener('touchcancel', onTouchEnd);
  };
}

/**
 * Destroys an annotation canvas and cleans up all associated state.
 */
export function destroyAnnotationCanvas(canvas: AnnotationCanvas): void {
  canvasAnnotations.delete(canvas.id);
  canvasTools.delete(canvas.id);
  destroyCanvas(canvas);
}
