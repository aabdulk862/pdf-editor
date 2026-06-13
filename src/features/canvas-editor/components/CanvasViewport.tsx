import { useEffect, useRef } from 'react';

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

export interface CanvasViewportProps {
  /** Callback when a text element should enter inline editing mode */
  onEditText?: (elementId: string) => void;
  /** Callback to report active snap guides during drag */
  onSnapGuidesChange?: (guides: import('../types').SnapGuide[]) => void;
}

export function CanvasViewport({ onEditText, onSnapGuidesChange }: CanvasViewportProps) {
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
    onDoubleClickTextRef,
    activeSnapGuides,
  } = useCanvasInput(canvasRef);

  // Wire up the double-click text editing callback
  onDoubleClickTextRef.current = onEditText ?? null;

  // Report snap guides to parent via useEffect (not during render)
  const onSnapGuidesChangeRef = useRef(onSnapGuidesChange);
  onSnapGuidesChangeRef.current = onSnapGuidesChange;

  useEffect(() => {
    onSnapGuidesChangeRef.current?.(activeSnapGuides);
  }, [activeSnapGuides]);

  // Attach wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      onWheel(e);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onWheel]);

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
      aria-label="Canvas editor viewport"
      role="img"
    />
  );
}
