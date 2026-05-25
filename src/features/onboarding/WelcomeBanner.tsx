import { useCallback, useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useOnboardingStore } from './useOnboardingStore';

/** Duration of the exit animation in milliseconds */
const EXIT_DURATION_MS = 200;

/**
 * WelcomeBanner — A non-blocking banner displayed at the top of the home page
 * for first-time visitors. Highlights three key capabilities: privacy, speed,
 * and tool variety. Dismissible with state persisted in localStorage via the
 * onboarding store.
 *
 * On dismiss:
 * 1. Plays a smooth exit animation (opacity 1→0, translateY 0→-8px, 200ms ease-in)
 * 2. After animation completes, removes from DOM
 * 3. Persists dismissed state to localStorage via the onboarding store
 *
 * Respects `prefers-reduced-motion` — skips animation and dismisses instantly.
 */
export function WelcomeBanner() {
  const welcomeDismissed = useOnboardingStore((s) => s.welcomeDismissed);
  const dismissWelcome = useOnboardingStore((s) => s.dismissWelcome);
  const prefersReducedMotion = useReducedMotion();

  const [isDismissing, setIsDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    if (prefersReducedMotion) {
      // Skip animation — dismiss immediately
      dismissWelcome();
      return;
    }

    // Start exit animation
    setIsDismissing(true);

    // After animation completes, persist dismissal and remove from DOM
    timerRef.current = setTimeout(() => {
      dismissWelcome();
    }, EXIT_DURATION_MS);
  }, [dismissWelcome, prefersReducedMotion]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Don't render if already dismissed
  if (welcomeDismissed) {
    return null;
  }

  return (
    <div
      role="banner"
      aria-label="Welcome banner"
      data-testid="welcome-banner"
      className={[
        // Layout
        'relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6',
        // Spacing
        'px-4 py-3 sm:px-6 sm:py-4',
        // Colors (light)
        'bg-primary-50 border border-primary-200',
        // Colors (dark)
        'dark:bg-primary-900/20 dark:border-primary-700/40',
        // Border radius
        'rounded-lg',
        // Entrance animation (only when not dismissing)
        !isDismissing && 'motion-safe:animate-page-enter',
        // Exit animation transition
        'motion-safe:transition-[opacity,transform] motion-safe:duration-moderate motion-safe:ease-in',
        // Reduced motion: no transitions
        'motion-reduce:transition-none',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isDismissing ? { opacity: 0, transform: 'translateY(-8px)' } : undefined}
    >
      {/* Capabilities */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-1 min-w-0">
        <Capability icon={<ShieldIcon />} text="Your files stay private" />
        <Capability icon={<BoltIcon />} text="Instant browser access" />
        <Capability icon={<GridIcon />} text="30+ tools available" />
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss welcome banner"
        className={[
          'absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto',
          'flex items-center justify-center',
          'w-8 h-8 rounded-md',
          'text-primary-600 dark:text-primary-300',
          'hover:bg-primary-100 dark:hover:bg-primary-800/40',
          'transition-colors duration-fast ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
          'dark:focus-visible:ring-offset-secondary-900',
          'shrink-0',
          // Minimum touch target for accessibility on mobile
          'min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0',
        ].join(' ')}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CapabilityProps {
  icon: React.ReactNode;
  text: string;
}

function Capability({ icon, text }: CapabilityProps) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-primary-700 dark:text-primary-300">
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, 20px, 1.5px stroke)
// ---------------------------------------------------------------------------

function ShieldIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
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
  );
}
