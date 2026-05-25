import { Skeleton } from './Skeleton';

export interface ProcessingStateProps {
  /** Whether the processing operation is currently active */
  isProcessing: boolean;
  /** Optional label to display during processing */
  label?: string;
  /** Layout variant for the skeleton placeholder */
  variant?: 'preview' | 'result' | 'comparison';
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProcessingState component — displays skeleton placeholders during tool page
 * processing operations to prevent abrupt state jumps.
 *
 * Uses opacity transitions (duration-moderate, 200ms ease-out) for smooth
 * entrance/exit. Respects reduced motion via motion-safe: variants.
 *
 * Variants:
 * - `preview`: Mimics a preview panel with a large rectangular area + controls
 * - `result`: Mimics a result section with heading + download button area
 * - `comparison`: Mimics a side-by-side comparison layout
 */
export function ProcessingState({
  isProcessing,
  label = 'Processing...',
  variant = 'preview',
  className = '',
}: ProcessingStateProps): JSX.Element | null {
  if (!isProcessing) return null;

  return (
    <div
      className={['motion-safe:animate-page-enter motion-reduce:opacity-100', className]
        .filter(Boolean)
        .join(' ')}
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      {variant === 'preview' && <PreviewSkeleton label={label} />}
      {variant === 'result' && <ResultSkeleton label={label} />}
      {variant === 'comparison' && <ComparisonSkeleton label={label} />}
    </div>
  );
}

function PreviewSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3">
      {/* Processing indicator */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin motion-reduce:animate-none rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
          {label}
        </span>
      </div>
      {/* Preview area skeleton */}
      <Skeleton variant="rectangular" height="240px" className="w-full" />
      {/* Controls skeleton */}
      <div className="flex gap-3">
        <Skeleton variant="rectangular" width="100px" height="36px" />
        <Skeleton variant="rectangular" width="100px" height="36px" />
      </div>
    </div>
  );
}

function ResultSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3 rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
      {/* Processing indicator */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin motion-reduce:animate-none rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
          {label}
        </span>
      </div>
      {/* Result content skeleton */}
      <Skeleton variant="text" lines={2} />
      <Skeleton variant="rectangular" height="180px" className="w-full" />
      {/* Action buttons skeleton */}
      <div className="flex gap-3 pt-2">
        <Skeleton variant="rectangular" width="140px" height="40px" />
        <Skeleton variant="rectangular" width="120px" height="40px" />
      </div>
    </div>
  );
}

function ComparisonSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3">
      {/* Processing indicator */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin motion-reduce:animate-none rounded-full border-2 border-primary-500 border-t-transparent" />
        <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
          {label}
        </span>
      </div>
      {/* Side-by-side skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton variant="rectangular" height="200px" className="w-full" />
        <Skeleton variant="rectangular" height="200px" className="w-full" />
      </div>
      {/* Summary skeleton */}
      <div className="flex gap-4">
        <Skeleton variant="rectangular" width="80px" height="24px" />
        <Skeleton variant="rectangular" width="80px" height="24px" />
        <Skeleton variant="rectangular" width="80px" height="24px" />
      </div>
    </div>
  );
}

ProcessingState.displayName = 'ProcessingState';
