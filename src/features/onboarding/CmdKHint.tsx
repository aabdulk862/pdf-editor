import { useCallback, useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useOnboardingStore } from './useOnboardingStore';

/** The hint ID used for dismissal tracking in the onboarding store */
const HINT_ID = 'cmd-k-hint';

/** Duration of the exit animation in milliseconds */
const EXIT_DURATION_MS = 200;

/** Minimum sessions before showing the hint */
const MIN_SESSIONS = 3;

/**
 * CmdKHint — A subtle tooltip/badge displayed near the search/filter area
 * suggesting the user try Cmd+K for quick access to the Command Palette.
 *
 * Visibility conditions (all must be true):
 * - sessionCount >= 3
 * - cmdKUsed === false
 * - hintsDismissed['cmd-k-hint'] !== true
 *
 * Dismissible by clicking the hint or the close button.
 * Respects `prefers-reduced-motion` — skips animation and dismisses instantly.
 * Supports dark mode via design token classes.
 */
export function CmdKHint() {
  const sessionCount = useOnboardingStore((s) => s.sessionCount);
  const cmdKUsed = useOnboardingStore((s) => s.cmdKUsed);
  const hintsDismissed = useOnboardingStore((s) => s.hintsDismissed);
  const dismissHint = useOnboardingStore((s) => s.dismissHint);
  const prefersReducedMotion = useReducedMotion();

  const [isDismissing, setIsDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldShow = sessionCount >= MIN_SESSIONS && !cmdKUsed && !hintsDismissed[HINT_ID];

  const handleDismiss = useCallback(() => {
    if (prefersReducedMotion) {
      dismissHint(HINT_ID);
      return;
    }

    setIsDismissing(true);

    timerRef.current = setTimeout(() => {
      dismissHint(HINT_ID);
    }, EXIT_DURATION_MS);
  }, [dismissHint, prefersReducedMotion]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Command palette hint"
      data-testid="cmd-k-hint"
      className={[
        // Layout
        'inline-flex items-center gap-2',
        // Spacing
        'px-3 py-2',
        // Colors (light)
        'bg-primary-50 border border-primary-200',
        // Colors (dark)
        'dark:bg-primary-900/20 dark:border-primary-700/40',
        // Border radius
        'rounded-md',
        // Shadow (subtle floating)
        'shadow-level-1',
        // Entrance animation (only when not dismissing)
        !isDismissing && 'motion-safe:animate-page-enter',
        // Exit animation transition
        'motion-safe:transition-[opacity,transform] motion-safe:duration-moderate motion-safe:ease-out',
        // Reduced motion: no transitions
        'motion-reduce:transition-none',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isDismissing ? { opacity: 0, transform: 'translateY(-4px)' } : undefined}
    >
      {/* Hint text */}
      <span className="text-xs font-medium text-primary-700 dark:text-primary-300 whitespace-nowrap">
        Try{' '}
        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-800/40 text-primary-800 dark:text-primary-200 font-mono text-xs border border-primary-200 dark:border-primary-700/60">
          ⌘K
        </kbd>{' '}
        for quick access
      </span>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss command palette hint"
        className={[
          'flex items-center justify-center',
          'w-5 h-5 rounded-sm',
          'text-primary-500 dark:text-primary-400',
          'hover:text-primary-700 dark:hover:text-primary-200',
          'hover:bg-primary-100 dark:hover:bg-primary-800/40',
          'transition-colors duration-fast ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500',
          'dark:focus-visible:ring-offset-secondary-900',
          'shrink-0',
        ].join(' ')}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
