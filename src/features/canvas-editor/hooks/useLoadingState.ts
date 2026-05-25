import { useCallback, useRef, useState } from 'react';

import type { LoadingContext } from '../types';

/**
 * Loading state managed by the hook.
 */
export interface LoadingState {
  /** Whether any loading operation is active */
  isLoading: boolean;
  /** The current loading context (null when idle) */
  context: LoadingContext | null;
  /** Whether the operation has exceeded 5 seconds (show extended message) */
  showExtendedMessage: boolean;
}

/**
 * Return type of the useLoadingState hook.
 */
export interface UseLoadingStateReturn {
  /** Current loading state */
  state: LoadingState;
  /** Start a loading operation with the given context */
  startLoading: (context: LoadingContext) => void;
  /** Stop the current loading operation */
  stopLoading: () => void;
  /** Update the loading context (e.g., update export progress page count) */
  updateContext: (context: LoadingContext) => void;
}

const EXTENDED_MESSAGE_THRESHOLD_MS = 5000;

/**
 * Hook that manages centralized loading context for the canvas editor.
 *
 * Supports variants: editor-init, export, image-upload, template-load.
 * Tracks operation start time and shows an extended message after 5 seconds.
 * Never displays a full-page blocking spinner — all loading states are
 * localized to the affected region via the skeleton components.
 *
 * Requirements: 23.5, 23.6, 23.7
 */
export function useLoadingState(): UseLoadingStateReturn {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    context: null,
    showExtendedMessage: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startLoading = useCallback(
    (context: LoadingContext) => {
      clearTimer();
      startTimeRef.current = Date.now();

      setState({
        isLoading: true,
        context,
        showExtendedMessage: false,
      });

      // Set timer to show extended message after 5 seconds
      timerRef.current = setTimeout(() => {
        setState((prev) => {
          if (!prev.isLoading) return prev;
          return { ...prev, showExtendedMessage: true };
        });
      }, EXTENDED_MESSAGE_THRESHOLD_MS);
    },
    [clearTimer],
  );

  const stopLoading = useCallback(() => {
    clearTimer();
    startTimeRef.current = null;

    setState({
      isLoading: false,
      context: null,
      showExtendedMessage: false,
    });
  }, [clearTimer]);

  const updateContext = useCallback((context: LoadingContext) => {
    setState((prev) => {
      if (!prev.isLoading) return prev;
      return { ...prev, context };
    });
  }, []);

  return {
    state,
    startLoading,
    stopLoading,
    updateContext,
  };
}
