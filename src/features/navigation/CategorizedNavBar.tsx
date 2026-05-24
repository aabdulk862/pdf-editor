import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavStore } from './store/nav-store';
import { useThemeStore } from '../../store/theme';
import { filterNavigation } from './filter';
import { NAV_CATEGORIES } from './categories';
import { NavFilterInput } from './NavFilterInput';
import { NavCategoryGroup } from './NavCategoryGroup';
import { NavToolLink } from './NavToolLink';
import { NavContextMenu } from './NavContextMenu';
import { FolderIcon, PencilIcon, ConvertIcon, ShieldIcon, ChartIcon, ScanIcon } from './icons';
import type { FC } from 'react';
import type { NavTool } from './categories';

/** Map category IDs to their icon components */
const CATEGORY_ICONS: Record<string, FC<{ className?: string }>> = {
  organize: FolderIcon,
  edit: PencilIcon,
  convert: ConvertIcon,
  protect: ShieldIcon,
  analyze: ChartIcon,
  ocr: ScanIcon,
};

/** Resolve a tool path to its NavTool definition */
function findToolByPath(path: string): NavTool | undefined {
  for (const category of NAV_CATEGORIES) {
    const tool = category.tools.find((t) => t.path === path);
    if (tool) return tool;
  }
  return undefined;
}

/**
 * Redesigned navigation component with categorized tool groups.
 *
 * Structure:
 * - App title
 * - Filter input
 * - Favorites section (hidden if empty)
 * - Recent section (hidden if empty, max 5)
 * - Category groups (collapsible)
 * - Collapse toggle button
 * - Theme toggle
 *
 * Supports:
 * - Collapsed sidebar mode (48px, icons only, tooltip on 300ms hover)
 * - Mobile full-screen overlay with bottom-up animation and backdrop
 *
 * Requirements: 14.1, 14.7, 14.9, 14.10, 14.12, 14.14
 */
export function CategorizedNavBar() {
  const {
    favorites,
    recentTools,
    collapsedCategories,
    sidebarCollapsed,
    filterQuery,
    toggleCategory,
    toggleSidebar,
    setFilterQuery,
    loadFromStorage,
  } = useNavStore();

  const { theme, toggleTheme } = useThemeStore();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    toolPath: string;
    position: { x: number; y: number };
  } | null>(null);

  // Tooltip state for collapsed mode
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Filter navigation
  const { categories: filteredCategories, hasResults } = filterNavigation(filterQuery);

  // Resolve favorite tools
  const favoriteTools = favorites
    .map((path) => findToolByPath(path))
    .filter((t): t is NavTool => t !== undefined);

  // Resolve recent tools
  const recentToolItems = recentTools
    .map((path) => findToolByPath(path))
    .filter((t): t is NavTool => t !== undefined);

  const handleContextMenu = useCallback((toolPath: string, position: { x: number; y: number }) => {
    setContextMenu({ toolPath, position });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Tooltip handlers for collapsed mode
  const handleToolMouseEnter = useCallback(
    (label: string, event: React.MouseEvent<HTMLElement>) => {
      if (!sidebarCollapsed) return;
      const rect = event.currentTarget.getBoundingClientRect();
      tooltipTimer.current = setTimeout(() => {
        setTooltip({ label, top: rect.top + rect.height / 2 });
      }, 300);
    },
    [sidebarCollapsed],
  );

  const handleToolMouseLeave = useCallback(() => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    setTooltip(null);
  }, []);

  // ─── Collapsed Sidebar (Desktop) ─────────────────────────────────────────────

  if (sidebarCollapsed) {
    return (
      <div className="hidden md:flex flex-col items-center w-12 h-full py-3 gap-1 relative">
        {/* All tools as icon-only buttons */}
        <div className="flex-1 overflow-y-auto w-full space-y-0.5 px-1">
          {NAV_CATEGORIES.map((category) =>
            category.tools.map((tool) => (
              <div
                key={tool.path}
                onMouseEnter={(e) => handleToolMouseEnter(tool.label, e)}
                onMouseLeave={handleToolMouseLeave}
              >
                <NavToolLink
                  path={tool.path}
                  label=""
                  icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                  onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                />
              </div>
            )),
          )}
        </div>

        {/* Collapse toggle (expand) */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800 transition-colors duration-150"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 4l6 6-6 6" />
          </svg>
        </button>

        {/* Theme toggle (icon only) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onMouseEnter={(e) =>
            handleToolMouseEnter(theme === 'light' ? 'Dark Mode' : 'Light Mode', e)
          }
          onMouseLeave={handleToolMouseLeave}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800 transition-colors duration-150"
        >
          {theme === 'light' ? (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed left-14 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none"
            style={{ top: tooltip.top, transform: 'translateY(-50%)' }}
            role="tooltip"
          >
            {tooltip.label}
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <NavContextMenu
            toolPath={contextMenu.toolPath}
            position={contextMenu.position}
            onClose={handleCloseContextMenu}
          />
        )}
      </div>
    );
  }

  // ─── Expanded Sidebar Content (shared between desktop and mobile) ─────────────

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* App title — links to home */}
      <div className="px-4 py-3">
        <Link
          to="/"
          className="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          PDF Editor
        </Link>
      </div>

      {/* Filter input */}
      <div className="px-3 pb-3">
        <NavFilterInput value={filterQuery} onChange={setFilterQuery} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3">
        {/* Favorites section — hidden if empty */}
        {favoriteTools.length > 0 && !filterQuery && (
          <div>
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
              Favorites
            </p>
            <div className="space-y-0.5">
              {favoriteTools.map((tool) => (
                <NavToolLink
                  key={tool.path}
                  path={tool.path}
                  label={tool.label}
                  icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                  onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent section — hidden if empty */}
        {recentToolItems.length > 0 && !filterQuery && (
          <div>
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
              Recent
            </p>
            <div className="space-y-0.5">
              {recentToolItems.map((tool) => (
                <NavToolLink
                  key={tool.path}
                  path={tool.path}
                  label={tool.label}
                  icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                  onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category groups or "No tools found" */}
        {hasResults ? (
          filteredCategories.map((category) => (
            <NavCategoryGroup
              key={category.id}
              category={category}
              icon={CATEGORY_ICONS[category.id] ?? FolderIcon}
              isCollapsed={!!collapsedCategories[category.id]}
              onToggle={() => toggleCategory(category.id)}
            >
              {category.tools.map((tool) => (
                <NavToolLink
                  key={tool.path}
                  path={tool.path}
                  label={tool.label}
                  icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                  onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                />
              ))}
            </NavCategoryGroup>
          ))
        ) : (
          <div className="px-3 py-6 text-center">
            <svg
              className="mx-auto h-10 w-10 text-secondary-400 dark:text-secondary-500"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M12.5 12.5 17 17" />
            </svg>
            <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
              No tools found
            </p>
          </div>
        )}
      </div>

      {/* Bottom section: collapse toggle + theme toggle */}
      <div className="border-t border-secondary-200 dark:border-secondary-700 px-3 py-2 space-y-1">
        {/* Collapse toggle (desktop only) */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:flex w-full items-center gap-3 min-h-[44px] px-3 py-2 rounded-md text-sm font-medium text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-150"
          aria-label="Collapse sidebar"
        >
          <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13 4l-6 6 6 6" />
          </svg>
          <span>Collapse</span>
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-md text-sm font-medium text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-150"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <NavContextMenu
          toolPath={contextMenu.toolPath}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );

  // ─── Desktop Expanded Sidebar ─────────────────────────────────────────────────

  const desktopSidebar = <div className="hidden md:flex md:flex-col h-full">{sidebarContent}</div>;

  return (
    <>
      {desktopSidebar}
      {/* On mobile, this component's content is rendered inside Layout's mobile drawer */}
      <div className="md:hidden flex flex-col h-full">{sidebarContent}</div>
    </>
  );
}
