import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageEnter } from './usePageEnter';

// Mock useReducedMotion
vi.mock('./useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from './useReducedMotion';
const mockUseReducedMotion = vi.mocked(useReducedMotion);

describe('usePageEnter', () => {
  let rafCallbacks: FrameRequestCallback[] = [];
  let originalRaf: typeof requestAnimationFrame;
  let originalCancelRaf: typeof cancelAnimationFrame;

  beforeEach(() => {
    rafCallbacks = [];
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    globalThis.cancelAnimationFrame = vi.fn();
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  });

  it('starts with entered=false and opacity 0', () => {
    const { result } = renderHook(() => usePageEnter());

    expect(result.current.entered).toBe(false);
    expect(result.current.style.opacity).toBe(0);
  });

  it('transitions to entered=true after requestAnimationFrame', () => {
    const { result } = renderHook(() => usePageEnter());

    expect(result.current.entered).toBe(false);

    // Flush the rAF callback
    act(() => {
      rafCallbacks.forEach((cb) => cb(performance.now()));
    });

    expect(result.current.entered).toBe(true);
    expect(result.current.style.opacity).toBe(1);
  });

  it('applies translateY(8px) initially and translateY(0) when entered (motion enabled)', () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => usePageEnter());

    expect(result.current.style.transform).toBe('translateY(8px)');

    act(() => {
      rafCallbacks.forEach((cb) => cb(performance.now()));
    });

    expect(result.current.style.transform).toBe('translateY(0)');
  });

  it('uses 200ms ease-out transition for opacity and transform', () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => usePageEnter());

    const transition = result.current.style.transition as string;
    expect(transition).toContain('opacity 200ms');
    expect(transition).toContain('transform 200ms');
    expect(transition).toContain('cubic-bezier(0.33, 1, 0.68, 1)');
  });

  it('skips transform when reduced motion is preferred', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => usePageEnter());

    // Should not have transform property
    expect(result.current.style.transform).toBeUndefined();
    // Should have instant opacity transition
    expect(result.current.style.transition).toBe('opacity 0ms');
  });

  it('sets willChange to opacity,transform before entering, then auto after', () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { result } = renderHook(() => usePageEnter());

    expect(result.current.style.willChange).toBe('opacity, transform');

    act(() => {
      rafCallbacks.forEach((cb) => cb(performance.now()));
    });

    expect(result.current.style.willChange).toBe('auto');
  });

  it('does not set willChange when reduced motion is preferred', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => usePageEnter());

    expect(result.current.style.willChange).toBeUndefined();
  });
});
