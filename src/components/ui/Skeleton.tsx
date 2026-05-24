export interface SkeletonProps {
  /** Width of the skeleton (CSS value or Tailwind class) */
  width?: string;
  /** Height of the skeleton (CSS value or Tailwind class) */
  height?: string;
  /** Shape variant */
  variant?: 'rectangular' | 'circular' | 'text';
  /** Additional CSS classes */
  className?: string;
  /** Number of text lines to render (only for variant="text") */
  lines?: number;
}

export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  className = '',
  lines = 1,
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-secondary-200 dark:bg-secondary-700';

  if (variant === 'text') {
    return (
      <div
        className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={[
              baseClasses,
              'h-4 rounded',
              i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            ].join(' ')}
            style={{ width: i === lines - 1 && lines > 1 ? undefined : width }}
          />
        ))}
      </div>
    );
  }

  const shapeClass = variant === 'circular' ? 'rounded-full' : 'rounded-md';

  return (
    <div
      className={[baseClasses, shapeClass, className].filter(Boolean).join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
