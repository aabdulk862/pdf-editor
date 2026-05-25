import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

import { ContextualHelpTooltip } from './ContextualHelpTooltip';
import { useOnboardingStore } from './useOnboardingStore';

const DEFAULT_PROPS = {
  toolId: 'merge-pdf',
  title: 'Merge PDFs',
  description: 'Drag and drop files to reorder them before merging.',
};

describe('ContextualHelpTooltip', () => {
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

  it('renders the tooltip when the hint has not been dismissed', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('contextual-help-tooltip-merge-pdf')).toBeTruthy();
  });

  it('does not render the tooltip when the hint has been dismissed', () => {
    act(() => {
      useOnboardingStore.setState({
        hintsDismissed: { 'merge-pdf': true },
      });
    });

    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    expect(screen.queryByTestId('contextual-help-tooltip-merge-pdf')).toBeNull();
  });

  it('displays the title text', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    expect(screen.getByText('Merge PDFs')).toBeTruthy();
  });

  it('displays the description text', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    expect(screen.getByText('Drag and drop files to reorder them before merging.')).toBeTruthy();
  });

  it('renders children alongside the tooltip', () => {
    render(
      <ContextualHelpTooltip {...DEFAULT_PROPS}>
        <button>Merge Tool</button>
      </ContextualHelpTooltip>,
    );

    expect(screen.getByText('Merge Tool')).toBeTruthy();
    expect(screen.getByTestId('contextual-help-tooltip-merge-pdf')).toBeTruthy();
  });

  it('renders a close button with accessible label', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const closeButton = screen.getByRole('button', { name: /dismiss merge pdfs tooltip/i });
    expect(closeButton).toBeTruthy();
  });

  it('renders a "Don\'t show again" button', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const dontShowButton = screen.getByTestId('contextual-help-dont-show-merge-pdf');
    expect(dontShowButton).toBeTruthy();
    expect(dontShowButton.textContent).toBe("Don't show again");
  });

  it('applies exit animation styles when close button is clicked', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const closeButton = screen.getByRole('button', { name: /dismiss merge pdfs tooltip/i });
    fireEvent.click(closeButton);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.style.opacity).toBe('0');
  });

  it('persists dismissal to store after animation completes (200ms) via close button', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const closeButton = screen.getByRole('button', { name: /dismiss merge pdfs tooltip/i });
    fireEvent.click(closeButton);

    // Not yet dismissed
    expect(useOnboardingStore.getState().hintsDismissed['merge-pdf']).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(useOnboardingStore.getState().hintsDismissed['merge-pdf']).toBe(true);
  });

  it('persists dismissal to store after animation via "Don\'t show again" button', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const dontShowButton = screen.getByTestId('contextual-help-dont-show-merge-pdf');
    fireEvent.click(dontShowButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(useOnboardingStore.getState().hintsDismissed['merge-pdf']).toBe(true);
  });

  it('hides the tooltip after dismissal', () => {
    const { rerender } = render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const closeButton = screen.getByRole('button', { name: /dismiss merge pdfs tooltip/i });
    fireEvent.click(closeButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    expect(screen.queryByTestId('contextual-help-tooltip-merge-pdf')).toBeNull();
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

    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const closeButton = screen.getByRole('button', { name: /dismiss merge pdfs tooltip/i });
    fireEvent.click(closeButton);

    // Should dismiss immediately without waiting for animation
    expect(useOnboardingStore.getState().hintsDismissed['merge-pdf']).toBe(true);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('positions tooltip below by default', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('top-full');
    expect(tooltip.className).toContain('mt-2');
  });

  it('positions tooltip above when position="above"', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} position="above" />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('bottom-full');
    expect(tooltip.className).toContain('mb-2');
  });

  it('has role="tooltip" for accessibility', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeTruthy();
  });

  it('uses design token colors for light mode', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('bg-white');
    expect(tooltip.className).toContain('border-secondary-200');
  });

  it('uses design token colors for dark mode', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('dark:bg-secondary-800');
    expect(tooltip.className).toContain('dark:border-secondary-700');
  });

  it('has shadow-level-2 for raised elevation', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('shadow-level-2');
  });

  it('has rounded-lg border radius', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('rounded-lg');
  });

  it('respects prefers-reduced-motion with motion-safe animation', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('motion-safe:animate-page-enter');
  });

  it('has motion-reduce:transition-none for reduced motion support', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const tooltip = screen.getByTestId('contextual-help-tooltip-merge-pdf');
    expect(tooltip.className).toContain('motion-reduce:transition-none');
  });

  it('close button has focus-visible ring for accessibility', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const closeButton = screen.getByRole('button', { name: /dismiss merge pdfs tooltip/i });
    expect(closeButton.className).toContain('focus-visible:ring-2');
    expect(closeButton.className).toContain('focus-visible:ring-primary-500');
  });

  it('"Don\'t show again" button has focus-visible ring for accessibility', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    const dontShowButton = screen.getByTestId('contextual-help-dont-show-merge-pdf');
    expect(dontShowButton.className).toContain('focus-visible:ring-2');
    expect(dontShowButton.className).toContain('focus-visible:ring-primary-500');
  });

  it('works with different toolId values independently', () => {
    act(() => {
      useOnboardingStore.setState({
        hintsDismissed: { 'split-pdf': true },
      });
    });

    render(
      <>
        <ContextualHelpTooltip toolId="split-pdf" title="Split" description="Split desc" />
        <ContextualHelpTooltip toolId="rotate-pdf" title="Rotate" description="Rotate desc" />
      </>,
    );

    // split-pdf is dismissed, should not show
    expect(screen.queryByTestId('contextual-help-tooltip-split-pdf')).toBeNull();
    // rotate-pdf is not dismissed, should show
    expect(screen.getByTestId('contextual-help-tooltip-rotate-pdf')).toBeTruthy();
  });

  it('renders the wrapper element with correct test id', () => {
    render(<ContextualHelpTooltip {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('contextual-help-wrapper-merge-pdf')).toBeTruthy();
  });
});
