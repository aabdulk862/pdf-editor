import { current } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  MAX_PAGES,
  MAX_SAVED_COLORS,
  MM_TO_PX,
  PAGE_DIMENSION_MAX,
  PAGE_DIMENSION_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
} from '../constants';
import type {
  BoundingBox,
  CanvasDocument,
  CanvasElement,
  CanvasPage,
  CanvasTool,
  ExportProgress,
  GroupElement,
  SelectionState,
  Viewport,
} from '../types';
import { getBoundingBox } from '../engine/geometry';
import {
  createSnapshot,
  initialHistoryState,
  performRedo,
  performUndo,
  pushToUndoStack,
} from './history';
import type { DocumentSnapshot, HistoryState } from './history';

export type { DocumentSnapshot, HistoryState };

// === Store State ===

export interface CanvasStoreState {
  document: CanvasDocument | null;
  viewport: Viewport;
  selection: SelectionState;
  activeTool: CanvasTool;
  gridEnabled: boolean;
  gridSpacing: number;
  snapEnabled: boolean;
  history: HistoryState;
  clipboard: CanvasElement[];
  savedColors: string[];
  exportProgress: ExportProgress;
  isDragging: boolean;
  dragSnapshot: DocumentSnapshot | null;
}

// === Store Actions ===

export interface CanvasStoreActions {
  // Document
  createDocument(name?: string): void;
  loadDocument(doc: CanvasDocument): void;
  saveToLocalStorage(): void;

  // Pages
  addPage(afterIndex?: number): void;
  removePage(pageIndex: number): void;
  setActivePage(pageIndex: number): void;
  setPageSize(pageIndex: number, width: number, height: number): void;

  // Elements
  addElement(element: CanvasElement): void;
  updateElement(id: string, updates: Partial<CanvasElement>): void;
  removeElements(ids: string[]): void;
  duplicateElements(ids: string[]): void;

  // Selection (non-mutating — no history)
  select(ids: string[]): void;
  selectAll(): void;
  deselect(): void;

  // Transform
  moveElements(ids: string[], deltaX: number, deltaY: number): void;
  resizeElement(id: string, width: number, height: number): void;
  rotateElement(id: string, angle: number): void;

  // Z-Order
  bringToFront(id: string): void;
  sendToBack(id: string): void;
  moveLayerUp(id: string): void;
  moveLayerDown(id: string): void;

  // Grouping
  groupElements(ids: string[]): void;
  ungroupElement(groupId: string): void;

  // Lock/Visibility
  lockElement(id: string): void;
  unlockElement(id: string): void;
  hideElement(id: string): void;
  showElement(id: string): void;

  // Viewport (non-mutating — no history)
  setZoom(zoom: number): void;
  zoomBy(delta: number): void;
  pan(deltaX: number, deltaY: number): void;
  fitPageToViewport(canvasWidth: number, canvasHeight: number): void;

  // History
  undo(): void;
  redo(): void;

  // Drag History
  beginDrag(): void;
  endDrag(): void;
  updateElementSilent(id: string, updates: Partial<CanvasElement>): void;

  // Clipboard
  copy(): void;
  paste(): void;

  // Tools (non-mutating — no history)
  setActiveTool(tool: CanvasTool): void;

  // Colors
  saveColor(hex: string): void;
}

// === Helpers ===

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createBlankPage(): CanvasPage {
  return {
    id: generateId(),
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
    backgroundColor: '#FFFFFF',
    elements: [],
  };
}

function clampZoom(zoom: number): number {
  const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
  // Round to nearest ZOOM_STEP, then fix floating point precision
  return Math.round(Math.round(clamped / ZOOM_STEP) * ZOOM_STEP * 100) / 100;
}

function isValidPageDimension(value: number): boolean {
  return value >= PAGE_DIMENSION_MIN && value <= PAGE_DIMENSION_MAX;
}

function getActivePage(state: CanvasStoreState): CanvasPage | null {
  if (!state.document) return null;
  return state.document.pages[state.document.activePageIndex] ?? null;
}

function getMaxZIndex(elements: CanvasElement[]): number {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map((e) => e.zIndex));
}

function getMinZIndex(elements: CanvasElement[]): number {
  if (elements.length === 0) return 0;
  return Math.min(...elements.map((e) => e.zIndex));
}

function deepCloneElement(element: CanvasElement): CanvasElement {
  // Use JSON parse/stringify to handle both Immer drafts and plain objects
  return JSON.parse(JSON.stringify(element));
}

/**
 * Compute the axis-aligned bounding box enclosing all elements with the given IDs.
 * Returns null if ids is empty or no matching elements are found.
 */
export function computeSelectionBounds(
  ids: string[],
  elements: CanvasElement[],
): BoundingBox | null {
  if (ids.length === 0) return null;

  const selected = elements.filter((e) => ids.includes(e.id));
  if (selected.length === 0) return null;

  // Use getBoundingBox to handle rotated elements
  const boxes = selected.map((el) => getBoundingBox(el));

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// === Initial State ===

const initialState: CanvasStoreState = {
  document: null,
  viewport: { panX: 0, panY: 0, zoom: 1.0 },
  selection: { selectedIds: [], selectionBounds: null, activeHandle: null },
  activeTool: 'select',
  gridEnabled: true,
  gridSpacing: 20,
  snapEnabled: true,
  history: initialHistoryState,
  clipboard: [],
  savedColors: [],
  exportProgress: { status: 'idle', currentPage: 0, totalPages: 0 },
  isDragging: false,
  dragSnapshot: null,
};

// === Store ===

export const useCanvasStore = create<CanvasStoreState & CanvasStoreActions>()(
  immer((set, get) => ({
    ...initialState,

    // ─── Document Actions ───────────────────────────────────────────────

    createDocument(name?: string) {
      set((state) => {
        const doc: CanvasDocument = {
          id: generateId(),
          name: name ?? 'Untitled Design',
          pages: [createBlankPage()],
          activePageIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        state.document = doc;
        state.selection = { selectedIds: [], selectionBounds: null, activeHandle: null };
        state.history = initialHistoryState;
      });
      // Persist immediately so recent files can load it
      get().saveToLocalStorage();
    },

    loadDocument(doc: CanvasDocument) {
      set((state) => {
        state.document = doc;
        state.selection = { selectedIds: [], selectionBounds: null, activeHandle: null };
        state.history = initialHistoryState;
      });
      // Persist immediately so recent files can load it
      get().saveToLocalStorage();
    },

    saveToLocalStorage() {
      const { document } = get();
      if (!document) return;
      try {
        const key = `canvas-editor-document-${document.id}`;
        localStorage.setItem(key, JSON.stringify(document));
      } catch {
        // localStorage unavailable or quota exceeded — silently continue
      }
    },

    // ─── Page Actions ───────────────────────────────────────────────────

    addPage(afterIndex?: number) {
      set((state) => {
        if (!state.document) return;
        if (state.document.pages.length >= MAX_PAGES) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document), 'Add page');
        state.history = pushToUndoStack(state.history, snapshot);

        const insertIndex =
          afterIndex !== undefined ? afterIndex + 1 : state.document.activePageIndex + 1;
        const clampedIndex = Math.max(0, Math.min(insertIndex, state.document.pages.length));

        state.document.pages.splice(clampedIndex, 0, createBlankPage());
        state.document.activePageIndex = clampedIndex;
        state.document.updatedAt = Date.now();
      });
    },

    removePage(pageIndex: number) {
      set((state) => {
        if (!state.document) return;
        if (state.document.pages.length <= 1) return;
        if (pageIndex < 0 || pageIndex >= state.document.pages.length) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document), 'Remove page');
        state.history = pushToUndoStack(state.history, snapshot);

        state.document.pages.splice(pageIndex, 1);

        // Adjust active page index
        if (state.document.activePageIndex >= state.document.pages.length) {
          state.document.activePageIndex = state.document.pages.length - 1;
        }
        state.document.updatedAt = Date.now();
        state.selection = { selectedIds: [], selectionBounds: null, activeHandle: null };
      });
    },

    setActivePage(pageIndex: number) {
      set((state) => {
        if (!state.document) return;
        if (pageIndex < 0 || pageIndex >= state.document.pages.length) return;
        state.document.activePageIndex = pageIndex;
        state.selection = { selectedIds: [], selectionBounds: null, activeHandle: null };
      });
    },

    setPageSize(pageIndex: number, width: number, height: number) {
      set((state) => {
        if (!state.document) return;
        if (pageIndex < 0 || pageIndex >= state.document.pages.length) return;
        if (!isValidPageDimension(width) || !isValidPageDimension(height)) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document), 'Resize page');
        state.history = pushToUndoStack(state.history, snapshot);

        state.document.pages[pageIndex].width = width;
        state.document.pages[pageIndex].height = height;
        state.document.updatedAt = Date.now();
      });
    },

    // ─── Element Actions ────────────────────────────────────────────────

    addElement(element: CanvasElement) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Add element');
        state.history = pushToUndoStack(state.history, snapshot);

        page.elements.push(element);
        state.document!.updatedAt = Date.now();
      });
    },

    updateElement(id: string, updates: Partial<CanvasElement>) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const elementIndex = page.elements.findIndex((e) => e.id === id);
        if (elementIndex === -1) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Update element');
        state.history = pushToUndoStack(state.history, snapshot);

        const element = page.elements[elementIndex];
        Object.assign(element, updates);
        state.document!.updatedAt = Date.now();
      });
    },

    removeElements(ids: string[]) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Remove elements');
        state.history = pushToUndoStack(state.history, snapshot);

        page.elements = page.elements.filter((e) => !ids.includes(e.id));
        state.selection.selectedIds = state.selection.selectedIds.filter((id) => !ids.includes(id));
        state.document!.updatedAt = Date.now();
      });
    },

    duplicateElements(ids: string[]) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Duplicate elements');
        state.history = pushToUndoStack(state.history, snapshot);

        const maxZ = getMaxZIndex(page.elements);
        const newIds: string[] = [];

        ids.forEach((id, i) => {
          const original = page.elements.find((e) => e.id === id);
          if (!original) return;

          const clone = deepCloneElement(original);
          clone.id = generateId();
          clone.x += 10;
          clone.y += 10;
          clone.zIndex = maxZ + 1 + i;
          page.elements.push(clone);
          newIds.push(clone.id);
        });

        state.selection.selectedIds = newIds;
        state.document!.updatedAt = Date.now();
      });
    },

    // ─── Selection Actions (non-mutating — no history) ──────────────────

    select(ids: string[]) {
      set((state) => {
        state.selection.selectedIds = ids;
        state.selection.activeHandle = null;
        const page = getActivePage(state);
        if (page) {
          state.selection.selectionBounds = computeSelectionBounds(ids, page.elements);
        }
      });
    },

    selectAll() {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;
        const selectedIds = page.elements.map((e) => e.id);
        state.selection.selectedIds = selectedIds;
        state.selection.activeHandle = null;
        state.selection.selectionBounds = computeSelectionBounds(selectedIds, page.elements);
      });
    },

    deselect() {
      set((state) => {
        state.selection.selectedIds = [];
        state.selection.selectionBounds = null;
        state.selection.activeHandle = null;
      });
    },

    // ─── Transform Actions ──────────────────────────────────────────────

    moveElements(ids: string[], deltaX: number, deltaY: number) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Move elements');
        state.history = pushToUndoStack(state.history, snapshot);

        for (const element of page.elements) {
          if (ids.includes(element.id)) {
            element.x += deltaX;
            element.y += deltaY;
          }
        }
        state.document!.updatedAt = Date.now();
      });
    },

    resizeElement(id: string, width: number, height: number) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Resize element');
        state.history = pushToUndoStack(state.history, snapshot);

        element.width = Math.max(1, width);
        element.height = Math.max(1, height);
        state.document!.updatedAt = Date.now();
      });
    },

    rotateElement(id: string, angle: number) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Rotate element');
        state.history = pushToUndoStack(state.history, snapshot);

        element.rotation = ((angle % 360) + 360) % 360;
        state.document!.updatedAt = Date.now();
      });
    },

    // ─── Z-Order Actions ────────────────────────────────────────────────

    bringToFront(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Bring to front');
        state.history = pushToUndoStack(state.history, snapshot);

        const maxZ = getMaxZIndex(page.elements);
        element.zIndex = maxZ + 1;
        state.document!.updatedAt = Date.now();
      });
    },

    sendToBack(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Send to back');
        state.history = pushToUndoStack(state.history, snapshot);

        const minZ = getMinZIndex(page.elements);
        element.zIndex = minZ - 1;
        state.document!.updatedAt = Date.now();
      });
    },

    moveLayerUp(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
        const idx = sorted.findIndex((e) => e.id === id);
        if (idx === -1 || idx >= sorted.length - 1) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Move layer up');
        state.history = pushToUndoStack(state.history, snapshot);

        const target = page.elements.find((e) => e.id === sorted[idx].id)!;
        const above = page.elements.find((e) => e.id === sorted[idx + 1].id)!;

        const tempZ = target.zIndex;
        target.zIndex = above.zIndex;
        above.zIndex = tempZ;
        state.document!.updatedAt = Date.now();
      });
    },

    moveLayerDown(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
        const idx = sorted.findIndex((e) => e.id === id);
        if (idx <= 0) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Move layer down');
        state.history = pushToUndoStack(state.history, snapshot);

        const target = page.elements.find((e) => e.id === sorted[idx].id)!;
        const below = page.elements.find((e) => e.id === sorted[idx - 1].id)!;

        const tempZ = target.zIndex;
        target.zIndex = below.zIndex;
        below.zIndex = tempZ;
        state.document!.updatedAt = Date.now();
      });
    },

    // ─── Grouping Actions ───────────────────────────────────────────────

    groupElements(ids: string[]) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;
        if (ids.length < 2) return;

        const children = page.elements.filter((e) => ids.includes(e.id));
        if (children.length < 2) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Group elements');
        state.history = pushToUndoStack(state.history, snapshot);

        // Calculate bounding box of children
        const minX = Math.min(...children.map((e) => e.x));
        const minY = Math.min(...children.map((e) => e.y));
        const maxX = Math.max(...children.map((e) => e.x + e.width));
        const maxY = Math.max(...children.map((e) => e.y + e.height));
        const maxZ = getMaxZIndex(page.elements);

        // Create group element
        const group: GroupElement = {
          id: generateId(),
          type: 'group',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          rotation: 0,
          opacity: 100,
          zIndex: maxZ + 1,
          locked: false,
          visible: true,
          children: children.map((child) => {
            const clone = deepCloneElement(child);
            // Store positions relative to group
            clone.x -= minX;
            clone.y -= minY;
            return clone;
          }),
        };

        // Remove original elements and add group
        page.elements = page.elements.filter((e) => !ids.includes(e.id));
        page.elements.push(group);

        state.selection.selectedIds = [group.id];
        state.document!.updatedAt = Date.now();
      });
    },

    ungroupElement(groupId: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const groupIndex = page.elements.findIndex((e) => e.id === groupId);
        if (groupIndex === -1) return;

        const group = page.elements[groupIndex];
        if (group.type !== 'group') return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Ungroup element');
        state.history = pushToUndoStack(state.history, snapshot);

        const groupElement = group as GroupElement;
        const restoredIds: string[] = [];
        const maxZ = getMaxZIndex(page.elements);

        // Restore children to absolute positions
        groupElement.children.forEach((child, i) => {
          const restored = deepCloneElement(child);
          restored.x += groupElement.x;
          restored.y += groupElement.y;
          restored.zIndex = maxZ + 1 + i;
          restored.id = generateId();
          page.elements.push(restored);
          restoredIds.push(restored.id);
        });

        // Remove the group
        page.elements.splice(groupIndex, 1);

        state.selection.selectedIds = restoredIds;
        state.document!.updatedAt = Date.now();
      });
    },

    // ─── Lock/Visibility Actions ────────────────────────────────────────

    lockElement(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Lock element');
        state.history = pushToUndoStack(state.history, snapshot);

        element.locked = true;
        state.document!.updatedAt = Date.now();
      });
    },

    unlockElement(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Unlock element');
        state.history = pushToUndoStack(state.history, snapshot);

        element.locked = false;
        state.document!.updatedAt = Date.now();
      });
    },

    hideElement(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Hide element');
        state.history = pushToUndoStack(state.history, snapshot);

        element.visible = false;
        state.document!.updatedAt = Date.now();
      });
    },

    showElement(id: string) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const element = page.elements.find((e) => e.id === id);
        if (!element) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Show element');
        state.history = pushToUndoStack(state.history, snapshot);

        element.visible = true;
        state.document!.updatedAt = Date.now();
      });
    },

    // ─── Viewport Actions (non-mutating — no history) ───────────────────

    setZoom(zoom: number) {
      set((state) => {
        state.viewport.zoom = clampZoom(zoom);
      });
    },

    zoomBy(delta: number) {
      set((state) => {
        const newZoom = state.viewport.zoom + delta;
        state.viewport.zoom = clampZoom(newZoom);
      });
    },

    pan(deltaX: number, deltaY: number) {
      set((state) => {
        state.viewport.panX += deltaX;
        state.viewport.panY += deltaY;
      });
    },

    fitPageToViewport(canvasWidth: number, canvasHeight: number) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        // Convert page dimensions from mm to px
        const pageWidthPx = page.width * MM_TO_PX;
        const pageHeightPx = page.height * MM_TO_PX;

        // Calculate zoom to fit page with 10% padding on each side (80% of viewport)
        const padding = 0.85;
        const zoomX = (canvasWidth * padding) / pageWidthPx;
        const zoomY = (canvasHeight * padding) / pageHeightPx;
        const zoom = clampZoom(Math.min(zoomX, zoomY));

        // Center the page in the viewport
        // panX/panY represent the top-left corner of the visible area in pixel space
        // To center: panX = (pageWidthPx / 2) - (canvasWidth / zoom / 2)
        const panX = (pageWidthPx - canvasWidth / zoom) / 2;
        const panY = (pageHeightPx - canvasHeight / zoom) / 2;

        state.viewport.zoom = zoom;
        state.viewport.panX = panX;
        state.viewport.panY = panY;
      });
    },

    // ─── History Actions ────────────────────────────────────────────────

    undo() {
      set((state) => {
        if (!state.document) return;

        const result = performUndo(state.history, current(state.document));
        if (!result) return;

        state.document = result.document;
        state.history = result.history;
        state.selection = { selectedIds: [], selectionBounds: null, activeHandle: null };
      });
    },

    redo() {
      set((state) => {
        if (!state.document) return;

        const result = performRedo(state.history, current(state.document));
        if (!result) return;

        state.document = result.document;
        state.history = result.history;
        state.selection = { selectedIds: [], selectionBounds: null, activeHandle: null };
      });
    },

    // ─── Drag History Actions ───────────────────────────────────────────

    beginDrag() {
      set((state) => {
        if (!state.document) return;
        state.dragSnapshot = createSnapshot(current(state.document), 'Drag operation');
        state.isDragging = true;
      });
    },

    endDrag() {
      set((state) => {
        if (state.dragSnapshot) {
          state.history = pushToUndoStack(state.history, state.dragSnapshot);
          state.dragSnapshot = null;
        }
        state.isDragging = false;
      });
    },

    updateElementSilent(id: string, updates: Partial<CanvasElement>) {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;
        const element = page.elements.find((e) => e.id === id);
        if (!element) return;
        Object.assign(element, updates);
        state.document!.updatedAt = Date.now();

        // Recompute selection bounds if the updated element is currently selected
        if (state.selection.selectedIds.includes(id)) {
          state.selection.selectionBounds = computeSelectionBounds(
            state.selection.selectedIds,
            page.elements,
          );
        }
      });
    },

    // ─── Clipboard Actions ──────────────────────────────────────────────

    copy() {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;

        const selected = page.elements.filter((e) => state.selection.selectedIds.includes(e.id));
        // Use current() to get plain objects from Immer drafts before cloning
        state.clipboard = selected.map((e) => JSON.parse(JSON.stringify(current(e))));
      });
    },

    paste() {
      set((state) => {
        const page = getActivePage(state);
        if (!page) return;
        if (state.clipboard.length === 0) return;

        // Record history before mutation
        const snapshot = createSnapshot(current(state.document!), 'Paste');
        state.history = pushToUndoStack(state.history, snapshot);

        const maxZ = getMaxZIndex(page.elements);
        const newIds: string[] = [];

        state.clipboard.forEach((element, i) => {
          const clone = deepCloneElement(element);
          clone.id = generateId();
          clone.x += 10;
          clone.y += 10;
          clone.zIndex = maxZ + 1 + i;
          page.elements.push(clone);
          newIds.push(clone.id);
        });

        // Update clipboard to reflect new offset for subsequent pastes
        state.clipboard = state.clipboard.map((e) => {
          const updated = deepCloneElement(e);
          updated.x += 10;
          updated.y += 10;
          return updated;
        });

        state.selection.selectedIds = newIds;
        state.document!.updatedAt = Date.now();
      });
    },

    // ─── Tool Actions (non-mutating — no history) ───────────────────────

    setActiveTool(tool: CanvasTool) {
      set((state) => {
        state.activeTool = tool;
      });
    },

    // ─── Color Actions ──────────────────────────────────────────────────

    saveColor(hex: string) {
      set((state) => {
        // Record history before mutation (only if document exists)
        if (state.document) {
          const snapshot = createSnapshot(current(state.document), 'Save color');
          state.history = pushToUndoStack(state.history, snapshot);
        }

        // Remove if already exists (move to front)
        const existing = state.savedColors.indexOf(hex);
        if (existing !== -1) {
          state.savedColors.splice(existing, 1);
        }

        // Add to front
        state.savedColors.unshift(hex);

        // FIFO eviction if over limit
        if (state.savedColors.length > MAX_SAVED_COLORS) {
          state.savedColors = state.savedColors.slice(0, MAX_SAVED_COLORS);
        }
      });
    },
  })),
);
