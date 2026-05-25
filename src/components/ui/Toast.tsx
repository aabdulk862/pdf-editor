import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastStore, type Toast as ToastType, type ToastSeverity } from '../../store/toast';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useIsMobile } from '../../hooks/useIsMobile';

const MAX_VISIBLE = 3;

/** Duration for the entrance animation (ms) */
const ENTER_DURATION = 200;
/** Duration for the exit animation (ms) */
const EXIT_DURATION = 150;

const severityStyles: Record<ToastSeverity, string> = {
  success:
    'bg-green-50 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-200',
  warning:
    'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-200',
  error:
    'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-200',
  info: 'bg-blue-50 border-blue-400 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-200',
};

const severityIcons: Record<ToastSeverity, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
};

const severityIconStyles: Record<ToastSeverity, string> = {
  success: 'bg-green-500 text-white',
  warning: 'bg-amber-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
};

type AnimationPhase = 'entering' | 'visible' | 'exiting' | 'exited';

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
  reducedMotion: boolean;
  isMobile: boolean;
}

function ToastItem({
  toast,
  onDismiss,
  reducedMotion,
  isMobile,
}: ToastItemProps): JSX.Element | null {
  const [phase, setPhase] = useState<AnimationPhase>('entering');
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());

  // Trigger entrance animation on mount
  useEffect(() => {
    if (reducedMotion) {
      setPhase('visible');
      return;
    }
    // Use requestAnimationFrame to ensure the initial transform is painted before transitioning
    const raf = requestAnimationFrame(() => {
      setPhase('visible');
    });
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const startExitAnimation = useCallback(() => {
    if (reducedMotion) {
      onDismiss(toast.id);
      return;
    }
    setPhase('exiting');
    setTimeout(() => {
      onDismiss(toast.id);
    }, EXIT_DURATION);
  }, [onDismiss, toast.id, reducedMotion]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      startExitAnimation();
    }, remainingRef.current);
  }, [startExitAnimation]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }
  }, []);

  useEffect(() => {
    if (!isPaused && phase === 'visible') {
      startTimer();
    } else {
      pauseTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, phase, startTimer, pauseTimer]);

  const handleMouseEnter = (): void => {
    setIsPaused(true);
  };

  const handleMouseLeave = (): void => {
    setIsPaused(false);
  };

  // Mobile: slide-up (from bottom), Desktop: slide-down (from top)
  const handleDismiss = (): void => {
    startExitAnimation();
  };

  // Compute inline transform style for GPU-accelerated animation
  // Mobile slides up from bottom, desktop slides down from top
  const offscreenTranslate = isMobile ? 'translateY(100%)' : 'translateY(-100%)';

  const getTransformStyle = (): React.CSSProperties => {
    if (reducedMotion) {
      return { opacity: 1 };
    }

    switch (phase) {
      case 'entering':
        return {
          transform: offscreenTranslate,
          opacity: 0,
          transition: 'none',
        };
      case 'visible':
        return {
          transform: 'translateY(0)',
          opacity: 1,
          transition: `transform ${ENTER_DURATION}ms cubic-bezier(0.33, 1, 0.68, 1), opacity ${ENTER_DURATION}ms cubic-bezier(0.33, 1, 0.68, 1)`,
        };
      case 'exiting':
        return {
          transform: offscreenTranslate,
          opacity: 0,
          transition: `transform ${EXIT_DURATION}ms cubic-bezier(0.32, 0, 0.67, 0), opacity ${EXIT_DURATION}ms cubic-bezier(0.32, 0, 0.67, 0)`,
        };
      case 'exited':
        return {
          transform: offscreenTranslate,
          opacity: 0,
        };
    }
  };

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...getTransformStyle(),
        willChange: 'transform, opacity',
      }}
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg ${severityStyles[toast.severity]}`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${severityIconStyles[toast.severity]}`}
        aria-hidden="true"
      >
        {severityIcons[toast.severity]}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-md min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:p-1 inline-flex items-center justify-center opacity-70 transition-opacity duration-normal ease-out motion-reduce:transition-none hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Toast container with responsive positioning:
 * - Mobile (< md): bottom-center, thumb-reachable with padding from bottom edge
 * - Desktop (>= md): top-right
 *
 * Toasts animate with:
 * - Mobile entrance: slide-up (translateY 100% → 0) over 200ms ease-out
 * - Desktop entrance: slide-down (translateY -100% → 0) over 200ms ease-out
 * - Mobile exit: slide-down (translateY 0 → 100%) over 150ms ease-in
 * - Desktop exit: slide-up (translateY 0 → -100%) over 150ms ease-in
 *
 * Respects prefers-reduced-motion by disabling transform animations.
 */
export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const visibleToasts = toasts.slice(-MAX_VISIBLE);

  const errorToasts = visibleToasts.filter((t) => t.severity === 'error');
  const nonErrorToasts = visibleToasts.filter((t) => t.severity !== 'error');

  return (
    <div
      className={[
        'pointer-events-none fixed z-50 flex flex-col gap-2',
        // Mobile: bottom-center with padding for thumb reach
        'inset-x-0 bottom-4 items-center px-4',
        // Desktop (md+): top-right with appropriate padding
        'md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:items-end md:px-0',
      ].join(' ')}
    >
      {/* Assertive region for error toasts - announced immediately */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="pointer-events-auto w-full max-w-sm space-y-2"
      >
        {errorToasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Polite region for success/warning/info toasts - announced when convenient */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-auto w-full max-w-sm space-y-2"
      >
        {nonErrorToasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

export default ToastContainer;
