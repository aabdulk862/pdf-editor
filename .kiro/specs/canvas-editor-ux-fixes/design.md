# Technical Design: Canvas Editor UX Fixes

## Overview

This design addresses seven critical UX bugs in the canvas editor spanning the store layer, rendering engine, page layout, and input layer. Each fix is isolated to minimize cross-cutting risk while sharing common patterns (coordinate conversion, state flags, pure computation helpers).

## Architecture

The canvas editor follows a unidirectional data flow:

```
User Input → Store (Zustand+Immer) → Render State → Canvas 2D Renderer
                                    ↗
                        Geometry/Hit-Test Helpers
```

All seven fixes slot into this existing architecture without introducing new layers:

1. **Store layer** — Selection bounds computation, history suppression flag, silent update method
2. **Constants** — MM_TO_PX conversion factor
3. **Renderer** — mm-to-px conversion, ghost preview, group offset fix
4. **Input hook** — Drag history management, ghost element tracking, cursor computation
5. **Components** — Layout height fix, cursor style binding

## Components and Interfaces

### 1. Constants Module (`constants.ts`)

```typescript
/** Conversion factor from millimeters to pixels at 96 DPI */
export const MM_TO_PX = 96 / 25.4; // ≈ 3.7795 px/mm
```

### 2. Selection Bounds Helper (`store/canvas-store.ts`)

A pure function extracted for testability:

```typescript
import { getBoundingBox } from '../engine/geometry';

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
```

The `select()` and `selectAll()` actions call this helper and assign the result to `state.selection.selectionBounds`.

### 3. History Suppression (`store/canvas-store.ts`)

New store state and actions:

```typescript
// Added to CanvasStoreState
isDragging: boolean;  // true while a drag operation is active

// Added to CanvasStoreActions
beginDrag(): void;    // captures snapshot, sets isDragging = true
endDrag(): void;      // commits snapshot to undo stack, sets isDragging = false
updateElementSilent(id: string, updates: Partial<CanvasElement>): void;  // no history push
```

**Behavior:**

- `beginDrag()` — Captures a `DocumentSnapshot` of the current state and stores it in a `dragSnapshot` field. Sets `isDragging = true`.
- `updateElementSilent(id, updates)` — Same as `updateElement` but skips the `pushToUndoStack` call. Used during drag for intermediate position/size updates.
- `endDrag()` — Pushes the stored `dragSnapshot` to the undo stack. Sets `isDragging = false`. Clears `dragSnapshot`.

```typescript
// Internal state added alongside CanvasStoreState
dragSnapshot: DocumentSnapshot | null;

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
  });
},
```

### 4. Rendering Formula with MM_TO_PX (`engine/renderer.ts`)

The rendering pipeline applies mm-to-px conversion before viewport transform:

```typescript
import { MM_TO_PX } from '../constants';

// Screen coordinate formula:
// screenPos = (docPosMm * MM_TO_PX - panOffset) * zoom
//
// Where panOffset is in pixel space (panX/panY are stored in px after conversion)

function toScreen(docMm: number, pan: number, zoom: number): number {
  return (docMm * MM_TO_PX - pan) * zoom;
}
```

**Page background rendering:**

```typescript
function renderPageBackground(ctx, page, viewport) {
  const pageScreenX = (0 * MM_TO_PX - viewport.panX) * viewport.zoom;
  const pageScreenY = (0 * MM_TO_PX - viewport.panY) * viewport.zoom;
  const pageScreenW = page.width * MM_TO_PX * viewport.zoom;
  const pageScreenH = page.height * MM_TO_PX * viewport.zoom;
  // ... draw page
}
```

**Element rendering (all types):**

```typescript
const screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
const screenY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
const screenW = element.width * MM_TO_PX * viewport.zoom;
const screenH = element.height * MM_TO_PX * viewport.zoom;
```

**Hit-test inverse (screen → document mm):**

```typescript
// In geometry.ts, update screenToDocument:
export function screenToDocument(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x / viewport.zoom + viewport.panX) / MM_TO_PX,
    y: (screenPoint.y / viewport.zoom + viewport.panY) / MM_TO_PX,
  };
}
```

### 5. Ghost Preview (`engine/renderer.ts` + `hooks/useCanvasInput.ts`)

**RenderState extension:**

```typescript
export interface RenderState {
  document: CanvasDocument;
  viewport: Viewport;
  activePage: CanvasPage;
  ghostElement?: CanvasElement | null; // NEW: shape being drag-created
}
```

**Renderer draws ghost after normal elements:**

```typescript
// In render(), after renderElementsInOrder:
if (state.ghostElement) {
  renderGhostElement(ctx, state.ghostElement, viewport);
}

function renderGhostElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  viewport: Viewport,
): void {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.setLineDash([6, 4]);
  renderElement(ctx, element, viewport);
  ctx.restore();
}
```

**Input hook updates ghostElement on every pointer-move during create mode:**
The `useCanvasInput` hook stores the creating element in a ref and exposes it to the renderer via a shared ref or store field. On pointer-up, the ghost is cleared and the final element is committed.

### 6. Group Rendering Offset Fix (`engine/renderer.ts`)

The current `renderGroupElement` renders children without offsetting by the group's position. Fix:

```typescript
function renderGroupElement(
  ctx: CanvasRenderingContext2D,
  element: GroupElement,
  viewport: Viewport,
): void {
  ctx.save();

  // Apply group rotation around group center in screen space
  if (element.rotation !== 0) {
    const screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
    const screenY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
    const screenW = element.width * MM_TO_PX * viewport.zoom;
    const screenH = element.height * MM_TO_PX * viewport.zoom;
    const centerX = screenX + screenW / 2;
    const centerY = screenY + screenH / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Create a modified viewport that offsets children by group position
  const childViewport: Viewport = {
    panX: viewport.panX - element.x * MM_TO_PX,
    panY: viewport.panY - element.y * MM_TO_PX,
    zoom: viewport.zoom,
  };

  // Render children in z-order using the offset viewport
  const sortedChildren = [...element.children].sort((a, b) => a.zIndex - b.zIndex);
  for (const child of sortedChildren) {
    if (!child.visible) continue;
    renderElement(ctx, child, childViewport);
  }

  ctx.restore();
}
```

The key insight: by subtracting `element.x * MM_TO_PX` from `panX`, children's relative positions get shifted by the group's absolute position. This works recursively for nested groups.

### 7. Layout Height Fix (`components/CanvasEditorPage.tsx`)

Replace the fragile `h-[calc(100vh-3.5rem)]` with dynamic viewport height:

```tsx
<div
  className="canvas-editor-page -mx-4 sm:-mx-6 lg:-mx-8 -my-6
    w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]
    flex h-[calc(100dvh-3.5rem)] md:h-dvh overflow-hidden"
  style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
>
```

- `100dvh` accounts for mobile browser chrome (address bar, bottom nav)
- `h-[calc(100dvh-3.5rem)]` on mobile subtracts the app navbar
- `md:h-dvh` on desktop uses full dynamic viewport (no app navbar in desktop layout)
- `overflow-hidden` prevents any scrollbar leakage

### 8. Cursor Feedback (`components/CanvasViewport.tsx` + `hooks/useCanvasInput.ts`)

**Pure cursor computation function (testable):**

```typescript
export type CursorStyle =
  | 'default'
  | 'move'
  | 'crosshair'
  | 'grab'
  | 'grabbing'
  | 'text'
  | 'nwse-resize'
  | 'nesw-resize'
  | 'ns-resize'
  | 'ew-resize';

export interface CursorContext {
  activeTool: CanvasTool;
  hoverElement: CanvasElement | null;
  hoverHandle: ResizeHandle | RotateHandle | null;
  isDragging: boolean;
  dragMode: DragMode;
}

export function computeCursor(ctx: CursorContext): CursorStyle {
  const { activeTool, hoverElement, hoverHandle, isDragging, dragMode } = ctx;

  // Dragging states take priority
  if (isDragging && dragMode === 'pan') return 'grabbing';

  // Tool-based cursors
  if (activeTool === 'pan') return 'grab';
  if (activeTool === 'text') return 'text';
  if (isShapeTool(activeTool)) return 'crosshair';

  // Select tool: context-dependent
  if (activeTool === 'select') {
    if (hoverHandle) return getHandleCursor(hoverHandle);
    if (hoverElement) return 'move';
    return 'default';
  }

  return 'default';
}

function getHandleCursor(handle: ResizeHandle | RotateHandle): CursorStyle {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'rotate':
      return 'default'; // or a custom rotate cursor
    default:
      return 'default';
  }
}
```

**CanvasViewport applies cursor via style:**

```tsx
<canvas
  ref={canvasRef}
  className="flex-1 w-full h-full block touch-none"
  style={{ cursor: cursorStyle, willChange: 'transform' }}
  // ... event handlers
/>
```

The cursor is recomputed on every `onPointerMove` (when not dragging) by running hit-test against elements and handles, then calling `computeCursor`.

## Data Models

No new persistent data models are introduced. All changes are to runtime state:

| Field          | Type                       | Location             | Purpose                        |
| -------------- | -------------------------- | -------------------- | ------------------------------ |
| `isDragging`   | `boolean`                  | Canvas Store         | Suppresses history during drag |
| `dragSnapshot` | `DocumentSnapshot \| null` | Canvas Store         | Pre-drag state for undo        |
| `ghostElement` | `CanvasElement \| null`    | RenderState          | Shape being drag-created       |
| `cursorStyle`  | `CursorStyle`              | CanvasViewport state | Current cursor to display      |

## Error Handling

- **computeSelectionBounds** — Returns `null` for empty input or when no elements match the IDs. Callers already handle `null` bounds.
- **MM_TO_PX conversion** — Pure multiplication; no error states. Invalid element dimensions (negative width/height) are prevented by existing validation in `resizeElement`.
- **Ghost preview** — If `ghostElement` has zero width/height (drag hasn't moved), the renderer skips drawing (existing `width > 0` guards).
- **History suppression** — If `endDrag()` is called without a prior `beginDrag()` (e.g., pointer capture lost), `dragSnapshot` is null and no history entry is pushed. This is safe — the intermediate updates remain applied.
- **Group rendering** — If a group has no children, the loop simply doesn't execute. Deeply nested groups are bounded by the existing element limit per page.

## Testing Strategy

**Unit Tests (example-based):**

- MM_TO_PX constant value verification (smoke)
- A4 page renders at ~794×1123px at zoom 1.0 (specific example)
- Ghost preview opacity and dash style (render output checks)
- Layout height at mobile/desktop breakpoints (DOM assertions)
- Select with empty array returns null bounds (edge case)

**Property-Based Tests (universal, 100+ iterations):**

- Selection bounds computation correctness (Property 1)
- Rendering coordinate formula (Property 2)
- Ghost preview drag rectangle tracking (Property 3)
- Drag history suppression — exactly one entry per drag (Property 4)
- Drag-then-undo round-trip (Property 5)
- Cursor computation determinism (Property 6)
- Group offset absolute position computation (Property 7)
- Group rotation child position preservation (Property 8)

**Integration Tests:**

- Layout produces no scrollbars across viewport sizes 360–2560px (visual regression)
- Full drag-create flow: pointerdown → pointermove × N → pointerup commits element

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Selection bounds encloses all selected elements

_For any_ non-empty set of canvas elements, the computed `selectionBounds` SHALL have `x` equal to the minimum bounding-box x, `y` equal to the minimum bounding-box y, `width` equal to `max(bbox.x + bbox.width) - min(bbox.x)`, and `height` equal to `max(bbox.y + bbox.height) - min(bbox.y)` across all selected elements.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7**

### Property 2: Rendering coordinate formula

_For any_ element with position `(x, y)` in millimeters and _for any_ viewport with `(panX, panY, zoom)`, the rendered screen position SHALL equal `((x * MM_TO_PX) - panX) * zoom` for the x-axis and `((y * MM_TO_PX) - panY) * zoom` for the y-axis, and the rendered screen dimensions SHALL equal `width * MM_TO_PX * zoom` and `height * MM_TO_PX * zoom`.

**Validates: Requirements 2.2, 2.3, 2.5**

### Property 3: Ghost preview tracks drag rectangle

_For any_ drag-create operation with start point `(sx, sy)` and current pointer at `(cx, cy)`, the ghost element's position SHALL be `(min(sx, cx), min(sy, cy))` and its dimensions SHALL be `(|cx - sx|, |cy - sy|)`.

**Validates: Requirements 3.4**

### Property 4: Drag produces exactly one history entry

_For any_ drag operation consisting of N intermediate moves (N ≥ 1), the undo stack SHALL grow by exactly one entry between the start and end of the drag, regardless of N.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Drag-then-undo restores original state

_For any_ document state S, if a drag operation modifies element positions and then undo is invoked, the document state SHALL be equal to S.

**Validates: Requirements 4.4**

### Property 6: Cursor computation is deterministic

_For any_ combination of `(activeTool, hoverElement, hoverHandle, isDragging, dragMode)`, the `computeCursor` function SHALL return: `'crosshair'` when activeTool is a shape tool; `'grab'` when activeTool is `'pan'` and not dragging; `'grabbing'` when dragging in pan mode; `'text'` when activeTool is `'text'`; `'move'` when activeTool is `'select'` and hovering an element; the directionally appropriate resize cursor when hovering a handle; and `'default'` otherwise.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

### Property 7: Group offset produces correct absolute positions

_For any_ group element at position `(gx, gy)` containing a child at relative position `(cx, cy)`, the child's effective document position for rendering SHALL be `(gx + cx, gy + cy)`. For nested groups, the effective position SHALL be the sum of all ancestor group positions plus the leaf's relative position.

**Validates: Requirements 7.1, 7.2, 7.4**

### Property 8: Group rotation preserves child relative positions

_For any_ group element with rotation θ, the children SHALL be rendered at positions rotated by θ around the group's center point, with their relative offsets from the group origin preserved.

**Validates: Requirements 7.3**
