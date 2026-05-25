import { useEffect, useRef, type MutableRefObject } from 'react';

import { render } from '../engine/renderer';
import { calculateCanvasDimensions } from '../engine/geometry';
import { useCanvasStore } from '../store/canvas-store';
import type { RenderState } from '../engine/renderer';
import type { CanvasElement } from '../types';

/**
 * Hook that manages the canvas rendering loop.
 *
 * Subscribes to canvas store state changes (document, viewport, selection)
 * and schedules re-renders via requestAnimationFrame. Handles HiDPI display
 * scaling by adjusting canvas buffer size and context scale to match
 * window.devicePixelRatio.
 *
 * @param canvasRef - React ref to the HTML canvas element
 * @param ghostElementRef - Ref to the ghost element being drag-created (optional)
 * @param renderTrigger - A value that changes to force a re-render (e.g., a counter incremented during drag-create)
 */
export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  ghostElementRef?: MutableRefObject<CanvasElement | null>,
  renderTrigger?: number,
): void {
  const rafIdRef = useRef<number | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const scheduleRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up 2D context
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    /**
     * Configure canvas dimensions for HiDPI rendering.
     * Sets the canvas buffer to element size * devicePixelRatio,
     * then scales the context so drawing operations remain in CSS pixels.
     * On mobile devices, clamps buffer dimensions to 4096×4096 to prevent
     * GPU memory issues while preserving aspect ratio.
     */
    function setupCanvasSize(): void {
      const canvas = canvasRef.current;
      if (!canvas || !ctxRef.current) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // Detect mobile: viewport width < 768px or touch-primary device
      const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

      // Calculate clamped dimensions for mobile
      const { width, height } = calculateCanvasDimensions(rect.width, rect.height, dpr, isMobile);

      // Set the canvas buffer size (actual pixels)
      canvas.width = width;
      canvas.height = height;

      // Maintain CSS visual size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Scale context so all drawing is in CSS pixel space
      // Use actual buffer/CSS ratio for the transform (accounts for clamping)
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      ctxRef.current.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    }

    // Initial size setup
    setupCanvasSize();

    // Fit page to viewport on initial mount (like Canva/Figma)
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const store = useCanvasStore.getState();
      if (store.document && store.viewport.panX === 0 && store.viewport.panY === 0) {
        store.fitPageToViewport(rect.width, rect.height);
      }
    }

    /**
     * Perform a render pass using the current store state.
     */
    function performRender(): void {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const state = useCanvasStore.getState();
      const { document, viewport } = state;

      if (!document) {
        // Clear canvas when no document is loaded
        const canvas = canvasRef.current;
        if (canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
      }

      const activePage = document.pages[document.activePageIndex];
      if (!activePage) return;

      const renderState: RenderState = {
        document,
        viewport,
        activePage,
        ghostElement: ghostElementRef?.current ?? null,
      };

      render(ctx, renderState);
    }

    /**
     * Schedule a render on the next animation frame.
     * Multiple calls within the same frame are batched (only one render executes).
     */
    function scheduleRender(): void {
      if (rafIdRef.current !== null) {
        // Already scheduled — the pending frame will pick up latest state
        return;
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        performRender();
      });
    }

    // Expose scheduleRender for external triggers (e.g., ghost element updates)
    scheduleRenderRef.current = scheduleRender;

    // Perform initial render
    scheduleRender();

    // Subscribe to store state changes that affect rendering
    const unsubscribe = useCanvasStore.subscribe((state, prevState) => {
      // Re-render when document, viewport, or selection changes
      if (
        state.document !== prevState.document ||
        state.viewport !== prevState.viewport ||
        state.selection !== prevState.selection
      ) {
        scheduleRender();
      }
    });

    // Handle window resize and DPR changes (e.g., moving between displays)
    function handleResize(): void {
      setupCanvasSize();
      scheduleRender();
    }

    window.addEventListener('resize', handleResize);

    // Listen for DPR changes (e.g., dragging window to a different monitor)
    const dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprMediaQuery.addEventListener('change', handleResize);

    // Cleanup
    return () => {
      unsubscribe();
      window.removeEventListener('resize', handleResize);
      dprMediaQuery.removeEventListener('change', handleResize);
      scheduleRenderRef.current = null;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      ctxRef.current = null;
    };
  }, [canvasRef]);

  // Re-render when renderTrigger changes (ghost element updates during drag-create)
  useEffect(() => {
    if (renderTrigger !== undefined && scheduleRenderRef.current) {
      scheduleRenderRef.current();
    }
  }, [renderTrigger]);
}
