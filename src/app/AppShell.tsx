import { useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

import { useSidebarStore } from '../store/sidebar';
import { useToolbarStore } from '../store/toolbar';
import { Toolbar } from './Toolbar';

/**
 * Props for the AppShell layout component.
 *
 * @property sidebar - Content rendered in the collapsible sidebar (left column, spans all rows)
 * @property children - Primary content rendered in the Canvas Area zone
 * @property rightPanel - Optional future panel (comments, AI, properties) rendered to the right of the canvas
 */
export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
}

/** Expanded sidebar width in pixels */
const SIDEBAR_WIDTH_EXPANDED = 280;
/** Collapsed sidebar width in pixels (icon-only rail) */
const SIDEBAR_WIDTH_COLLAPSED = 48;

/**
 * AppShell — Top-level CSS Grid layout shell for the PDF Editor.
 *
 * Implements a two-column grid (sidebar + main content) with four rows
 * in the main content area (tab bar, toolbar, canvas, status bar).
 *
 * Grid structure:
 *   Columns: auto (sidebar) | 1fr (main content)
 *   Rows:    auto (tab bar) | auto (toolbar) | 1fr (canvas) | auto (status bar)
 *
 * The sidebar spans all rows and transitions between 48px (collapsed) and 280px (expanded)
 * with a GPU-accelerated width transition (200ms ease-in-out).
 * The canvas area enforces a minimum width of 320px.
 *
 * On mobile (below md breakpoint / 768px):
 * - The sidebar column is hidden from the grid
 * - A hamburger menu button is shown in the tab bar
 * - When activated, the sidebar appears as a fixed full-height overlay
 * - A semi-transparent backdrop with blur is shown behind the overlay
 * - The overlay animates in from the left over 200ms ease-out
 * - Dismissible via backdrop click, close button, or Escape key
 *
 * Layout zones:
 * ┌────────┬─────────────────────────────────────────────────────┐
 * │        │  Tab Bar                                             │
 * │        ├─────────────────────────────────────────────────────┤
 * │ Side-  │  Contextual Toolbar                                 │
 * │ bar    ├─────────────────────────────────────────────────────┤
 * │        │  Canvas Area (children)                             │
 * │        ├─────────────────────────────────────────────────────┤
 * │        │  Status Bar                                         │
 * └────────┴─────────────────────────────────────────────────────┘
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.8, 7.5
 */
export function AppShell({ sidebar, children, rightPanel }: AppShellProps) {
  const { collapsed, toggle, mobileOpen, openMobile, closeMobile } = useSidebarStore();
  const toolbarSlots = useToolbarStore((state) => state.slots);

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  // Close mobile sidebar on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        closeMobile();
      }
    },
    [mobileOpen, closeMobile],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when mobile overlay is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Use inert attribute to prevent focus on hidden mobile sidebar
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mobileSidebarRef.current;
    if (!el) return;
    if (mobileOpen) {
      el.removeAttribute('inert');
    } else {
      el.setAttribute('inert', '');
    }
  }, [mobileOpen]);

  return (
    <div
      className="grid h-screen overflow-hidden bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark"
      style={{
        gridTemplateColumns: 'auto 1fr',
        gridTemplateRows: 'auto auto 1fr auto',
      }}
    >
      {/* Desktop Sidebar — spans all rows, transitions width, hidden on mobile */}
      {/* Container animates width for layout reflow; content uses GPU-accelerated translateX for smooth visual animation */}
      <aside
        className="row-span-full relative flex-col border-r border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 overflow-hidden transition-[width] duration-moderate ease-in-out motion-reduce:transition-none hidden md:flex"
        style={{ width: `${sidebarWidth}px` }}
        role="navigation"
        aria-label="Sidebar navigation"
        data-collapsed={collapsed}
      >
        {/* Sidebar content — uses translateX for GPU-accelerated slide animation */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden transition-transform duration-moderate ease-in-out motion-reduce:transition-none ${collapsed ? '-translate-x-full' : 'translate-x-0'}`}
          data-testid="sidebar-content-wrapper"
          aria-hidden={collapsed}
        >
          {sidebar}
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={toggle}
          className="flex items-center justify-center w-full min-h-[44px] border-t border-secondary-200 dark:border-secondary-700 bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-300 transition-colors duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-moderate ease-in-out motion-reduce:transition-none ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div
        ref={mobileSidebarRef}
        className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-secondary-900/50 backdrop-blur-sm transition-opacity duration-moderate ease-out motion-reduce:transition-none ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeMobile}
          aria-hidden="true"
          data-testid="mobile-sidebar-backdrop"
        />

        {/* Sidebar panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-[280px] flex flex-col bg-secondary-50 dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-700 shadow-level-4 transition-transform duration-moderate ease-out motion-reduce:transition-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="navigation"
          aria-label="Mobile sidebar navigation"
          data-testid="mobile-sidebar-panel"
        >
          {/* Close button */}
          <div className="flex items-center justify-end p-2 border-b border-secondary-200 dark:border-secondary-700">
            <button
              type="button"
              onClick={closeMobile}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
              aria-label="Close sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">{sidebar}</div>
        </aside>
      </div>

      {/* Tab Bar — row 1 */}
      <div
        className="border-b border-secondary-200 dark:border-secondary-700 bg-background-light dark:bg-background-dark"
        role="banner"
        data-zone="tab-bar"
      >
        {/* Mobile hamburger menu button */}
        <div className="flex items-center md:hidden p-2">
          <button
            type="button"
            onClick={openMobile}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        {/* Tab bar content will be injected by TabBar feature component */}
      </div>

      {/* Contextual Toolbar — row 2 */}
      <div data-zone="toolbar">
        <Toolbar slots={toolbarSlots} />
      </div>

      {/* Canvas Area — row 3 (main content) */}
      <main
        className="overflow-x-hidden overflow-y-auto bg-background-light dark:bg-background-dark min-w-0"
        role="main"
        data-zone="canvas"
      >
        {rightPanel ? (
          <div className="flex h-full">
            <div className="flex-1 min-w-0 overflow-auto">{children}</div>
            <aside
              className="w-80 shrink-0 border-l border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 overflow-y-auto"
              role="complementary"
              aria-label="Right panel"
            >
              {rightPanel}
            </aside>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Status Bar — row 4 */}
      <div
        className="border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 text-xs text-secondary-500 dark:text-secondary-400"
        data-zone="status-bar"
      >
        {/* Status bar content (progress, file info) will be injected by workspace features */}
      </div>
    </div>
  );
}
