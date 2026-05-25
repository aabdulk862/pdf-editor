import React, { useCallback, useRef, useState } from 'react';

import { ZOOM_STEP, DEFAULT_TEXT_WIDTH, MM_TO_PX } from '../constants';
import { computeCursor, type CursorStyle } from '../engine/cursor';
import { hitTest, hitTestHandle } from '../engine/hit-test';
import { calculateSnap } from '../engine/snap';
import { screenToDocument, calculateImagePlacement } from '../engine/transform';
import { useCanvasStore } from '../store/canvas-store';
import type {
  CanvasElement,
  CanvasTool,
  ImageElement,
  ResizeHandle,
  ShapeElement,
  ShapeType,
  TextElement,
} from '../types';

// === Types ===

type DragMode = 'move' | 'resize' | 'create' | 'pan' | 'none';

/** Minimum pixels the pointer must move before a drag starts (prevents accidental micro-drags) */
const DRAG_THRESHOLD_PX = 3;

/** Minimum element dimension in mm (prevents elements from becoming unselectable) */
const MIN_ELEMENT_SIZE_MM = 5;

interface DragState {
  isDragging: boolean;
  dragMode: DragMode;
  /** Document-space position at drag start */
  dragStart: { x: number; y: number };
  /** Document-space position of current pointer */
  dragCurrent: { x: number; y: number };
  /** Screen-space position at pointer down (used for threshold check) */
  pointerDownScreen: { x: number; y: number };
  /** Whether the drag threshold has been exceeded and drag is "committed" */
  dragCommitted: boolean;
  /** Element being created during drag-create */
  creatingElement: CanvasElement | null;
  /** Handle being dragged during resize */
  activeHandle: ResizeHandle | null;
  /** Original positions of selected elements at drag start (for move) */
  originalPositions: Map<string, { x: number; y: number }>;
  /** Original size of element at drag start (for resize) */
  originalSize: { width: number; height: number } | null;
  /** Original position of element at drag start (for resize) */
  originalPosition: { x: number; y: number } | null;
  /** Pan start viewport offset */
  panStart: { panX: number; panY: number } | null;
}

/** Accepted image MIME types */
const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/** Max image file size: 10MB */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// === Helper: generate unique ID ===

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// === Helper: determine if tool is a shape tool ===

function isShapeTool(tool: CanvasTool): tool is ShapeType {
  return ['rectangle', 'circle', 'line', 'arrow', 'star', 'polygon'].includes(tool);
}

// === Hook ===

export function useCanvasInput(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [cursorStyle, setCursorStyle] = useState<CursorStyle>('default');
  const [renderTick, setRenderTick] = useState(0);
  const [activeSnapGuides, setActiveSnapGuides] = useState<import('../types').SnapGuide[]>([]);

  /** Ref exposing the ghost element (shape being drag-created) to the renderer */
  const ghostElementRef = useRef<CanvasElement | null>(null);

  /** Callback to enter text editing mode (set by CanvasWorkspace) */
  const onDoubleClickTextRef = useRef<((elementId: string) => void) | null>(null);

  /** Track last pointer-down time and target for double-click detection */
  const lastClickRef = useRef<{ time: number; elementId: string | null }>({
    time: 0,
    elementId: null,
  });

  const dragState = useRef<DragState>({
    isDragging: false,
    dragMode: 'none',
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    pointerDownScreen: { x: 0, y: 0 },
    dragCommitted: false,
    creatingElement: null,
    activeHandle: null,
    originalPositions: new Map(),
    originalSize: null,
    originalPosition: null,
    panStart: null,
  });

  // Helper to get canvas-relative pointer position
  const getCanvasPoint = useCallback(
    (e: React.PointerEvent | PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: e.clientX, y: e.clientY };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [canvasRef],
  );

  // === onPointerDown ===

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const store = useCanvasStore.getState();
      const { activeTool, viewport, selection, document: doc } = store;

      if (!doc) return;

      const page = doc.pages[doc.activePageIndex];
      if (!page) return;

      const screenPoint = getCanvasPoint(e);
      const docPoint = screenToDocument(screenPoint, viewport);

      const state = dragState.current;
      state.dragStart = docPoint;
      state.dragCurrent = docPoint;
      state.pointerDownScreen = screenPoint;
      state.dragCommitted = false;

      switch (activeTool) {
        case 'select': {
          // First check if clicking on a resize/rotate handle
          const handle = hitTestHandle(screenPoint, selection, viewport);
          if (handle && handle !== 'rotate') {
            // Start resize
            state.isDragging = true;
            state.dragMode = 'resize';
            state.activeHandle = handle as ResizeHandle;

            // Store original size and position of the first selected element
            const selectedEl = page.elements.find((el) => el.id === selection.selectedIds[0]);
            if (selectedEl) {
              state.originalSize = { width: selectedEl.width, height: selectedEl.height };
              state.originalPosition = { x: selectedEl.x, y: selectedEl.y };
              state.originalPositions = new Map();
              state.originalPositions.set(selectedEl.id, { x: selectedEl.x, y: selectedEl.y });
            }

            // Capture pre-drag snapshot for history
            store.beginDrag();
            break;
          }

          // Hit test for element selection
          const hitElement = hitTest(screenPoint, page.elements, viewport);

          if (hitElement) {
            // Double-click detection: enter text editing mode
            const now = Date.now();
            const lastClick = lastClickRef.current;
            if (
              hitElement.type === 'text' &&
              hitElement.id === lastClick.elementId &&
              now - lastClick.time < 400
            ) {
              // Double-click on a text element — enter inline editing
              onDoubleClickTextRef.current?.(hitElement.id);
              lastClickRef.current = { time: 0, elementId: null };
              break;
            }
            lastClickRef.current = { time: now, elementId: hitElement.id };

            // Select the element if not already selected
            if (!selection.selectedIds.includes(hitElement.id)) {
              if (e.shiftKey) {
                // Multi-select with shift
                store.select([...selection.selectedIds, hitElement.id]);
              } else {
                store.select([hitElement.id]);
              }
            }

            // Prevent move drag on locked elements
            if (hitElement.locked) break;

            // Start move drag
            state.isDragging = true;
            state.dragMode = 'move';
            state.originalPositions = new Map();

            // Store original positions of all selected elements
            const selectedIds = useCanvasStore.getState().selection.selectedIds;
            for (const id of selectedIds) {
              const el = page.elements.find((elem) => elem.id === id);
              if (el) {
                state.originalPositions.set(id, { x: el.x, y: el.y });
              }
            }

            // Capture pre-drag snapshot for history
            store.beginDrag();
          } else {
            // Clicked on empty space — deselect
            store.deselect();
          }
          break;
        }

        case 'text': {
          // Create a text element at click position
          // DEFAULT_TEXT_WIDTH is in px; convert to mm for document coordinates
          const textWidthMm = DEFAULT_TEXT_WIDTH / MM_TO_PX;
          const textHeightMm = 30 / MM_TO_PX;
          const textElement: TextElement = {
            id: generateId(),
            type: 'text',
            x: docPoint.x,
            y: docPoint.y,
            width: textWidthMm,
            height: textHeightMm,
            rotation: 0,
            opacity: 100,
            zIndex: page.elements.length,
            locked: false,
            visible: true,
            content: 'Type here',
            fontFamily: 'Inter',
            fontSize: 16,
            fontColor: '#000000',
            bold: false,
            italic: false,
            underline: false,
            alignment: 'left',
          };

          store.addElement(textElement);
          store.select([textElement.id]);
          store.setActiveTool('select');

          // Immediately enter text editing mode for the new element
          onDoubleClickTextRef.current?.(textElement.id);
          break;
        }

        case 'image': {
          // Trigger file picker
          triggerImageUpload(viewport, canvasRef.current);
          break;
        }

        case 'pan': {
          // Start panning
          state.isDragging = true;
          state.dragMode = 'pan';
          state.panStart = { panX: viewport.panX, panY: viewport.panY };
          // Use screen coordinates for pan delta calculation
          state.dragStart = screenPoint;
          state.dragCurrent = screenPoint;
          setCursorStyle('grabbing');
          break;
        }

        case 'crop': {
          // Enter crop mode: select the image element under cursor
          const cropTarget = hitTest(screenPoint, page.elements, viewport);
          if (cropTarget && cropTarget.type === 'image') {
            store.select([cropTarget.id]);
          }
          break;
        }

        default: {
          // Shape tools: start drag-create
          if (isShapeTool(activeTool)) {
            state.isDragging = true;
            state.dragMode = 'create';

            const shapeElement: ShapeElement = {
              id: generateId(),
              type: 'shape',
              shapeType: activeTool as ShapeType,
              x: docPoint.x,
              y: docPoint.y,
              width: 0,
              height: 0,
              rotation: 0,
              opacity: 100,
              zIndex: page.elements.length,
              locked: false,
              visible: true,
              fill: '#4A90D9',
              stroke: '#2C5F8A',
              strokeWidth: 2,
              borderStyle: 'solid',
            };

            state.creatingElement = shapeElement;
          }
          break;
        }
      }

      // Capture pointer for drag tracking
      if (state.isDragging) {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [canvasRef, getCanvasPoint],
  );

  // === onPointerMove ===

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const state = dragState.current;
      const store = useCanvasStore.getState();
      const { viewport, document, snapEnabled, gridSpacing, activeTool, selection } = store;

      if (!document) return;

      const page = document.pages[document.activePageIndex];
      if (!page) return;

      const screenPoint = getCanvasPoint(e);

      // If not dragging, compute cursor based on hover state
      if (!state.isDragging) {
        const hoverElement = hitTest(screenPoint, page.elements, viewport);
        const hoverHandle = hitTestHandle(screenPoint, selection, viewport);

        const cursor = computeCursor({
          activeTool,
          hoverElement,
          hoverHandle,
          isDragging: false,
          dragMode: 'none',
        });
        setCursorStyle(cursor);
        return;
      }

      // --- Drag threshold check ---
      // For move and resize, require the pointer to move at least DRAG_THRESHOLD_PX
      // before committing the drag. This prevents accidental micro-drags on click.
      if (!state.dragCommitted && (state.dragMode === 'move' || state.dragMode === 'resize')) {
        const dx = screenPoint.x - state.pointerDownScreen.x;
        const dy = screenPoint.y - state.pointerDownScreen.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < DRAG_THRESHOLD_PX) {
          return; // Not yet past threshold — don't start visual drag
        }
        state.dragCommitted = true;
      }

      // Update cursor during drag operations
      if (state.dragMode === 'move') {
        setCursorStyle('grabbing');
      } else if (state.dragMode === 'pan') {
        setCursorStyle('grabbing');
      } else if (state.dragMode === 'resize' && state.activeHandle) {
        // Keep the resize cursor during resize drag
        const resizeCursor = computeCursor({
          activeTool: 'select',
          hoverElement: null,
          hoverHandle: state.activeHandle,
          isDragging: true,
          dragMode: 'resize',
        });
        setCursorStyle(resizeCursor);
      }

      switch (state.dragMode) {
        case 'move': {
          const docPoint = screenToDocument(screenPoint, viewport);
          state.dragCurrent = docPoint;

          const deltaX = docPoint.x - state.dragStart.x;
          const deltaY = docPoint.y - state.dragStart.y;

          // Move each selected element with snap
          const selectedIds = store.selection.selectedIds;
          let allGuides: import('../types').SnapGuide[] = [];
          for (const id of selectedIds) {
            const originalPos = state.originalPositions.get(id);
            if (!originalPos) continue;

            const el = page.elements.find((elem) => elem.id === id);
            if (!el) continue;

            const newPos = { x: originalPos.x + deltaX, y: originalPos.y + deltaY };

            // Apply snap
            const otherElements = page.elements.filter((elem) => !selectedIds.includes(elem.id));
            const snapResult = calculateSnap(
              newPos,
              { width: el.width, height: el.height },
              otherElements,
              gridSpacing,
              snapEnabled,
            );

            // Collect snap guides
            if (snapResult.guides.length > 0) {
              allGuides = snapResult.guides;
            }

            // Use silent update to avoid flooding history during drag
            store.updateElementSilent(id, {
              x: snapResult.snappedX,
              y: snapResult.snappedY,
            } as Partial<CanvasElement>);
          }
          setActiveSnapGuides(allGuides);
          break;
        }

        case 'resize': {
          const docPoint = screenToDocument(screenPoint, viewport);
          state.dragCurrent = docPoint;

          const selectedId = store.selection.selectedIds[0];
          if (!selectedId || !state.originalSize || !state.activeHandle) break;

          const originalPos = state.originalPositions.get(selectedId);
          if (!originalPos) break;

          const deltaX = docPoint.x - state.dragStart.x;
          const deltaY = docPoint.y - state.dragStart.y;

          const handle = state.activeHandle;
          const shiftHeld = e.shiftKey;
          const altHeld = e.altKey;

          // Calculate new size based on handle direction
          let newWidth = state.originalSize.width;
          let newHeight = state.originalSize.height;
          let newX = originalPos.x;
          let newY = originalPos.y;

          // East handles: width increases with positive deltaX
          if (handle.includes('e')) newWidth += deltaX;
          // West handles: width decreases with positive deltaX, position moves right
          if (handle.includes('w')) {
            newWidth -= deltaX;
            newX += deltaX;
          }
          // South handles: height increases with positive deltaY
          if (handle.includes('s')) newHeight += deltaY;
          // North handles: height decreases with positive deltaY, position moves down
          if (handle.includes('n')) {
            newHeight -= deltaY;
            newY += deltaY;
          }

          // --- Aspect ratio lock ---
          // For images: lock aspect ratio by default, Shift UNLOCKS it.
          // For shapes/text: Shift LOCKS aspect ratio (original behavior).
          // If the image has aspectRatioLocked: true, always lock regardless of Shift.
          const selectedElement = page.elements.find((el) => el.id === selectedId);
          const isImage = selectedElement?.type === 'image';
          const imageAlwaysLocked =
            isImage && (selectedElement as import('../types').ImageElement).aspectRatioLocked;
          const shouldLockAspect = imageAlwaysLocked ? true : isImage ? !shiftHeld : shiftHeld;

          if (shouldLockAspect && state.originalSize.width > 0 && state.originalSize.height > 0) {
            const aspectRatio = state.originalSize.width / state.originalSize.height;

            if (handle === 'n' || handle === 's') {
              // Vertical-only handle: derive width from height
              newWidth = newHeight * aspectRatio;
              // Center horizontally relative to original center
              const originalCenterX = originalPos.x + state.originalSize.width / 2;
              newX = originalCenterX - newWidth / 2;
            } else if (handle === 'e' || handle === 'w') {
              // Horizontal-only handle: derive height from width
              newHeight = newWidth / aspectRatio;
              // Center vertically relative to original center
              const originalCenterY = originalPos.y + state.originalSize.height / 2;
              newY = originalCenterY - newHeight / 2;
            } else {
              // Corner handle: use dominant axis
              const absDeltaX = Math.abs(deltaX);
              const absDeltaY = Math.abs(deltaY);

              if (absDeltaX >= absDeltaY) {
                // Width is dominant — derive height
                newHeight = newWidth / aspectRatio;
              } else {
                // Height is dominant — derive width
                newWidth = newHeight * aspectRatio;
              }

              // Recalculate position for handles that affect position
              if (handle === 'nw') {
                newX = originalPos.x + state.originalSize.width - newWidth;
                newY = originalPos.y + state.originalSize.height - newHeight;
              } else if (handle === 'ne') {
                newY = originalPos.y + state.originalSize.height - newHeight;
              } else if (handle === 'sw') {
                newX = originalPos.x + state.originalSize.width - newWidth;
              }
              // 'se' doesn't change position
            }
          }

          // --- Alt/Option: Resize from center ---
          if (altHeld) {
            const originalCenterX = originalPos.x + state.originalSize.width / 2;
            const originalCenterY = originalPos.y + state.originalSize.height / 2;
            newX = originalCenterX - newWidth / 2;
            newY = originalCenterY - newHeight / 2;
          }

          // --- Enforce minimum size (5mm) ---
          if (newWidth < MIN_ELEMENT_SIZE_MM) {
            if (handle.includes('w') && !altHeld) {
              newX += newWidth - MIN_ELEMENT_SIZE_MM;
            }
            newWidth = MIN_ELEMENT_SIZE_MM;
            if (altHeld) {
              const originalCenterX = originalPos.x + state.originalSize.width / 2;
              newX = originalCenterX - newWidth / 2;
            }
          }
          if (newHeight < MIN_ELEMENT_SIZE_MM) {
            if (handle.includes('n') && !altHeld) {
              newY += newHeight - MIN_ELEMENT_SIZE_MM;
            }
            newHeight = MIN_ELEMENT_SIZE_MM;
            if (altHeld) {
              const originalCenterY = originalPos.y + state.originalSize.height / 2;
              newY = originalCenterY - newHeight / 2;
            }
          }

          // Use silent update to avoid flooding history during drag
          store.updateElementSilent(selectedId, {
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY,
          } as Partial<CanvasElement>);
          break;
        }

        case 'create': {
          const docPoint = screenToDocument(screenPoint, viewport);
          state.dragCurrent = docPoint;

          if (state.creatingElement) {
            // Update dimensions based on drag distance
            const width = Math.abs(docPoint.x - state.dragStart.x);
            const height = Math.abs(docPoint.y - state.dragStart.y);
            const x = Math.min(docPoint.x, state.dragStart.x);
            const y = Math.min(docPoint.y, state.dragStart.y);

            state.creatingElement = {
              ...state.creatingElement,
              x,
              y,
              width,
              height,
            };

            // Sync ghost element ref and trigger re-render for live preview
            ghostElementRef.current = state.creatingElement;
            setRenderTick((t) => t + 1);
          }
          break;
        }

        case 'pan': {
          state.dragCurrent = screenPoint;

          if (state.panStart) {
            const deltaX = (screenPoint.x - state.dragStart.x) / viewport.zoom;
            const deltaY = (screenPoint.y - state.dragStart.y) / viewport.zoom;

            // Pan is inverse of drag direction
            store.setZoom(viewport.zoom); // no-op to avoid stale state
            const currentStore = useCanvasStore.getState();
            // Directly set pan values based on original + delta
            const newPanX = state.panStart.panX - deltaX;
            const newPanY = state.panStart.panY - deltaY;

            // Use pan action with absolute delta from current
            const panDeltaX = newPanX - currentStore.viewport.panX;
            const panDeltaY = newPanY - currentStore.viewport.panY;
            if (panDeltaX !== 0 || panDeltaY !== 0) {
              store.pan(panDeltaX, panDeltaY);
            }
          }
          break;
        }
      }
    },
    [getCanvasPoint],
  );

  // === onPointerUp ===

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = dragState.current;
    if (!state.isDragging) return;

    const store = useCanvasStore.getState();

    // If drag threshold was never exceeded, treat as a click (no-op for drag)
    const wasCommitted =
      state.dragCommitted || state.dragMode === 'pan' || state.dragMode === 'create';

    switch (state.dragMode) {
      case 'move': {
        if (wasCommitted) {
          // Finalize move — commit single history entry for the entire drag
          store.endDrag();
        } else {
          // Threshold not met — cancel the drag, no history entry
          // Restore original positions
          const page = store.document?.pages[store.document.activePageIndex];
          if (page) {
            for (const [id, pos] of state.originalPositions) {
              store.updateElementSilent(id, { x: pos.x, y: pos.y } as Partial<CanvasElement>);
            }
          }
          // Discard the drag snapshot without pushing to history
          useCanvasStore.setState({ dragSnapshot: null, isDragging: false });
        }
        break;
      }

      case 'resize': {
        if (wasCommitted) {
          // Finalize resize — commit single history entry for the entire drag
          store.endDrag();
        } else {
          // Threshold not met — restore original size/position
          const selectedId = store.selection.selectedIds[0];
          if (selectedId && state.originalSize && state.originalPosition) {
            store.updateElementSilent(selectedId, {
              width: state.originalSize.width,
              height: state.originalSize.height,
              x: state.originalPosition.x,
              y: state.originalPosition.y,
            } as Partial<CanvasElement>);
          }
          useCanvasStore.setState({ dragSnapshot: null, isDragging: false });
        }
        break;
      }

      case 'create': {
        // Commit the created element if it has meaningful size
        if (state.creatingElement) {
          const el = state.creatingElement;
          if (el.width > 1 && el.height > 1) {
            store.addElement(el);
            store.select([el.id]);
          }
          state.creatingElement = null;
          ghostElementRef.current = null;
        }
        // Switch back to select tool after creation
        store.setActiveTool('select');
        break;
      }

      case 'pan': {
        // Pan is already applied continuously
        break;
      }
    }

    // Reset drag state
    state.isDragging = false;
    state.dragMode = 'none';
    state.activeHandle = null;
    state.originalPositions = new Map();
    state.originalSize = null;
    state.originalPosition = null;
    state.panStart = null;
    state.dragCommitted = false;

    // Clear snap guides
    setActiveSnapGuides([]);

    // Reset cursor to reflect current tool state
    const currentStore = useCanvasStore.getState();
    setCursorStyle(
      computeCursor({
        activeTool: currentStore.activeTool,
        hoverElement: null,
        hoverHandle: null,
        isDragging: false,
        dragMode: 'none',
      }),
    );

    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // === onWheel ===

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    const store = useCanvasStore.getState();

    // Ctrl/Cmd + wheel → zoom
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      // Zoom by ZOOM_STEP increments
      const direction = e.deltaY < 0 ? 1 : -1;
      const delta = direction * ZOOM_STEP;

      store.zoomBy(delta);
    } else {
      // Plain wheel → vertical scroll/pan
      e.preventDefault();

      const { viewport } = store;
      // Convert pixel delta to document-space delta
      const panDeltaX = e.deltaX / viewport.zoom;
      const panDeltaY = e.deltaY / viewport.zoom;

      store.pan(panDeltaX, panDeltaY);
    }
  }, []);

  // === Escape key to cancel drag ===

  const cancelDrag = useCallback(() => {
    const state = dragState.current;
    if (!state.isDragging) return;

    const store = useCanvasStore.getState();

    switch (state.dragMode) {
      case 'move': {
        // Restore original positions of all selected elements
        for (const [id, pos] of state.originalPositions) {
          store.updateElementSilent(id, { x: pos.x, y: pos.y } as Partial<CanvasElement>);
        }
        // Discard drag snapshot without pushing to history
        useCanvasStore.setState({ dragSnapshot: null, isDragging: false });
        break;
      }

      case 'resize': {
        // Restore original size and position
        const selectedId = store.selection.selectedIds[0];
        if (selectedId && state.originalSize) {
          const originalPos = state.originalPositions.get(selectedId);
          if (originalPos) {
            store.updateElementSilent(selectedId, {
              width: state.originalSize.width,
              height: state.originalSize.height,
              x: originalPos.x,
              y: originalPos.y,
            } as Partial<CanvasElement>);
          }
        }
        useCanvasStore.setState({ dragSnapshot: null, isDragging: false });
        break;
      }

      case 'create': {
        // Discard the element being created
        state.creatingElement = null;
        ghostElementRef.current = null;
        setRenderTick((t) => t + 1);
        break;
      }

      case 'pan': {
        // Restore original pan position
        if (state.panStart) {
          const currentStore = useCanvasStore.getState();
          const panDeltaX = state.panStart.panX - currentStore.viewport.panX;
          const panDeltaY = state.panStart.panY - currentStore.viewport.panY;
          if (panDeltaX !== 0 || panDeltaY !== 0) {
            store.pan(panDeltaX, panDeltaY);
          }
        }
        break;
      }
    }

    // Reset drag state
    state.isDragging = false;
    state.dragMode = 'none';
    state.activeHandle = null;
    state.originalPositions = new Map();
    state.originalSize = null;
    state.originalPosition = null;
    state.panStart = null;
    state.dragCommitted = false;

    // Clear snap guides
    setActiveSnapGuides([]);

    // Reset cursor
    const currentStore = useCanvasStore.getState();
    setCursorStyle(
      computeCursor({
        activeTool: currentStore.activeTool,
        hoverElement: null,
        hoverHandle: null,
        isDragging: false,
        dragMode: 'none',
      }),
    );
  }, []);

  // Listen for Escape key to cancel active drag operations
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragState.current.isDragging) {
        e.preventDefault();
        cancelDrag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrag]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    cursorStyle,
    ghostElementRef,
    renderTick,
    onDoubleClickTextRef,
    activeSnapGuides,
  };
}

// === Image Upload Helper ===

function triggerImageUpload(
  _viewport: { panX: number; panY: number; zoom: number },
  canvas: HTMLCanvasElement | null,
) {
  const input = window.document.createElement('input');
  input.type = 'file';
  input.accept = ACCEPTED_IMAGE_TYPES.join(',');

  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      // eslint-disable-next-line no-console
      console.warn('Invalid image type:', file.type);
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      // eslint-disable-next-line no-console
      console.warn('Image file too large:', file.size);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        const store = useCanvasStore.getState();
        const currentViewport = store.viewport;
        const document = store.document;
        if (!document) return;

        const page = document.pages[document.activePageIndex];
        if (!page) return;

        // Calculate viewport size from canvas element
        const viewportSize = canvas
          ? { width: canvas.clientWidth, height: canvas.clientHeight }
          : { width: 800, height: 600 };

        // Use calculateImagePlacement for positioning
        const placement = calculateImagePlacement(
          { width: img.naturalWidth, height: img.naturalHeight },
          viewportSize,
          currentViewport,
        );

        const imageElement: ImageElement = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          type: 'image',
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          rotation: 0,
          opacity: 100,
          zIndex: page.elements.length,
          locked: false,
          visible: true,
          src,
          originalWidth: img.naturalWidth,
          originalHeight: img.naturalHeight,
          aspectRatioLocked: true,
        };

        store.addElement(imageElement);
        store.select([imageElement.id]);
        store.setActiveTool('select');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  input.click();
}
