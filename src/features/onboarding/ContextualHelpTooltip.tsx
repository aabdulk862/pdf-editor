import { useCallback, useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useOnboardingStore } from './useOnboardingStore';

/** Duration of the exit animation in milliseconds */
const EXIT_DURATION_MS = 200;

export interface ContextualHelpTooltipProps {
  /** Unique identifier for this tool hint (used for dismissal tracking) */
  toolId: string;
  /** Title text displayed in the tooltip */
  title: string;
  /** Description text providing guidance for the tool */
  description: string;
  /** Position of the tooltip relative to its trigger element */
  position?: 'above' | 'below';
  /** The element the tooltip is attached to */
  children?: React.ReactNode;
}

/**
 * ContextualHelpTooltip — A contextual help tooltip shown on first use of each tool.
 *
 * Visibility conditions:
 * - `hintsDismissed[toolId]` is NOT true in the onboarding store
 *
 * Dismiss options:
 * - Close button (×): permanently dismisses the hint for this tool
 * - "Don't show again" button: permanently dismisses the hint for this tool
 *
 * Both options call `dismissHint(toolId)` to persist in localStorage.
 *
 * Features:
 * - Subtle fade-in animation (respects prefers-reduced-motion)
 * - Positioned above or below the trigger element
 * - Supports dark mode via design token classes
 * - Accessible with ARIA attributes
 */
export function ContextualHelpTooltip({
  toolId,
  title,
  description,
  position = 'below',
  children,
}: ContextualHelpTooltipProps) {
  const hintsDismissed = useOnboardingStore((s) => s.hintsDismissed);
  const dismissHint = useOnboardingStore((s) => s.dismissHint);
  const prefersReducedMotion = useReducedMotion();

  const [isDismissing, setIsDismissing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = !hintsDismissed[toolId];

  const handleDismiss = useCallback(() => {
    if (prefersReducedMotion) {
      dismissHint(toolId);
      return;
    }

    setIsDismissing(true);

    timerRef.current = setTimeout(() => {
      dismissHint(toolId);
    }, EXIT_DURATION_MS);
  }, [dismissHint, toolId, prefersReducedMotion]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-block" data-testid={`contextual-help-wrapper-${toolId}`}>
      {children}
      {isVisible && (
        <div
          role="tooltip"
          aria-label={`${title} help tooltip`}
          data-testid={`contextual-help-tooltip-${toolId}`}
          className={[
            // Positioning
            'absolute left-1/2 -translate-x-1/2 z-50',
            position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
            // Layout
            'flex flex-col gap-1',
            // Sizing
            'w-64 p-3',
            // Colors (light)
            'bg-white border border-secondary-200',
            // Colors (dark)
            'dark:bg-secondary-800 dark:border-secondary-700',
            // Border radius
            'rounded-lg',
            // Shadow
            'shadow-level-2',
            // Entrance animation
            !isDismissing && 'motion-safe:animate-page-enter',
            // Exit animation transition
            'motion-safe:transition-[opacity,transform] motion-safe:duration-moderate motion-safe:ease-out',
            // Reduced motion
            'motion-reduce:transition-none',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            isDismissing ? { opacity: 0, transform: 'translateX(-50%) translateY(4px)' } : undefined
          }
        >
          {/* Header with title and close button */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
              {title}
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={`Dismiss ${title} tooltip`}
              className={[
                'flex items-center justify-center',
                'w-5 h-5 rounded-sm shrink-0',
                'text-secondary-400 dark:text-secondary-500',
                'hover:text-secondary-700 dark:hover:text-secondary-300',
                'hover:bg-secondary-100 dark:hover:bg-secondary-700',
                'transition-colors duration-fast ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500',
                'dark:focus-visible:ring-offset-secondary-900',
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

          {/* Description */}
          <p className="text-xs text-secondary-600 dark:text-secondary-400 leading-relaxed">
            {description}
          </p>

          {/* Don't show again button */}
          <button
            type="button"
            onClick={handleDismiss}
            data-testid={`contextual-help-dont-show-${toolId}`}
            className={[
              'self-start mt-1',
              'text-xs font-medium',
              'text-primary-600 dark:text-primary-400',
              'hover:text-primary-800 dark:hover:text-primary-300',
              'transition-colors duration-fast ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500',
              'dark:focus-visible:ring-offset-secondary-900',
              'rounded-sm px-1 py-0.5 -ml-1',
            ].join(' ')}
          >
            Don&apos;t show again
          </button>

          {/* Arrow indicator */}
          <div
            aria-hidden="true"
            className={[
              'absolute left-1/2 -translate-x-1/2',
              'w-2 h-2 rotate-45',
              'bg-white border-secondary-200',
              'dark:bg-secondary-800 dark:border-secondary-700',
              position === 'above'
                ? 'bottom-[-5px] border-b border-r'
                : 'top-[-5px] border-t border-l',
            ].join(' ')}
          />
        </div>
      )}
    </div>
  );
}
