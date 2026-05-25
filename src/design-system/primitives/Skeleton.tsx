import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface SkeletonProps {
  /** Shape variant of the skeleton placeholder */
  variant?: 'text' | 'rectangular' | 'circular';
  /** Width — CSS value (e.g. '100px', '50%') or number (px) */
  width?: string | number;
  /** Height — CSS value (e.g. '100px', '50%') or number (px) */
  height?: string | number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Enhanced skeleton loading placeholder with shimmer animation.
 *
 * Uses GPU-accelerated translateX for the shimmer effect.
 * Respects `prefers-reduced-motion: reduce` by disabling the shimmer.
 *
 * Variants:
 * - `text`: rounded-sm, defaults height to 1em
 * - `rectangular`: rounded-md, requires explicit width/height
 * - `circular`: rounded-full, width equals height
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();

  const resolvedWidth = typeof width === 'number' ? `${width}px` : width;
  const resolvedHeight = typeof height === 'number' ? `${height}px` : height;

  // For circular variant, ensure width === height
  const circularSize = resolvedWidth || resolvedHeight || '40px';

  const variantClasses: Record<string, string> = {
    text: 'rounded-sm',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };

  const baseClasses = 'bg-secondary-200 dark:bg-secondary-700 relative overflow-hidden';
  const shapeClass = variantClasses[variant];

  // Compute dimensions based on variant
  const style: React.CSSProperties = {};
  if (variant === 'circular') {
    style.width = circularSize;
    style.height = circularSize;
  } else if (variant === 'text') {
    style.width = resolvedWidth || '100%';
    style.height = resolvedHeight || '1em';
  } else {
    // rectangular
    if (resolvedWidth) style.width = resolvedWidth;
    if (resolvedHeight) style.height = resolvedHeight;
  }

  return (
    <div
      className={[baseClasses, shapeClass, className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
      data-testid="skeleton"
    >
      {!prefersReducedMotion && (
        <div
          className="absolute inset-0 -translate-x-full animate-shimmer"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }}
        />
      )}
    </div>
  );
}
