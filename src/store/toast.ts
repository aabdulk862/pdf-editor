import { create } from 'zustand';

export type ToastSeverity = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  severity: ToastSeverity;
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, severity: ToastSeverity, duration?: number) => string;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

function generateId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, severity, duration = 5000) => {
    const id = generateId();
    const toast: Toast = {
      id,
      message,
      severity,
      duration,
      createdAt: Date.now(),
    };
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
