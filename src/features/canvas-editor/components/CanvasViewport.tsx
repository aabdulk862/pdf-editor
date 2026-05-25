import { useRef } from 'react';

import { useCanvasInput } from '../hooks/useCanvasInput';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';

/**
 * CanvasViewport handles the HTML5 Canvas element rendering and input.
 *
 * Responsibilities:
 * - Renders the HTML5 Canvas element with proper sizing
 * - Connects the useCanvasRenderer hook for rendering loop and HiDPI support
 * - Connects the useCanvasInput hook for pointer/wheel event handling
 *
 * Requirements: 15.2, 16.4
 */
export function CanvasViewport() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Set up input handling (pointer events, wheel zoom/pan)
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    cursorStyle,
    ghostElementRef,
    renderTick,
  } = useCanvasInput(canvasRef);

  // Set up rendering loop (subscribes to store, handles DPR, requestAnimationFrame)
  // Pass ghostElementRef so the renderer can include the ghost element in the render state
  // Pass renderTick to trigger re-renders during drag-create operations
  useCanvasRenderer(canvasRef, ghostElementRef, renderTick);

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 w-full h-full block touch-none"
      style={{ cursor: cursorStyle, willChange: 'transform' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      aria-label="Canvas editor viewport"
      role="img"
    />
  );
}
