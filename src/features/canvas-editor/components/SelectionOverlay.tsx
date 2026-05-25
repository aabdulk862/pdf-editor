import React from 'react';

import { MM_TO_PX } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import type { ResizeHandle } from '../types';

/**
 * SelectionOverlay renders an absolute-positioned div over the canvas showing
 * the selection bounding box with 8 resize handles (nw, n, ne, e, se, s, sw, w)
 * and a rotate handle above the top center.
 *
 * Each handle has a minimum 44×44px touch target for accessibility.
 * Uses the canvas store's selection state and viewport to position the overlay.
 */

const HANDLE_SIZE = 12; // visual handle size in px
const TOUCH_TARGET_SIZE = 44; // minimum touch target in px
const ROTATE_HANDLE_OFFSET = 32; // distance above top center in px

type HandlePosition = ResizeHandle | 'rotate';

interface HandleConfig {
  position: HandlePosition;
  /** CSS positioning relative to the selection box */
  style: React.CSSProperties;
  /** Cursor style for the handle */
  cursor: string;
}

function getHandleConfigs(width: number, height: number): HandleConfig[] {
  const halfHandle = HANDLE_SIZE / 2;

  return [
    // Corner handles
    {
      position: 'nw',
      style: { top: -halfHandle, left: -halfHandle },
      cursor: 'nwse-resize',
    },
    {
      position: 'ne',
      style: { top: -halfHandle, left: width - halfHandle },
      cursor: 'nesw-resize',
    },
    {
      position: 'se',
      style: { top: height - halfHandle, left: width - halfHandle },
      cursor: 'nwse-resize',
    },
    {
      position: 'sw',
      style: { top: height - halfHandle, left: -halfHandle },
      cursor: 'nesw-resize',
    },
    // Edge handles
    {
      position: 'n',
      style: { top: -halfHandle, left: width / 2 - halfHandle },
      cursor: 'ns-resize',
    },
    {
      position: 'e',
      style: { top: height / 2 - halfHandle, left: width - halfHandle },
      cursor: 'ew-resize',
    },
    {
      position: 's',
      style: { top: height - halfHandle, left: width / 2 - halfHandle },
      cursor: 'ns-resize',
    },
    {
      position: 'w',
      style: { top: height / 2 - halfHandle, left: -halfHandle },
      cursor: 'ew-resize',
    },
    // Rotate handle (above top center)
    {
      position: 'rotate',
      style: { top: -ROTATE_HANDLE_OFFSET - halfHandle, left: width / 2 - halfHandle },
      cursor: 'grab',
    },
  ];
}

export interface SelectionOverlayProps {
  /** Optional callback when a handle interaction starts */
  onHandlePointerDown?: (handle: HandlePosition, event: React.PointerEvent) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({ onHandlePointerDown }) => {
  const selection = useCanvasStore((state) => state.selection);
  const viewport = useCanvasStore((state) => state.viewport);

  // Don't render if nothing is selected or no bounds
  if (selection.selectedIds.length === 0 || !selection.selectionBounds) {
    return null;
  }

  const { x, y, width, height } = selection.selectionBounds;

  // Convert document coordinates (mm) to screen coordinates (px)
  const screenX = (x * MM_TO_PX - viewport.panX) * viewport.zoom;
  const screenY = (y * MM_TO_PX - viewport.panY) * viewport.zoom;
  const screenWidth = width * MM_TO_PX * viewport.zoom;
  const screenHeight = height * MM_TO_PX * viewport.zoom;

  const handles = getHandleConfigs(screenWidth, screenHeight);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      data-testid="selection-overlay"
    >
      {/* Selection bounding box */}
      <div
        className="absolute border-2 border-blue-500"
        style={{
          left: screenX,
          top: screenY,
          width: screenWidth,
          height: screenHeight,
          willChange: 'transform, left, top, width, height',
        }}
      >
        {/* Rotate handle connector line */}
        <div
          className="absolute left-1/2 w-px bg-blue-500"
          style={{
            top: -ROTATE_HANDLE_OFFSET + HANDLE_SIZE / 2,
            height: ROTATE_HANDLE_OFFSET - HANDLE_SIZE / 2,
            transform: 'translateX(-50%)',
          }}
        />

        {/* Resize and rotate handles */}
        {handles.map((handle) => (
          <div
            key={handle.position}
            className="pointer-events-auto absolute flex items-center justify-center"
            style={{
              ...handle.style,
              width: TOUCH_TARGET_SIZE,
              height: TOUCH_TARGET_SIZE,
              // Center the touch target around the visual handle position
              marginLeft: -(TOUCH_TARGET_SIZE - HANDLE_SIZE) / 2,
              marginTop: -(TOUCH_TARGET_SIZE - HANDLE_SIZE) / 2,
              cursor: handle.cursor,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onHandlePointerDown?.(handle.position, e);
            }}
            data-testid={`handle-${handle.position}`}
            role="button"
            aria-label={
              handle.position === 'rotate' ? 'Rotate element' : `Resize ${handle.position}`
            }
            tabIndex={-1}
          >
            {/* Visual handle indicator */}
            {handle.position === 'rotate' ? (
              <div className="h-3 w-3 rounded-full border-2 border-blue-500 bg-white shadow-sm" />
            ) : (
              <div className="h-3 w-3 rounded-sm border-2 border-blue-500 bg-white shadow-sm" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectionOverlay;
