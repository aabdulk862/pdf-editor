import { useEffect } from 'react';
import { useHistoryStore } from '../../store/history';

/**
 * Undo/Redo UI controls component.
 *
 * Displays undo and redo buttons that are disabled when their respective stacks
 * are empty. Registers global keyboard shortcuts:
 * - Ctrl+Z / Cmd+Z for undo
 * - Ctrl+Y / Cmd+Shift+Z for redo
 *
 * Wired to the operation history store (src/store/history.ts).
 *
 * Requirements: 25.4, 25.6
 */
export function UndoRedoControls() {
  const { canUndo, canRedo, undo, redo } = useHistoryStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (macOS)
      if (isMeta && e.key === 'y' && !e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (isMeta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label="Undo and redo controls">
      <button
        type="button"
        onClick={() => undo()}
        disabled={!canUndo}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900"
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
      >
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
          <path d="M4 7h8a5 5 0 010 10H9" />
          <path d="M7 4L4 7l3 3" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => redo()}
        disabled={!canRedo}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900"
        aria-label="Redo"
        title="Redo (Ctrl+Y)"
      >
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
          <path d="M16 7H8a5 5 0 000 10h3" />
          <path d="M13 4l3 3-3 3" />
        </svg>
      </button>
    </div>
  );
}
