import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  level: 'app' | 'feature' | 'component';
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component implementing a three-tier error handling strategy:
 * - 'app': Full-page fallback with reload option
 * - 'feature': Error message with retry button to re-mount children
 * - 'component': Inline placeholder with error context
 *
 * This is a class component because React error boundaries require
 * getDerivedStateFromError and componentDidCatch lifecycle methods.
 *
 * Validates: Requirements 31.2, 31.3, 31.6
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { level } = this.props;
    const { error } = this.state;

    switch (level) {
      case 'app':
        return <AppLevelFallback onReload={this.handleReload} />;
      case 'feature':
        return <FeatureLevelFallback error={error} onRetry={this.handleRetry} />;
      case 'component':
        return <ComponentLevelFallback error={error} />;
      default:
        return <FeatureLevelFallback error={error} onRetry={this.handleRetry} />;
    }
  }
}

function AppLevelFallback({ onReload }: { onReload: () => void }): ReactNode {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl" aria-hidden="true">
          ⚠️
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Something went wrong
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          An unexpected error occurred. Your uploaded files and input have been preserved. Please
          reload the page to continue.
        </p>
        <button
          onClick={onReload}
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function FeatureLevelFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}): ReactNode {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4 text-4xl" aria-hidden="true">
        ❌
      </div>
      <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
        This section encountered an error
      </h2>
      {error && (
        <p className="mb-4 max-w-md text-center text-sm text-red-600 dark:text-red-400">
          {error.message}
        </p>
      )}
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Your input and uploaded files have been preserved. Click retry to try again.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-red-950"
      >
        Retry
      </button>
    </div>
  );
}

function ComponentLevelFallback({ error }: { error: Error | null }): ReactNode {
  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">
          ⚠️
        </span>
        <div>
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Component failed to render
          </h3>
          {error && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{error.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
