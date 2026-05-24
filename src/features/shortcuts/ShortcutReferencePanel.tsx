import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useShortcutStore } from '../../store/shortcuts';
import { useShortcutContext } from './ShortcutProvider';
import { detectPlatform, formatShortcut } from './format';
import type { ShortcutBinding, ShortcutCategory } from './types';

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  operations: 'Operations',
  application: 'Application',
};

const CATEGORY_ORDER: ShortcutCategory[] = ['navigation', 'operations', 'application'];

/**
 * Filters shortcut bindings by a search query.
 * Each space-separated token must appear as a case-insensitive substring
 * in the binding's label or formatted key combination string.
 */
export function filterShortcuts(
  bindings: ShortcutBinding[],
  query: string,
  platform: ReturnType<typeof detectPlatform>,
): ShortcutBinding[] {
  const trimmed = query.trim();
  if (!trimmed) return bindings;

  const tokens = trimmed.toLowerCase().split(/\s+/);

  return bindings.filter((binding) => {
    const label = binding.label.toLowerCase();
    const formatted = formatShortcut(binding.keys, platform).toLowerCase();
    const searchable = `${label} ${formatted}`;

    return tokens.every((token) => searchable.includes(token));
  });
}

/**
 * ShortcutReferencePanel — Modal overlay listing all registered shortcuts
 * grouped by category (Navigation, Operations, Application).
 *
 * Displays formatted key combinations per OS, searchable by name or key combination.
 * Opens via Shift+?, closes via Escape or click-outside.
 */
export function ShortcutReferencePanel() {
  const { isReferencePanelOpen, closeReferencePanel } = useShortcutContext();
  const [searchQuery, setSearchQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const platform = useMemo(() => detectPlatform(), []);

  const bindings = useShortcutStore((state) => state.bindings);

  const allBindings = useMemo(() => Array.from(bindings.values()), [bindings]);

  const filteredBindings = useMemo(
    () => filterShortcuts(allBindings, searchQuery, platform),
    [allBindings, searchQuery, platform],
  );

  const groupedBindings = useMemo(() => {
    const groups: Record<ShortcutCategory, ShortcutBinding[]> = {
      navigation: [],
      operations: [],
      application: [],
    };

    for (const binding of filteredBindings) {
      groups[binding.category].push(binding);
    }

    return groups;
  }, [filteredBindings]);

  // Focus search input when panel opens
  useEffect(() => {
    if (isReferencePanelOpen) {
      setSearchQuery('');
      // Small delay to ensure the portal is rendered
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isReferencePanelOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isReferencePanelOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeReferencePanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isReferencePanelOpen, closeReferencePanel]);

  // Handle click-outside to close
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        closeReferencePanel();
      }
    },
    [closeReferencePanel],
  );

  if (!isReferencePanelOpen) return null;

  const panelContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Keyboard Shortcuts Reference"
        aria-modal="true"
        className="mx-4 flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-secondary-200 bg-white shadow-xl dark:border-secondary-700 dark:bg-secondary-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary-200 px-6 py-4 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={closeReferencePanel}
            aria-label="Close shortcuts panel"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-secondary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-secondary-200 px-6 py-3 dark:border-secondary-700">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts..."
            aria-label="Search shortcuts"
            className="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-text-light placeholder-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark dark:placeholder-secondary-500"
          />
        </div>

        {/* Shortcut List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredBindings.length === 0 ? (
            <p className="py-8 text-center text-sm text-secondary-500 dark:text-secondary-400">
              No shortcuts found
            </p>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const bindings = groupedBindings[category];
              if (bindings.length === 0) return null;

              return (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <ul className="space-y-1">
                    {bindings.map((binding) => (
                      <li
                        key={binding.id}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-secondary-50 dark:hover:bg-secondary-700/50"
                      >
                        <span className="text-sm text-text-light dark:text-text-dark">
                          {binding.label}
                        </span>
                        <kbd className="ml-4 shrink-0 rounded bg-secondary-100 px-2 py-1 font-mono text-xs text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300">
                          {formatShortcut(binding.keys, platform)}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}
