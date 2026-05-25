import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AppShell } from './AppShell';
import { useSidebarStore } from '../store/sidebar';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AppShell', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset sidebar store state to expanded
    useSidebarStore.setState({ collapsed: false });
  });

  it('renders the CSS Grid layout with correct grid template', () => {
    const { container } = render(
      <AppShell sidebar={<nav>Sidebar</nav>}>
        <div>Canvas Content</div>
      </AppShell>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toBeTruthy();
    expect(grid.style.gridTemplateColumns).toBe('auto 1fr');
    expect(grid.style.gridTemplateRows).toBe('auto auto 1fr auto');
  });

  it('renders sidebar content in an aside with navigation role', () => {
    render(
      <AppShell sidebar={<nav data-testid="sidebar-content">My Sidebar</nav>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /^Sidebar navigation$/i });
    expect(aside).toBeTruthy();
    expect(aside.tagName).toBe('ASIDE');
    // Sidebar content appears in both desktop and mobile sidebars
    const sidebarContents = screen.getAllByTestId('sidebar-content');
    expect(sidebarContents.length).toBeGreaterThanOrEqual(1);
  });

  it('renders children in the main canvas area', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div data-testid="canvas-content">PDF Preview</div>
      </AppShell>,
    );

    const main = screen.getByRole('main');
    expect(main).toBeTruthy();
    expect(screen.getByTestId('canvas-content')).toBeTruthy();
  });

  it('enforces minimum canvas width of 320px', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const main = screen.getByRole('main');
    expect(main.style.minWidth).toBe('320px');
  });

  it('provides ARIA landmarks: banner, navigation, main, complementary', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>} rightPanel={<div>Panel</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('complementary', { name: /right panel/i })).toBeTruthy();
  });

  it('renders all four layout zones (tab-bar, toolbar, canvas, status-bar)', () => {
    const { container } = render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    expect(container.querySelector('[data-zone="tab-bar"]')).toBeTruthy();
    expect(container.querySelector('[data-zone="toolbar"]')).toBeTruthy();
    expect(container.querySelector('[data-zone="canvas"]')).toBeTruthy();
    expect(container.querySelector('[data-zone="status-bar"]')).toBeTruthy();
  });

  it('renders the sidebar spanning all rows via row-span-full class', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.className).toContain('row-span-full');
  });

  it('renders right panel when provided', () => {
    render(
      <AppShell
        sidebar={<div>Sidebar</div>}
        rightPanel={<div data-testid="right-panel">Comments</div>}
      >
        <div>Canvas</div>
      </AppShell>,
    );

    expect(screen.getByTestId('right-panel')).toBeTruthy();
    const complementary = screen.getByRole('complementary', { name: /right panel/i });
    expect(complementary).toBeTruthy();
    // Right panel has a default width of 320px (w-80) and doesn't shrink
    expect(complementary.className).toContain('w-80');
    expect(complementary.className).toContain('shrink-0');
  });

  it('does not render right panel aside when rightPanel prop is not provided', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('uses full viewport height', () => {
    const { container } = render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain('h-screen');
  });

  it('applies design token background and text colors', () => {
    const { container } = render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain('bg-background-light');
    expect(grid.className).toContain('dark:bg-background-dark');
    expect(grid.className).toContain('text-text-light');
    expect(grid.className).toContain('dark:text-text-dark');
  });

  // --- Sidebar collapse/expand tests ---

  it('renders sidebar at 280px width when expanded', () => {
    useSidebarStore.setState({ collapsed: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.style.width).toBe('280px');
  });

  it('renders sidebar at 48px width when collapsed', () => {
    useSidebarStore.setState({ collapsed: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.style.width).toBe('48px');
  });

  it('toggles sidebar from expanded to collapsed on button click', () => {
    useSidebarStore.setState({ collapsed: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.style.width).toBe('48px');
  });

  it('toggles sidebar from collapsed to expanded on button click', () => {
    useSidebarStore.setState({ collapsed: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
    fireEvent.click(toggleButton);

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.style.width).toBe('280px');
  });

  it('persists collapsed state to localStorage on toggle', () => {
    useSidebarStore.setState({ collapsed: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('pdf-editor-sidebar-collapsed', 'true');
  });

  it('has transition-[width] class for GPU-accelerated width transition', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.className).toContain('transition-[width]');
    expect(aside.className).toContain('duration-moderate');
    expect(aside.className).toContain('ease-in-out');
  });

  it('has motion-reduce:transition-none for reduced motion support', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.className).toContain('motion-reduce:transition-none');
  });

  it('toggle button has correct aria-expanded attribute', () => {
    useSidebarStore.setState({ collapsed: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggleButton);

    const expandButton = screen.getByRole('button', { name: /expand sidebar/i });
    expect(expandButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets data-collapsed attribute on sidebar aside', () => {
    useSidebarStore.setState({ collapsed: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /sidebar/i });
    expect(aside.getAttribute('data-collapsed')).toBe('true');
  });

  // --- Mobile sidebar overlay tests ---

  it('renders a hamburger menu button for mobile', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const hamburger = screen.getByRole('button', { name: /open menu/i });
    expect(hamburger).toBeTruthy();
    // The hamburger's parent container has md:hidden to only show on mobile
    const hamburgerContainer = hamburger.parentElement as HTMLElement;
    expect(hamburgerContainer.className).toContain('md:hidden');
  });

  it('opens mobile sidebar overlay when hamburger is clicked', () => {
    useSidebarStore.setState({ mobileOpen: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const hamburger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(hamburger);

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('translate-x-0');
    expect(mobilePanel.className).not.toContain('-translate-x-full');
  });

  it('closes mobile sidebar when close button is clicked', () => {
    useSidebarStore.setState({ mobileOpen: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const closeButton = screen.getByRole('button', { name: /close sidebar/i });
    fireEvent.click(closeButton);

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('-translate-x-full');
  });

  it('closes mobile sidebar when backdrop is clicked', () => {
    useSidebarStore.setState({ mobileOpen: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
    fireEvent.click(backdrop);

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('-translate-x-full');
  });

  it('closes mobile sidebar on Escape key press', () => {
    useSidebarStore.setState({ mobileOpen: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('-translate-x-full');
  });

  it('mobile sidebar overlay has backdrop blur class', () => {
    useSidebarStore.setState({ mobileOpen: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
    expect(backdrop.className).toContain('backdrop-blur-sm');
  });

  it('mobile sidebar panel has slide-in transition classes (200ms ease-out)', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('transition-transform');
    expect(mobilePanel.className).toContain('duration-moderate');
    expect(mobilePanel.className).toContain('ease-out');
  });

  it('mobile sidebar panel respects reduced motion', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('motion-reduce:transition-none');
  });

  it('mobile sidebar is hidden off-screen when closed', () => {
    useSidebarStore.setState({ mobileOpen: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const mobilePanel = screen.getByTestId('mobile-sidebar-panel');
    expect(mobilePanel.className).toContain('-translate-x-full');
  });

  it('desktop sidebar is hidden on mobile via hidden md:flex classes', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const aside = screen.getByRole('navigation', { name: /^Sidebar navigation$/i });
    expect(aside.className).toContain('hidden');
    expect(aside.className).toContain('md:flex');
  });

  it('hamburger button has aria-expanded reflecting mobile sidebar state', () => {
    useSidebarStore.setState({ mobileOpen: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const hamburger = screen.getByRole('button', { name: /open menu/i });
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(hamburger);
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
  });

  // --- GPU-accelerated sidebar content animation tests ---

  it('sidebar content wrapper uses translateX(-100%) when collapsed for GPU-accelerated animation', () => {
    useSidebarStore.setState({ collapsed: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const contentWrapper = screen.getByTestId('sidebar-content-wrapper');
    expect(contentWrapper.className).toContain('-translate-x-full');
    expect(contentWrapper.className).not.toContain('translate-x-0');
  });

  it('sidebar content wrapper uses translateX(0) when expanded', () => {
    useSidebarStore.setState({ collapsed: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const contentWrapper = screen.getByTestId('sidebar-content-wrapper');
    expect(contentWrapper.className).toContain('translate-x-0');
    expect(contentWrapper.className).not.toContain('-translate-x-full');
  });

  it('sidebar content wrapper has GPU-accelerated transition-transform with 200ms ease-in-out', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const contentWrapper = screen.getByTestId('sidebar-content-wrapper');
    expect(contentWrapper.className).toContain('transition-transform');
    expect(contentWrapper.className).toContain('duration-moderate');
    expect(contentWrapper.className).toContain('ease-in-out');
  });

  it('sidebar content wrapper respects prefers-reduced-motion', () => {
    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const contentWrapper = screen.getByTestId('sidebar-content-wrapper');
    expect(contentWrapper.className).toContain('motion-reduce:transition-none');
  });

  it('sidebar content slides from translateX(0) to translateX(-100%) on collapse toggle', () => {
    useSidebarStore.setState({ collapsed: false });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const contentWrapper = screen.getByTestId('sidebar-content-wrapper');
    expect(contentWrapper.className).toContain('translate-x-0');

    const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleButton);

    expect(contentWrapper.className).toContain('-translate-x-full');
  });

  it('sidebar content slides from translateX(-100%) to translateX(0) on expand toggle', () => {
    useSidebarStore.setState({ collapsed: true });

    render(
      <AppShell sidebar={<div>Sidebar</div>}>
        <div>Canvas</div>
      </AppShell>,
    );

    const contentWrapper = screen.getByTestId('sidebar-content-wrapper');
    expect(contentWrapper.className).toContain('-translate-x-full');

    const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
    fireEvent.click(toggleButton);

    expect(contentWrapper.className).toContain('translate-x-0');
  });
});
