import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { UndoRedoControls } from './UndoRedoControls';
import { useHistoryStore } from '../../store/history';

describe('UndoRedoControls', () => {
  beforeEach(() => {
    // Reset the store between tests
    useHistoryStore.setState({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    });
  });

  describe('button disabled states', () => {
    it('disables both buttons when stacks are empty', () => {
      render(<UndoRedoControls />);

      const undoBtn = screen.getByLabelText('Undo');
      const redoBtn = screen.getByLabelText('Redo');

      expect(undoBtn).toBeDisabled();
      expect(redoBtn).toBeDisabled();
    });

    it('enables undo button when undo stack has entries', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });

      render(<UndoRedoControls />);

      const undoBtn = screen.getByLabelText('Undo');
      const redoBtn = screen.getByLabelText('Redo');

      expect(undoBtn).not.toBeDisabled();
      expect(redoBtn).toBeDisabled();
    });

    it('enables redo button after an undo', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });
      useHistoryStore.getState().undo();

      render(<UndoRedoControls />);

      const undoBtn = screen.getByLabelText('Undo');
      const redoBtn = screen.getByLabelText('Redo');

      expect(undoBtn).toBeDisabled();
      expect(redoBtn).not.toBeDisabled();
    });
  });

  describe('button click actions', () => {
    it('calls undo when undo button is clicked', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });

      render(<UndoRedoControls />);

      const undoBtn = screen.getByLabelText('Undo');
      fireEvent.click(undoBtn);

      expect(useHistoryStore.getState().canUndo).toBe(false);
      expect(useHistoryStore.getState().canRedo).toBe(true);
    });

    it('calls redo when redo button is clicked', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });
      useHistoryStore.getState().undo();

      render(<UndoRedoControls />);

      const redoBtn = screen.getByLabelText('Redo');
      fireEvent.click(redoBtn);

      expect(useHistoryStore.getState().canUndo).toBe(true);
      expect(useHistoryStore.getState().canRedo).toBe(false);
    });
  });

  describe('keyboard shortcuts', () => {
    it('triggers undo on Ctrl+Z', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });

      render(<UndoRedoControls />);

      act(() => {
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      });

      expect(useHistoryStore.getState().canUndo).toBe(false);
      expect(useHistoryStore.getState().canRedo).toBe(true);
    });

    it('triggers undo on Cmd+Z (macOS)', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });

      render(<UndoRedoControls />);

      act(() => {
        fireEvent.keyDown(window, { key: 'z', metaKey: true });
      });

      expect(useHistoryStore.getState().canUndo).toBe(false);
      expect(useHistoryStore.getState().canRedo).toBe(true);
    });

    it('triggers redo on Ctrl+Y', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });
      useHistoryStore.getState().undo();

      render(<UndoRedoControls />);

      act(() => {
        fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      });

      expect(useHistoryStore.getState().canUndo).toBe(true);
      expect(useHistoryStore.getState().canRedo).toBe(false);
    });

    it('triggers redo on Cmd+Shift+Z (macOS)', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });
      useHistoryStore.getState().undo();

      render(<UndoRedoControls />);

      act(() => {
        fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
      });

      expect(useHistoryStore.getState().canUndo).toBe(true);
      expect(useHistoryStore.getState().canRedo).toBe(false);
    });

    it('does not trigger undo on Ctrl+Shift+Z (that is redo)', () => {
      useHistoryStore.getState().pushOperation({
        id: '1',
        type: 'rotate',
        timestamp: Date.now(),
        previousState: new ArrayBuffer(0),
        currentState: new ArrayBuffer(0),
        description: 'Rotate pages',
      });

      render(<UndoRedoControls />);

      act(() => {
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      });

      // Shift+Z triggers redo, not undo. Since redo stack is empty, nothing happens.
      expect(useHistoryStore.getState().canUndo).toBe(true);
      expect(useHistoryStore.getState().canRedo).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('has a toolbar role with appropriate label', () => {
      render(<UndoRedoControls />);

      expect(screen.getByRole('toolbar', { name: 'Undo and redo controls' })).toBeInTheDocument();
    });

    it('buttons have accessible labels', () => {
      render(<UndoRedoControls />);

      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
      expect(screen.getByLabelText('Redo')).toBeInTheDocument();
    });
  });
});
