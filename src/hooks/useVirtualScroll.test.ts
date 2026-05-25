import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVirtualScroll } from './useVirtualScroll';
import type { RefObject } from 'react';

describe('useVirtualScroll', () => {
  let mockContainer: {
    scrollTop: number;
    clientHeight: number;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };
  let containerRef: RefObject<HTMLElement | null>;
  let scrollListeners: Array<() => void>;
  let resizeCallback: ResizeObserverCallback | null;

  beforeEach(() => {
    scrollListeners = [];
    resizeCallback = null;

    mockContainer = {
      scrollTop: 0,
      clientHeight: 500,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'scroll') scrollListeners.push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'scroll') {
          scrollListeners = scrollListeners.filter((l) => l !== handler);
        }
      }),
    };

    containerRef = { current: mockContainer as unknown as HTMLElement };

    // Mock ResizeObserver
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn().mockImplementation((callback: ResizeObserverCallback) => {
        resizeCallback = callback;
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn(),
        };
      }),
    );

    // Mock requestAnimationFrame to execute immediately
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns correct initial state with items at the top', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    // Container is 500px, items are 50px each → 10 visible items
    // Buffer of 5 above and below
    // Start: max(0, 0 - 5) = 0
    // End: min(99, 0 + 10 + 5) = 15
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(15);
    expect(result.current.totalHeight).toBe(5000); // 100 * 50
    expect(result.current.offsetTop).toBe(0); // 0 * 50
    expect(result.current.visibleCount).toBe(16); // 15 - 0 + 1
  });

  it('calculates correct range after scrolling', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    // Simulate scrolling to position 1000 (item index 20)
    act(() => {
      mockContainer.scrollTop = 1000;
      scrollListeners.forEach((listener) => listener());
    });

    // rawStartIndex = floor(1000 / 50) = 20
    // visibleItemCount = ceil(500 / 50) = 10
    // startIndex = max(0, 20 - 5) = 15
    // endIndex = min(99, 20 + 10 + 5) = 35
    expect(result.current.startIndex).toBe(15);
    expect(result.current.endIndex).toBe(35);
    expect(result.current.offsetTop).toBe(750); // 15 * 50
    expect(result.current.visibleCount).toBe(21); // 35 - 15 + 1
  });

  it('clamps startIndex to 0 when buffer exceeds scroll position', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    // Scroll to item index 2 (buffer of 5 would go negative)
    act(() => {
      mockContainer.scrollTop = 100; // index 2
      scrollListeners.forEach((listener) => listener());
    });

    // rawStartIndex = floor(100 / 50) = 2
    // startIndex = max(0, 2 - 5) = 0
    expect(result.current.startIndex).toBe(0);
  });

  it('clamps endIndex to totalItems - 1 when near the end', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    // Scroll near the end
    act(() => {
      mockContainer.scrollTop = 4500; // index 90
      scrollListeners.forEach((listener) => listener());
    });

    // rawStartIndex = floor(4500 / 50) = 90
    // visibleItemCount = ceil(500 / 50) = 10
    // endIndex = min(99, 90 + 10 + 5) = 99
    expect(result.current.endIndex).toBe(99);
  });

  it('returns totalHeight as totalItems * itemHeight', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 500,
        itemHeight: 120,
        containerRef,
        bufferSize: 3,
      }),
    );

    expect(result.current.totalHeight).toBe(60000); // 500 * 120
  });

  it('handles zero items gracefully', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 0,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(-1);
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.offsetTop).toBe(0);
    expect(result.current.visibleCount).toBe(0);
  });

  it('uses default buffer size of 5 when not specified', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
      }),
    );

    // With default buffer of 5, scrolled to top:
    // startIndex = max(0, 0 - 5) = 0
    // endIndex = min(99, 0 + 10 + 5) = 15
    expect(result.current.endIndex).toBe(15);
  });

  it('responds to container resize', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    // Simulate container resize to 1000px
    act(() => {
      if (resizeCallback) {
        resizeCallback(
          [{ contentRect: { height: 1000 } } as unknown as ResizeObserverEntry],
          {} as ResizeObserver,
        );
      }
    });

    // visibleItemCount = ceil(1000 / 50) = 20
    // endIndex = min(99, 0 + 20 + 5) = 25
    expect(result.current.endIndex).toBe(25);
  });

  it('cleans up scroll listener and resize observer on unmount', () => {
    const { unmount } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    expect(scrollListeners.length).toBe(1);

    unmount();

    expect(scrollListeners.length).toBe(0);
  });

  it('handles null container ref gracefully', () => {
    const nullRef: RefObject<HTMLElement | null> = { current: null };

    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 100,
        itemHeight: 50,
        containerRef: nullRef,
        bufferSize: 5,
      }),
    );

    // With null ref, containerHeight is 0 and scrollTop is 0
    // rawStartIndex = 0, visibleItemCount = 0
    // startIndex = max(0, 0 - 5) = 0
    // endIndex = min(99, 0 + 0 + 5) = 5 (buffer still applies)
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(5);
    expect(result.current.totalHeight).toBe(5000);
    expect(result.current.offsetTop).toBe(0);
    expect(result.current.visibleCount).toBe(6);
  });

  it('handles single item', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 1,
        itemHeight: 50,
        containerRef,
        bufferSize: 5,
      }),
    );

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(0);
    expect(result.current.totalHeight).toBe(50);
    expect(result.current.visibleCount).toBe(1);
  });

  it('works with large datasets (500+ items)', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        totalItems: 1000,
        itemHeight: 120,
        containerRef,
        bufferSize: 5,
      }),
    );

    // Scroll to middle
    act(() => {
      mockContainer.scrollTop = 60000; // index 500
      scrollListeners.forEach((listener) => listener());
    });

    // rawStartIndex = floor(60000 / 120) = 500
    // visibleItemCount = ceil(500 / 120) = 5 (rounded up)
    // startIndex = max(0, 500 - 5) = 495
    // endIndex = min(999, 500 + 5 + 5) = 510
    expect(result.current.startIndex).toBe(495);
    expect(result.current.endIndex).toBe(510);
    expect(result.current.totalHeight).toBe(120000);
    // Only renders 16 items out of 1000
    expect(result.current.visibleCount).toBe(16);
  });
});
