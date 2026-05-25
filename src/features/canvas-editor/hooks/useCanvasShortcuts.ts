import { useEffect, useRef } from 'react';

import { ZOOM_STEP } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import type { CanvasTool } from '../types';

/**
 * Detects whether the current platform is macOS.
 * On macOS, we use metaKey (Cmd) as the primary modifier.
 * On Windows/Linux, we use ctrlKey (Ctrl).
 */
function isMacPlatform(): boolean {
  // navigator.platform is deprecated but widely supported;
  // fall back to userAgentData or userAgent
  if (typeof navigator !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('userAgentData' in navigator && (navigator as any).userAgentData?.platform) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (navigator as any).userAgentData.platform === 'macOS';
    }
    if (navigator.platform) {
      return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    }
    return /Mac/.test(navigator.userAgent);
  }
  return false;
}

/**
 * Returns true if the platform-appropriate modifier key is held.
 * macOS: metaKey (Cmd), Windows/Linux: ctrlKey (Ctrl)
 */
function hasPlatformModifier(e: KeyboardEvent, isMac: boolean): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

/**
 * Checks if the event target is an input element where we should
 * NOT intercept keyboard shortcuts (text inputs, textareas, contenteditable).
 */
function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  if (!tagName) return false;
  if (tagName === 'input' || tagName === 'textarea') return true;
  if (target.isContentEditable) return true;
  return false;
}

interface UseCanvasShortcutsOptions {
  /** Callback to toggle the keyboard shortcut reference panel */
  onToggleShortcutPanel?: () => void;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook that registers document-level keyboard event listeners for canvas shortcuts.
 *
 * Tool shortcuts: V (select), T (text), R (rectangle), C (circle), L (line), I (image upload)
 * Action shortcuts: Delete/Backspace (delete selected), Escape (deselect), +/- (zoom)
 * Modifier shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo), Ctrl+A (select all),
 *   Ctrl+D (duplicate), Ctrl+G (group), Ctrl+Shift+G (ungroup),
 *   Ctrl+C (copy), Ctrl+V (paste), Ctrl+S (save)
 * Arrow keys: 1px move (10px with Shift)
 * Spacebar: hold for pan mode
 * "?" key: toggle shortcut reference panel
 *
 * Handles macOS Cmd vs Windows/Linux Ctrl automatically.
 */
export function useCanvasShortcuts(options: UseCanvasShortcutsOptions = {}): void {
  const { onToggleShortcutPanel, enabled = true } = options;

  // Store the previous tool before spacebar pan mode
  const previousToolRef = useRef<CanvasTool | null>(null);
  const spaceHeldRef = useRef(false);
  const isMacRef = useRef(false);

  useEffect(() => {
    isMacRef.current = isMacPlatform();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = isMacRef.current;
      const hasModifier = hasPlatformModifier(e, isMac);

      // Don't intercept shortcuts when typing in inputs
      // Exception: modifier shortcuts (Ctrl+S, Ctrl+Z, etc.) should still work
      if (isEditableTarget(e) && !hasModifier) return;

      // === Spacebar: hold for pan mode ===
      if (e.code === 'Space' && !hasModifier && !e.shiftKey && !isEditableTarget(e)) {
        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true;
          const currentTool = useCanvasStore.getState().activeTool;
          if (currentTool !== 'pan') {
            previousToolRef.current = currentTool;
            useCanvasStore.getState().setActiveTool('pan');
          }
        }
        e.preventDefault();
        return;
      }

      // === Modifier shortcuts (Ctrl/Cmd + key) ===
      if (hasModifier) {
        const key = e.key.toLowerCase();

        // Ctrl+Shift+Z: Redo
        if (key === 'z' && e.shiftKey) {
          e.preventDefault();
          useCanvasStore.getState().redo();
          return;
        }

        // Ctrl+Z: Undo
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          useCanvasStore.getState().undo();
          return;
        }

        // Ctrl+Shift+G: Ungroup
        if (key === 'g' && e.shiftKey) {
          e.preventDefault();
          const state = useCanvasStore.getState();
          const { selectedIds } = state.selection;
          if (selectedIds.length === 1) {
            state.ungroupElement(selectedIds[0]);
          }
          return;
        }

        // Ctrl+G: Group
        if (key === 'g' && !e.shiftKey) {
          e.preventDefault();
          const state = useCanvasStore.getState();
          const { selectedIds } = state.selection;
          if (selectedIds.length >= 2) {
            state.groupElements(selectedIds);
          }
          return;
        }

        // Ctrl+A: Select all
        if (key === 'a') {
          e.preventDefault();
          useCanvasStore.getState().selectAll();
          return;
        }

        // Ctrl+D: Duplicate
        if (key === 'd') {
          e.preventDefault();
          const state = useCanvasStore.getState();
          const { selectedIds } = state.selection;
          if (selectedIds.length > 0) {
            state.duplicateElements(selectedIds);
          }
          return;
        }

        // Ctrl+C: Copy
        if (key === 'c') {
          e.preventDefault();
          useCanvasStore.getState().copy();
          return;
        }

        // Ctrl+V: Paste
        if (key === 'v') {
          e.preventDefault();
          useCanvasStore.getState().paste();
          return;
        }

        // Ctrl+S: Save
        if (key === 's') {
          e.preventDefault();
          useCanvasStore.getState().saveToLocalStorage();
          return;
        }

        return;
      }

      // === Non-modifier shortcuts (only when not in editable target) ===
      if (isEditableTarget(e)) return;

      const key = e.key;

      // === "?" key: toggle shortcut panel ===
      if (key === '?') {
        e.preventDefault();
        onToggleShortcutPanel?.();
        return;
      }

      // === Tool shortcuts ===
      switch (key.toLowerCase()) {
        case 'v':
          e.preventDefault();
          useCanvasStore.getState().setActiveTool('select');
          return;
        case 't':
          e.preventDefault();
          useCanvasStore.getState().setActiveTool('text');
          return;
        case 'r':
          e.preventDefault();
          useCanvasStore.getState().setActiveTool('rectangle');
          return;
        case 'c':
          e.preventDefault();
          useCanvasStore.getState().setActiveTool('circle');
          return;
        case 'l':
          e.preventDefault();
          useCanvasStore.getState().setActiveTool('line');
          return;
        case 'i':
          e.preventDefault();
          useCanvasStore.getState().setActiveTool('image');
          return;
      }

      // === Delete/Backspace: delete selected elements ===
      if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault();
        const state = useCanvasStore.getState();
        const { selectedIds } = state.selection;
        if (selectedIds.length > 0) {
          state.removeElements(selectedIds);
        }
        return;
      }

      // === Escape: deselect ===
      if (key === 'Escape') {
        e.preventDefault();
        useCanvasStore.getState().deselect();
        return;
      }

      // === +/- (or =/−): zoom in/out ===
      if (key === '+' || key === '=') {
        e.preventDefault();
        useCanvasStore.getState().zoomBy(ZOOM_STEP);
        return;
      }
      if (key === '-' || key === '_') {
        e.preventDefault();
        useCanvasStore.getState().zoomBy(-ZOOM_STEP);
        return;
      }

      // === Arrow keys: move selected elements ===
      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
        const state = useCanvasStore.getState();
        const { selectedIds } = state.selection;
        if (selectedIds.length === 0) return;

        const step = e.shiftKey ? 10 : 1;
        let deltaX = 0;
        let deltaY = 0;

        switch (key) {
          case 'ArrowUp':
            deltaY = -step;
            break;
          case 'ArrowDown':
            deltaY = step;
            break;
          case 'ArrowLeft':
            deltaX = -step;
            break;
          case 'ArrowRight':
            deltaX = step;
            break;
        }

        state.moveElements(selectedIds, deltaX, deltaY);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // === Spacebar release: restore previous tool ===
      if (e.code === 'Space' && spaceHeldRef.current) {
        spaceHeldRef.current = false;
        if (previousToolRef.current !== null) {
          useCanvasStore.getState().setActiveTool(previousToolRef.current);
          previousToolRef.current = null;
        }
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onToggleShortcutPanel]);
}
