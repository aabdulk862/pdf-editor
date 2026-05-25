import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';

import { useCanvasRenderer } from './useCanvasRenderer';
import { useCanvasStore } from '../store/canvas-store';

// Mock the renderer module
vi.mock('../engine/renderer', () => ({
  render: vi.fn(),
}));

import { render as mockRender } from '../engine/renderer';

describe('useCanvasRenderer', () => {
  let canvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let canvasRef: React.RefObject<HTMLCanvasElement | null>;
  let rafCallbacks: Array<FrameRequestCallback>;

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];

    // Reset the store
    useCanvasStore.setState({
      document: null,
      viewport: { panX: 0, panY: 0, zoom: 1.0 },
      selection: { selectedIds: [], selectionBounds: null, activeHandle: null },
      activeTool: 'select',
      gridEnabled: true,
      gridSpacing: 20,
      snapEnabled: true,
      history: { undoStack: [], redoStack: [], canUndo: false, canRedo: false },
      clipboard: [],
      savedColors: [],
      exportProgress: { status: 'idle', currentPage: 0, totalPages: 0 },
    });

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Create a mock canvas element
    canvas = document.createElement('canvas');
    mockCtx = {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    canvasRef = { current: canvas };

    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true,
      configurable: true,
    });

    // Mock matchMedia for DPR change listener
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function flushRaf(): void {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach((cb) => cb(performance.now()));
  }

  it('should set up canvas dimensions with device pixel ratio', () => {
    renderHook(() => useCanvasRenderer(canvasRef));

    // Canvas buffer should be element size * DPR
    expect(canvas.width).toBe(1600); // 800 * 2
    expect(canvas.height).toBe(1200); // 600 * 2

    // CSS size should match element size
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('600px');

    // Context should be scaled by DPR
    expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('should schedule a render on mount', () => {
    renderHook(() => useCanvasRenderer(canvasRef));

    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('should call render with correct state when document exists', () => {
    // Set up a document in the store
    act(() => {
      useCanvasStore.getState().createDocument('Test');
    });

    renderHook(() => useCanvasRenderer(canvasRef));
    flushRaf();

    expect(mockRender).toHaveBeenCalledWith(
      mockCtx,
      expect.objectContaining({
        document: expect.objectContaining({ name: 'Test' }),
        viewport: expect.objectContaining({
          zoom: expect.any(Number),
        }),
        activePage: expect.objectContaining({
          backgroundColor: '#FFFFFF',
        }),
      }),
    );
  });

  it('should clear canvas when no document is loaded', () => {
    renderHook(() => useCanvasRenderer(canvasRef));
    flushRaf();

    // No document → should clear, not render
    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('should re-render when viewport changes', () => {
    act(() => {
      useCanvasStore.getState().createDocument('Test');
    });

    renderHook(() => useCanvasRenderer(canvasRef));
    flushRaf();
    vi.mocked(mockRender).mockClear();

    // Change viewport
    act(() => {
      useCanvasStore.getState().pan(10, 20);
    });
    flushRaf();

    expect(mockRender).toHaveBeenCalled();
  });

  it('should re-render when document changes', () => {
    act(() => {
      useCanvasStore.getState().createDocument('Test');
    });

    renderHook(() => useCanvasRenderer(canvasRef));
    flushRaf();
    vi.mocked(mockRender).mockClear();

    // Change document (add a page)
    act(() => {
      useCanvasStore.getState().addPage();
    });
    flushRaf();

    expect(mockRender).toHaveBeenCalled();
  });

  it('should batch multiple state changes into a single render frame', () => {
    act(() => {
      useCanvasStore.getState().createDocument('Test');
    });

    renderHook(() => useCanvasRenderer(canvasRef));
    flushRaf();
    vi.mocked(mockRender).mockClear();

    // Multiple rapid state changes
    act(() => {
      useCanvasStore.getState().pan(10, 0);
      useCanvasStore.getState().pan(0, 10);
      useCanvasStore.getState().setZoom(1.5);
    });

    // Only one RAF should be pending despite multiple changes
    expect(rafCallbacks.length).toBeLessThanOrEqual(1);
    flushRaf();

    // Only one render call
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useCanvasRenderer(canvasRef));

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should handle resize events', () => {
    renderHook(() => useCanvasRenderer(canvasRef));
    flushRaf();
    vi.mocked(mockRender).mockClear();

    // Set up document so render is called
    act(() => {
      useCanvasStore.getState().createDocument('Test');
    });
    flushRaf();
    vi.mocked(mockRender).mockClear();

    // Simulate resize
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    flushRaf();

    // Should have re-set canvas size and re-rendered
    expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(mockRender).toHaveBeenCalled();
  });

  it('should not render if canvas ref is null', () => {
    const nullRef = { current: null };
    renderHook(() => useCanvasRenderer(nullRef));

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
