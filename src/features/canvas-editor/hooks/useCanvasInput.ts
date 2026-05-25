import { useCallback, useRef, useState } from 'react';

import { ZOOM_STEP, DEFAULT_TEXT_WIDTH } from '../constants';
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

interface DragState {
  isDragging: boolean;
  dragMode: DragMode;
  dragStart: { x: number; y: number };
  dragCurrent: { x: number; y: number };
  /** Element being created during drag-create */
  creatingElement: CanvasElement | null;
  /** Handle being dragged during resize */
  activeHandle: ResizeHandle | null;
  /** Original positions of selected elements at drag start (for move) */
  originalPositions: Map<string, { x: number; y: number }>;
  /** Original size of element at drag start (for resize) */
  originalSize: { width: number; height: number } | null;
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

  /** Ref exposing the ghost element (shape being drag-created) to the renderer */
  const ghostElementRef = useRef<CanvasElement | null>(null);

  const dragState = useRef<DragState>({
    isDragging: false,
    dragMode: 'none',
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    creatingElement: null,
    activeHandle: null,
    originalPositions: new Map(),
    originalSize: null,
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

      switch (activeTool) {
        case 'select': {
          // First check if clicking on a resize/rotate handle
          const handle = hitTestHandle(screenPoint, selection, viewport);
          if (handle && handle !== 'rotate') {
            // Start resize
            state.isDragging = true;
            state.dragMode = 'resize';
            state.activeHandle = handle as ResizeHandle;

            // Store original size of the first selected element
            const selectedEl = page.elements.find((el) => el.id === selection.selectedIds[0]);
            if (selectedEl) {
              state.originalSize = { width: selectedEl.width, height: selectedEl.height };
            }

            // Capture pre-drag snapshot for history
            store.beginDrag();
            break;
          }

          // Hit test for element selection
          const hitElement = hitTest(screenPoint, page.elements, viewport);

          if (hitElement) {
            // Select the element if not already selected
            if (!selection.selectedIds.includes(hitElement.id)) {
              if (e.shiftKey) {
                // Multi-select with shift
                store.select([...selection.selectedIds, hitElement.id]);
              } else {
                store.select([hitElement.id]);
              }
            }

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
          const textElement: TextElement = {
            id: generateId(),
            type: 'text',
            x: docPoint.x,
            y: docPoint.y,
            width: DEFAULT_TEXT_WIDTH,
            height: 30,
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

      // Update cursor during drag operations
      if (state.dragMode === 'pan') {
        setCursorStyle('grabbing');
      }

      switch (state.dragMode) {
        case 'move': {
          const docPoint = screenToDocument(screenPoint, viewport);
          state.dragCurrent = docPoint;

          const deltaX = docPoint.x - state.dragStart.x;
          const deltaY = docPoint.y - state.dragStart.y;

          // Move each selected element with snap
          const selectedIds = store.selection.selectedIds;
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

            // Use silent update to avoid flooding history during drag
            store.updateElementSilent(id, {
              x: snapResult.snappedX,
              y: snapResult.snappedY,
            } as Partial<CanvasElement>);
          }
          break;
        }

        case 'resize': {
          const docPoint = screenToDocument(screenPoint, viewport);
          state.dragCurrent = docPoint;

          const selectedId = store.selection.selectedIds[0];
          if (!selectedId || !state.originalSize || !state.activeHandle) break;

          const deltaX = docPoint.x - state.dragStart.x;
          const deltaY = docPoint.y - state.dragStart.y;

          // Calculate new size based on handle direction
          let newWidth = state.originalSize.width;
          let newHeight = state.originalSize.height;

          const handle = state.activeHandle;
          if (handle.includes('e')) newWidth += deltaX;
          if (handle.includes('w')) newWidth -= deltaX;
          if (handle.includes('s')) newHeight += deltaY;
          if (handle.includes('n')) newHeight -= deltaY;

          newWidth = Math.max(1, newWidth);
          newHeight = Math.max(1, newHeight);

          // Use silent update to avoid flooding history during drag
          store.updateElementSilent(selectedId, { width: newWidth, height: newHeight });
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

    switch (state.dragMode) {
      case 'move': {
        // Finalize move — commit single history entry for the entire drag
        store.endDrag();
        break;
      }

      case 'resize': {
        // Finalize resize — commit single history entry for the entire drag
        store.endDrag();
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
    state.panStart = null;

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

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    cursorStyle,
    ghostElementRef,
    renderTick,
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
