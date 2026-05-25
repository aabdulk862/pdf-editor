import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useNavStore } from './store/nav-store';
import { CategorizedNavBar } from './CategorizedNavBar';

/**
 * Tests for collapsed sidebar tooltip fade-in animation behavior.
 *
 * Validates: Requirements 2.8 (Sidebar collapse with tooltips on 300ms hover)
 *
 * The tooltip should:
 * - Appear after a 300ms hover delay
 * - Fade in over 150ms (opacity 0→1) using CSS transition
 * - Use GPU-accelerated property (opacity) for the animation
 * - Respect prefers-reduced-motion (instant show if reduced motion preferred)
 */

function renderCollapsedNavBar() {
  // Set localStorage to persist collapsed state (loadFromStorage reads from it on mount)
  localStorage.setItem('pdf-editor-sidebar-collapsed', JSON.stringify(true));

  useNavStore.setState({
    favorites: [],
    recentTools: [],
    collapsedCategories: {},
    sidebarCollapsed: true,
    filterQuery: '',
    usageCounts: {},
  });

  return render(
    <MemoryRouter initialEntries={['/']}>
      <CategorizedNavBar />
    </MemoryRouter>,
  );
}

/**
 * Get the first hoverable tool wrapper in the collapsed sidebar.
 * The collapsed sidebar renders tool wrappers as divs with onMouseEnter/onMouseLeave.
 * These are direct children of the scrollable container inside the w-12 sidebar.
 */
function getFirstToolWrapper(): HTMLElement {
  // The collapsed sidebar has the "Expand sidebar" button
  const expandButton = screen.getByLabelText('Expand sidebar');
  // The parent of the expand button is the collapsed sidebar container
  const collapsedSidebar = expandButton.parentElement!;
  // The first child is the scrollable tools container
  const toolsContainer = collapsedSidebar.querySelector('.overflow-y-auto')!;
  // Each tool is wrapped in a div with mouse event handlers
  const toolWrapper = toolsContainer.firstElementChild as HTMLElement;
  return toolWrapper;
}

describe('Collapsed Sidebar Tooltip - Fade-in Animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('does not show tooltip before 300ms hover delay', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    // Mock getBoundingClientRect on the wrapper
    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    // Advance 200ms (less than 300ms delay)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Tooltip should not be visible yet
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip after 300ms hover delay with opacity 0 initially', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    // Advance past the 300ms delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Tooltip should now be in the DOM
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();

    // Initially opacity should be 0 (before fade-in triggers)
    expect(tooltip.style.opacity).toBe('0');
  });

  it('fades tooltip to opacity 1 after the fade-in delay', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    // Advance past 300ms delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Advance past the 10ms fade trigger timeout
    act(() => {
      vi.advanceTimersByTime(10);
    });

    // Tooltip should now have opacity 1
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.style.opacity).toBe('1');
  });

  it('applies 150ms ease-out transition on opacity', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    act(() => {
      vi.advanceTimersByTime(310);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.style.transition).toBe('opacity 150ms ease-out');
  });

  it('uses willChange: opacity for GPU acceleration', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    act(() => {
      vi.advanceTimersByTime(310);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.style.willChange).toBe('opacity');
  });

  it('hides tooltip on mouse leave', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    act(() => {
      vi.advanceTimersByTime(310);
    });

    // Tooltip is visible
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Mouse leave
    act(() => {
      fireEvent.mouseLeave(toolWrapper);
    });

    // Tooltip should be removed
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('cancels tooltip if mouse leaves before 300ms delay', () => {
    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    // Leave before 300ms
    act(() => {
      vi.advanceTimersByTime(150);
    });

    act(() => {
      fireEvent.mouseLeave(toolWrapper);
    });

    // Advance past the original delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Tooltip should never appear
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip instantly when prefers-reduced-motion is active', () => {
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

    renderCollapsedNavBar();

    const toolWrapper = getFirstToolWrapper();

    toolWrapper.getBoundingClientRect = () => ({
      top: 50,
      bottom: 94,
      left: 0,
      right: 48,
      width: 48,
      height: 44,
      x: 0,
      y: 50,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(toolWrapper);
    });

    // Advance past 300ms delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // With reduced motion, tooltip should be immediately visible (opacity 1)
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.style.opacity).toBe('1');
    // And transition should be 'none'
    expect(tooltip.style.transition).toBe('none');

    // Restore original matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });
});
