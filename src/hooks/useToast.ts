import { useCallback } from 'react';
import { useToastStore, type ToastSeverity } from '../store/toast';

export interface UseToastReturn {
  addToast: (message: string, severity: ToastSeverity, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

export function useToast(): UseToastReturn {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);

  const success = useCallback(
    (message: string, duration?: number) => addToast(message, 'success', duration),
    [addToast],
  );

  const warning = useCallback(
    (message: string, duration?: number) => addToast(message, 'warning', duration),
    [addToast],
  );

  const error = useCallback(
    (message: string, duration?: number) => addToast(message, 'error', duration),
    [addToast],
  );

  const info = useCallback(
    (message: string, duration?: number) => addToast(message, 'info', duration),
    [addToast],
  );

  return { addToast, removeToast, success, warning, error, info };
}
