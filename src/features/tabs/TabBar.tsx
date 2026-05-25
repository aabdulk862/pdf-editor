import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useTabStore } from '../../store/tabs';

/**
 * Horizontal tab strip displaying all open document tabs.
 * Supports horizontal scrolling when tabs overflow, click to switch,
 * close button to remove, and Ctrl+Tab keyboard shortcut to cycle.
 * Features a sliding active indicator that animates via translateX over 150ms.
 *
 * Requirements: 5.1, 5.3, 5.5, 5.7, 5.8, 5.9, 8.2
 */
export function TabBar() {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const switchTab = useTabStore((state) => state.switchTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const cycleTab = useTabStore((state) => state.cycleTab);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(
    null,
  );

  // Keyboard shortcut: Ctrl+Tab to cycle to next tab
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (tabs.length === 0) return;

      // Ctrl+Tab (or Cmd+Option+Right on macOS) → cycle next
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        cycleTab(e.shiftKey ? 'prev' : 'next');
      }
    },
    [tabs.length, cycleTab],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Update indicator position when active tab changes
  useLayoutEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) {
      setIndicatorStyle(null);
      return;
    }
    const activeEl = scrollContainerRef.current.querySelector(
      `[data-tab-id="${activeTabId}"]`,
    ) as HTMLElement | null;
    if (activeEl) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left + scrollContainerRef.current.scrollLeft,
        width: tabRect.width,
      });
    }
  }, [activeTabId, tabs.length]);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!activeTabId || !scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <div
      className="relative flex items-center border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900"
      role="tablist"
      aria-label="Open document tabs"
    >
      <div
        ref={scrollContainerRef}
        className="relative flex-1 flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-secondary-300 dark:scrollbar-thumb-secondary-600 scrollbar-track-transparent"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`Tab: ${tab.fileName}`}
              onClick={() => switchTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] text-sm font-medium whitespace-nowrap border-r border-secondary-200 dark:border-secondary-700 transition-colors duration-normal ease-in-out flex-shrink-0 ${
                isActive
                  ? 'bg-background-light dark:bg-background-dark text-primary-700 dark:text-primary-300'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              <span className="truncate flex-1 text-left">{tab.fileName}</span>
              <span
                role="button"
                aria-label={`Close tab: ${tab.fileName}`}
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    closeTab(tab.id);
                  }
                }}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-opacity duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900 focus-visible:opacity-100"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </span>
            </button>
          );
        })}
        {/* Sliding active indicator */}
        {indicatorStyle && (
          <div
            ref={indicatorRef}
            data-testid="tab-active-indicator"
            className="absolute bottom-0 h-0.5 bg-primary-500 transition-transform duration-normal ease-in-out motion-reduce:transition-none"
            style={{
              width: `${indicatorStyle.width}px`,
              transform: `translateX(${indicatorStyle.left}px)`,
              left: 0,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
