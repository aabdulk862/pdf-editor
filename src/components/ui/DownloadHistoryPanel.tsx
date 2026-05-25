import { useDownloadStore, type DownloadEntry } from '../../store/downloads';
import { useToast } from '../../hooks/useToast';

/**
 * Truncates a file name to a maximum length, adding ellipsis if truncated.
 */
function truncateFileName(name: string, maxLength = 60): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '…';
}

/**
 * Formats a timestamp to the user's locale date/time string.
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Checks whether a download entry still has file data available in memory.
 */
function isDataAvailable(entry: DownloadEntry): boolean {
  return entry.fileData != null && entry.fileData.byteLength > 0;
}

/**
 * DownloadHistoryPanel displays the list of files downloaded during the current
 * browser session. Users can re-download files by clicking on entries.
 *
 * - File names are truncated to 60 characters with ellipsis
 * - Shows operation type and locale-formatted timestamp
 * - Re-download on click; disabled with toast if data is unavailable
 * - History is cleared when the browser session ends (in-memory store)
 *
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6
 */
export function DownloadHistoryPanel() {
  const downloads = useDownloadStore((state) => state.downloads);
  const reDownload = useDownloadStore((state) => state.reDownload);
  const clearDownloads = useDownloadStore((state) => state.clearDownloads);
  const { error: showError } = useToast();

  const handleEntryClick = (entry: DownloadEntry) => {
    if (!isDataAvailable(entry)) {
      showError('File is no longer available for download.');
      return;
    }
    reDownload(entry.id);
  };

  if (downloads.length === 0) {
    return (
      <div className="rounded-lg border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 p-6">
        <h2 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">
          Download History
        </h2>
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          No downloads yet. Processed files will appear here.
        </p>
      </div>
    );
  }

  // Display in reverse chronological order (newest first)
  const sortedDownloads = [...downloads].reverse();

  return (
    <div className="rounded-lg border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
          Download History
        </h2>
        <button
          type="button"
          onClick={clearDownloads}
          className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-medium text-secondary-600 dark:text-secondary-300 hover:text-error-600 dark:hover:text-error-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-md transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900"
          aria-label="Clear download history"
        >
          Clear All
        </button>
      </div>

      <ul className="space-y-1" role="list" aria-label="Download history entries">
        {sortedDownloads.map((entry) => {
          const available = isDataAvailable(entry);
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => handleEntryClick(entry)}
                disabled={!available}
                aria-disabled={!available}
                className={[
                  'w-full text-left px-3 py-2.5 rounded-md transition-colors duration-normal ease-in-out min-h-[44px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900',
                  available
                    ? 'hover:bg-secondary-100 dark:hover:bg-secondary-800 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed',
                ].join(' ')}
                title={available ? `Re-download ${entry.fileName}` : 'File no longer available'}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                    {truncateFileName(entry.fileName)}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium">
                      {entry.operation}
                    </span>
                    <time dateTime={new Date(entry.timestamp).toISOString()}>
                      {formatTimestamp(entry.timestamp)}
                    </time>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
