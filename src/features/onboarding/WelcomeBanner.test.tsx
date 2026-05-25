import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

import { WelcomeBanner } from './WelcomeBanner';
import { useOnboardingStore } from './useOnboardingStore';

describe('WelcomeBanner', () => {
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

  it('renders the welcome banner when not dismissed', () => {
    render(<WelcomeBanner />);

    expect(screen.getByTestId('welcome-banner')).toBeTruthy();
  });

  it('does not render when welcomeDismissed is true', () => {
    useOnboardingStore.setState({ welcomeDismissed: true });

    render(<WelcomeBanner />);

    expect(screen.queryByTestId('welcome-banner')).toBeNull();
  });

  it('displays the privacy capability text', () => {
    render(<WelcomeBanner />);

    expect(screen.getByText('Your files stay private')).toBeTruthy();
  });

  it('displays the speed capability text', () => {
    render(<WelcomeBanner />);

    expect(screen.getByText('Instant browser access')).toBeTruthy();
  });

  it('displays the tool variety capability text', () => {
    render(<WelcomeBanner />);

    expect(screen.getByText('30+ tools available')).toBeTruthy();
  });

  it('renders a dismiss button with accessible label', () => {
    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    expect(dismissButton).toBeTruthy();
  });

  it('applies exit animation styles when dismiss button is clicked', () => {
    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    fireEvent.click(dismissButton);

    // Banner should still be visible but with exit animation styles
    const banner = screen.getByTestId('welcome-banner');
    expect(banner.style.opacity).toBe('0');
    expect(banner.style.transform).toBe('translateY(-8px)');
  });

  it('does not update store immediately during animation', () => {
    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    fireEvent.click(dismissButton);

    // Before animation completes, store should not be updated
    expect(useOnboardingStore.getState().welcomeDismissed).toBe(false);
  });

  it('persists dismissal to store after animation completes (200ms)', () => {
    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    fireEvent.click(dismissButton);

    // After 200ms, the store should be updated
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(useOnboardingStore.getState().welcomeDismissed).toBe(true);
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

    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    fireEvent.click(dismissButton);

    // Should dismiss immediately without waiting for animation
    expect(useOnboardingStore.getState().welcomeDismissed).toBe(true);

    // Restore original matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('hides the banner after dismiss animation completes', () => {
    const { rerender } = render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    fireEvent.click(dismissButton);

    // Advance past animation duration
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender(<WelcomeBanner />);

    expect(screen.queryByTestId('welcome-banner')).toBeNull();
  });

  it('has role="banner" with accessible label', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByRole('banner', { name: /welcome banner/i });
    expect(banner).toBeTruthy();
  });

  it('uses design token colors for light mode', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    expect(banner.className).toContain('bg-primary-50');
    expect(banner.className).toContain('border-primary-200');
  });

  it('uses design token colors for dark mode', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    expect(banner.className).toContain('dark:bg-primary-900/20');
    expect(banner.className).toContain('dark:border-primary-700/40');
  });

  it('has rounded-lg border radius from design tokens', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    expect(banner.className).toContain('rounded-lg');
  });

  it('respects prefers-reduced-motion with motion-safe animation', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    expect(banner.className).toContain('motion-safe:animate-page-enter');
  });

  it('has motion-reduce:transition-none for reduced motion support', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    expect(banner.className).toContain('motion-reduce:transition-none');
  });

  it('has transition classes for smooth exit animation', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    expect(banner.className).toContain('motion-safe:transition-[opacity,transform]');
    expect(banner.className).toContain('motion-safe:duration-moderate');
    expect(banner.className).toContain('motion-safe:ease-in');
  });

  it('is non-blocking (does not use fixed/absolute positioning on the page)', () => {
    render(<WelcomeBanner />);

    const banner = screen.getByTestId('welcome-banner');
    // The banner uses relative positioning (for the close button), not fixed/absolute
    expect(banner.className).toContain('relative');
    expect(banner.className).not.toContain('fixed');
    // It should not contain 'absolute' as a standalone class
    const classes = banner.className.split(' ');
    expect(classes).not.toContain('absolute');
  });

  it('renders three capability items with icons', () => {
    render(<WelcomeBanner />);

    // All icons should be aria-hidden (decorative)
    const banner = screen.getByTestId('welcome-banner');
    const svgs = banner.querySelectorAll('svg[aria-hidden="true"]');
    // 3 capability icons + 1 close icon = 4 total
    expect(svgs.length).toBe(4);
  });

  it('dismiss button has focus-visible ring for accessibility', () => {
    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    expect(dismissButton.className).toContain('focus-visible:ring-2');
    expect(dismissButton.className).toContain('focus-visible:ring-primary-500');
  });

  it('dismiss button has dark mode focus ring offset', () => {
    render(<WelcomeBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss welcome banner/i });
    expect(dismissButton.className).toContain('dark:focus-visible:ring-offset-secondary-900');
  });
});
