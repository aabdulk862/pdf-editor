import { useCallback, useEffect } from 'react';

import { useOnboardingStore } from '../store/onboarding-store';

interface ShortcutPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string;
  description: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutEntry[];
}

/**
 * Returns the platform-appropriate modifier key label.
 */
function getModifierLabel(): string {
  if (typeof navigator !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('userAgentData' in navigator && (navigator as unknown as any).userAgentData?.platform) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((navigator as unknown as any).userAgentData.platform === 'macOS') return '⌘';
    }
    if (navigator.platform && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
      return '⌘';
    }
  }
  return 'Ctrl';
}

function buildShortcutCategories(): ShortcutCategory[] {
  const mod = getModifierLabel();

  return [
    {
      name: 'Tools',
      shortcuts: [
        { keys: 'V', description: 'Select / Move' },
        { keys: 'T', description: 'Text tool' },
        { keys: 'R', description: 'Rectangle' },
        { keys: 'C', description: 'Circle' },
        { keys: 'L', description: 'Line' },
        { keys: 'I', description: 'Image upload' },
      ],
    },
    {
      name: 'Actions',
      shortcuts: [
        { keys: 'Delete / Backspace', description: 'Delete selected' },
        { keys: 'Escape', description: 'Deselect' },
        { keys: '+ / =', description: 'Zoom in' },
        { keys: '- / _', description: 'Zoom out' },
      ],
    },
    {
      name: 'Modifiers',
      shortcuts: [
        { keys: `${mod}+Z`, description: 'Undo' },
        { keys: `${mod}+Shift+Z`, description: 'Redo' },
        { keys: `${mod}+A`, description: 'Select all' },
        { keys: `${mod}+D`, description: 'Duplicate' },
        { keys: `${mod}+G`, description: 'Group elements' },
        { keys: `${mod}+Shift+G`, description: 'Ungroup' },
        { keys: `${mod}+C`, description: 'Copy' },
        { keys: `${mod}+V`, description: 'Paste' },
        { keys: `${mod}+S`, description: 'Save' },
      ],
    },
    {
      name: 'Movement',
      shortcuts: [
        { keys: 'Arrow keys', description: 'Move selected by 1px' },
        { keys: 'Shift + Arrow', description: 'Move selected by 10px' },
      ],
    },
    {
      name: 'Navigation',
      shortcuts: [
        { keys: 'Space + drag', description: 'Pan canvas' },
        { keys: `${mod} + scroll`, description: 'Zoom at cursor' },
        { keys: '?', description: 'Toggle this panel' },
      ],
    },
  ];
}

/**
 * ShortcutPanel displays all keyboard shortcuts grouped by category.
 * It renders as a fixed overlay panel with a backdrop, closeable via
 * the "×" button or Escape key.
 */
export function ShortcutPanel({ isOpen, onClose }: ShortcutPanelProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const categories = buildShortcutCategories();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-[min(32rem,calc(100vw-32px))] max-h-[calc(100vh-32px)] mx-4 bg-white dark:bg-secondary-800 rounded-xl shadow-level-4 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] md:w-8 md:h-8 md:min-w-0 md:min-h-0 rounded-lg text-secondary-400 dark:text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={onClose}
            aria-label="Close shortcuts panel"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {categories.map((category) => (
            <div key={category.name}>
              <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">
                {category.name}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-2">
                    <span className="text-sm text-secondary-700 dark:text-secondary-200">
                      {shortcut.description}
                    </span>
                    <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600 text-xs font-mono text-secondary-600 dark:text-secondary-300">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-secondary-100 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 flex items-center justify-between">
          <p className="hidden sm:block text-xs text-secondary-500 dark:text-secondary-400">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 font-mono">
              ?
            </kbd>{' '}
            to toggle this panel
          </p>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={() => {
              useOnboardingStore.getState().resetTour();
              onClose();
            }}
            aria-label="Show onboarding tour"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="7" r="6" />
              <path d="M5.5 5.5a1.5 1.5 0 0 1 2.83.5c0 1-1.33 1.5-1.33 1.5" />
              <circle cx="7" cy="10" r="0.5" fill="currentColor" />
            </svg>
            Show Tour
          </button>
        </div>
      </div>
    </div>
  );
}
