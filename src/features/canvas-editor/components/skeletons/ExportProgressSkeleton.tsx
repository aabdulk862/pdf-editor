/**
 * ExportProgressSkeleton - Inline progress indicator for export operations.
 *
 * Displays a format icon, "Exporting page X of Y" text, and a determinate
 * progress bar. Never blocks the full page — renders within the export dialog area.
 *
 * Requirements: 23.2, 23.5
 */

export interface ExportProgressSkeletonProps {
  /** Current page being exported (1-based) */
  currentPage: number;
  /** Total number of pages to export */
  totalPages: number;
  /** Export format label (e.g., "PDF", "PNG") */
  format: string;
  /** Whether to show extended message (operation > 5 seconds) */
  showExtendedMessage?: boolean;
}

const formatIcons: Record<string, string> = {
  pdf: '📄',
  png: '🖼️',
  svg: '🎨',
  docx: '📝',
};

export function ExportProgressSkeleton({
  currentPage,
  totalPages,
  format,
  showExtendedMessage = false,
}: ExportProgressSkeletonProps) {
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const icon = formatIcons[format.toLowerCase()] ?? '📄';

  return (
    <div
      className="flex flex-col items-center gap-3 py-4 px-6"
      role="status"
      aria-label={`Exporting page ${currentPage} of ${totalPages}`}
      aria-busy="true"
    >
      {/* Format icon */}
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>

      {/* Progress text */}
      <p className="text-sm font-medium text-secondary-700 dark:text-secondary-200">
        Exporting page {currentPage} of {totalPages}
      </p>

      {/* Determinate progress bar */}
      <div className="w-full max-w-xs h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={currentPage}
          aria-valuemin={0}
          aria-valuemax={totalPages}
        />
      </div>

      {/* Extended message for long operations */}
      {showExtendedMessage && (
        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
          Large file — this may take a moment
        </p>
      )}
    </div>
  );
}
