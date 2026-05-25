import { useEffect, useRef, useState } from 'react';

export interface ProgressBarProps {
  /** Progress value 0-100 for determinate mode, null for indeterminate */
  progress: number | null;
  /** Visible label text displayed alongside the progress bar */
  label: string;
  /** Accessible label for assistive technologies */
  ariaLabel: string;
}

/**
 * ProgressBar component with determinate and indeterminate modes.
 *
 * - Shows after a 500ms delay to avoid flash for quick operations.
 * - Fades out within 300ms on completion.
 * - Supports dark mode via Tailwind class strategy.
 *
 * Validates: Requirements 28.1, 28.2, 28.3, 28.4, 28.5, 28.6
 */
export function ProgressBar({ progress, label, ariaLabel }: ProgressBarProps): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasActiveRef = useRef(false);

  const isComplete = progress !== null && progress >= 100;
  const isActive = progress !== null ? !isComplete : true;

  useEffect(() => {
    if (isActive && !isComplete) {
      // Operation is in progress — start 500ms delay before showing
      wasActiveRef.current = true;
      if (!visible && !fadingOut) {
        showTimerRef.current = setTimeout(() => {
          setVisible(true);
        }, 500);
      }
    } else if (wasActiveRef.current) {
      // Operation completed or failed — fade out within 300ms
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      if (visible) {
        setFadingOut(true);
        fadeTimerRef.current = setTimeout(() => {
          setVisible(false);
          setFadingOut(false);
          wasActiveRef.current = false;
        }, 300);
      } else {
        // Never became visible (completed within 500ms) — just reset
        wasActiveRef.current = false;
      }
    }

    return () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [isActive, isComplete, visible, fadingOut]);

  if (!visible) {
    return null;
  }

  const isDeterminate = progress !== null;
  const clampedProgress = isDeterminate ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`w-full transition-opacity duration-300 motion-reduce:transition-none ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-light dark:text-text-dark">{label}</span>
        {isDeterminate && (
          <span className="text-sm text-text-muted dark:text-secondary-300">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
      <div
        className="w-full h-2 rounded-full bg-secondary-200 dark:bg-secondary-700 overflow-hidden"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={isDeterminate ? Math.round(clampedProgress) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {isDeterminate ? (
          <div
            className="h-full rounded-full bg-primary-500 dark:bg-primary-400 transition-all duration-200 ease-out motion-reduce:transition-none"
            style={{ width: `${clampedProgress}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-primary-500 dark:bg-primary-400 animate-indeterminate motion-reduce:animate-none" />
        )}
      </div>
    </div>
  );
}
