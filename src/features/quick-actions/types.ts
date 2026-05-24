export interface QuickAction {
  id: string;
  label: string;
  operationRoute: string;
  icon: string;
  ariaLabel: string;
}

export interface QuickActionsState {
  isVisible: boolean;
  actions: QuickAction[];
  resultFile: ArrayBuffer | null;

  show: (operationType: string, resultFile: ArrayBuffer) => void;
  dismiss: () => void;
  hide: () => void;
}
