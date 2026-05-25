import { Skeleton } from '../design-system/primitives/Skeleton';

/**
 * Route-level skeleton placeholder for lazy-loaded tool pages.
 *
 * Mimics the general layout of a tool page (heading, file upload zone, action buttons)
 * to minimize Cumulative Layout Shift during code-splitting loads.
 *
 * Uses design tokens via the Skeleton primitive and supports dark mode automatically.
 */
export function ToolPageSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 w-full"
      aria-busy="true"
      aria-label="Loading tool page"
      data-testid="tool-page-skeleton"
    >
      {/* Heading area */}
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width="40%" height="2rem" />
        <Skeleton variant="text" width="60%" height="1rem" />
      </div>

      {/* File upload zone area */}
      <Skeleton
        variant="rectangular"
        width="100%"
        height="200px"
        className="border-2 border-dashed border-secondary-300 dark:border-secondary-600"
      />

      {/* Action buttons area */}
      <div className="flex gap-3">
        <Skeleton variant="rectangular" width="120px" height="40px" />
        <Skeleton variant="rectangular" width="120px" height="40px" />
      </div>
    </div>
  );
}
