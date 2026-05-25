/**
 * TemplateLoadSkeleton - Full-size template thumbnail with shimmer overlay.
 *
 * Shown while a template is being loaded into the canvas. Uses a CSS gradient
 * animation (shimmer) over the template thumbnail to indicate loading.
 *
 * Requirements: 23.4, 23.5
 */

export interface TemplateLoadSkeletonProps {
  /** Optional thumbnail source to show beneath the shimmer */
  thumbnailSrc?: string;
  /** Whether to show extended message (operation > 5 seconds) */
  showExtendedMessage?: boolean;
}

export function TemplateLoadSkeleton({
  thumbnailSrc,
  showExtendedMessage = false,
}: TemplateLoadSkeletonProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 p-6"
      role="status"
      aria-label="Loading template"
      aria-busy="true"
    >
      {/* Template thumbnail with shimmer overlay */}
      <div className="relative w-[180px] h-[240px] rounded-lg overflow-hidden shadow-md bg-gray-100">
        {/* Thumbnail image (if available) */}
        {thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            aria-hidden="true"
          />
        )}

        {/* Shimmer overlay */}
        <div className="absolute inset-0 shimmer-overlay" aria-hidden="true" />
      </div>

      {/* Loading text */}
      <p className="text-sm font-medium text-gray-600">Loading template...</p>

      {/* Extended message */}
      {showExtendedMessage && (
        <p className="text-xs text-gray-500">Large file — this may take a moment</p>
      )}

      {/* Shimmer animation styles */}
      <style>{`
        .shimmer-overlay {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}
