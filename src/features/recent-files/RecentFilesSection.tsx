import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRecentFilesStore } from '../../store/recent-files';

/**
 * Truncates a file name to a maximum of 60 characters, appending "…" if truncated.
 */
function truncateFileName(name: string, maxLength = 60): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '…';
}

/**
 * Formats a file size in bytes to a human-readable string (e.g., "1.2 MB", "500 KB").
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Formats a timestamp into a relative time string (e.g., "2 minutes ago", "1 hour ago").
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/**
 * Home page section displaying recent file entries sorted by recency.
 * Each entry shows file name (truncated to 60 chars), file size, relative time, and operation name.
 * Clicking an entry navigates to the associated operation route.
 *
 * Requirements: 7.4, 7.5, 7.6
 */
export function RecentFilesSection() {
  const rawEntries = useRecentFilesStore((state) => state.entries);
  const clearAll = useRecentFilesStore((state) => state.clearAll);
  const navigate = useNavigate();

  const entries = useMemo(
    () => [...rawEntries].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt),
    [rawEntries],
  );

  return (
    <section aria-labelledby="recent-files-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="recent-files-heading"
          className="text-lg font-semibold text-text-light dark:text-text-dark"
        >
          Recent Files
        </h2>
        {entries.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
            aria-label="Clear all recent files"
          >
            Clear All
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-secondary-500 dark:text-secondary-400 py-4">No recent files</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => navigate(entry.operationRoute)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-150 text-left min-h-[44px]"
                aria-label={`Open ${entry.fileName} in ${entry.operationName}`}
              >
                <div className="flex-shrink-0 p-2 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                    {truncateFileName(entry.fileName)}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {formatFileSize(entry.fileSize)} · {formatRelativeTime(entry.lastOpenedAt)} ·{' '}
                    {entry.operationName}
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 flex-shrink-0 text-secondary-400 dark:text-secondary-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
