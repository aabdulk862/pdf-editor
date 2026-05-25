import { getElementEdges, type Point, type Size } from './geometry';
import { SNAP_THRESHOLD } from '../constants';
import type { CanvasElement, SnapResult, SnapGuide } from '../types';

/**
 * Calculate snapped position for an element being dragged.
 *
 * Algorithm:
 * 1. If snap disabled, return position unchanged with no guides.
 * 2. Grid snapping: round to nearest grid intersection, snap if within threshold.
 * 3. Smart alignment: compare edges of dragged element against all other elements.
 *    - Horizontal (X-axis) alignments: left-left, left-right, right-left, right-right, centerX-centerX
 *    - Vertical (Y-axis) alignments: top-top, top-bottom, bottom-top, bottom-bottom, centerY-centerY
 *    - If within SNAP_THRESHOLD, snap and produce a guide line.
 * 4. Return SnapResult with snapped position and guides.
 */
export function calculateSnap(
  position: Point,
  size: Size,
  otherElements: CanvasElement[],
  gridSpacing: number,
  snapEnabled: boolean,
): SnapResult {
  if (!snapEnabled) {
    return { snappedX: position.x, snappedY: position.y, guides: [] };
  }

  const guides: SnapGuide[] = [];
  let snappedX = position.x;
  let snappedY = position.y;

  // --- Grid snapping ---
  const nearestGridX = Math.round(position.x / gridSpacing) * gridSpacing;
  const nearestGridY = Math.round(position.y / gridSpacing) * gridSpacing;

  if (Math.abs(position.x - nearestGridX) <= SNAP_THRESHOLD) {
    snappedX = nearestGridX;
  }
  if (Math.abs(position.y - nearestGridY) <= SNAP_THRESHOLD) {
    snappedY = nearestGridY;
  }

  // --- Smart alignment with other elements ---
  const edges = getElementEdges({ x: snappedX, y: snappedY }, size);

  let bestDeltaX: number | null = null;
  let bestDistX = SNAP_THRESHOLD + 1;
  let bestDeltaY: number | null = null;
  let bestDistY = SNAP_THRESHOLD + 1;

  const xGuides: SnapGuide[] = [];
  const yGuides: SnapGuide[] = [];

  for (const other of otherElements) {
    const otherEdges = getElementEdges(
      { x: other.x, y: other.y },
      { width: other.width, height: other.height },
    );

    // Horizontal alignment pairs (affects X position, produces vertical guide lines)
    const xPairs: Array<[number, number]> = [
      [edges.left, otherEdges.left],
      [edges.left, otherEdges.right],
      [edges.right, otherEdges.left],
      [edges.right, otherEdges.right],
      [edges.centerX, otherEdges.centerX],
    ];

    for (const [edgeVal, otherEdgeVal] of xPairs) {
      const dist = Math.abs(edgeVal - otherEdgeVal);
      if (dist <= SNAP_THRESHOLD && dist < bestDistX) {
        bestDistX = dist;
        bestDeltaX = otherEdgeVal - edgeVal;
        xGuides.length = 0;
        xGuides.push({
          type: 'vertical',
          position: otherEdgeVal,
          sourceId: other.id,
        });
      } else if (dist <= SNAP_THRESHOLD && dist === bestDistX) {
        xGuides.push({
          type: 'vertical',
          position: otherEdgeVal,
          sourceId: other.id,
        });
      }
    }

    // Vertical alignment pairs (affects Y position, produces horizontal guide lines)
    const yPairs: Array<[number, number]> = [
      [edges.top, otherEdges.top],
      [edges.top, otherEdges.bottom],
      [edges.bottom, otherEdges.top],
      [edges.bottom, otherEdges.bottom],
      [edges.centerY, otherEdges.centerY],
    ];

    for (const [edgeVal, otherEdgeVal] of yPairs) {
      const dist = Math.abs(edgeVal - otherEdgeVal);
      if (dist <= SNAP_THRESHOLD && dist < bestDistY) {
        bestDistY = dist;
        bestDeltaY = otherEdgeVal - edgeVal;
        yGuides.length = 0;
        yGuides.push({
          type: 'horizontal',
          position: otherEdgeVal,
          sourceId: other.id,
        });
      } else if (dist <= SNAP_THRESHOLD && dist === bestDistY) {
        yGuides.push({
          type: 'horizontal',
          position: otherEdgeVal,
          sourceId: other.id,
        });
      }
    }
  }

  // Apply the best alignment snap (element alignment overrides grid snap)
  if (bestDeltaX !== null) {
    snappedX += bestDeltaX;
    guides.push(...xGuides);
  }
  if (bestDeltaY !== null) {
    snappedY += bestDeltaY;
    guides.push(...yGuides);
  }

  return { snappedX, snappedY, guides };
}

/**
 * Get snap guide lines for rendering overlay.
 * Similar to calculateSnap but only returns the guide lines (no grid snapping).
 * Used for rendering the visual snap guide overlay during drag operations.
 */
export function getSnapGuides(position: Point, size: Size, elements: CanvasElement[]): SnapGuide[] {
  const guides: SnapGuide[] = [];
  const edges = getElementEdges(position, size);

  for (const other of elements) {
    const otherEdges = getElementEdges(
      { x: other.x, y: other.y },
      { width: other.width, height: other.height },
    );

    // Horizontal alignment pairs (vertical guide lines)
    const xPairs: Array<[number, number]> = [
      [edges.left, otherEdges.left],
      [edges.left, otherEdges.right],
      [edges.right, otherEdges.left],
      [edges.right, otherEdges.right],
      [edges.centerX, otherEdges.centerX],
    ];

    for (const [edgeVal, otherEdgeVal] of xPairs) {
      if (Math.abs(edgeVal - otherEdgeVal) <= SNAP_THRESHOLD) {
        guides.push({
          type: 'vertical',
          position: otherEdgeVal,
          sourceId: other.id,
        });
      }
    }

    // Vertical alignment pairs (horizontal guide lines)
    const yPairs: Array<[number, number]> = [
      [edges.top, otherEdges.top],
      [edges.top, otherEdges.bottom],
      [edges.bottom, otherEdges.top],
      [edges.bottom, otherEdges.bottom],
      [edges.centerY, otherEdges.centerY],
    ];

    for (const [edgeVal, otherEdgeVal] of yPairs) {
      if (Math.abs(edgeVal - otherEdgeVal) <= SNAP_THRESHOLD) {
        guides.push({
          type: 'horizontal',
          position: otherEdgeVal,
          sourceId: other.id,
        });
      }
    }
  }

  return guides;
}
