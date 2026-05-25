import { useCallback, useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useOnboardingStore } from './useOnboardingStore';

/** Auto-dismiss delay in milliseconds */
const AUTO_DISMISS_MS = 2000;

/** Duration of the exit animation in milliseconds */
const EXIT_DURATION_MS = 200;

/**
 * FirstSuccessCelebration — A brief, non-intrusive floating celebration
 * shown when the user completes their first successful operation.
 *
 * Behavior:
 * - Shows a checkmark icon with a congratulatory message
 * - Auto-dismisses after 2 seconds
 * - Calls `markFirstSuccess()` on the onboarding store to prevent showing again
 * - Positioned as a floating element (fixed, bottom-center) so it doesn't block interaction
 * - Uses a scale/fade entrance animation and fade exit animation
 * - Respects `prefers-reduced-motion` (shows without animation, still auto-dismisses)
 * - Supports dark mode via design tokens
 *
 * Only renders when `firstSuccessShown` is false in the onboarding store.
 * The parent is responsible for triggering visibility (e.g., after a successful operation).
 */

export interface FirstSuccessCelebrationProps {
  /** Whether the celebration should be visible. The parent controls this based on operation success. */
  visible: boolean;
}

export function FirstSuccessCelebration({ visible }: FirstSuccessCelebrationProps) {
  const firstSuccessShown = useOnboardingStore((s) => s.firstSuccessShown);
  const markFirstSuccess = useOnboardingStore((s) => s.markFirstSuccess);
  const prefersReducedMotion = useReducedMotion();

  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (prefersReducedMotion) {
      setShouldRender(false);
      markFirstSuccess();
      return;
    }

    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      markFirstSuccess();
    }, EXIT_DURATION_MS);
  }, [markFirstSuccess, prefersReducedMotion]);

  // Show the celebration when visible becomes true and firstSuccessShown is false
  useEffect(() => {
    if (visible && !firstSuccessShown) {
      setShouldRender(true);
      setIsExiting(false);

      // Auto-dismiss after 2 seconds
      autoDismissRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (autoDismissRef.current !== null) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    };
  }, [visible, firstSuccessShown, dismiss]);

  // Cleanup exit timer on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  // Don't render if already shown or not triggered
  if (!shouldRender || firstSuccessShown) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="First operation completed successfully"
      data-testid="first-success-celebration"
      className={[
        // Floating position — bottom center, non-blocking
        'fixed bottom-8 left-1/2 -translate-x-1/2 z-50',
        // Layout
        'flex items-center gap-3',
        // Spacing
        'px-4 py-3',
        // Colors (light)
        'bg-success-50 border border-success-200',
        // Colors (dark)
        'dark:bg-success-900/20 dark:border-success-700/40',
        // Border radius
        'rounded-lg',
        // Shadow — floating level
        'shadow-level-3',
        // Pointer events — allow clicking through if needed
        'pointer-events-auto',
        // Entrance animation
        !isExiting && !prefersReducedMotion && 'animate-celebration-enter',
        // Exit state
        isExiting && 'opacity-0 scale-95',
        // Transition for exit
        'motion-safe:transition-[opacity,transform] motion-safe:duration-moderate motion-safe:ease-in',
        // Reduced motion: no transitions
        'motion-reduce:transition-none',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Checkmark icon */}
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full bg-success-500 dark:bg-success-600 shrink-0"
        aria-hidden="true"
      >
        <CheckmarkIcon />
      </span>

      {/* Message */}
      <span className="text-sm font-medium text-success-800 dark:text-success-200 whitespace-nowrap">
        Great job! First operation complete
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckmarkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
