import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useCommandPaletteStore } from '../../store/command-palette';
import { useRovingTabindex } from '../../hooks/useRovingTabindex';
import { Icon } from '../../design-system/primitives/Icon';

/**
 * Command Palette — a modal overlay for keyboard-driven navigation.
 *
 * Renders via React portal to document.body. Provides:
 * - Auto-focus on search input when opened
 * - ARIA role="dialog" with accessible label
 * - Keyboard navigation: Escape, Enter, ArrowUp/ArrowDown
 * - Click-outside to close
 * - Focus restoration on close
 * - "No results found" empty state
 * - 100-character input limit
 * - Modal backdrop preventing interaction with elements behind
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 2.6, 2.7, 2.8
 */
export function CommandPalette() {
  const {
    isOpen,
    query,
    activeIndex,
    filteredItems,
    close,
    setQuery,
    moveSelection,
    setActiveIndex,
    getActiveItem,
  } = useCommandPaletteStore();

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Animation state: starts false, transitions to true after mount to trigger CSS transitions
  const [animateIn, setAnimateIn] = useState(false);

  const handleNavigate = useCallback(
    (route: string) => {
      close();
      navigate(route);
    },
    [close, navigate],
  );

  // Roving tabindex for the results list
  const {
    getTabIndex,
    getItemRef,
    handleKeyDown: handleListKeyDown,
  } = useRovingTabindex({
    itemCount: filteredItems.length,
    wrap: true,
    onActivate: (index: number) => {
      const item = filteredItems[index];
      if (item) {
        handleNavigate(item.route);
      }
    },
  });

  // Trigger entrance animation after the portal renders
  useEffect(() => {
    if (isOpen) {
      // Reset animation state when opening
      setAnimateIn(false);
      // Use requestAnimationFrame to ensure the initial state is painted before transitioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  // Auto-focus the search input when the palette opens
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure the portal is rendered before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeElement = listRef.current.children[activeIndex] as HTMLElement | undefined;
    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveSelection('down');
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveSelection('up');
          break;
        case 'Home':
          e.preventDefault();
          if (filteredItems.length > 0) {
            setActiveIndex(0);
          }
          break;
        case 'End':
          e.preventDefault();
          if (filteredItems.length > 0) {
            setActiveIndex(filteredItems.length - 1);
          }
          break;
        case 'Enter': {
          e.preventDefault();
          const activeItem = getActiveItem();
          if (activeItem) {
            handleNavigate(activeItem.route);
          }
          break;
        }
      }
    },
    [close, moveSelection, setActiveIndex, filteredItems.length, getActiveItem, handleNavigate],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Close only if clicking the backdrop itself, not the content
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        close();
      }
    },
    [close],
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      {/* Backdrop — prevents interaction with elements behind */}
      <div
        className={[
          'absolute inset-0 bg-black/50',
          'transition-[opacity,backdrop-filter] duration-fast ease-out motion-reduce:transition-none',
          animateIn ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={contentRef}
        className={[
          'relative z-10 w-full max-w-[min(32rem,calc(100vw-32px))] max-h-[calc(100vh-32px)] mx-4 overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-level-4 dark:border-secondary-700 dark:bg-secondary-800',
          'transition-transform duration-normal ease-out motion-reduce:transition-none',
          animateIn ? 'scale-100' : 'scale-95',
        ].join(' ')}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-secondary-200 px-4 dark:border-secondary-700">
          <Icon size={20} className="shrink-0 text-secondary-400 dark:text-secondary-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Icon>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="Search operations..."
            className="w-full bg-transparent px-3 py-4 text-sm text-text-light outline-none placeholder:text-secondary-400 dark:text-text-dark dark:placeholder:text-secondary-500"
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filteredItems.length > 0
                ? `command-item-${filteredItems[activeIndex]?.id}`
                : undefined
            }
          />
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto overscroll-contain">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-secondary-500 dark:text-secondary-400">
              No results found
            </div>
          ) : (
            <ul
              ref={listRef}
              id="command-palette-list"
              role="listbox"
              aria-label="Available commands"
              className="py-2"
              onKeyDown={handleListKeyDown}
            >
              {filteredItems.map((item, index) => (
                <li
                  key={item.id}
                  id={`command-item-${item.id}`}
                  ref={getItemRef(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  tabIndex={getTabIndex(index)}
                  onClick={() => handleNavigate(item.route)}
                  className={[
                    'flex cursor-pointer items-center gap-3 px-4 py-3 min-h-[44px] text-sm transition-colors duration-normal ease-in-out outline-none',
                    index === activeIndex
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-text-light hover:bg-secondary-50 dark:text-text-dark dark:hover:bg-secondary-700/50',
                  ].join(' ')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="hidden sm:block truncate text-xs text-secondary-500 dark:text-secondary-400">
                      {item.description}
                    </div>
                  </div>
                  <span className="hidden sm:inline shrink-0 text-xs text-secondary-400 dark:text-secondary-500">
                    {item.route}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint — hidden on small screens (keyboard shortcut hints non-essential on mobile) */}
        <div className="hidden sm:flex items-center gap-4 border-t border-secondary-200 px-4 py-2 text-xs text-secondary-400 dark:border-secondary-700 dark:text-secondary-500">
          <span>
            <kbd className="rounded border border-secondary-300 px-1.5 py-0.5 font-mono text-[10px] dark:border-secondary-600">
              ↑↓
            </kbd>{' '}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-secondary-300 px-1.5 py-0.5 font-mono text-[10px] dark:border-secondary-600">
              Home/End
            </kbd>{' '}
            first/last
          </span>
          <span>
            <kbd className="rounded border border-secondary-300 px-1.5 py-0.5 font-mono text-[10px] dark:border-secondary-600">
              ↵
            </kbd>{' '}
            select
          </span>
          <span>
            <kbd className="rounded border border-secondary-300 px-1.5 py-0.5 font-mono text-[10px] dark:border-secondary-600">
              esc
            </kbd>{' '}
            close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
