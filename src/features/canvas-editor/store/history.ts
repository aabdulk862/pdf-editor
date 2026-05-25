import { MAX_HISTORY } from '../constants';
import type { CanvasDocument } from '../types';

// === History Types ===

export interface DocumentSnapshot {
  document: CanvasDocument;
  timestamp: number;
  description: string;
}

export interface HistoryState {
  undoStack: DocumentSnapshot[];
  redoStack: DocumentSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
}

// === Initial History State ===

export const initialHistoryState: HistoryState = {
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
};

// === History Helper Functions ===

/**
 * Creates a deep-cloned snapshot of the current document state.
 */
export function createSnapshot(document: CanvasDocument, description: string): DocumentSnapshot {
  return {
    document: structuredClone(document),
    timestamp: Date.now(),
    description,
  };
}

/**
 * Pushes a snapshot onto the undo stack before a mutating action.
 * Clears the redo stack (any new action after undo invalidates the redo history).
 * Applies FIFO eviction when the undo stack exceeds MAX_HISTORY entries.
 */
export function pushToUndoStack(history: HistoryState, snapshot: DocumentSnapshot): HistoryState {
  const undoStack = [...history.undoStack, snapshot];

  // FIFO eviction: remove oldest entries if over limit
  while (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }

  return {
    undoStack,
    redoStack: [], // Clear redo stack on new action
    canUndo: true,
    canRedo: false,
  };
}

/**
 * Performs an undo operation:
 * - Pops the most recent snapshot from the undo stack
 * - Pushes the current document state onto the redo stack
 * - Returns the restored document and updated history state
 *
 * Returns null if undo is not possible (empty undo stack).
 */
export function performUndo(
  history: HistoryState,
  currentDocument: CanvasDocument,
): { document: CanvasDocument; history: HistoryState } | null {
  if (history.undoStack.length === 0) return null;

  const undoStack = [...history.undoStack];
  const poppedSnapshot = undoStack.pop()!;

  // Push current state to redo stack
  const redoSnapshot = createSnapshot(currentDocument, 'undo');
  const redoStack = [...history.redoStack, redoSnapshot];

  return {
    document: poppedSnapshot.document,
    history: {
      undoStack,
      redoStack,
      canUndo: undoStack.length > 0,
      canRedo: true,
    },
  };
}

/**
 * Performs a redo operation:
 * - Pops the most recent snapshot from the redo stack
 * - Pushes the current document state onto the undo stack
 * - Returns the restored document and updated history state
 *
 * Returns null if redo is not possible (empty redo stack).
 */
export function performRedo(
  history: HistoryState,
  currentDocument: CanvasDocument,
): { document: CanvasDocument; history: HistoryState } | null {
  if (history.redoStack.length === 0) return null;

  const redoStack = [...history.redoStack];
  const poppedSnapshot = redoStack.pop()!;

  // Push current state to undo stack
  const undoSnapshot = createSnapshot(currentDocument, 'redo');
  const undoStack = [...history.undoStack, undoSnapshot];

  return {
    document: poppedSnapshot.document,
    history: {
      undoStack,
      redoStack,
      canUndo: true,
      canRedo: redoStack.length > 0,
    },
  };
}
