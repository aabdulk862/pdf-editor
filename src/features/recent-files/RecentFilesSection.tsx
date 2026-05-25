import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRecentFilesStore } from '../../store/recent-files';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/** Maximum number of recent files to display in the section. */
const MAX_DISPLAY = 8;

/**
 * Truncates a file name to a maximum length, appending "…" if truncated.
 */
function truncateFileName(name: string, maxLength = 24): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '…';
}

/**
 * Formats a timestamp into a relative time string (e.g., "2 min ago", "1 hr ago").
 * Uses compact labels to fit within card width.
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 30)} mo ago`;
}

/**
 * Home page section displaying recent file entries as horizontally-scrollable cards.
 * Each card shows a PDF thumbnail placeholder, file name (truncated), and relative timestamp.
 * Clicking a card navigates to the associated operation route.
 * Shows up to 8 most recent files. If no recent files exist, the section is not rendered.
 *
 * Requirements: 5.2 (Recent Files section with thumbnail previews, file names, timestamps)
 */
export function RecentFilesSection() {
  const rawEntries = useRecentFilesStore((state) => state.entries);
  const clearAll = useRecentFilesStore((state) => state.clearAll);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const entries = useMemo(
    () => [...rawEntries].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, MAX_DISPLAY),
    [rawEntries],
  );

  // Don't render the section if there are no recent files
  if (entries.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recent-files-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="recent-files-heading"
          className="text-lg font-semibold text-text-light dark:text-text-dark"
        >
          Recent Files
        </h2>
        <button
          onClick={clearAll}
          className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-error-600 dark:hover:text-error-400 transition-colors duration-normal min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Clear all recent files"
        >
          Clear All
        </button>
      </div>

      {/* Horizontal scroll container */}
      <div
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        role="list"
        aria-label="Recent files"
      >
        {entries.map((entry) => (
          <button
            key={entry.id}
            role="listitem"
            onClick={() => navigate(entry.operationRoute)}
            aria-label={`Open ${entry.fileName} in ${entry.operationName}`}
            className={[
              // Card sizing — consistent 160px width with PDF page aspect ratio
              'flex-shrink-0 w-40 flex flex-col rounded-lg overflow-hidden',
              'border border-secondary-200 dark:border-secondary-700',
              'bg-white dark:bg-secondary-800',
              'hover:border-primary-300 dark:hover:border-primary-600',
              'hover:shadow-level-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-secondary-900',
              'cursor-pointer text-left',
              // Animation
              !prefersReducedMotion &&
                'transition-all duration-normal ease-out hover:-translate-y-0.5',
              prefersReducedMotion && 'transition-colors duration-normal',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Thumbnail preview placeholder — PDF page aspect ratio (roughly 8.5:11) */}
            <div className="relative w-full aspect-[85/110] bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center">
              {/* PDF page icon as placeholder */}
              <svg
                className="h-10 w-10 text-secondary-300 dark:text-secondary-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              {/* Operation badge */}
              <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 leading-tight">
                {entry.operationName}
              </span>
            </div>

            {/* File info */}
            <div className="px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
              <p className="text-xs font-medium text-text-light dark:text-text-dark truncate">
                {truncateFileName(entry.fileName)}
              </p>
              <p className="text-[11px] text-secondary-500 dark:text-secondary-400 leading-tight">
                {formatRelativeTime(entry.lastOpenedAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
