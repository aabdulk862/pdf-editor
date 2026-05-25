import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastContainer } from './Toast';
import { useToastStore } from '../../store/toast';

// Mock useReducedMotion hook
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '../../hooks/useReducedMotion';
const mockUseReducedMotion = vi.mocked(useReducedMotion);

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when there are no toasts', () => {
    render(<ToastContainer />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders toast messages', () => {
    useToastStore.getState().addToast('File saved', 'success');
    render(<ToastContainer />);
    expect(screen.getByText('File saved')).toBeTruthy();
  });

  it('positions container at bottom-center on mobile and top-right on desktop', () => {
    useToastStore.getState().addToast('Test toast', 'info');
    const { container } = render(<ToastContainer />);
    const wrapper = container.firstElementChild as HTMLElement;

    // Mobile: bottom-center
    expect(wrapper.className).toContain('bottom-0');
    expect(wrapper.className).toContain('inset-x-0');
    expect(wrapper.className).toContain('items-center');

    // Desktop (md+): top-right
    expect(wrapper.className).toContain('md:bottom-auto');
    expect(wrapper.className).toContain('md:top-0');
    expect(wrapper.className).toContain('md:right-0');
    expect(wrapper.className).toContain('md:items-end');
  });

  it('applies entering transform (translateY 100%) initially', () => {
    useToastStore.getState().addToast('Entering toast', 'success');
    render(<ToastContainer />);

    const alert = screen.getByRole('alert');
    // Before rAF fires, the toast should have the entering transform
    expect(alert.style.transform).toBe('translateY(100%)');
  });

  it('transitions to visible state (translateY 0) after animation frame', () => {
    useToastStore.getState().addToast('Visible toast', 'success');
    render(<ToastContainer />);

    // Simulate requestAnimationFrame
    act(() => {
      vi.advanceTimersByTime(16);
    });

    const alert = screen.getByRole('alert');
    expect(alert.style.transform).toBe('translateY(0)');
    expect(alert.style.opacity).toBe('1');
  });

  it('uses ease-out easing for entrance animation (200ms)', () => {
    useToastStore.getState().addToast('Animated toast', 'info');
    render(<ToastContainer />);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const alert = screen.getByRole('alert');
    // Check transition includes 200ms and ease-out cubic-bezier
    expect(alert.style.transition).toContain('200ms');
    expect(alert.style.transition).toContain('cubic-bezier(0.33, 1, 0.68, 1)');
  });

  it('applies exit animation (translateY 100%) on dismiss', () => {
    useToastStore.getState().addToast('Dismissing toast', 'warning', 10000);
    render(<ToastContainer />);

    // Enter visible state
    act(() => {
      vi.advanceTimersByTime(16);
    });

    // Click dismiss button
    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);

    const alert = screen.getByRole('alert');
    expect(alert.style.transform).toBe('translateY(100%)');
    // Check transition includes 150ms and ease-in cubic-bezier
    expect(alert.style.transition).toContain('150ms');
    expect(alert.style.transition).toContain('cubic-bezier(0.32, 0, 0.67, 0)');
  });

  it('removes toast from store after exit animation completes (150ms)', () => {
    useToastStore.getState().addToast('Removing toast', 'info', 10000);
    render(<ToastContainer />);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);

    // Toast still visible during exit animation
    expect(screen.getByRole('alert')).toBeTruthy();

    // After exit duration, toast is removed
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('auto-dismisses toast after its duration expires', () => {
    useToastStore.getState().addToast('Auto dismiss', 'success', 4000);
    render(<ToastContainer />);

    // Enter visible state
    act(() => {
      vi.advanceTimersByTime(16);
    });

    // Advance past the toast duration
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Toast enters exit animation
    const alert = screen.getByRole('alert');
    expect(alert.style.transform).toBe('translateY(100%)');

    // After exit animation completes
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('skips animations when reduced motion is preferred', () => {
    mockUseReducedMotion.mockReturnValue(true);
    useToastStore.getState().addToast('No animation', 'info');
    render(<ToastContainer />);

    const alert = screen.getByRole('alert');
    // Should not have transform, just opacity
    expect(alert.style.opacity).toBe('1');
    expect(alert.style.transform).toBe('');
  });

  it('immediately removes toast on dismiss when reduced motion is preferred', () => {
    mockUseReducedMotion.mockReturnValue(true);
    useToastStore.getState().addToast('Instant dismiss', 'info', 10000);
    render(<ToastContainer />);

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);

    // Should be removed immediately without exit animation
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('pauses auto-dismiss timer on mouse enter', () => {
    useToastStore.getState().addToast('Pausable toast', 'info', 4000);
    render(<ToastContainer />);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const alert = screen.getByRole('alert');
    fireEvent.mouseEnter(alert);

    // Advance past the original duration
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Toast should still be visible because timer was paused
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('resumes auto-dismiss timer on mouse leave', () => {
    useToastStore.getState().addToast('Resumable toast', 'info', 4000);
    render(<ToastContainer />);

    act(() => {
      vi.advanceTimersByTime(16);
    });

    const alert = screen.getByRole('alert');

    // Pause after 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.mouseEnter(alert);

    // Wait a while paused
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Resume
    fireEvent.mouseLeave(alert);

    // Should dismiss after remaining ~2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Exit animation
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('has will-change property set for GPU acceleration', () => {
    useToastStore.getState().addToast('GPU toast', 'success');
    render(<ToastContainer />);

    const alert = screen.getByRole('alert');
    expect(alert.style.willChange).toBe('transform, opacity');
  });

  it('separates error toasts into assertive aria-live region', () => {
    useToastStore.getState().addToast('Error occurred', 'error');
    useToastStore.getState().addToast('Info message', 'info');
    const { container } = render(<ToastContainer />);

    const assertiveRegion = container.querySelector('[aria-live="assertive"]');
    expect(assertiveRegion).toBeTruthy();
    expect(assertiveRegion!.textContent).toContain('Error occurred');
    expect(assertiveRegion!.textContent).not.toContain('Info message');
  });

  it('places non-error toasts in polite aria-live region', () => {
    useToastStore.getState().addToast('Success message', 'success');
    const { container } = render(<ToastContainer />);

    const politeRegion = container.querySelector('[aria-live="polite"]');
    expect(politeRegion).toBeTruthy();
    expect(politeRegion!.textContent).toContain('Success message');
  });

  it('limits visible toasts to MAX_VISIBLE (3)', () => {
    useToastStore.getState().addToast('Toast 1', 'info');
    useToastStore.getState().addToast('Toast 2', 'info');
    useToastStore.getState().addToast('Toast 3', 'info');
    useToastStore.getState().addToast('Toast 4', 'info');
    render(<ToastContainer />);

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBe(3);
    // Should show the most recent 3
    expect(screen.queryByText('Toast 1')).toBeNull();
    expect(screen.getByText('Toast 4')).toBeTruthy();
  });
});
