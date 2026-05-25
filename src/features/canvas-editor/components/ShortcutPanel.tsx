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
        className="relative w-full max-w-lg max-h-[80vh] mx-4 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={onClose}
            aria-label="Close shortcuts panel"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {category.name}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-mono text-gray-600">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">?</kbd>{' '}
            to toggle this panel
          </p>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => {
              useOnboardingStore.getState().resetTour();
              onClose();
            }}
            aria-label="Show onboarding tour"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
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
