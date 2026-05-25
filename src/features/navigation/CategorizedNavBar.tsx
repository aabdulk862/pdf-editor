import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNavStore } from './store/nav-store';
import { useThemeStore } from '../../store/theme';
import { filterNavigation } from './filter';
import { NAV_CATEGORIES } from './categories';
import { NavFilterInput } from './NavFilterInput';
import { NavCategoryGroup } from './NavCategoryGroup';
import { NavToolLink } from './NavToolLink';
import { NavContextMenu } from './NavContextMenu';
import { useRovingTabindex } from '../../hooks/useRovingTabindex';
import { useReducedMotion } from '../../hooks/useReducedMotion';
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
  const navigate = useNavigate();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    toolPath: string;
    position: { x: number; y: number };
  } | null>(null);

  // Tooltip state for collapsed mode
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();

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

  // Build flat list of visible tool paths for roving tabindex
  const visibleToolPaths = useMemo(() => {
    const paths: string[] = [];

    // Favorites (only shown when not filtering and has items)
    if (favoriteTools.length > 0 && !filterQuery) {
      favoriteTools.forEach((tool) => paths.push(tool.path));
    }

    // Recents (only shown when not filtering and has items)
    if (recentToolItems.length > 0 && !filterQuery) {
      recentToolItems.forEach((tool) => paths.push(tool.path));
    }

    // Category tools (only non-collapsed categories, or filtered results)
    if (hasResults) {
      filteredCategories.forEach((category) => {
        // When filtering, show all results regardless of collapse state
        // When not filtering, respect collapse state
        const isCollapsed = !filterQuery && !!collapsedCategories[category.id];
        if (!isCollapsed) {
          category.tools.forEach((tool) => paths.push(tool.path));
        }
      });
    }

    return paths;
  }, [
    favoriteTools,
    recentToolItems,
    filterQuery,
    hasResults,
    filteredCategories,
    collapsedCategories,
  ]);

  // Roving tabindex for keyboard navigation
  const { getTabIndex, getItemRef, handleKeyDown, focusedIndex, setFocusedIndex } =
    useRovingTabindex({
      itemCount: visibleToolPaths.length,
      wrap: true,
      onActivate: (index) => {
        const path = visibleToolPaths[index];
        if (path) {
          navigate(path);
        }
      },
    });

  // Reset focused index when visible items change (e.g., filter or collapse)
  useEffect(() => {
    if (focusedIndex >= visibleToolPaths.length && visibleToolPaths.length > 0) {
      setFocusedIndex(0);
    }
  }, [visibleToolPaths.length, focusedIndex, setFocusedIndex]);

  // Track the current flat index as we render items
  let flatIndex = 0;

  /** Get the next flat index and increment the counter */
  const getNextFlatIndex = () => {
    const idx = flatIndex;
    flatIndex++;
    return idx;
  };

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
        // If reduced motion is preferred, show instantly; otherwise trigger fade-in
        if (prefersReducedMotion) {
          setTooltipVisible(true);
        } else {
          // Start with opacity 0, then trigger fade-in on next frame
          setTooltipVisible(false);
          tooltipFadeTimer.current = setTimeout(() => {
            setTooltipVisible(true);
          }, 10);
        }
      }, 300);
    },
    [sidebarCollapsed, prefersReducedMotion],
  );

  const handleToolMouseLeave = useCallback(() => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    if (tooltipFadeTimer.current) {
      clearTimeout(tooltipFadeTimer.current);
      tooltipFadeTimer.current = null;
    }
    setTooltip(null);
    setTooltipVisible(false);
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
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800 transition-colors duration-normal ease-in-out"
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
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800 transition-colors duration-normal ease-in-out"
        >
          {theme === 'light' ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 10a7 7 0 01-9.9 6.4A7 7 0 0110 3.1a5.5 5.5 0 007 6.9z" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="4" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
            </svg>
          )}
        </button>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed left-14 z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none"
            style={{
              top: tooltip.top,
              transform: 'translateY(-50%)',
              opacity: tooltipVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : 'opacity 150ms ease-out',
              willChange: 'opacity',
            }}
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
          className="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-normal ease-in-out"
        >
          PDF Editor
        </Link>
      </div>

      {/* Filter input */}
      <div className="px-3 pb-3">
        <NavFilterInput value={filterQuery} onChange={setFilterQuery} />
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto px-3 space-y-3"
        role="listbox"
        aria-label="PDF Tools"
        onKeyDown={handleKeyDown}
      >
        {/* Favorites section — hidden if empty */}
        {favoriteTools.length > 0 && !filterQuery && (
          <div>
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
              Favorites
            </p>
            <div className="space-y-0.5">
              {favoriteTools.map((tool) => {
                const idx = getNextFlatIndex();
                return (
                  <NavToolLink
                    key={tool.path}
                    ref={getItemRef(idx)}
                    tabIndex={getTabIndex(idx)}
                    path={tool.path}
                    label={tool.label}
                    icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                    onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                  />
                );
              })}
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
              {recentToolItems.map((tool) => {
                const idx = getNextFlatIndex();
                return (
                  <NavToolLink
                    key={tool.path}
                    ref={getItemRef(idx)}
                    tabIndex={getTabIndex(idx)}
                    path={tool.path}
                    label={tool.label}
                    icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                    onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Category groups or "No tools found" */}
        {hasResults ? (
          filteredCategories.map((category) => {
            const isCollapsed = !filterQuery && !!collapsedCategories[category.id];
            return (
              <NavCategoryGroup
                key={category.id}
                category={category}
                icon={CATEGORY_ICONS[category.id] ?? FolderIcon}
                isCollapsed={isCollapsed}
                onToggle={() => toggleCategory(category.id)}
              >
                {category.tools.map((tool) => {
                  const idx = getNextFlatIndex();
                  return (
                    <NavToolLink
                      key={tool.path}
                      ref={getItemRef(idx)}
                      tabIndex={getTabIndex(idx)}
                      path={tool.path}
                      label={tool.label}
                      icon={CATEGORY_ICONS[tool.categoryId] ?? FolderIcon}
                      onContextMenu={(pos) => handleContextMenu(tool.path, pos)}
                    />
                  );
                })}
              </NavCategoryGroup>
            );
          })
        ) : (
          <div className="px-3 py-6 text-center">
            <svg
              className="mx-auto h-6 w-6 text-secondary-400 dark:text-secondary-500"
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
          className="hidden md:flex w-full items-center gap-3 min-h-[44px] px-3 py-2 rounded-md text-sm font-medium text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out"
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
          className="w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-md text-sm font-medium text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 10a7 7 0 01-9.9 6.4A7 7 0 0110 3.1a5.5 5.5 0 007 6.9z" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="4" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
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
