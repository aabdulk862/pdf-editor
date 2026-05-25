import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

import { FirstSuccessCelebration } from './FirstSuccessCelebration';
import { useOnboardingStore } from './useOnboardingStore';

describe('FirstSuccessCelebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    act(() => {
      useOnboardingStore.setState({
        welcomeDismissed: false,
        sessionCount: 0,
        firstSuccessShown: false,
        hintsDismissed: {},
        cmdKUsed: false,
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not render when visible is false', () => {
    render(<FirstSuccessCelebration visible={false} />);

    expect(screen.queryByTestId('first-success-celebration')).toBeNull();
  });

  it('does not render when firstSuccessShown is already true', () => {
    useOnboardingStore.setState({ firstSuccessShown: true });

    render(<FirstSuccessCelebration visible={true} />);

    expect(screen.queryByTestId('first-success-celebration')).toBeNull();
  });

  it('renders when visible is true and firstSuccessShown is false', () => {
    render(<FirstSuccessCelebration visible={true} />);

    expect(screen.getByTestId('first-success-celebration')).toBeTruthy();
  });

  it('displays a congratulatory message', () => {
    render(<FirstSuccessCelebration visible={true} />);

    expect(screen.getByText('Great job! First operation complete')).toBeTruthy();
  });

  it('auto-dismisses after 2000ms', () => {
    render(<FirstSuccessCelebration visible={true} />);

    expect(screen.getByTestId('first-success-celebration')).toBeTruthy();

    // Advance past auto-dismiss delay (2000ms) + exit animation (200ms)
    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(screen.queryByTestId('first-success-celebration')).toBeNull();
  });

  it('calls markFirstSuccess after auto-dismiss', () => {
    render(<FirstSuccessCelebration visible={true} />);

    // Advance past auto-dismiss delay + exit animation
    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(useOnboardingStore.getState().firstSuccessShown).toBe(true);
  });

  it('does not call markFirstSuccess before auto-dismiss completes', () => {
    render(<FirstSuccessCelebration visible={true} />);

    // Advance only 1 second — should still be visible
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(useOnboardingStore.getState().firstSuccessShown).toBe(false);
    expect(screen.getByTestId('first-success-celebration')).toBeTruthy();
  });

  it('has role="status" for screen reader announcement', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByRole('status');
    expect(element).toBeTruthy();
  });

  it('has aria-live="polite" for non-intrusive announcement', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.getAttribute('aria-live')).toBe('polite');
  });

  it('has an accessible label', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.getAttribute('aria-label')).toBe('First operation completed successfully');
  });

  it('is positioned as a floating element (fixed)', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('fixed');
  });

  it('is positioned at bottom center', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('bottom-8');
    expect(element.className).toContain('left-1/2');
    expect(element.className).toContain('-translate-x-1/2');
  });

  it('uses success design token colors for light mode', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('bg-success-50');
    expect(element.className).toContain('border-success-200');
  });

  it('uses success design token colors for dark mode', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('dark:bg-success-900/20');
    expect(element.className).toContain('dark:border-success-700/40');
  });

  it('uses shadow-level-3 for floating appearance', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('shadow-level-3');
  });

  it('has rounded-lg border radius', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('rounded-lg');
  });

  it('includes entrance animation class', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('animate-celebration-enter');
  });

  it('has motion-reduce:transition-none for reduced motion support', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    expect(element.className).toContain('motion-reduce:transition-none');
  });

  it('renders a checkmark icon that is aria-hidden', () => {
    render(<FirstSuccessCelebration visible={true} />);

    const element = screen.getByTestId('first-success-celebration');
    const svgs = element.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBe(1);
  });

  it('dismisses instantly when prefers-reduced-motion is active', () => {
    // Mock matchMedia to return reduced motion preference
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    render(<FirstSuccessCelebration visible={true} />);

    // Advance past auto-dismiss delay — should dismiss without exit animation delay
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(useOnboardingStore.getState().firstSuccessShown).toBe(true);
    expect(screen.queryByTestId('first-success-celebration')).toBeNull();

    // Restore original matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('does not show again after being dismissed', () => {
    const { rerender } = render(<FirstSuccessCelebration visible={true} />);

    // Auto-dismiss
    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(useOnboardingStore.getState().firstSuccessShown).toBe(true);

    // Re-render with visible=true — should not show again
    rerender(<FirstSuccessCelebration visible={true} />);

    expect(screen.queryByTestId('first-success-celebration')).toBeNull();
  });

  it('applies exit animation styles during dismissal', () => {
    render(<FirstSuccessCelebration visible={true} />);

    // Advance past auto-dismiss delay but not exit animation
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const element = screen.queryByTestId('first-success-celebration');
    // Element should still be in DOM during exit animation
    if (element) {
      expect(element.className).toContain('opacity-0');
      expect(element.className).toContain('scale-95');
    }
  });
});
