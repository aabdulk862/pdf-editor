import { useState, useEffect } from 'react';

/** Tailwind md breakpoint (768px) */
const QUERY = '(min-width: 768px)';

/**
 * Detects whether the viewport is below the md breakpoint (768px).
 *
 * Returns `true` when the viewport is mobile-sized (< 768px), `false` otherwise.
 * Listens for runtime changes (e.g. window resize) and handles SSR gracefully.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(!event.matches);
    };

    // Sync state in case it changed between render and effect
    setIsMobile(!mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}
