import type { ReactNode } from 'react';
import { useState } from 'react';
import { UndoRedoControls } from './UndoRedoControls';
import { GlobalDropZone } from '../../features/global-drop-zone/GlobalDropZone';
import { CommandPalette } from '../../features/command-palette/CommandPalette';
import { ShortcutReferencePanel } from '../../features/shortcuts/ShortcutReferencePanel';
import { TabBar } from '../../features/tabs/TabBar';
import { TabContent } from '../../features/tabs/TabContent';
import { TemplateConfigScreen } from '../../features/templates/TemplateConfigScreen';
import { TemplateProgress } from '../../features/templates/TemplateProgress';

/** Navigation link item for the sidebar/mobile nav */
export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface LayoutProps {
  children: ReactNode;
  /** Optional sidebar navigation content for desktop */
  sidebar?: ReactNode;
  /** Optional top bar content (e.g., NavBar component) */
  topBar?: ReactNode;
}

/**
 * Responsive layout shell for the PDF Editor application.
 *
 * - Desktop (≥768px): sidebar navigation on the left, main content on the right
 * - Mobile (<768px): stacked layout with nav on top, content below
 * - Smooth transitions (150-300ms) for layout changes and interactive states
 * - Non-essential UI hidden behind expandable sections on <640px
 * - Modals/dropdowns constrained to viewport bounds on mobile
 *
 * Requirements: 27.1, 27.5, 27.7, 27.9, 30.4
 */
export function Layout({ children, sidebar, topBar }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <GlobalDropZone>
      <div className="min-h-screen flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-200">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 w-full border-b border-secondary-200 dark:border-secondary-700 bg-background-light dark:bg-background-dark">
          <div className="flex items-center justify-between px-4 h-14">
            {topBar ?? (
              <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                PDF Editor
              </span>
            )}
            <div className="flex items-center gap-1">
              <UndoRedoControls />
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-md text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile navigation drawer */}
          <nav
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              sidebarOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'
            }`}
            aria-label="Mobile navigation"
          >
            <div className="px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 overflow-y-auto max-h-[60vh]">
              {sidebar ?? <DefaultSidebarContent />}
            </div>
          </nav>
        </header>

        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex md:flex-col md:w-64 lg:w-72 md:flex-shrink-0 border-r border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 sticky top-0 h-screen overflow-y-auto transition-all duration-200"
          aria-label="Desktop navigation"
        >
          <div className="flex items-center justify-between h-14 px-4 border-b border-secondary-200 dark:border-secondary-700">
            {topBar ?? (
              <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                PDF Editor
              </span>
            )}
            <UndoRedoControls />
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">{sidebar ?? <DefaultSidebarContent />}</nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-w-0 transition-all duration-200">
          {/* Tab bar above main content */}
          <TabBar />
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TabContent>{children}</TabContent>
          </div>
        </main>

        {/* Mobile overlay backdrop when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 md:hidden transition-opacity duration-150"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Portal-based overlays */}
      <CommandPalette />
      <ShortcutReferencePanel />
      <TemplateConfigScreen />
      <TemplateProgress />
    </GlobalDropZone>
  );
}

/**
 * Expandable section for hiding non-essential UI on small screens (<640px).
 * Renders content in a collapsible panel with smooth transitions.
 *
 * Requirements: 27.7
 */
export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="sm:contents">
      {/* On ≥640px, always show content inline */}
      <div className="hidden sm:block">{children}</div>

      {/* On <640px, show as expandable section */}
      <div className="sm:hidden border border-secondary-200 dark:border-secondary-700 rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-light dark:text-text-dark bg-secondary-50 dark:bg-secondary-800 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-150 min-h-[44px]"
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper for modals/dropdowns that ensures they render within viewport bounds on mobile.
 * Uses fixed positioning with viewport-aware constraints.
 *
 * Requirements: 27.9
 */
export function ViewportConstrained({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-auto ${className}`}>
      {children}
    </div>
  );
}

/** Default sidebar content placeholder when no sidebar prop is provided */
function DefaultSidebarContent() {
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
        PDF Tools
      </p>
      <p className="px-3 py-2 text-sm text-secondary-400 dark:text-secondary-500">
        Navigation will appear here.
      </p>
    </div>
  );
}
