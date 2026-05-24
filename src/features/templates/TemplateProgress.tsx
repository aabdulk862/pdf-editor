import { useCallback, useEffect, useRef } from 'react';

import { useTemplateStore } from '../../store/templates';
import { useToastStore } from '../../store/toast';
import { Button } from '../../components/ui/Button';

/**
 * Execution progress overlay shown when a template is executing.
 * Displays current step number/total, step name, progress indicator, and cancel button.
 * Shows success toast on completion, error toast on failure with step details.
 *
 * Requirements: 8.6, 9.1, 9.2, 9.3, 9.4
 */
export function TemplateProgress() {
  const execution = useTemplateStore((state) => state.execution);
  const cancel = useTemplateStore((state) => state.cancel);
  const reset = useTemplateStore((state) => state.reset);
  const addToast = useToastStore((state) => state.addToast);

  // Track whether we've already shown a toast for the current terminal state
  const toastShownRef = useRef<string | null>(null);

  // Show toasts on completion or failure
  useEffect(() => {
    if (execution.status === 'completed' && toastShownRef.current !== 'completed') {
      toastShownRef.current = 'completed';
      addToast('Template executed successfully! Your file is ready for download.', 'success');
    } else if (execution.status === 'failed' && toastShownRef.current !== 'failed') {
      toastShownRef.current = 'failed';
      const error = execution.error;
      if (error) {
        addToast(
          `Template failed at step ${error.stepIndex + 1} "${error.stepName}": ${error.reason}`,
          'error',
        );
      } else {
        addToast('Template execution failed.', 'error');
      }
    } else if (execution.status === 'idle' || execution.status === 'configuring') {
      toastShownRef.current = null;
    }
  }, [execution.status, execution.error, addToast]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const handleDownload = useCallback(() => {
    const data = execution.finalResult ?? execution.intermediateResult;
    if (!data) return;

    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-result.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [execution.finalResult, execution.intermediateResult]);

  const handleDone = useCallback(() => {
    reset();
  }, [reset]);

  // Only show when executing, completed, failed, or cancelled
  if (
    execution.status !== 'executing' &&
    execution.status !== 'completed' &&
    execution.status !== 'failed' &&
    execution.status !== 'cancelled'
  ) {
    return null;
  }

  const progressPercent =
    execution.totalSteps > 0
      ? Math.round(
          ((execution.currentStepIndex + (execution.status === 'executing' ? 0.5 : 1)) /
            execution.totalSteps) *
            100,
        )
      : 0;

  const isTerminal =
    execution.status === 'completed' ||
    execution.status === 'failed' ||
    execution.status === 'cancelled';

  const hasDownloadableResult =
    execution.finalResult !== null || execution.intermediateResult !== null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-progress-title"
    >
      <div className="w-full max-w-md mx-4 rounded-lg bg-white dark:bg-secondary-800 shadow-xl animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2
            id="template-progress-title"
            className="text-lg font-semibold text-text-light dark:text-text-dark"
          >
            {execution.status === 'executing' && 'Executing Template…'}
            {execution.status === 'completed' && 'Template Complete'}
            {execution.status === 'failed' && 'Template Failed'}
            {execution.status === 'cancelled' && 'Template Cancelled'}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-light dark:text-text-dark">
              Step {execution.currentStepIndex + 1} of {execution.totalSteps}
            </span>
            <span className="text-sm text-secondary-500 dark:text-secondary-400">
              {isTerminal ? '100%' : `${progressPercent}%`}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 rounded-full bg-secondary-200 dark:bg-secondary-700 overflow-hidden mb-3"
            role="progressbar"
            aria-label="Template execution progress"
            aria-valuenow={isTerminal ? 100 : progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={[
                'h-full rounded-full transition-all duration-300 ease-out',
                execution.status === 'failed'
                  ? 'bg-red-500 dark:bg-red-400'
                  : execution.status === 'completed'
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-primary-500 dark:bg-primary-400',
              ].join(' ')}
              style={{ width: isTerminal ? '100%' : `${progressPercent}%` }}
            />
          </div>

          {/* Current step name */}
          <p className="text-sm text-secondary-600 dark:text-secondary-300 mb-1">
            {execution.status === 'executing' && (
              <>
                <span className="inline-block animate-pulse mr-1">●</span>
                {execution.currentStepName}
              </>
            )}
            {execution.status === 'completed' && 'All steps completed successfully.'}
            {execution.status === 'failed' && execution.error && (
              <span className="text-red-600 dark:text-red-400">
                Failed at "{execution.error.stepName}": {execution.error.reason}
              </span>
            )}
            {execution.status === 'cancelled' && 'Execution was cancelled.'}
          </p>

          {/* Step dots */}
          <div className="flex items-center gap-1 mt-4">
            {Array.from({ length: execution.totalSteps }).map((_, i) => {
              let dotColor = 'bg-secondary-300 dark:bg-secondary-600';
              if (i < execution.currentStepIndex) {
                dotColor = 'bg-green-500 dark:bg-green-400';
              } else if (i === execution.currentStepIndex) {
                if (execution.status === 'executing') {
                  dotColor = 'bg-primary-500 dark:bg-primary-400 animate-pulse';
                } else if (execution.status === 'failed') {
                  dotColor = 'bg-red-500 dark:bg-red-400';
                } else if (execution.status === 'completed') {
                  dotColor = 'bg-green-500 dark:bg-green-400';
                }
              }
              return (
                <span key={i} className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-secondary-200 dark:border-secondary-700 px-6 py-4">
          {execution.status === 'executing' && (
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          )}

          {isTerminal && hasDownloadableResult && (
            <Button variant="primary" size="sm" onClick={handleDownload}>
              Download Result
            </Button>
          )}

          {isTerminal && (
            <Button variant="outline" size="sm" onClick={handleDone}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
