import type { CanvasElement, CanvasTool, ResizeHandle, RotateHandle } from '../types';

// === Cursor Types ===

export type CursorStyle =
  | 'default'
  | 'move'
  | 'crosshair'
  | 'grab'
  | 'grabbing'
  | 'text'
  | 'nwse-resize'
  | 'nesw-resize'
  | 'ns-resize'
  | 'ew-resize';

export type DragMode = 'move' | 'resize' | 'create' | 'pan' | 'none';

export interface CursorContext {
  activeTool: CanvasTool;
  hoverElement: CanvasElement | null;
  hoverHandle: ResizeHandle | RotateHandle | null;
  isDragging: boolean;
  dragMode: DragMode;
}

// === Helper: determine if tool is a shape tool ===

function isShapeTool(tool: CanvasTool): boolean {
  return ['rectangle', 'circle', 'line', 'arrow', 'star', 'polygon'].includes(tool);
}

// === Cursor Computation ===

/**
 * Computes the appropriate cursor style based on the current editor context.
 * Priority: dragging states > tool-based > select-tool context > default
 */
export function computeCursor(ctx: CursorContext): CursorStyle {
  const { activeTool, hoverElement, hoverHandle, isDragging, dragMode } = ctx;

  // Dragging states take priority
  if (isDragging && dragMode === 'pan') return 'grabbing';

  // Tool-based cursors
  if (activeTool === 'pan') return 'grab';
  if (activeTool === 'text') return 'text';
  if (isShapeTool(activeTool)) return 'crosshair';

  // Select tool: context-dependent
  if (activeTool === 'select') {
    if (hoverHandle) return getHandleCursor(hoverHandle);
    if (hoverElement) return 'move';
    return 'default';
  }

  return 'default';
}

/**
 * Returns the directionally appropriate resize cursor for a given handle.
 */
export function getHandleCursor(handle: ResizeHandle | RotateHandle): CursorStyle {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'rotate':
      return 'default';
    default:
      return 'default';
  }
}
