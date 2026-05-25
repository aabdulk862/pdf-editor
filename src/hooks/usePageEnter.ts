import { useState, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Hook that provides a page-enter animation state.
 *
 * Returns `true` once the component has mounted and the animation should
 * be in its "entered" state. Uses `opacity: 0 → 1` and `translateY(8px) → 0`
 * over 200ms ease-out.
 *
 * When `prefers-reduced-motion: reduce` is active, the transform is skipped
 * and only opacity is used (with instant transition).
 *
 * Usage:
 * ```tsx
 * const { entered, style } = usePageEnter();
 * return <div style={style}>...</div>;
 * ```
 *
 * Requirements: 8.1, 8.6
 */
export function usePageEnter() {
  const prefersReducedMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to ensure the initial state is painted
    // before transitioning to the entered state
    const raf = requestAnimationFrame(() => {
      setEntered(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const style: React.CSSProperties = prefersReducedMotion
    ? {
        opacity: entered ? 1 : 0,
        transition: 'opacity 0ms',
      }
    : {
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(8px)',
        transition:
          'opacity 200ms cubic-bezier(0.33, 1, 0.68, 1), transform 200ms cubic-bezier(0.33, 1, 0.68, 1)',
        willChange: entered ? 'auto' : 'opacity, transform',
      };

  return { entered, style };
}
