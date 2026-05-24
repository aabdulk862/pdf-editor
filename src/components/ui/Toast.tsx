import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastStore, type Toast as ToastType, type ToastSeverity } from '../../store/toast';

const MAX_VISIBLE = 3;

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

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps): JSX.Element {
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingRef.current);
  }, [onDismiss, toast.id]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      startTimer();
    } else {
      pauseTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, startTimer, pauseTimer]);

  const handleMouseEnter = (): void => {
    setIsPaused(true);
  };

  const handleMouseLeave = (): void => {
    setIsPaused(false);
  };

  const handleDismiss = (): void => {
    onDismiss(toast.id);
  };

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ${severityStyles[toast.severity]}`}
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
        className="shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer(): JSX.Element {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  const visibleToasts = toasts.slice(-MAX_VISIBLE);

  const errorToasts = visibleToasts.filter((t) => t.severity === 'error');
  const nonErrorToasts = visibleToasts.filter((t) => t.severity !== 'error');

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-end gap-2 p-4 sm:justify-start sm:p-6">
      {/* Assertive region for error toasts - announced immediately */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="pointer-events-auto w-full max-w-sm space-y-2"
      >
        {errorToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Polite region for success/warning toasts - announced when convenient */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-auto w-full max-w-sm space-y-2"
      >
        {nonErrorToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
}

export default ToastContainer;
