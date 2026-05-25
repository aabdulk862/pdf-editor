# Requirements Document

## Introduction

This specification addresses seven critical UX bugs in the canvas editor that affect rendering accuracy, interaction feedback, and undo/redo reliability. The fixes span the store layer (selection bounds, history suppression), the rendering engine (mm-to-pixel conversion, group offsets, drag-create preview), the page layout (height calculation), and the input layer (cursor feedback).

## Glossary

- **Canvas_Store**: The Zustand+Immer state store at `src/features/canvas-editor/store/canvas-store.ts` managing document, selection, viewport, and history state.
- **Renderer**: The canvas rendering engine at `src/features/canvas-editor/engine/renderer.ts` responsible for drawing pages and elements to the HTML5 Canvas.
- **SelectionOverlay**: The React overlay component at `src/features/canvas-editor/components/SelectionOverlay.tsx` that renders resize/rotate handles around selected elements.
- **CanvasEditorPage**: The route-level page component at `src/features/canvas-editor/components/CanvasEditorPage.tsx` composing the editor layout.
- **CanvasViewport**: The component at `src/features/canvas-editor/components/CanvasViewport.tsx` hosting the HTML5 Canvas element and wiring input/render hooks.
- **InputHook**: The `useCanvasInput` hook at `src/features/canvas-editor/hooks/useCanvasInput.ts` handling pointer and wheel events.
- **MM_TO_PX_FACTOR**: The conversion constant from millimeters to pixels at 96 DPI, equal to 96/25.4 ≈ 3.7795 px/mm.
- **SelectionBounds**: A `BoundingBox` (`{ x, y, width, height }`) in document coordinates representing the axis-aligned bounding rectangle of all selected elements.
- **History_Stack**: The undo/redo stack managed by the Canvas_Store history module.
- **Drag_Operation**: A pointer interaction spanning from pointerdown to pointerup involving continuous element position or size updates.
- **Ghost_Preview**: A semi-transparent visual representation of a shape being created during a drag-create operation.
- **Group_Element**: A `CanvasElement` of type `group` containing child elements with positions stored relative to the group origin.

## Requirements

### Requirement 1: Selection Bounds Computation

**User Story:** As a designer, I want resize handles to appear around my selected elements, so that I can visually resize and transform them.

#### Acceptance Criteria

1. WHEN the `select` action is called with one or more element IDs, THE Canvas_Store SHALL compute `selectionBounds` as the axis-aligned bounding box enclosing all selected elements based on their `x`, `y`, `width`, and `height` properties.
2. WHEN the `select` action is called with one or more element IDs, THE Canvas_Store SHALL set `selectionBounds.x` to the minimum `x` value among all selected elements.
3. WHEN the `select` action is called with one or more element IDs, THE Canvas_Store SHALL set `selectionBounds.y` to the minimum `y` value among all selected elements.
4. WHEN the `select` action is called with one or more element IDs, THE Canvas_Store SHALL set `selectionBounds.width` to the difference between the maximum `(x + width)` and the minimum `x` among all selected elements.
5. WHEN the `select` action is called with one or more element IDs, THE Canvas_Store SHALL set `selectionBounds.height` to the difference between the maximum `(y + height)` and the minimum `y` among all selected elements.
6. WHEN the `select` action is called with an empty array, THE Canvas_Store SHALL set `selectionBounds` to null.
7. WHEN the `selectAll` action is called, THE Canvas_Store SHALL compute `selectionBounds` using the same bounding box logic as the `select` action.

### Requirement 2: Millimeter-to-Pixel Conversion

**User Story:** As a designer, I want the A4 page to render at the correct physical size on screen, so that my designs are spatially accurate.

#### Acceptance Criteria

1. THE Canvas_Store constants module SHALL define a `MM_TO_PX` constant with the value `96 / 25.4` (approximately 3.7795 px/mm).
2. WHEN rendering the page background, THE Renderer SHALL multiply the page `width` and `height` (in mm) by `MM_TO_PX` to obtain pixel dimensions before applying viewport zoom and pan.
3. WHEN rendering any element, THE Renderer SHALL multiply the element `x`, `y`, `width`, and `height` values (in mm) by `MM_TO_PX` to convert to pixel coordinates before applying viewport zoom and pan.
4. WHEN the page dimensions are 210mm × 297mm and zoom is 1.0, THE Renderer SHALL produce a page surface of approximately 794px × 1123px on the canvas.
5. THE Renderer SHALL apply the mm-to-pixel conversion before the viewport zoom multiplication so that zoom operates on pixel-space values.

### Requirement 3: Shape Drag-Create Visual Feedback

**User Story:** As a designer, I want to see a live preview of the shape I am creating while dragging, so that I can size it accurately before committing.

#### Acceptance Criteria

1. WHILE a Drag_Operation is active with `dragMode` equal to `create`, THE Renderer SHALL draw a Ghost_Preview on the canvas representing the shape being created.
2. WHILE a Drag_Operation is active with `dragMode` equal to `create`, THE Ghost_Preview SHALL use a semi-transparent fill with opacity between 0.2 and 0.4.
3. WHILE a Drag_Operation is active with `dragMode` equal to `create`, THE Ghost_Preview SHALL use a dashed border style.
4. WHILE a Drag_Operation is active with `dragMode` equal to `create`, THE Ghost_Preview SHALL update its position and dimensions on every pointer move event to reflect the current drag rectangle.
5. WHEN the Drag_Operation ends (pointerup), THE Renderer SHALL stop drawing the Ghost_Preview.

### Requirement 4: History Flooding Prevention

**User Story:** As a designer, I want each drag operation to produce a single undo entry, so that undo/redo remains usable and predictable.

#### Acceptance Criteria

1. WHEN a Drag_Operation begins (pointerdown), THE Canvas_Store SHALL capture a snapshot of the document state for the History_Stack.
2. WHILE a Drag_Operation is active, THE Canvas_Store SHALL suppress history entry creation for intermediate element updates.
3. WHEN a Drag_Operation ends (pointerup), THE Canvas_Store SHALL commit the pre-drag snapshot to the undo stack as a single history entry.
4. WHEN the user invokes undo after a completed Drag_Operation, THE Canvas_Store SHALL restore the document to the state captured at the start of that Drag_Operation in a single step.
5. THE Canvas_Store SHALL provide a mechanism (either a silent update method or a dragging flag) to distinguish intermediate drag updates from discrete user actions.

### Requirement 5: Layout Height Calculation

**User Story:** As a designer, I want the canvas editor to fill the available viewport height without overflow or content cutoff, so that I have maximum workspace area.

#### Acceptance Criteria

1. THE CanvasEditorPage SHALL calculate its height by subtracting the Layout header/navbar height from the viewport height.
2. THE CanvasEditorPage SHALL account for both the mobile header height (3.5rem / 56px) and the desktop layout where no top header is present.
3. THE CanvasEditorPage SHALL apply `overflow-hidden` to prevent scrollbars on the editor container.
4. WHEN the viewport is resized, THE CanvasEditorPage SHALL recalculate its available height to maintain full coverage without cutoff.
5. THE CanvasEditorPage SHALL not produce vertical scrollbars or clip the canvas workspace content at any standard viewport size (360px to 2560px width).

### Requirement 6: Cursor Feedback

**User Story:** As a designer, I want the cursor to change based on what I am hovering over or what tool is active, so that I have clear visual feedback about available interactions.

#### Acceptance Criteria

1. WHILE the active tool is `select` and the pointer is over empty canvas space, THE CanvasViewport SHALL display the default arrow cursor.
2. WHILE the active tool is `select` and the pointer is over a selectable element, THE CanvasViewport SHALL display the `move` cursor.
3. WHILE the active tool is `select` and the pointer is over a resize handle, THE CanvasViewport SHALL display the directionally appropriate resize cursor (`nwse-resize`, `nesw-resize`, `ns-resize`, or `ew-resize`).
4. WHILE the active tool is a shape tool (rectangle, circle, line, arrow, star, or polygon), THE CanvasViewport SHALL display the `crosshair` cursor.
5. WHILE the active tool is `pan`, THE CanvasViewport SHALL display the `grab` cursor.
6. WHILE a pan Drag_Operation is active, THE CanvasViewport SHALL display the `grabbing` cursor.
7. WHILE the active tool is `text`, THE CanvasViewport SHALL display the `text` cursor.

### Requirement 7: Group Element Rendering Offset

**User Story:** As a designer, I want grouped elements to render at their correct positions on the canvas, so that grouping does not visually displace child elements.

#### Acceptance Criteria

1. WHEN rendering a Group_Element, THE Renderer SHALL offset each child element's position by adding the group's `x` and `y` coordinates to the child's relative `x` and `y` before computing screen coordinates.
2. WHEN rendering a Group_Element, THE Renderer SHALL apply the group's `x` and `y` offset before applying viewport pan and zoom transformations.
3. WHEN rendering a Group_Element with rotation, THE Renderer SHALL apply the group rotation around the group's center point in screen coordinates, then render children at their offset positions within the rotated context.
4. WHEN a Group_Element contains nested Group_Elements, THE Renderer SHALL recursively apply parent group offsets to nested children so that all descendants render at correct absolute positions.
