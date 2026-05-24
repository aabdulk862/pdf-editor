import { create } from 'zustand';

import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { OperationResult } from '@/types/operations';
import type {
  OperationTemplate,
  TemplateEngineState,
  TemplateExecutionState,
} from '../features/templates/types';

/**
 * Internal store state extends the public interface with private fields
 * used for cancellation and template selection tracking.
 */
interface TemplateStoreInternal extends TemplateEngineState {
  _cancelRequested: boolean;
  _selectedTemplateId: string | null;
}

/**
 * Execute a single PDF operation via the PdfWorkerClient.
 * This is the integration point between the template engine and the worker.
 * Maps operation type strings to the appropriate PdfWorkerClient method.
 */
export async function executeOperation(
  operationType: string,
  input: ArrayBuffer,
  params: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const client = getPdfWorkerClient();
  let result: OperationResult;

  switch (operationType) {
    case 'compress':
      result = await client.compress(input);
      break;
    case 'flatten':
      result = await client.flatten(input);
      break;
    case 'linearize':
      result = await client.linearize(input);
      break;
    case 'page-numbers':
      result = await client.addPageNumbers(input, params as never);
      break;
    case 'headers-footers':
      result = await client.addHeadersFooters(input, params as never);
      break;
    case 'watermark':
      result = await client.addWatermark(input, params as never);
      break;
    case 'redact':
      result = await client.redact(input, (params.regions ?? []) as never);
      break;
    case 'password-protect':
      result = await client.encrypt(input, (params.password ?? '') as string);
      break;
    default:
      // For operations not yet mapped, return input unchanged
      return input;
  }

  if (!result.success || !result.data) {
    throw new Error(result.error ?? `Operation "${operationType}" failed`);
  }

  return result.data;
}

const predefinedTemplates: OperationTemplate[] = [
  {
    id: 'prepare-for-print',
    name: 'Prepare for Print',
    description: 'Add page numbers, headers and footers, then compress for optimal print output.',
    steps: [
      {
        id: 'prepare-for-print-step-1',
        operationType: 'page-numbers',
        label: 'Add Page Numbers',
        params: {},
        timeoutMs: 30000,
      },
      {
        id: 'prepare-for-print-step-2',
        operationType: 'headers-footers',
        label: 'Add Headers & Footers',
        params: {},
        timeoutMs: 30000,
      },
      {
        id: 'prepare-for-print-step-3',
        operationType: 'compress',
        label: 'Compress',
        params: {},
        timeoutMs: 30000,
      },
    ],
  },
  {
    id: 'secure-document',
    name: 'Secure Document',
    description: 'Redact sensitive content and apply password protection.',
    steps: [
      {
        id: 'secure-document-step-1',
        operationType: 'redact',
        label: 'Redact Sensitive Content',
        params: {},
        timeoutMs: 30000,
      },
      {
        id: 'secure-document-step-2',
        operationType: 'password-protect',
        label: 'Password Protect',
        params: {},
        timeoutMs: 30000,
      },
    ],
  },
  {
    id: 'clean-and-optimize',
    name: 'Clean and Optimize',
    description: 'Flatten annotations, compress, and linearize for fast web viewing.',
    steps: [
      {
        id: 'clean-and-optimize-step-1',
        operationType: 'flatten',
        label: 'Flatten Annotations',
        params: {},
        timeoutMs: 30000,
      },
      {
        id: 'clean-and-optimize-step-2',
        operationType: 'compress',
        label: 'Compress',
        params: {},
        timeoutMs: 30000,
      },
      {
        id: 'clean-and-optimize-step-3',
        operationType: 'linearize',
        label: 'Linearize for Web',
        params: {},
        timeoutMs: 30000,
      },
    ],
  },
];

const initialExecutionState: TemplateExecutionState = {
  status: 'idle',
  currentStepIndex: 0,
  totalSteps: 0,
  currentStepName: '',
  intermediateResult: null,
  finalResult: null,
  error: null,
};

export const useTemplateStore = create<TemplateStoreInternal>((set, get) => ({
  templates: predefinedTemplates,
  execution: { ...initialExecutionState },
  _cancelRequested: false,
  _selectedTemplateId: null,

  selectTemplate: (templateId: string) => {
    const template = get().templates.find((t) => t.id === templateId);
    if (!template) return;

    set({
      _selectedTemplateId: templateId,
      execution: {
        ...initialExecutionState,
        status: 'configuring',
        totalSteps: template.steps.length,
        currentStepName: template.steps[0]?.label ?? '',
      },
    });
  },

  updateStepParams: (stepIndex: number, params: Record<string, unknown>) => {
    const { templates, execution } = get();
    // Find the currently selected template based on configuring state
    // We need to update the step params in the templates array
    const updatedTemplates = templates.map((template) => ({
      ...template,
      steps: template.steps.map((step, idx) => {
        if (idx === stepIndex && execution.status === 'configuring') {
          return { ...step, params: { ...step.params, ...params } };
        }
        return step;
      }),
    }));

    set({ templates: updatedTemplates });
  },

  execute: async (inputFile: ArrayBuffer) => {
    const state = get();
    const template = state.templates.find((t) => t.id === state._selectedTemplateId);

    if (!template) return;

    // Reset cancel flag and set status to executing
    set({
      _cancelRequested: false,
      execution: {
        status: 'executing',
        currentStepIndex: 0,
        totalSteps: template.steps.length,
        currentStepName: template.steps[0]?.label ?? '',
        intermediateResult: null,
        finalResult: null,
        error: null,
      },
    });

    let currentInput: ArrayBuffer = inputFile;
    let lastSuccessfulResult: ArrayBuffer | null = null;

    for (let i = 0; i < template.steps.length; i++) {
      const step = template.steps[i];

      // Update current step info
      set({
        execution: {
          ...get().execution,
          currentStepIndex: i,
          currentStepName: step.label,
        },
      });

      // Check if cancellation was requested between steps
      if (get()._cancelRequested) {
        set({
          execution: {
            ...get().execution,
            status: 'cancelled',
            intermediateResult: lastSuccessfulResult,
            finalResult: null,
          },
        });
        return;
      }

      try {
        // Execute the operation with a timeout
        const timeoutMs = step.timeoutMs || 30000;
        const result = await Promise.race([
          executeOperation(step.operationType, currentInput, step.params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs),
          ),
        ]);

        // Step succeeded
        lastSuccessfulResult = result;
        currentInput = result;

        // Update intermediate result
        set({
          execution: {
            ...get().execution,
            intermediateResult: lastSuccessfulResult,
          },
        });
      } catch (err) {
        // Step failed or timed out
        const reason = err instanceof Error ? err.message : 'Unknown error';

        set({
          execution: {
            ...get().execution,
            status: 'failed',
            error: { stepName: step.label, stepIndex: i, reason },
            // If first step fails, intermediateResult stays null
            // Otherwise preserve last successful result
            intermediateResult: lastSuccessfulResult,
            finalResult: null,
          },
        });
        return;
      }
    }

    // All steps completed successfully
    set({
      execution: {
        ...get().execution,
        status: 'completed',
        finalResult: lastSuccessfulResult,
      },
    });
  },

  cancel: () => {
    // Set the cancellation flag; the execute loop will check it between steps
    // and stop after the current in-progress step finishes
    set({ _cancelRequested: true });
  },

  reset: () => {
    set({
      _cancelRequested: false,
      _selectedTemplateId: null,
      execution: { ...initialExecutionState },
    });
  },
}));
