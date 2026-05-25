# Implementation Plan: Canvas Editor UX Fixes

## Overview

Seven isolated bug fixes spanning the store layer (selection bounds, history suppression), rendering engine (mm-to-pixel conversion, group offsets, drag-create preview), page layout (height calculation), and input layer (cursor feedback). Each fix is implemented incrementally with property-based tests validating correctness properties from the design.

## Tasks

- [x] 1. Add MM_TO_PX constant and update coordinate transforms
  - [x] 1.1 Add MM_TO_PX constant to constants.ts
    - Add `export const MM_TO_PX = 96 / 25.4;` to `src/features/canvas-editor/constants.ts`
    - Place it in a new `// === Unit Conversion ===` section near the top
    - _Requirements: 2.1_

  - [x] 1.2 Update screenToDocument and documentToScreen in geometry.ts and transform.ts
    - Import `MM_TO_PX` from `../constants` in both files
    - In `geometry.ts`: update `screenToDocument` to divide by `MM_TO_PX` after inverse viewport transform: `x: (screenPoint.x / viewport.zoom + viewport.panX) / MM_TO_PX`
    - In `geometry.ts`: update `documentToScreen` to multiply by `MM_TO_PX` before viewport transform: `x: (docPoint.x * MM_TO_PX - viewport.panX) * viewport.zoom`
    - In `transform.ts`: apply same changes to `screenToDocument` and `documentToScreen`
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 1.3 Update renderer.ts to apply MM_TO_PX conversion
    - Import `MM_TO_PX` from `../constants`
    - In `renderPageBackground`: multiply `page.width` and `page.height` by `MM_TO_PX` before applying viewport zoom
    - In `renderImageElement`, `renderShapeElement`, `renderTextElementWrapper`: multiply element `x`, `y`, `width`, `height` by `MM_TO_PX` before viewport transform
    - In `renderGroupElement`: multiply group `x`, `y`, `width`, `height` by `MM_TO_PX`
    - Formula: `screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom`
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 1.4 Write property test for rendering coordinate formula
    - **Property 2: Rendering coordinate formula**
    - Test that for arbitrary element positions (x, y in mm) and viewport (panX, panY, zoom), the screen position equals `((x * MM_TO_PX) - panX) * zoom` and screen dimensions equal `width * MM_TO_PX * zoom`
    - Use `fast-check` with `fc.float` arbitraries for positions and zoom
    - **Validates: Requirements 2.2, 2.3, 2.5**

- [x] 2. Implement selection bounds computation
  - [x] 2.1 Add computeSelectionBounds helper to canvas-store.ts
    - Import `getBoundingBox` from `../engine/geometry`
    - Implement `computeSelectionBounds(ids: string[], elements: CanvasElement[]): BoundingBox | null`
    - Return `null` for empty `ids` array or when no elements match
    - Compute axis-aligned bounding box: `minX`, `minY`, `maxX - minX`, `maxY - minY` using `getBoundingBox` for each element
    - Export the function for testability
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Wire computeSelectionBounds into select() and selectAll() actions
    - In `select(ids)`: after setting `selectedIds`, call `computeSelectionBounds(ids, page.elements)` and assign result to `state.selection.selectionBounds`
    - In `selectAll()`: after setting `selectedIds`, call `computeSelectionBounds(selectedIds, page.elements)` and assign result to `state.selection.selectionBounds`
    - Handle case where page is null (skip bounds computation)
    - _Requirements: 1.1, 1.7_

  - [ ]\* 2.3 Write property test for selection bounds computation
    - **Property 1: Selection bounds encloses all selected elements**
    - Generate arbitrary arrays of elements with random positions/sizes/rotations
    - Verify bounds.x equals min bounding-box x, bounds.y equals min bounding-box y
    - Verify bounds.width equals max(bbox.x + bbox.width) - min(bbox.x)
    - Verify bounds.height equals max(bbox.y + bbox.height) - min(bbox.y)
    - Verify empty input returns null
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7**

- [x] 3. Implement history flooding prevention
  - [x] 3.1 Add drag history state and actions to canvas-store.ts
    - Add `isDragging: boolean` and `dragSnapshot: DocumentSnapshot | null` to store state
    - Add `beginDrag()` action: captures snapshot via `createSnapshot(current(state.document))`, sets `isDragging = true`
    - Add `endDrag()` action: pushes `dragSnapshot` to undo stack via `pushToUndoStack`, sets `isDragging = false`, clears `dragSnapshot`
    - Add `updateElementSilent(id, updates)` action: same as `updateElement` but skips `pushToUndoStack` call
    - Initialize `isDragging: false` and `dragSnapshot: null` in initial state
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 3.2 Wire beginDrag/endDrag/updateElementSilent into useCanvasInput
    - In `onPointerDown` for `move` and `resize` modes: call `store.beginDrag()` after setting up drag state
    - In `onPointerMove` for `move` mode: replace `store.updateElement(id, ...)` with `store.updateElementSilent(id, ...)`
    - In `onPointerMove` for `resize` mode: replace `store.resizeElement(...)` with `store.updateElementSilent(id, { width, height })`
    - In `onPointerUp` for `move` and `resize` modes: call `store.endDrag()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 3.3 Write property test for drag history suppression
    - **Property 4: Drag produces exactly one history entry**
    - Simulate N intermediate moves (N ≥ 1) between beginDrag and endDrag
    - Verify undo stack grows by exactly 1 entry regardless of N
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ]\* 3.4 Write property test for drag-then-undo round-trip
    - **Property 5: Drag-then-undo restores original state**
    - Capture document state, perform drag with multiple intermediate updates, end drag, then undo
    - Verify document state equals the captured pre-drag state
    - **Validates: Requirements 4.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ghost preview during shape drag-create
  - [x] 5.1 Extend RenderState with ghostElement field
    - In `renderer.ts`: add `ghostElement?: CanvasElement | null` to the `RenderState` interface
    - Add `renderGhostElement` function: saves context, sets `globalAlpha = 0.3`, sets `setLineDash([6, 4])`, calls `renderElement`, restores context
    - In `render()` function: after `renderElementsInOrder`, check `state.ghostElement` and call `renderGhostElement` if present
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 5.2 Expose ghost element from useCanvasInput to renderer
    - In `useCanvasInput`: export the `dragState.current.creatingElement` via a returned ref or by setting it on a shared store field
    - In `useCanvasRenderer`: pass the ghost element into the `RenderState` when calling `render()`
    - On `onPointerMove` during `create` mode: the existing code already updates `state.creatingElement` — ensure the renderer re-renders on each update
    - On `onPointerUp` during `create` mode: clear the ghost element (already done via `state.creatingElement = null`)
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ]\* 5.3 Write property test for ghost preview drag rectangle tracking
    - **Property 3: Ghost preview tracks drag rectangle**
    - For arbitrary start point (sx, sy) and current point (cx, cy), verify ghost position is `(min(sx, cx), min(sy, cy))` and dimensions are `(|cx - sx|, |cy - sy|)`
    - **Validates: Requirements 3.4**

- [x] 6. Fix group element rendering offset
  - [x] 6.1 Update renderGroupElement to offset children by group position
    - In `renderGroupElement`: create a `childViewport` that subtracts `element.x * MM_TO_PX` from `viewport.panX` and `element.y * MM_TO_PX` from `viewport.panY`
    - Pass `childViewport` to `renderElement` for each child instead of the original `viewport`
    - Update the rotation calculation to use `element.x * MM_TO_PX` and `element.y * MM_TO_PX` for screen coordinate computation
    - This works recursively for nested groups since each child group will further offset its own children
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]\* 6.2 Write property test for group offset absolute positions
    - **Property 7: Group offset produces correct absolute positions**
    - For arbitrary group position (gx, gy) and child relative position (cx, cy), verify the effective document position for rendering is (gx + cx, gy + cy)
    - Test nested groups: effective position is sum of all ancestor positions plus leaf relative position
    - **Validates: Requirements 7.1, 7.2, 7.4**

  - [ ]\* 6.3 Write property test for group rotation child position preservation
    - **Property 8: Group rotation preserves child relative positions**
    - For arbitrary group with rotation θ, verify children are rendered at positions rotated by θ around group center with relative offsets preserved
    - **Validates: Requirements 7.3**

- [x] 7. Implement cursor feedback
  - [x] 7.1 Add computeCursor function and cursor types
    - Create cursor computation logic (can be in `useCanvasInput.ts` or a new `engine/cursor.ts` file)
    - Define `CursorStyle` type: `'default' | 'move' | 'crosshair' | 'grab' | 'grabbing' | 'text' | 'nwse-resize' | 'nesw-resize' | 'ns-resize' | 'ew-resize'`
    - Define `CursorContext` interface with `activeTool`, `hoverElement`, `hoverHandle`, `isDragging`, `dragMode`
    - Implement `computeCursor(ctx: CursorContext): CursorStyle` with priority: dragging states > tool-based > select-tool context
    - Implement `getHandleCursor(handle)` helper for directional resize cursors
    - Export `computeCursor` for testability
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 7.2 Wire cursor style into CanvasViewport
    - In `useCanvasInput`: compute cursor on every `onPointerMove` (when not dragging) by running hit-test against elements and handles
    - Return `cursorStyle` from `useCanvasInput` hook (as state or ref)
    - In `CanvasViewport.tsx`: apply `style={{ cursor: cursorStyle }}` to the canvas element
    - Update cursor during drag operations (e.g., `grabbing` during pan)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]\* 7.3 Write property test for cursor computation determinism
    - **Property 6: Cursor computation is deterministic**
    - For all combinations of (activeTool, hoverElement, hoverHandle, isDragging, dragMode), verify `computeCursor` returns the expected cursor per the specification rules
    - Test shape tools → crosshair, pan → grab, pan+dragging → grabbing, text → text, select+hover → move, select+handle → directional resize
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

- [x] 8. Fix layout height calculation
  - [x] 8.1 Update CanvasEditorPage height classes
    - In `CanvasEditorPage.tsx`: replace `h-[calc(100vh-3.5rem)] md:h-screen` with `h-[calc(100dvh-3.5rem)] md:h-dvh`
    - `100dvh` accounts for mobile browser chrome (address bar, bottom nav)
    - `md:h-dvh` on desktop uses full dynamic viewport height (no app navbar in desktop layout)
    - Ensure `overflow-hidden` remains on the container
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest with `@fast-check/vitest` for property-based testing
- All coordinate transforms must be updated consistently (geometry.ts, transform.ts, renderer.ts) to avoid mismatches between hit-testing and rendering

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "8.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "3.1", "7.1"] },
    { "id": 2, "tasks": ["1.4", "2.3", "3.2", "5.1", "6.1", "7.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "5.2", "6.2", "6.3", "7.3"] },
    { "id": 4, "tasks": ["5.3"] }
  ]
}
```
