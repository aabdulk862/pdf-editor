export interface OperationStep {
  id: string;
  operationType: string;
  label: string;
  params: Record<string, unknown>;
  timeoutMs: number; // default 30000
}

export interface OperationTemplate {
  id: string;
  name: string;
  description: string;
  steps: OperationStep[];
}

export type TemplateExecutionStatus =
  | 'idle'
  | 'configuring'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TemplateExecutionState {
  status: TemplateExecutionStatus;
  currentStepIndex: number;
  totalSteps: number;
  currentStepName: string;
  intermediateResult: ArrayBuffer | null;
  finalResult: ArrayBuffer | null;
  error: { stepName: string; stepIndex: number; reason: string } | null;
}

export interface TemplateEngineState {
  templates: OperationTemplate[];
  execution: TemplateExecutionState;

  selectTemplate: (templateId: string) => void;
  updateStepParams: (stepIndex: number, params: Record<string, unknown>) => void;
  execute: (inputFile: ArrayBuffer) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}
