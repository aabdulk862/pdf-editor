import { create } from 'zustand';

export interface Operation {
  id: string;
  type: string;
  timestamp: number;
  previousState: ArrayBuffer;
  currentState: ArrayBuffer;
  description: string;
}

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  undoStack: Operation[];
  redoStack: Operation[];
  canUndo: boolean;
  canRedo: boolean;
  pushOperation: (op: Operation) => void;
  undo: () => Operation | undefined;
  redo: () => Operation | undefined;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,

  pushOperation: (op: Operation) => {
    set((state) => {
      const newStack = [...state.undoStack, op];
      // Enforce max 50 entries by discarding oldest
      if (newStack.length > MAX_HISTORY_SIZE) {
        newStack.splice(0, newStack.length - MAX_HISTORY_SIZE);
      }
      return {
        undoStack: newStack,
        redoStack: [], // Clear redo stack on new operation
        canUndo: true,
        canRedo: false,
      };
    });
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return undefined;

    const operation = undoStack[undoStack.length - 1];
    set((state) => {
      const newUndoStack = state.undoStack.slice(0, -1);
      const newRedoStack = [...state.redoStack, operation];
      return {
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        canUndo: newUndoStack.length > 0,
        canRedo: true,
      };
    });
    return operation;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return undefined;

    const operation = redoStack[redoStack.length - 1];
    set((state) => {
      const newRedoStack = state.redoStack.slice(0, -1);
      const newUndoStack = [...state.undoStack, operation];
      return {
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        canUndo: true,
        canRedo: newRedoStack.length > 0,
      };
    });
    return operation;
  },
}));
