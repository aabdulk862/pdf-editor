export interface DropValidationResult {
  valid: boolean;
  file: File;
  reason?: string;
}

export interface GlobalDropZoneState {
  isDragging: boolean;
  isValidType: boolean;
  setDragging: (isDragging: boolean, isValid: boolean) => void;
}
