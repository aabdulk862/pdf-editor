import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

import { CmdKHint } from './CmdKHint';
import { useOnboardingStore } from './useOnboardingStore';

describe('CmdKHint', () => {
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

  it('does not render when sessionCount is less than 3', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 2, cmdKUsed: false });
    });

    render(<CmdKHint />);

    expect(screen.queryByTestId('cmd-k-hint')).toBeNull();
  });

  it('does not render when cmdKUsed is true', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 5, cmdKUsed: true });
    });

    render(<CmdKHint />);

    expect(screen.queryByTestId('cmd-k-hint')).toBeNull();
  });

  it('does not render when the hint has been dismissed', () => {
    act(() => {
      useOnboardingStore.setState({
        sessionCount: 5,
        cmdKUsed: false,
        hintsDismissed: { 'cmd-k-hint': true },
      });
    });

    render(<CmdKHint />);

    expect(screen.queryByTestId('cmd-k-hint')).toBeNull();
  });

  it('renders when sessionCount >= 3, cmdKUsed is false, and hint not dismissed', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    expect(screen.getByTestId('cmd-k-hint')).toBeTruthy();
  });

  it('renders at exactly 3 sessions (boundary)', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    expect(screen.getByTestId('cmd-k-hint')).toBeTruthy();
  });

  it('displays the keyboard shortcut text', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    expect(screen.getByText('⌘K')).toBeTruthy();
  });

  it('displays hint text about quick access', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    expect(screen.getByText(/for quick access/)).toBeTruthy();
  });

  it('renders a dismiss button with accessible label', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    expect(dismissButton).toBeTruthy();
  });

  it('applies exit animation styles when dismiss button is clicked', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    fireEvent.click(dismissButton);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.style.opacity).toBe('0');
    expect(hint.style.transform).toBe('translateY(-4px)');
  });

  it('does not update store immediately during animation', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    fireEvent.click(dismissButton);

    expect(useOnboardingStore.getState().hintsDismissed['cmd-k-hint']).toBeUndefined();
  });

  it('persists dismissal to store after animation completes (200ms)', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    fireEvent.click(dismissButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(useOnboardingStore.getState().hintsDismissed['cmd-k-hint']).toBe(true);
  });

  it('dismisses instantly when prefers-reduced-motion is active', () => {
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

    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    fireEvent.click(dismissButton);

    expect(useOnboardingStore.getState().hintsDismissed['cmd-k-hint']).toBe(true);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('hides the hint after dismiss animation completes', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    const { rerender } = render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    fireEvent.click(dismissButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender(<CmdKHint />);

    expect(screen.queryByTestId('cmd-k-hint')).toBeNull();
  });

  it('has role="status" for screen reader announcement', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByRole('status');
    expect(hint).toBeTruthy();
  });

  it('uses design token colors for light mode', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.className).toContain('bg-primary-50');
    expect(hint.className).toContain('border-primary-200');
  });

  it('uses design token colors for dark mode', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.className).toContain('dark:bg-primary-900/20');
    expect(hint.className).toContain('dark:border-primary-700/40');
  });

  it('has rounded-md border radius from design tokens', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.className).toContain('rounded-md');
  });

  it('respects prefers-reduced-motion with motion-safe animation', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.className).toContain('motion-safe:animate-page-enter');
  });

  it('has motion-reduce:transition-none for reduced motion support', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.className).toContain('motion-reduce:transition-none');
  });

  it('has shadow-level-1 for subtle elevation', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const hint = screen.getByTestId('cmd-k-hint');
    expect(hint.className).toContain('shadow-level-1');
  });

  it('dismiss button has focus-visible ring for accessibility', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const dismissButton = screen.getByRole('button', { name: /dismiss command palette hint/i });
    expect(dismissButton.className).toContain('focus-visible:ring-2');
    expect(dismissButton.className).toContain('focus-visible:ring-primary-500');
  });

  it('renders the kbd element for the shortcut', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const kbd = screen.getByText('⌘K');
    expect(kbd.tagName).toBe('KBD');
  });

  it('uses font-mono on the kbd element', () => {
    act(() => {
      useOnboardingStore.setState({ sessionCount: 3, cmdKUsed: false });
    });

    render(<CmdKHint />);

    const kbd = screen.getByText('⌘K');
    expect(kbd.className).toContain('font-mono');
  });
});
