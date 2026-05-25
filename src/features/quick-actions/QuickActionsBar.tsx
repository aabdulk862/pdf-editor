import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useQuickActionsStore } from '../../store/quick-actions';
import type { QuickAction } from './types';

/** Icon mapping for quick action suggestions */
function ActionIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'compress':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      );
    case 'page-numbers':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
          />
        </svg>
      );
    case 'download':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      );
    case 'linearize':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    case 'encrypt':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    case 'flatten':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
          />
        </svg>
      );
    case 'headers':
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      );
  }
}

/**
 * QuickActionsBar — Contextual follow-up operation suggestions bar.
 *
 * Appears near the download button after a PDF operation completes successfully.
 * Displays 2-3 suggestion buttons that pass the result file to the next operation.
 * Non-blocking layout, auto-hides on navigation, dismissible.
 *
 * Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 */
export function QuickActionsBar(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();

  const isVisible = useQuickActionsStore((state) => state.isVisible);
  const actions = useQuickActionsStore((state) => state.actions);
  const resultFile = useQuickActionsStore((state) => state.resultFile);
  const dismiss = useQuickActionsStore((state) => state.dismiss);
  const hide = useQuickActionsStore((state) => state.hide);

  // Track whether the bar has animated in
  const [isAnimatedIn, setIsAnimatedIn] = useState(false);

  // Track the initial pathname to avoid hiding on first mount
  const initialPathRef = useRef(location.pathname);

  // Auto-hide on page navigation (Requirement 11.7)
  useEffect(() => {
    if (location.pathname !== initialPathRef.current) {
      hide();
    }
    initialPathRef.current = location.pathname;
  }, [location.pathname, hide]);

  // Animate in with a slight delay (appear within 500ms — Requirement 11.1)
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsAnimatedIn(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatedIn(false);
    }
  }, [isVisible]);

  // Handle suggestion click (Requirements 11.3, 11.4)
  const handleActionClick = (action: QuickAction) => {
    navigate(action.operationRoute, {
      state: { preloadedFile: resultFile },
    });
  };

  if (!isVisible || actions.length === 0) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label="Quick follow-up actions"
      className={[
        'flex items-center gap-2 mt-3 p-3 rounded-lg',
        'border border-secondary-200 dark:border-secondary-700',
        'bg-secondary-50 dark:bg-secondary-800/50',
        'transition-all duration-slow ease-in-out motion-reduce:transition-none',
        isAnimatedIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
      ].join(' ')}
    >
      {/* Label */}
      <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400 whitespace-nowrap mr-1">
        Next:
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            aria-label={action.ariaLabel}
            onClick={() => handleActionClick(action)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-white dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600',
              'text-secondary-700 dark:text-secondary-200',
              'hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700',
              'dark:hover:bg-primary-900/20 dark:hover:border-primary-600 dark:hover:text-primary-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
              'transition-colors duration-normal ease-in-out',
              'min-h-[36px]',
            ].join(' ')}
          >
            <ActionIcon icon={action.icon} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Dismiss button (Requirement 11.6) */}
      <button
        type="button"
        aria-label="Dismiss quick actions"
        onClick={dismiss}
        className={[
          'ml-auto shrink-0 p-1.5 rounded-md',
          'text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300',
          'hover:bg-secondary-200 dark:hover:bg-secondary-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          'transition-colors duration-normal ease-in-out',
          'min-h-[36px] min-w-[36px] flex items-center justify-center',
        ].join(' ')}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

QuickActionsBar.displayName = 'QuickActionsBar';
