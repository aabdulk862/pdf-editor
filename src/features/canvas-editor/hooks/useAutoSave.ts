import { useCallback, useEffect, useRef } from 'react';

import { useToastStore } from '../../../store/toast';
import { AUTO_SAVE_INTERVAL } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import type { CanvasDocument } from '../types';

// === Storage Keys ===

function getAutoSaveKey(documentId: string): string {
  return `canvas-editor-autosave-${documentId}`;
}

function getManualSaveKey(documentId: string): string {
  return `canvas-editor-document-${documentId}`;
}

const PALETTE_KEY = 'canvas-editor-palette';

// === Recovery Metadata ===

export interface RecoveryMetadata {
  exists: boolean;
  savedAt: number;
  documentName: string;
}

// === Safe localStorage Write ===

/**
 * Attempts to write to localStorage, catching QuotaExceededError gracefully.
 * Returns true if the write succeeded, false if quota was exceeded.
 */
function safeLocalStorageSet(key: string, value: string, showWarning: () => void): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    ) {
      showWarning();
      return false;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

// === Hook ===

/**
 * Hook that manages auto-save lifecycle for the canvas editor.
 *
 * - Auto-saves every 30 seconds if the document has unsaved changes (dirty flag)
 * - Immediate save on Ctrl+S / Cmd+S with "Saved" toast confirmation
 * - Registers beforeunload handler for immediate save on tab close/navigation
 * - Persists auto-save under `canvas-editor-autosave-{documentId}`
 * - Persists saved colors under `canvas-editor-palette`
 * - Provides recovery utilities: checkForRecovery, recoverDocument, clearRecoveryData
 * - Handles localStorage quota exceeded gracefully with non-blocking warning toast
 *
 * @param documentId - The ID of the current document being edited
 */
export function useAutoSave(documentId: string | null): {
  checkForRecovery: (docId: string) => RecoveryMetadata | null;
  recoverDocument: (docId: string) => CanvasDocument | null;
  clearRecoveryData: (docId: string) => void;
} {
  const dirtyRef = useRef(false);
  const lastUpdatedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useToastStore((state) => state.addToast);

  // --- Quota exceeded warning ---
  const showQuotaWarning = useCallback(() => {
    addToast('Auto-save failed — storage full. Consider exporting your work.', 'warning');
  }, [addToast]);

  // --- Perform auto-save (to autosave key) ---
  const performAutoSave = useCallback(() => {
    if (!documentId) return;

    const state = useCanvasStore.getState();
    const doc = state.document;
    if (!doc) return;

    const key = getAutoSaveKey(documentId);
    const payload = JSON.stringify({
      document: doc,
      savedAt: Date.now(),
      documentId,
    });

    safeLocalStorageSet(key, payload, showQuotaWarning);
    dirtyRef.current = false;
  }, [documentId, showQuotaWarning]);

  // --- Perform manual save (to document key) ---
  const performManualSave = useCallback(() => {
    if (!documentId) return;

    const state = useCanvasStore.getState();
    const doc = state.document;
    if (!doc) return;

    const key = getManualSaveKey(documentId);
    const payload = JSON.stringify(doc);

    const success = safeLocalStorageSet(key, payload, showQuotaWarning);
    if (success) {
      addToast('Saved', 'success', 2000);
    }
    dirtyRef.current = false;
  }, [documentId, showQuotaWarning, addToast]);

  // --- Persist saved colors ---
  const persistColors = useCallback(
    (colors: string[]) => {
      safeLocalStorageSet(PALETTE_KEY, JSON.stringify(colors), showQuotaWarning);
    },
    [showQuotaWarning],
  );

  // --- Subscribe to store changes to track dirty flag and color changes ---
  useEffect(() => {
    if (!documentId) return;

    const unsubscribe = useCanvasStore.subscribe((state, prevState) => {
      // Track document mutations via updatedAt
      if (
        state.document &&
        prevState.document &&
        state.document.updatedAt !== prevState.document.updatedAt
      ) {
        dirtyRef.current = true;
        lastUpdatedAtRef.current = state.document.updatedAt;
      }

      // Persist saved colors when they change
      if (state.savedColors !== prevState.savedColors) {
        persistColors(state.savedColors);
      }
    });

    return unsubscribe;
  }, [documentId, persistColors]);

  // --- Auto-save interval (every 30 seconds) ---
  useEffect(() => {
    if (!documentId) return;

    intervalRef.current = setInterval(() => {
      if (dirtyRef.current) {
        performAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [documentId, performAutoSave]);

  // --- Ctrl+S / Cmd+S keyboard shortcut ---
  useEffect(() => {
    if (!documentId) return;

    function handleKeyDown(event: KeyboardEvent): void {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      if (modKey && event.key === 's') {
        event.preventDefault();
        performManualSave();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [documentId, performManualSave]);

  // --- beforeunload handler ---
  useEffect(() => {
    if (!documentId) return;

    function handleBeforeUnload(): void {
      if (dirtyRef.current) {
        performAutoSave();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [documentId, performAutoSave]);

  // --- Recovery utilities ---

  const checkForRecovery = useCallback((docId: string): RecoveryMetadata | null => {
    const key = getAutoSaveKey(docId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        document: CanvasDocument;
        savedAt: number;
        documentId: string;
      };

      return {
        exists: true,
        savedAt: parsed.savedAt,
        documentName: parsed.document.name,
      };
    } catch {
      // Corrupted data — remove it
      localStorage.removeItem(key);
      return null;
    }
  }, []);

  const recoverDocument = useCallback((docId: string): CanvasDocument | null => {
    const key = getAutoSaveKey(docId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        document: CanvasDocument;
        savedAt: number;
        documentId: string;
      };
      return parsed.document;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }, []);

  const clearRecoveryData = useCallback((docId: string): void => {
    const key = getAutoSaveKey(docId);
    localStorage.removeItem(key);
  }, []);

  return {
    checkForRecovery,
    recoverDocument,
    clearRecoveryData,
  };
}
