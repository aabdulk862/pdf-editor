import { Button } from './Button';

/**
 * Describes the error state for a tool page, including recovery options.
 */
export interface ToolErrorState {
  type:
    | 'corrupt-file'
    | 'password-protected'
    | 'unsupported-feature'
    | 'processing-failed'
    | 'unknown';
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
  alternativeAction?: { label: string; action: () => void };
}

export interface ErrorRecoveryProps {
  error: ToolErrorState;
  /** Called when the user clicks "Start Over" to reset the tool */
  onReset?: () => void;
}

/**
 * ErrorRecovery component - Displays an inline error state with retry and reset options.
 *
 * Provides:
 * - Accessible error announcement via aria-live="assertive"
 * - Descriptive error message with icon
 * - Retry button (when the error is recoverable)
 * - Optional alternative action button
 * - Start Over button to reset the tool
 *
 * Requirements: 6.7 (tool workspace error state with retry)
 */
export function ErrorRecovery({ error, onReset }: ErrorRecoveryProps): JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20"
    >
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-error-500 dark:text-error-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Error content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
            {getErrorTitle(error.type)}
          </h3>
          <p className="mt-1 text-sm text-error-700 dark:text-error-300">{error.message}</p>

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {error.recoverable && error.retryAction && (
              <Button variant="primary" size="sm" onClick={error.retryAction}>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Retry
              </Button>
            )}
            {error.alternativeAction && (
              <Button variant="outline" size="sm" onClick={error.alternativeAction.action}>
                {error.alternativeAction.label}
              </Button>
            )}
            {onReset && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                Start Over
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getErrorTitle(type: ToolErrorState['type']): string {
  switch (type) {
    case 'corrupt-file':
      return 'Corrupt or Invalid File';
    case 'password-protected':
      return 'Password Protected';
    case 'unsupported-feature':
      return 'Unsupported Feature';
    case 'processing-failed':
      return 'Processing Failed';
    case 'unknown':
    default:
      return 'Something Went Wrong';
  }
}

ErrorRecovery.displayName = 'ErrorRecovery';
