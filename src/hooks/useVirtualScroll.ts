import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';

export interface UseVirtualScrollOptions {
  /** Total number of items in the list */
  totalItems: number;
  /** Fixed height of each item in pixels */
  itemHeight: number;
  /** Ref to the scrollable container element */
  containerRef: RefObject<HTMLElement | null>;
  /** Number of extra items to render above and below the visible area */
  bufferSize?: number;
}

export interface VirtualScrollResult {
  /** Index of the first item to render (inclusive) */
  startIndex: number;
  /** Index of the last item to render (inclusive) */
  endIndex: number;
  /** Total height of the full list in pixels (for the spacer element) */
  totalHeight: number;
  /** Pixel offset from the top for the visible items container */
  offsetTop: number;
  /** Number of visible items being rendered */
  visibleCount: number;
}

/**
 * A lightweight virtual scroll hook that calculates which items in a
 * fixed-height list should be rendered based on the container's scroll
 * position. Only visible items plus a configurable buffer are mounted,
 * enabling smooth 60fps scrolling with large datasets (500+ items).
 *
 * Usage:
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { startIndex, endIndex, totalHeight, offsetTop } = useVirtualScroll({
 *   totalItems: pages.length,
 *   itemHeight: 120,
 *   containerRef,
 *   bufferSize: 5,
 * });
 * ```
 */
export function useVirtualScroll({
  totalItems,
  itemHeight,
  containerRef,
  bufferSize = 5,
}: UseVirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const rafId = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const el = containerRef.current;
      if (el) {
        setScrollTop(el.scrollTop);
        setContainerHeight(el.clientHeight);
      }
    });
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initialize container height
    setContainerHeight(el.clientHeight);
    setScrollTop(el.scrollTop);

    el.addEventListener('scroll', handleScroll, { passive: true });

    // Use ResizeObserver to track container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [containerRef, handleScroll]);

  const totalHeight = totalItems * itemHeight;

  // Calculate visible range
  const rawStartIndex = Math.floor(scrollTop / itemHeight);
  const visibleItemCount = Math.ceil(containerHeight / itemHeight);

  // Apply buffer
  const startIndex = Math.max(0, rawStartIndex - bufferSize);
  const endIndex = Math.min(totalItems - 1, rawStartIndex + visibleItemCount + bufferSize);

  // Offset for positioning the visible items
  const offsetTop = startIndex * itemHeight;

  // Number of items being rendered
  const visibleCount = endIndex >= startIndex ? endIndex - startIndex + 1 : 0;

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetTop,
    visibleCount,
  };
}
