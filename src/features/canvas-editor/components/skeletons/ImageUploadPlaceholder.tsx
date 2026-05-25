/**
 * ImageUploadPlaceholder - Positioned placeholder shown while an image is uploading/loading.
 *
 * Renders at the target coordinates on the canvas with a pulse animation
 * and "Loading image..." text. Appears within 100ms of upload starting.
 *
 * Requirements: 23.3, 23.5
 */

export interface ImageUploadPlaceholderProps {
  /** X position in pixels (screen coordinates) */
  x: number;
  /** Y position in pixels (screen coordinates) */
  y: number;
  /** Width of the placeholder in pixels */
  width?: number;
  /** Height of the placeholder in pixels */
  height?: number;
  /** Whether to show extended message (operation > 5 seconds) */
  showExtendedMessage?: boolean;
}

export function ImageUploadPlaceholder({
  x,
  y,
  width = 200,
  height = 150,
  showExtendedMessage = false,
}: ImageUploadPlaceholderProps) {
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      role="status"
      aria-label="Loading image"
      aria-busy="true"
    >
      <div className="w-full h-full rounded-md border-2 border-dashed border-blue-300 bg-blue-50/50 animate-pulse motion-reduce:animate-none flex flex-col items-center justify-center gap-2">
        {/* Image icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-400"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>

        {/* Loading text */}
        <span className="text-xs font-medium text-blue-500">Loading image...</span>

        {/* Extended message */}
        {showExtendedMessage && (
          <span className="text-[10px] text-blue-400">Large file — this may take a moment</span>
        )}
      </div>
    </div>
  );
}
