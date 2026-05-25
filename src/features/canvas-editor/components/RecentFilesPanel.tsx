import { useCallback, useEffect, useMemo } from 'react';

import { useRecentFilesStore } from '../store/recent-files-store';
import type { RecentFileEntry } from '../types';

/**
 * Formats a timestamp into a human-readable relative time string.
 * e.g., "2 hours ago", "3 days ago", "just now"
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

/**
 * RecentFilesPanel displays the last 10 recently opened/created documents
 * as visual cards with thumbnail, name, and relative time.
 *
 * Shown on the canvas editor landing when no document is open.
 * Sorted by most recent first.
 *
 * Requirements: 19.3, 19.4, 19.5, 19.7
 */
export function RecentFilesPanel() {
  const recentFiles = useRecentFilesStore((state) => state.recentFiles);
  const isLoading = useRecentFilesStore((state) => state.isLoading);
  const loadRecentFiles = useRecentFilesStore((state) => state.loadRecentFiles);
  const removeRecentFile = useRecentFilesStore((state) => state.removeRecentFile);
  const openRecentFile = useRecentFilesStore((state) => state.openRecentFile);

  // Load recent files from localStorage on mount
  useEffect(() => {
    loadRecentFiles();
  }, [loadRecentFiles]);

  // Show only the last 10 entries (already sorted by most recent first from store)
  const displayedFiles = useMemo(() => recentFiles.slice(0, 10), [recentFiles]);

  const handleOpenFile = useCallback(
    (entry: RecentFileEntry) => {
      openRecentFile(entry.id);
    },
    [openRecentFile],
  );

  const handleRemoveFile = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      removeRecentFile(id);
    },
    [removeRecentFile],
  );

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
          Recent
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse motion-reduce:animate-none rounded-lg bg-secondary-100 dark:bg-secondary-800 h-[140px]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (displayedFiles.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-3">
        Recent
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {displayedFiles.map((entry) => (
          <div
            key={entry.id}
            className="group relative flex flex-col rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 overflow-hidden hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md active:scale-[0.98] transition-all duration-normal ease-in-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 text-left cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => handleOpenFile(entry)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenFile(entry);
              }
            }}
            aria-label={`Open ${entry.name}`}
          >
            {/* Thumbnail */}
            <div className="w-full h-[100px] bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center overflow-hidden">
              {entry.thumbnail ? (
                <img
                  src={entry.thumbnail}
                  alt={`Preview of ${entry.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-secondary-300 dark:text-secondary-600"
                >
                  <rect x="4" y="4" width="24" height="24" rx="2" />
                  <path d="M4 22l6-6 4 4 6-6 8 8" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="px-2 py-2 flex-1 min-w-0">
              <p className="text-xs font-medium text-secondary-800 dark:text-secondary-100 truncate">
                {entry.name}
              </p>
              <p className="text-[11px] text-secondary-400 dark:text-secondary-500 mt-0.5">
                {formatRelativeTime(entry.lastOpened)}
              </p>
            </div>

            {/* Delete button (visible on hover) */}
            <button
              type="button"
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 dark:bg-secondary-800/80 backdrop-blur-sm text-secondary-400 dark:text-secondary-500 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-normal ease-in-out motion-reduce:transition-none focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              onClick={(e) => handleRemoveFile(e, entry.id)}
              aria-label={`Remove ${entry.name} from recent files`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
