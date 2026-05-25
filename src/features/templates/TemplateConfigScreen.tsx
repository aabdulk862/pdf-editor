import { useCallback, useRef, useState } from 'react';

import { useTemplateStore } from '../../store/templates';
import { useToastStore } from '../../store/toast';
import { Button } from '../../components/ui/Button';

/**
 * Modal overlay for configuring a template before execution.
 * Shows the selected template's steps in order with editable parameters.
 * Requires a file to be uploaded before execution can begin.
 *
 * Requirements: 8.3, 8.4, 8.5
 */
export function TemplateConfigScreen() {
  const execution = useTemplateStore((state) => state.execution);
  const templates = useTemplateStore((state) => state.templates);
  const reset = useTemplateStore((state) => state.reset);
  const execute = useTemplateStore((state) => state.execute);
  const updateStepParams = useTemplateStore((state) => state.updateStepParams);
  const addToast = useToastStore((state) => state.addToast);

  const [file, setFile] = useState<File | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find the currently selected template based on configuring state
  const selectedTemplate = templates.find(
    (t) => t.steps.length === execution.totalSteps && execution.status === 'configuring',
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!file) {
      addToast('Please upload a PDF file before executing the template.', 'error');
      return;
    }

    setIsExecuting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      await execute(arrayBuffer);
    } finally {
      setIsExecuting(false);
    }
  }, [file, execute, addToast]);

  const handleCancel = useCallback(() => {
    setFile(null);
    setIsExecuting(false);
    reset();
  }, [reset]);

  const handleParamChange = useCallback(
    (stepIndex: number, key: string, value: string) => {
      updateStepParams(stepIndex, { [key]: value });
    },
    [updateStepParams],
  );

  if (execution.status !== 'configuring' || !selectedTemplate) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-config-title"
    >
      <div className="w-full max-w-[min(32rem,calc(100vw-32px))] max-h-[calc(100vh-32px)] mx-4 rounded-lg bg-white dark:bg-secondary-800 shadow-level-4 animate-in fade-in duration-normal motion-reduce:animate-none overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-700 px-6 py-4">
          <h2
            id="template-config-title"
            className="text-lg font-semibold text-text-light dark:text-text-dark"
          >
            {selectedTemplate.name}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close configuration"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-secondary-500 transition-colors duration-normal ease-in-out motion-reduce:transition-none hover:bg-secondary-100 hover:text-secondary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-200"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
            {selectedTemplate.description}
          </p>

          {/* Steps list */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-text-light dark:text-text-dark">
              Steps ({selectedTemplate.steps.length})
            </h3>
            <ol className="space-y-3">
              {selectedTemplate.steps.map((step, index) => (
                <li
                  key={step.id}
                  className="rounded-md border border-secondary-200 dark:border-secondary-700 p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {step.label}
                    </span>
                  </div>

                  {/* Editable parameters */}
                  {Object.keys(step.params).length > 0 ? (
                    <div className="ml-8 space-y-2">
                      {Object.entries(step.params).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <label
                            htmlFor={`step-${index}-${key}`}
                            className="text-xs text-secondary-600 dark:text-secondary-400 min-w-[80px]"
                          >
                            {key}:
                          </label>
                          <input
                            id={`step-${index}-${key}`}
                            type="text"
                            value={String(value ?? '')}
                            onChange={(e) => handleParamChange(index, key, e.target.value)}
                            className="flex-1 rounded-md border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-2 py-1 text-xs text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[32px]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="ml-8 text-xs text-secondary-400 dark:text-secondary-500 italic">
                      No configurable parameters
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* File upload */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
            <label
              htmlFor="template-file-input"
              className="block text-sm font-medium text-text-light dark:text-text-dark mb-2"
            >
              PDF File
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="template-file-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-secondary-600 dark:text-secondary-400 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 file:cursor-pointer file:min-h-[44px] md:file:min-h-[36px]"
              />
            </div>
            {file && (
              <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-secondary-200 dark:border-secondary-700 px-6 py-4">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleExecute} loading={isExecuting}>
            Execute
          </Button>
        </div>
      </div>
    </div>
  );
}
