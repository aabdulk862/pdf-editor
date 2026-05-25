import { describe, it, expect } from 'vitest';

import { MAX_HISTORY } from '../constants';
import type { CanvasDocument } from '../types';

import {
  createSnapshot,
  initialHistoryState,
  performRedo,
  performUndo,
  pushToUndoStack,
} from './history';
import type { HistoryState } from './history';

function makeDocument(name = 'Test Doc'): CanvasDocument {
  return {
    id: 'doc-1',
    name,
    pages: [
      {
        id: 'page-1',
        width: 210,
        height: 297,
        backgroundColor: '#FFFFFF',
        elements: [],
      },
    ],
    activePageIndex: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('History Manager', () => {
  describe('createSnapshot', () => {
    it('creates a deep clone of the document', () => {
      const doc = makeDocument();
      const snapshot = createSnapshot(doc, 'test action');

      // Modify original — snapshot should be unaffected
      doc.name = 'Modified';
      doc.pages[0].width = 500;

      expect(snapshot.document.name).toBe('Test Doc');
      expect(snapshot.document.pages[0].width).toBe(210);
      expect(snapshot.description).toBe('test action');
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });
  });

  describe('pushToUndoStack', () => {
    it('adds a snapshot to the undo stack', () => {
      const snapshot = createSnapshot(makeDocument(), 'action 1');
      const result = pushToUndoStack(initialHistoryState, snapshot);

      expect(result.undoStack).toHaveLength(1);
      expect(result.undoStack[0].description).toBe('action 1');
      expect(result.canUndo).toBe(true);
    });

    it('clears the redo stack on new action', () => {
      const history: HistoryState = {
        undoStack: [createSnapshot(makeDocument(), 'prev')],
        redoStack: [createSnapshot(makeDocument(), 'redo entry')],
        canUndo: true,
        canRedo: true,
      };

      const snapshot = createSnapshot(makeDocument(), 'new action');
      const result = pushToUndoStack(history, snapshot);

      expect(result.redoStack).toHaveLength(0);
      expect(result.canRedo).toBe(false);
    });

    it('applies FIFO eviction when exceeding MAX_HISTORY', () => {
      let history = initialHistoryState;

      // Push MAX_HISTORY + 5 entries
      for (let i = 0; i < MAX_HISTORY + 5; i++) {
        const snapshot = createSnapshot(makeDocument(`Doc ${i}`), `action ${i}`);
        history = pushToUndoStack(history, snapshot);
      }

      expect(history.undoStack).toHaveLength(MAX_HISTORY);
      // Oldest entries should have been evicted
      expect(history.undoStack[0].description).toBe('action 5');
      expect(history.undoStack[MAX_HISTORY - 1].description).toBe(`action ${MAX_HISTORY + 4}`);
    });
  });

  describe('performUndo', () => {
    it('returns null when undo stack is empty', () => {
      const result = performUndo(initialHistoryState, makeDocument());
      expect(result).toBeNull();
    });

    it('restores the previous document state', () => {
      const originalDoc = makeDocument('Original');
      const snapshot = createSnapshot(originalDoc, 'before change');

      const history: HistoryState = {
        undoStack: [snapshot],
        redoStack: [],
        canUndo: true,
        canRedo: false,
      };

      const currentDoc = makeDocument('Modified');
      const result = performUndo(history, currentDoc);

      expect(result).not.toBeNull();
      expect(result!.document.name).toBe('Original');
    });

    it('pushes current state to redo stack', () => {
      const snapshot = createSnapshot(makeDocument('V1'), 'action');
      const history: HistoryState = {
        undoStack: [snapshot],
        redoStack: [],
        canUndo: true,
        canRedo: false,
      };

      const currentDoc = makeDocument('V2');
      const result = performUndo(history, currentDoc);

      expect(result!.history.redoStack).toHaveLength(1);
      expect(result!.history.redoStack[0].document.name).toBe('V2');
      expect(result!.history.canRedo).toBe(true);
    });

    it('updates canUndo based on remaining stack', () => {
      const snapshot = createSnapshot(makeDocument(), 'only entry');
      const history: HistoryState = {
        undoStack: [snapshot],
        redoStack: [],
        canUndo: true,
        canRedo: false,
      };

      const result = performUndo(history, makeDocument());
      expect(result!.history.canUndo).toBe(false);
      expect(result!.history.undoStack).toHaveLength(0);
    });

    it('supports multiple undos', () => {
      const history: HistoryState = {
        undoStack: [
          createSnapshot(makeDocument('V1'), 'action 1'),
          createSnapshot(makeDocument('V2'), 'action 2'),
        ],
        redoStack: [],
        canUndo: true,
        canRedo: false,
      };

      const result1 = performUndo(history, makeDocument('V3'));
      expect(result1!.document.name).toBe('V2');
      expect(result1!.history.canUndo).toBe(true);

      const result2 = performUndo(result1!.history, result1!.document);
      expect(result2!.document.name).toBe('V1');
      expect(result2!.history.canUndo).toBe(false);
    });
  });

  describe('performRedo', () => {
    it('returns null when redo stack is empty', () => {
      const result = performRedo(initialHistoryState, makeDocument());
      expect(result).toBeNull();
    });

    it('restores the redo document state', () => {
      const redoSnapshot = createSnapshot(makeDocument('Redo State'), 'undo');
      const history: HistoryState = {
        undoStack: [],
        redoStack: [redoSnapshot],
        canUndo: false,
        canRedo: true,
      };

      const result = performRedo(history, makeDocument('Current'));
      expect(result!.document.name).toBe('Redo State');
    });

    it('pushes current state to undo stack', () => {
      const redoSnapshot = createSnapshot(makeDocument('Redo'), 'undo');
      const history: HistoryState = {
        undoStack: [],
        redoStack: [redoSnapshot],
        canUndo: false,
        canRedo: true,
      };

      const currentDoc = makeDocument('Current');
      const result = performRedo(history, currentDoc);

      expect(result!.history.undoStack).toHaveLength(1);
      expect(result!.history.undoStack[0].document.name).toBe('Current');
      expect(result!.history.canUndo).toBe(true);
    });

    it('updates canRedo based on remaining stack', () => {
      const redoSnapshot = createSnapshot(makeDocument('Redo'), 'undo');
      const history: HistoryState = {
        undoStack: [],
        redoStack: [redoSnapshot],
        canUndo: false,
        canRedo: true,
      };

      const result = performRedo(history, makeDocument());
      expect(result!.history.canRedo).toBe(false);
      expect(result!.history.redoStack).toHaveLength(0);
    });
  });

  describe('undo/redo round-trip', () => {
    it('undo then redo restores the original state', () => {
      const docV1 = makeDocument('V1');
      const docV2 = makeDocument('V2');

      // Simulate: was at V1, did action to get to V2
      const snapshot = createSnapshot(docV1, 'action');
      const history = pushToUndoStack(initialHistoryState, snapshot);

      // Undo: should go back to V1
      const undoResult = performUndo(history, docV2);
      expect(undoResult!.document.name).toBe('V1');

      // Redo: should go back to V2
      const redoResult = performRedo(undoResult!.history, undoResult!.document);
      expect(redoResult!.document.name).toBe('V2');
    });

    it('new action after undo clears redo stack', () => {
      const docV1 = makeDocument('V1');
      const docV2 = makeDocument('V2');

      const snapshot = createSnapshot(docV1, 'action');
      let history = pushToUndoStack(initialHistoryState, snapshot);

      // Undo
      const undoResult = performUndo(history, docV2);
      expect(undoResult!.history.canRedo).toBe(true);

      // New action after undo
      const newSnapshot = createSnapshot(undoResult!.document, 'new action');
      history = pushToUndoStack(undoResult!.history, newSnapshot);

      expect(history.redoStack).toHaveLength(0);
      expect(history.canRedo).toBe(false);
    });
  });
});
