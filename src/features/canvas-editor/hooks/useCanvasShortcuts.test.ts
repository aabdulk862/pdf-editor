import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCanvasStore } from '../store/canvas-store';
import { useCanvasShortcuts } from './useCanvasShortcuts';

// Helper to dispatch keyboard events on document body (has tagName)
function fireKeyDown(key: string, options: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code: options.code ?? `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.body.dispatchEvent(event);
  return event;
}

function fireKeyUp(key: string, options: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent('keyup', {
    key,
    code: options.code ?? `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.body.dispatchEvent(event);
  return event;
}

describe('useCanvasShortcuts', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useCanvasStore.getState();
    store.createDocument('Test');
  });

  afterEach(() => {
    cleanup();
  });

  describe('tool shortcuts', () => {
    it('should set tool to select when V is pressed', () => {
      useCanvasStore.getState().setActiveTool('text');
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('v');
      });

      expect(useCanvasStore.getState().activeTool).toBe('select');
    });

    it('should set tool to text when T is pressed', () => {
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('t');
      });

      expect(useCanvasStore.getState().activeTool).toBe('text');
    });

    it('should set tool to rectangle when R is pressed', () => {
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('r');
      });

      expect(useCanvasStore.getState().activeTool).toBe('rectangle');
    });

    it('should set tool to circle when C is pressed', () => {
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('c');
      });

      expect(useCanvasStore.getState().activeTool).toBe('circle');
    });

    it('should set tool to line when L is pressed', () => {
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('l');
      });

      expect(useCanvasStore.getState().activeTool).toBe('line');
    });

    it('should set tool to image when I is pressed', () => {
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('i');
      });

      expect(useCanvasStore.getState().activeTool).toBe('image');
    });
  });

  describe('action shortcuts', () => {
    it('should delete selected elements on Delete key', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-1']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('Delete', { code: 'Delete' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(0);
    });

    it('should delete selected elements on Backspace key', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-2',
        type: 'shape',
        shapeType: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-2']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('Backspace', { code: 'Backspace' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(0);
    });

    it('should deselect on Escape', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-3',
        type: 'shape',
        shapeType: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-3']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('Escape', { code: 'Escape' });
      });

      expect(useCanvasStore.getState().selection.selectedIds).toHaveLength(0);
    });

    it('should zoom in on + key', () => {
      const initialZoom = useCanvasStore.getState().viewport.zoom;
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('+', { code: 'Equal' });
      });

      expect(useCanvasStore.getState().viewport.zoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out on - key', () => {
      useCanvasStore.getState().setZoom(1.0);
      const initialZoom = useCanvasStore.getState().viewport.zoom;
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('-', { code: 'Minus' });
      });

      expect(useCanvasStore.getState().viewport.zoom).toBeLessThan(initialZoom);
    });
  });

  describe('modifier shortcuts', () => {
    it('should undo on Ctrl+Z', () => {
      const store = useCanvasStore.getState();
      // Make a change to create history
      store.addElement({
        id: 'el-undo',
        type: 'shape',
        shapeType: 'rectangle',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#FF0000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('z', { ctrlKey: true, code: 'KeyZ' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(0);
    });

    it('should redo on Ctrl+Shift+Z', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-redo',
        type: 'shape',
        shapeType: 'rectangle',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#FF0000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.undo();

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('z', { ctrlKey: true, shiftKey: true, code: 'KeyZ' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(1);
    });

    it('should select all on Ctrl+A', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-a1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.addElement({
        id: 'el-a2',
        type: 'shape',
        shapeType: 'circle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 2,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('a', { ctrlKey: true, code: 'KeyA' });
      });

      expect(useCanvasStore.getState().selection.selectedIds).toHaveLength(2);
    });

    it('should duplicate on Ctrl+D', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-dup',
        type: 'shape',
        shapeType: 'rectangle',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-dup']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('d', { ctrlKey: true, code: 'KeyD' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(2);
    });

    it('should copy and paste on Ctrl+C and Ctrl+V', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-copy',
        type: 'shape',
        shapeType: 'rectangle',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-copy']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('c', { ctrlKey: true, code: 'KeyC' });
      });

      act(() => {
        fireKeyDown('v', { ctrlKey: true, code: 'KeyV' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(2);
    });

    it('should save on Ctrl+S', () => {
      const spy = vi.spyOn(useCanvasStore.getState(), 'saveToLocalStorage');
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('s', { ctrlKey: true, code: 'KeyS' });
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should group on Ctrl+G with multiple selected', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-g1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.addElement({
        id: 'el-g2',
        type: 'shape',
        shapeType: 'circle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 2,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });

      renderHook(() => useCanvasShortcuts());

      // Select both elements AFTER hook is rendered
      act(() => {
        useCanvasStore.getState().select(['el-g1', 'el-g2']);
      });

      act(() => {
        fireKeyDown('g', { ctrlKey: true, code: 'KeyG' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      // Should have 1 group element now
      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('group');
    });

    it('should ungroup on Ctrl+Shift+G with group selected', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-ug1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.addElement({
        id: 'el-ug2',
        type: 'shape',
        shapeType: 'circle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 2,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.groupElements(['el-ug1', 'el-ug2']);

      // The group is now selected (groupElements sets selection to the group)
      const groupId = useCanvasStore.getState().selection.selectedIds[0];
      expect(groupId).toBeDefined();

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('g', { ctrlKey: true, shiftKey: true, code: 'KeyG' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      // Should have 2 ungrouped elements
      expect(page.elements).toHaveLength(2);
      expect(page.elements.every((e) => e.type !== 'group')).toBe(true);
    });
  });

  describe('arrow keys', () => {
    it('should move selected element by 1px on arrow key', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-arrow',
        type: 'shape',
        shapeType: 'rectangle',
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-arrow']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('ArrowRight', { code: 'ArrowRight' });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].x).toBe(51);
    });

    it('should move selected element by 10px on Shift+arrow key', () => {
      const store = useCanvasStore.getState();
      store.addElement({
        id: 'el-arrow10',
        type: 'shape',
        shapeType: 'rectangle',
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 100,
        zIndex: 1,
        locked: false,
        visible: true,
        fill: '#000000',
        stroke: '#000000',
        strokeWidth: 1,
        borderStyle: 'solid',
      });
      store.select(['el-arrow10']);

      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown('ArrowDown', { code: 'ArrowDown', shiftKey: true });
      });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].y).toBe(60);
    });
  });

  describe('spacebar pan mode', () => {
    it('should switch to pan tool on space down and restore on space up', () => {
      useCanvasStore.getState().setActiveTool('select');
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown(' ', { code: 'Space' });
      });

      expect(useCanvasStore.getState().activeTool).toBe('pan');

      act(() => {
        fireKeyUp(' ', { code: 'Space' });
      });

      expect(useCanvasStore.getState().activeTool).toBe('select');
    });

    it('should restore the correct previous tool after pan', () => {
      useCanvasStore.getState().setActiveTool('text');
      renderHook(() => useCanvasShortcuts());

      act(() => {
        fireKeyDown(' ', { code: 'Space' });
      });

      expect(useCanvasStore.getState().activeTool).toBe('pan');

      act(() => {
        fireKeyUp(' ', { code: 'Space' });
      });

      expect(useCanvasStore.getState().activeTool).toBe('text');
    });
  });

  describe('shortcut panel toggle', () => {
    it('should call onToggleShortcutPanel when ? is pressed', () => {
      const onToggle = vi.fn();
      renderHook(() => useCanvasShortcuts({ onToggleShortcutPanel: onToggle }));

      act(() => {
        fireKeyDown('?', { code: 'Slash', shiftKey: true });
      });

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('enabled option', () => {
    it('should not respond to shortcuts when disabled', () => {
      useCanvasStore.getState().setActiveTool('select');
      renderHook(() => useCanvasShortcuts({ enabled: false }));

      act(() => {
        fireKeyDown('t');
      });

      expect(useCanvasStore.getState().activeTool).toBe('select');
    });
  });
});
