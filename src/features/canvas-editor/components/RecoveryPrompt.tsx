import { useMemo } from 'react';

/**
 * RecoveryPrompt - Modal dialog shown when auto-saved data from a previous session is detected.
 *
 * Displays the document name and relative time since last auto-save.
 * Provides "Restore" and "Discard" actions.
 *
 * - "Restore" loads the auto-saved document into the canvas store and deletes the auto-save key.
 * - "Discard" deletes the auto-save entry from localStorage and presents a fresh canvas.
 *
 * Requirements: 22.3, 22.4, 22.5, 22.6
 */

export interface RecoveryPromptProps {
  /** Whether the prompt is visible */
  open: boolean;
  /** Name of the document that was auto-saved */
  documentName: string;
  /** Timestamp (ms since epoch) of the last auto-save */
  savedAt: number;
  /** Called when the user chooses to restore the auto-saved document */
  onRestore: () => void;
  /** Called when the user chooses to discard the auto-saved data */
  onDiscard: () => void;
}

/**
 * Formats a timestamp into a human-readable relative time string.
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function RecoveryPrompt({
  open,
  documentName,
  savedAt,
  onRestore,
  onDiscard,
}: RecoveryPromptProps) {
  const relativeTime = useMemo(() => formatRelativeTime(savedAt), [savedAt]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-prompt-title"
    >
      <div className="w-[calc(100%-2rem)] max-w-md bg-white dark:bg-secondary-800 rounded-lg shadow-xl animate-in fade-in duration-normal motion-reduce:animate-none">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-3">
            {/* Recovery icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-600"
                aria-hidden="true"
              >
                <path d="M3 10a7 7 0 0 1 7-7 7 7 0 0 1 5.5 2.7" />
                <path d="M15.5 2.7V6H12.2" />
                <path d="M17 10a7 7 0 0 1-7 7 7 7 0 0 1-5.5-2.7" />
                <path d="M4.5 17.3V14H7.8" />
              </svg>
            </div>
            <h2
              id="recovery-prompt-title"
              className="text-lg font-semibold text-secondary-800 dark:text-secondary-100"
            >
              Recover unsaved work?
            </h2>
          </div>

          <p className="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">
            We found an auto-saved version of{' '}
            <span className="font-medium text-secondary-800 dark:text-secondary-100">
              &ldquo;{documentName}&rdquo;
            </span>
            .
          </p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Last saved: {relativeTime}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 mt-2 border-t border-secondary-100 dark:border-secondary-700">
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600 transition-colors duration-normal ease-in-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="min-h-[44px] px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors duration-normal ease-in-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            autoFocus
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
