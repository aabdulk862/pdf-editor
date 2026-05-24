import { describe, it, expect, beforeEach } from 'vitest';
import type { Operation } from '../../../src/store/history';
import { useHistoryStore } from '../../../src/store/history';

function createOperation(id: string): Operation {
  return {
    id,
    type: 'test',
    timestamp: Date.now(),
    previousState: new ArrayBuffer(8),
    currentState: new ArrayBuffer(8),
    description: `Operation ${id}`,
  };
}

describe('useHistoryStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useHistoryStore.setState({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  });

  describe('initial state', () => {
    it('should start with empty stacks', () => {
      const state = useHistoryStore.getState();
      expect(state.undoStack).toEqual([]);
      expect(state.redoStack).toEqual([]);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });
  });

  describe('pushOperation', () => {
    it('should add operation to undo stack', () => {
      const op = createOperation('1');
      useHistoryStore.getState().pushOperation(op);

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0]).toBe(op);
      expect(state.canUndo).toBe(true);
    });

    it('should clear redo stack on new operation', () => {
      const op1 = createOperation('1');
      const op2 = createOperation('2');

      useHistoryStore.getState().pushOperation(op1);
      useHistoryStore.getState().undo();
      // redo stack should have op1
      expect(useHistoryStore.getState().canRedo).toBe(true);

      useHistoryStore.getState().pushOperation(op2);
      const state = useHistoryStore.getState();
      expect(state.redoStack).toEqual([]);
      expect(state.canRedo).toBe(false);
    });

    it('should enforce max 50 entries by discarding oldest', () => {
      for (let i = 0; i < 55; i++) {
        useHistoryStore.getState().pushOperation(createOperation(`${i}`));
      }

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(50);
      // Oldest entries (0-4) should be discarded
      expect(state.undoStack[0].id).toBe('5');
      expect(state.undoStack[49].id).toBe('54');
    });
  });

  describe('undo', () => {
    it('should return undefined when undo stack is empty', () => {
      const result = useHistoryStore.getState().undo();
      expect(result).toBeUndefined();
    });

    it('should pop from undo stack and push to redo stack', () => {
      const op = createOperation('1');
      useHistoryStore.getState().pushOperation(op);

      const result = useHistoryStore.getState().undo();
      expect(result).toBe(op);

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(1);
      expect(state.redoStack[0]).toBe(op);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
    });

    it('should handle multiple undos', () => {
      const op1 = createOperation('1');
      const op2 = createOperation('2');
      useHistoryStore.getState().pushOperation(op1);
      useHistoryStore.getState().pushOperation(op2);

      const result1 = useHistoryStore.getState().undo();
      expect(result1).toBe(op2);

      const result2 = useHistoryStore.getState().undo();
      expect(result2).toBe(op1);

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(2);
    });
  });

  describe('redo', () => {
    it('should return undefined when redo stack is empty', () => {
      const result = useHistoryStore.getState().redo();
      expect(result).toBeUndefined();
    });

    it('should pop from redo stack and push to undo stack', () => {
      const op = createOperation('1');
      useHistoryStore.getState().pushOperation(op);
      useHistoryStore.getState().undo();

      const result = useHistoryStore.getState().redo();
      expect(result).toBe(op);

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0]).toBe(op);
      expect(state.redoStack).toHaveLength(0);
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it('should handle undo then redo round-trip', () => {
      const op1 = createOperation('1');
      const op2 = createOperation('2');
      useHistoryStore.getState().pushOperation(op1);
      useHistoryStore.getState().pushOperation(op2);

      // Undo op2
      useHistoryStore.getState().undo();
      // Redo op2
      useHistoryStore.getState().redo();

      const state = useHistoryStore.getState();
      expect(state.undoStack).toHaveLength(2);
      expect(state.undoStack[0]).toBe(op1);
      expect(state.undoStack[1]).toBe(op2);
      expect(state.redoStack).toHaveLength(0);
    });
  });
});
