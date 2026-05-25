import type {
  CanvasElement,
  ShapeElement,
  Viewport,
  SelectionState,
  ResizeHandle,
  RotateHandle,
  BoundingBox,
} from '../types';
import { MM_TO_PX } from '../constants';
import {
  screenToDocument,
  transformToLocal,
  getBoundingBox,
  type Point,
  type Rect,
} from './geometry';

// === Constants ===

/** Pixel radius for handle hit detection */
const HANDLE_HIT_RADIUS = 8;

/** Distance above the selection bounds for the rotate handle */
const ROTATE_HANDLE_OFFSET = 20;

// === Hit Test ===

/**
 * Determine which element the user clicked.
 * Processes elements in reverse z-order (front to back) and returns the first hit.
 *
 * Algorithm:
 * 1. Convert screen point to document coordinates
 * 2. Sort elements by z-index descending (front first)
 * 3. For each element: skip if not visible or locked
 * 4. Apply inverse rotation transform to test point
 * 5. AABB test in local space
 * 6. For shape elements: additional path-based test
 * 7. Return first hit element or null
 */
export function hitTest(
  point: Point,
  elements: CanvasElement[],
  viewport: Viewport,
): CanvasElement | null {
  // Convert screen point to document coordinates
  const docPoint = screenToDocument(point, viewport);

  // Sort elements by z-index descending (front first)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  for (const element of sorted) {
    if (!element.visible || element.locked) continue;

    // Apply inverse rotation transform to test point
    const localPoint = transformToLocal(docPoint, element);

    // Axis-aligned bounding box test in local space
    if (
      localPoint.x >= 0 &&
      localPoint.x <= element.width &&
      localPoint.y >= 0 &&
      localPoint.y <= element.height
    ) {
      // For shape elements: additional path-based test
      if (element.type === 'shape') {
        if (isPointInShape(localPoint, element)) return element;
      } else {
        return element;
      }
    }
  }

  return null;
}

// === Handle Hit Test ===

/**
 * Detect if the user clicked on a resize or rotate handle.
 * Given a point (in screen coordinates relative to the canvas) and the current
 * selection state, checks if the point is near any of the 8 resize handles
 * or the rotate handle.
 *
 * Returns the handle identifier or null if no handle was hit.
 */
export function hitTestHandle(
  point: Point,
  selection: SelectionState,
  viewport?: { panX: number; panY: number; zoom: number },
): ResizeHandle | RotateHandle | null {
  const { selectionBounds } = selection;
  if (!selectionBounds || selection.selectedIds.length === 0) return null;

  // Get handle positions in document space (mm)
  const docHandles = getHandlePositions(selectionBounds);

  // Convert handle positions to screen space if viewport is provided
  const handles = viewport
    ? (Object.fromEntries(
        Object.entries(docHandles).map(([key, pos]) => [
          key,
          {
            x: (pos.x * MM_TO_PX - viewport.panX) * viewport.zoom,
            y: (pos.y * MM_TO_PX - viewport.panY) * viewport.zoom,
          },
        ]),
      ) as Record<ResizeHandle | 'rotate', Point>)
    : docHandles;

  // Check rotate handle first (it's above the selection)
  if (isWithinRadius(point, handles.rotate, HANDLE_HIT_RADIUS)) {
    return 'rotate';
  }

  // Check resize handles
  const resizeHandles: [ResizeHandle, Point][] = [
    ['nw', handles.nw],
    ['n', handles.n],
    ['ne', handles.ne],
    ['e', handles.e],
    ['se', handles.se],
    ['s', handles.s],
    ['sw', handles.sw],
    ['w', handles.w],
  ];

  for (const [handle, pos] of resizeHandles) {
    if (isWithinRadius(point, pos, HANDLE_HIT_RADIUS)) {
      return handle;
    }
  }

  return null;
}

// === Marquee Selection ===

/**
 * Return all elements whose bounding box is fully contained within the given rect.
 * Used for marquee (rubber-band) selection.
 *
 * Uses getBoundingBox for rotated elements to get their axis-aligned bounds,
 * then checks if the entire bounding box fits within the selection rect.
 */
export function getElementsInRect(rect: Rect, elements: CanvasElement[]): CanvasElement[] {
  return elements.filter((element) => {
    if (!element.visible) return false;

    const bbox = getBoundingBox(element);

    // Check if the element's bounding box is fully contained within the rect
    return (
      bbox.x >= rect.x &&
      bbox.y >= rect.y &&
      bbox.x + bbox.width <= rect.x + rect.width &&
      bbox.y + bbox.height <= rect.y + rect.height
    );
  });
}

// === Shape-Specific Hit Testing ===

/**
 * Test if a point (in element-local space, origin at top-left) is inside
 * the shape defined by the element's shapeType.
 *
 * Local space means: x in [0, width], y in [0, height].
 */
export function isPointInShape(localPoint: Point, element: ShapeElement): boolean {
  const { width, height, shapeType } = element;

  switch (shapeType) {
    case 'rectangle':
      // AABB already passed, so it's inside
      return true;

    case 'circle': {
      // Ellipse test: normalize to unit circle
      const cx = width / 2;
      const cy = height / 2;
      const dx = (localPoint.x - cx) / cx;
      const dy = (localPoint.y - cy) / cy;
      return dx * dx + dy * dy <= 1;
    }

    case 'line':
    case 'arrow': {
      // Line from top-left to bottom-right with a tolerance band
      const tolerance = Math.max(element.strokeWidth || 4, 4);
      return isPointNearLine(localPoint, { x: 0, y: 0 }, { x: width, y: height }, tolerance);
    }

    case 'star': {
      // Approximate star as a circle with 60% inner radius
      // A proper star test would use the polygon path, but this is a reasonable approximation
      const cx = width / 2;
      const cy = height / 2;
      const outerRx = width / 2;
      const outerRy = height / 2;
      const dx = (localPoint.x - cx) / outerRx;
      const dy = (localPoint.y - cy) / outerRy;
      // Use the outer ellipse as the hit area
      return dx * dx + dy * dy <= 1;
    }

    case 'polygon': {
      // Regular polygon inscribed in the element bounds
      const sides = element.polygonSides || 5;
      const cx = width / 2;
      const cy = height / 2;
      return isPointInRegularPolygon(localPoint, cx, cy, width / 2, height / 2, sides);
    }

    default:
      return true;
  }
}

// === Internal Helpers ===

/**
 * Get the positions of all handles (8 resize + 1 rotate) for a selection bounds.
 * Positions are in the same coordinate space as the bounds (document space).
 */
function getHandlePositions(bounds: BoundingBox): Record<ResizeHandle | 'rotate', Point> {
  const { x, y, width, height } = bounds;

  return {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
    rotate: { x: x + width / 2, y: y - ROTATE_HANDLE_OFFSET },
  };
}

/**
 * Check if a point is within a given radius of a target point.
 */
function isWithinRadius(point: Point, target: Point, radius: number): boolean {
  const dx = point.x - target.x;
  const dy = point.y - target.y;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check if a point is near a line segment within a given tolerance.
 * Uses perpendicular distance from point to line segment.
 */
function isPointNearLine(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
  tolerance: number,
): boolean {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Degenerate line (start === end)
    const distSq = (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2;
    return distSq <= tolerance * tolerance;
  }

  // Project point onto line, clamped to [0, 1]
  let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  // Closest point on segment
  const closestX = lineStart.x + t * dx;
  const closestY = lineStart.y + t * dy;

  const distSq = (point.x - closestX) ** 2 + (point.y - closestY) ** 2;
  return distSq <= tolerance * tolerance;
}

/**
 * Check if a point is inside a regular polygon inscribed in an ellipse.
 * Uses the ray-casting algorithm against the polygon vertices.
 */
function isPointInRegularPolygon(
  point: Point,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
): boolean {
  // Generate polygon vertices
  const vertices: Point[] = [];
  const angleStep = (2 * Math.PI) / sides;
  // Start from top (-PI/2 offset so first vertex is at top)
  const startAngle = -Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    vertices.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }

  // Ray-casting algorithm
  return isPointInPolygonVertices(point, vertices);
}

/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 * Casts a ray from the point to the right and counts intersections.
 */
function isPointInPolygonVertices(point: Point, vertices: Point[]): boolean {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersect =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
