# Implementation Plan: Visual Canvas Editor

## Overview

This plan implements a Canva/Figma-style visual canvas editor integrated into the existing PDF Editor application. The implementation follows a bottom-up approach: foundational types and constants first, then state management, canvas engine, UI components, templates, export engines, integration wiring, and finally product polish features (onboarding, recent files, PWA, performance, error recovery, loading states). All code lives under `src/features/canvas-editor/` using TypeScript with Zustand + Immer for state and HTML5 Canvas 2D for rendering.

## Tasks

- [x] 1. Set up project structure, types, and constants
  - [x] 1.1 Create types and constants files
    - Create `src/features/canvas-editor/types.ts` with all TypeScript interfaces and types: `CanvasDocument`, `CanvasPage`, `CanvasElement` (discriminated union), `BaseElement`, `TextElement`, `ImageElement`, `ShapeElement`, `GroupElement`, `ShadowConfig`, `Viewport`, `CanvasTool`, `SelectionState`, `BoundingBox`, `ResizeHandle`, `RotateHandle`, `SnapResult`, `SnapGuide`, `ExportOptions`, `ExportProgress`, `CanvasTemplate`, `TemplateCategory`, `TextRun`, `TextAlignment`, `CropRect`, `ShapeType`, `BorderStyle`, `ElementType`, `OnboardingStep`, `RecentFileEntry`, `AutoSaveEntry`, `LoadingContext`, `ServiceWorkerMessage`
    - Create `src/features/canvas-editor/constants.ts` with all magic numbers: zoom range [0.1, 4.0], zoom step 0.05, page dimension range [10, 5000] mm, font size range [8, 144], polygon sides range [3, 12], stroke width range [0, 50], grid spacing range [5, 100], snap threshold 5px, max pages 100, max text chars 10000, max history 50, max saved colors 32, default page size A4 (210×297mm), default text width 200px, auto-save interval 30000ms, max recent files 20, max mobile canvas dimension 4096, max thumbnail size 10240 bytes
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.4, 2.5, 4.4, 4.5, 4.6, 6.6, 7.3, 19.1, 21.6, 22.1_

- [x] 2. Implement canvas store with history
  - [x] 2.1 Create the main canvas store
    - Create `src/features/canvas-editor/store/canvas-store.ts` using Zustand with Immer middleware
    - Implement state shape: `document`, `viewport`, `selection`, `activeTool`, `gridEnabled`, `gridSpacing`, `snapEnabled`, `history`, `clipboard`, `savedColors`, `exportProgress`
    - Implement document actions: `createDocument`, `loadDocument`, `saveToLocalStorage`
    - Implement page actions: `addPage`, `removePage`, `setActivePage`, `setPageSize` with validation (10-5000mm range, max 100 pages)
    - Implement element actions: `addElement`, `updateElement`, `removeElements`, `duplicateElements`
    - Implement selection actions: `select`, `selectAll`, `deselect`
    - Implement transform actions: `moveElements`, `resizeElement`, `rotateElement`
    - Implement z-order actions: `bringToFront`, `sendToBack`, `moveLayerUp`, `moveLayerDown`
    - Implement grouping actions: `groupElements`, `ungroupElement`
    - Implement lock/visibility actions: `lockElement`, `unlockElement`, `hideElement`, `showElement`
    - Implement viewport actions: `setZoom`, `zoomBy`, `pan`
    - Implement clipboard actions: `copy`, `paste`
    - Implement tool/color actions: `setActiveTool`, `saveColor`
    - _Requirements: 1.2, 1.3, 1.7, 1.8, 2.9, 3.4, 5.1-5.9, 6.1, 6.3, 7.1-7.7, 9.5, 17.1-17.7_

  - [x] 2.2 Create the history manager
    - Create `src/features/canvas-editor/store/history.ts`
    - Implement snapshot-based history using `structuredClone` for deep cloning
    - Push previous state to undo stack before every mutating action
    - Implement `undo`: pop from undo stack, push current to redo stack, restore popped state
    - Implement `redo`: pop from redo stack, push current to undo stack, restore popped state
    - Clear redo stack on any new mutating action after undo
    - FIFO eviction when undo stack exceeds 50 entries
    - Non-mutating actions (selection, zoom, pan, tool switch) do NOT create history entries
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 2.3 Create the clipboard manager
    - Create `src/features/canvas-editor/store/clipboard.ts`
    - Implement `copy`: deep clone selected elements to clipboard array
    - Implement `paste`: insert clipboard elements with new IDs, 10px offset, highest z-index
    - _Requirements: 17.6_

  - [ ]\* 2.4 Write property tests for canvas store (page management)
    - **Property 1: Page dimension validation**
    - **Property 2: Zoom level clamping**
    - **Property 3: Zoom increment quantization**
    - **Property 4: Pan preserves element positions**
    - **Property 5: Page insertion correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

  - [ ]\* 2.5 Write property tests for history system
    - **Property 23: Undo/redo round-trip**
    - **Property 24: History stack capacity**
    - **Property 25: New action after undo clears redo**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 3. Implement canvas engine modules
  - [x] 3.1 Create geometry utilities
    - Create `src/features/canvas-editor/engine/geometry.ts`
    - Implement `Point`, `Size`, `Rect` utility types and operations
    - Implement `screenToDocument` and `documentToScreen` coordinate transforms using viewport matrix
    - Implement `transformToLocal`: apply inverse rotation to convert a point into element-local space
    - Implement `getElementEdges`: compute left, right, top, bottom, centerX, centerY for an element
    - Implement `getBoundingBox`: compute axis-aligned bounding box for a rotated element
    - Implement `isPointInRect`: axis-aligned point-in-rectangle test
    - _Requirements: 1.6, 2.9, 3.4_

  - [x] 3.2 Create transform utilities
    - Create `src/features/canvas-editor/engine/transform.ts`
    - Implement viewport affine transform: `screenPos = (docPos - panOffset) * zoomLevel`
    - Implement `snapRotation(angle, shiftHeld)`: snap to 15° increments when Shift held
    - Implement `resizeWithAspectLock(original, dragDelta, handle, locked)`: maintain aspect ratio when locked
    - Implement `calculateImagePlacement(imageSize, viewportSize, viewport)`: center and fit within 80% of viewport
    - _Requirements: 1.4, 1.5, 1.6, 3.1, 3.4, 3.7, 3.8_

  - [x] 3.3 Create hit-test engine
    - Create `src/features/canvas-editor/engine/hit-test.ts`
    - Implement `hitTest(point, elements, viewport)`: reverse z-order traversal, skip hidden/locked, apply inverse rotation, AABB test, shape-specific path test
    - Implement `hitTestHandle(point, selection)`: detect resize/rotate handle clicks
    - Implement `getElementsInRect(rect, elements)`: marquee selection (elements fully within rect)
    - _Requirements: 2.9, 3.4, 5.6_

  - [x] 3.4 Create snap engine
    - Create `src/features/canvas-editor/engine/snap.ts`
    - Implement `calculateSnap(position, size, otherElements, gridSpacing, snapEnabled)`: grid snapping + smart alignment with 5px threshold
    - Implement `getSnapGuides(position, size, elements)`: return horizontal/vertical guide lines for rendering
    - When snap disabled, return position unchanged with no guides
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 3.5 Create text layout engine
    - Create `src/features/canvas-editor/engine/text-layout.ts`
    - Implement text measurement using `CanvasRenderingContext2D.measureText()`
    - Implement word-wrapping within element width
    - Implement multi-line text rendering with alignment (left, center, right, justify)
    - Support styled runs (TextRun array) for mixed formatting within a single text element
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 2.7, 2.8_

  - [x] 3.6 Create canvas renderer
    - Create `src/features/canvas-editor/engine/renderer.ts`
    - Implement `render(state)`: clear canvas, apply viewport transform, render elements in z-order
    - Implement `renderElement(ctx, element, viewport)`: dispatch to type-specific render (text, image, shape, group)
    - Render text elements using text-layout engine with font, color, formatting
    - Render image elements with rotation, opacity, crop rect
    - Render shape elements (rectangle, circle, line, arrow, star, polygon) with fill, stroke, border style, shadow
    - Render group elements by recursively rendering children
    - Apply opacity and shadow to all element types
    - Implement dirty-rect optimization for drag operations
    - Use `requestAnimationFrame` for all visual updates
    - _Requirements: 2.1, 3.1, 4.1, 4.4, 5.1, 9.1, 9.2, 9.3_

  - [ ]\* 3.7 Write property tests for canvas engine
    - **Property 8: Element repositioning**
    - **Property 9: Image placement centering and aspect ratio**
    - **Property 10: Aspect-ratio-locked resize preserves ratio**
    - **Property 11: Rotation snap to 15-degree increments**
    - **Property 12: Shape dimensions from drag**
    - **Property 13: Shift-constrained shapes produce squares/circles**
    - **Property 22: Snap-to-grid behavior**
    - **Validates: Requirements 2.9, 3.1, 3.4, 3.7, 3.8, 4.1, 4.2, 4.3, 6.1, 6.3**

  - [ ]\* 3.8 Write property tests for layers and elements
    - **Property 6: Text element creation at position**
    - **Property 7: Text formatting round-trip**
    - **Property 14: Shape styling storage**
    - **Property 15: Polygon side count clamping**
    - **Property 16: Z-order rendering invariant**
    - **Property 17: Z-order extremes**
    - **Property 18: Z-order layer swap**
    - **Property 19: Lock prevents all modifications**
    - **Property 20: Hide excludes from render but preserves data**
    - **Property 21: Group/ungroup round-trip preserves positions**
    - **Validates: Requirements 2.1, 2.3-2.8, 4.4, 4.5, 4.6, 5.1-5.9**

- [x] 4. Checkpoint - Core engine verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement input handling and tool hooks
  - [x] 5.1 Create input handler hook
    - Create `src/features/canvas-editor/hooks/useCanvasInput.ts`
    - Handle `onPointerDown`: tool-specific behavior (select → hit test + select, shape tools → start drag-create, text → create text element, image → trigger file picker, pan → start panning, crop → enter crop mode)
    - Handle `onPointerMove`: drag-move selected elements with snap, drag-resize with handles, drag-create shapes, pan viewport
    - Handle `onPointerUp`: finalize drag operations, commit element creation
    - Handle `onWheel`: Ctrl/Cmd + wheel → zoom by 5% increments, plain wheel → vertical scroll/pan
    - Apply snap engine during all drag operations
    - Show lift effect (scale 1.02) during element drag
    - _Requirements: 1.5, 1.6, 2.1, 2.9, 3.4, 4.1, 4.2, 4.3, 6.1, 6.2, 16.11_

  - [x] 5.2 Create canvas renderer hook
    - Create `src/features/canvas-editor/hooks/useCanvasRenderer.ts`
    - Subscribe to canvas store state changes
    - Call renderer on every state change via `requestAnimationFrame`
    - Handle canvas element ref and 2D context setup
    - Manage device pixel ratio for crisp rendering on HiDPI displays
    - _Requirements: 5.1, 9.6_

  - [x] 5.3 Create keyboard shortcuts hook
    - Create `src/features/canvas-editor/hooks/useCanvasShortcuts.ts`
    - Map tool shortcuts: V (select), T (text), R (rectangle), C (circle), L (line), I (image upload)
    - Map action shortcuts: Delete/Backspace (delete selected), Escape (deselect), +/- (zoom)
    - Map modifier shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo), Ctrl+A (select all), Ctrl+D (duplicate), Ctrl+G (group), Ctrl+Shift+G (ungroup), Ctrl+C (copy), Ctrl+V (paste), Ctrl+S (save)
    - Map arrow keys: 1px move (10px with Shift)
    - Map spacebar: hold for pan mode
    - Map "?" key: toggle shortcut reference panel
    - Handle macOS Cmd vs Windows/Linux Ctrl
    - _Requirements: 7.1, 7.2, 16.10, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

  - [x] 5.4 Create auto-save hook (enhanced with recovery)
    - Create `src/features/canvas-editor/hooks/useAutoSave.ts`
    - Implement 30-second interval auto-save that checks dirty flag before writing
    - Immediate save on Ctrl+S with "Saved" toast confirmation
    - Register `beforeunload` handler for immediate save on tab close/navigation
    - Persist auto-save under key `canvas-editor-autosave-{documentId}` (separate from manual saves at `canvas-editor-document-{id}`)
    - Persist saved colors under key `canvas-editor-palette`
    - Implement `checkForRecovery(documentId)`: detect existing auto-save data, return recovery metadata
    - Handle localStorage quota exceeded gracefully with non-blocking warning toast
    - _Requirements: 9.5, 17.7, 22.1, 22.2, 22.7, 22.8_

  - [ ]\* 5.5 Write property tests for shortcuts and productivity
    - **Property 31: Select-all selects every element**
    - **Property 32: Duplicate produces offset copy**
    - **Property 33: Arrow key movement precision**
    - **Property 34: Save persists document to localStorage**
    - **Validates: Requirements 17.1, 17.2, 17.5, 17.7**

- [x] 6. Implement UI components
  - [x] 6.1 Create CanvasEditorPage and CanvasWorkspace
    - Create `src/features/canvas-editor/components/CanvasEditorPage.tsx` as the route-level page component
    - Create `src/features/canvas-editor/components/CanvasWorkspace.tsx` as the main canvas container
    - Create `src/features/canvas-editor/components/CanvasViewport.tsx` handling zoom/pan viewport wrapper
    - Render HTML5 Canvas element with proper sizing and device pixel ratio
    - Use dark background (#1a1a2e) with white page surface and shadow-xl
    - Full-width content area without standard padding
    - _Requirements: 15.2, 16.4_

  - [x] 6.2 Create selection and snap overlays
    - Create `src/features/canvas-editor/components/SelectionOverlay.tsx` with resize handles (8 directional + rotate)
    - Create `src/features/canvas-editor/components/SnapGuideOverlay.tsx` rendering alignment guide lines
    - Create `src/features/canvas-editor/components/TextEditOverlay.tsx` with contenteditable for inline text editing
    - Selection handles: minimum 44×44px touch targets
    - _Requirements: 2.2, 6.2, 6.4, 16.3_

  - [x] 6.3 Create FloatingToolbar
    - Create `src/features/canvas-editor/components/FloatingToolbar.tsx`
    - Floating toolbar at top of canvas viewport with rounded-xl, shadow-md, backdrop-blur-sm
    - Icon-only buttons grouped by function: selection tools | shape tools | text/image tools | zoom controls
    - Groups separated by subtle 1px dividers
    - Active tool highlighted with primary color
    - Tooltips with tool name and shortcut (500ms delay)
    - Responsive: compact single-row on viewports < 768px
    - _Requirements: 16.1, 16.5, 16.6, 16.12_

  - [x] 6.4 Create PropertiesPanel with sub-panels
    - Create `src/features/canvas-editor/components/PropertiesPanel.tsx` (320px width, slide-in animation duration-200 ease-out)
    - Create `src/features/canvas-editor/components/properties/TextProperties.tsx` (font family, size, color, bold/italic/underline, alignment)
    - Create `src/features/canvas-editor/components/properties/ShapeProperties.tsx` (fill, stroke, stroke width, border style, polygon sides)
    - Create `src/features/canvas-editor/components/properties/ImageProperties.tsx` (aspect ratio lock, crop, original dimensions)
    - Create `src/features/canvas-editor/components/properties/PageProperties.tsx` (page size presets, custom dimensions, background color, grid toggle)
    - Create `src/features/canvas-editor/components/properties/ColorPicker.tsx` (hex input, RGB sliders, visual spectrum)
    - Create `src/features/canvas-editor/components/properties/ShadowControls.tsx` (offset-x/y, blur, color with alpha)
    - Create `src/features/canvas-editor/components/properties/OpacitySlider.tsx` (0-100% in 1% increments)
    - Show contextual controls based on selected element type; show page settings when nothing selected
    - Responsive: collapse to bottom sheet (max-height 50vh) with drag handle on viewports < 768px
    - All controls with 44×44px minimum touch targets, hover/active/focus states
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 16.2, 16.3, 16.6, 16.9_

  - [x] 6.5 Create PageNavigator and MinimapOverlay
    - Create `src/features/canvas-editor/components/PageNavigator.tsx` with page thumbnails sidebar, add/remove page controls
    - Create `src/features/canvas-editor/components/MinimapOverlay.tsx` (120×160px, bottom-right corner, viewport indicator rectangle, click-to-navigate)
    - _Requirements: 1.7, 1.8, 16.8_

  - [x] 6.6 Create EmptyState and ShortcutPanel
    - Create `src/features/canvas-editor/components/EmptyState.tsx` with centered large icon, "Start designing" message, quick-action buttons (Add Text, Add Image, Add Shape, Use Template)
    - Create `src/features/canvas-editor/components/ShortcutPanel.tsx` listing all shortcuts grouped by category, accessible via "?" key or help button
    - _Requirements: 16.13, 17.8_

  - [x] 6.7 Create ExportDialog
    - Create `src/features/canvas-editor/components/ExportDialog.tsx`
    - Format selection: PDF, PNG, SVG, DOCX
    - Page selection: all pages or specific pages
    - DPI selection for PNG (72, 150, 300)
    - Batch export toggle
    - "Insert into PDF" option for PDF format
    - Progress indicator showing current page / total pages
    - Error display with format-specific suggestions
    - Loading states with skeleton/spinner within affected area
    - _Requirements: 10.5, 10.6, 10.7, 10.8, 11.1, 11.2, 14.1, 14.5, 15.3, 16.14_

- [x] 7. Checkpoint - UI components verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement templates
  - [x] 8.1 Create template registry and templates
    - Create `src/features/canvas-editor/templates/index.ts` with template registry and lookup
    - Create `src/features/canvas-editor/templates/blank.ts` (blank A4 page)
    - Create `src/features/canvas-editor/templates/invoice.ts` (invoice layout with text placeholders, lines, logo area)
    - Create `src/features/canvas-editor/templates/resume.ts` (resume layout with sections, header, contact info)
    - Create `src/features/canvas-editor/templates/letter.ts` (formal letter layout with header, body, signature area)
    - Create `src/features/canvas-editor/templates/presentation.ts` (landscape slide with title, subtitle, content area)
    - Each template includes thumbnail, category, and pre-configured pages with elements
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.2 Create TemplatePicker component
    - Create `src/features/canvas-editor/components/TemplatePicker.tsx`
    - Display templates categorized by type with visual thumbnail previews (min 120×160px)
    - Load within 300ms, create document from template within 500ms
    - Template creates independent copy (no reference to original)
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [ ]\* 8.3 Write property test for template independence
    - **Property 26: Template independence**
    - **Validates: Requirements 8.4**

- [x] 9. Implement export engines
  - [x] 9.1 Create PDF export engine
    - Create `src/features/canvas-editor/export/pdf-export.ts`
    - Implement `ExportEngine` interface with `exportPage` and `exportDocument`
    - Use `pdf-lib` to create PDFDocument with matching page dimensions
    - Text elements → `page.drawText()` with embedded fonts (vector, not rasterized)
    - Shape elements → `page.drawRectangle()`, `page.drawEllipse()`, `page.drawLine()`, custom paths
    - Image elements → `pdfDoc.embedPng()`/`embedJpg()` at original resolution
    - Apply opacity via graphics state
    - Handle rotation transforms
    - Error handling: catch memory/processing errors, display error message, no corrupted file download
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 9.2 Create PNG export engine
    - Create `src/features/canvas-editor/export/png-export.ts`
    - Implement `ExportEngine` interface
    - Create off-screen `OffscreenCanvas` at target DPI resolution
    - Pixel dimensions = `floor(pageMm / 25.4 × dpi)` for each axis
    - Render all visible elements using the same renderer logic
    - Export via `canvas.convertToBlob({ type: 'image/png' })`
    - Preserve alpha transparency for elements with opacity < 100%
    - Multi-page: generate one PNG per page
    - Error handling: catch canvas size exceeding browser limits
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 9.3 Create SVG export engine
    - Create `src/features/canvas-editor/export/svg-export.ts`
    - Implement `ExportEngine` interface
    - Build SVG DOM tree programmatically (SVG 1.1 compliant)
    - Text → `<text>` with font-family, font-size, font-weight, font-style, fill, text-anchor
    - Shapes → `<rect>`, `<circle>`, `<line>`, `<polygon>`, `<path>` with fill, stroke, stroke-width, opacity
    - Images → `<image>` with base64-encoded data URI href
    - Apply rotation via `transform="rotate(...)"` attribute
    - Serialize via `XMLSerializer`
    - Multi-page: one SVG file per page
    - Error handling: catch memory constraints from large images
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 9.4 Create DOCX export engine
    - Create `src/features/canvas-editor/export/docx-export.ts`
    - Implement `ExportEngine` interface using `docx` npm package
    - Text elements → `Paragraph` with `TextRun` preserving font family, size, bold, italic, underline, color, alignment
    - Image elements → `ImageRun` with original resolution bytes
    - Shapes that can't be natively represented → rasterize at 150 DPI via off-screen canvas, embed as images
    - Page dimensions set via `SectionProperties`
    - Error handling: catch failures, display error, no corrupted file
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 9.5 Create batch export coordinator
    - Create `src/features/canvas-editor/export/batch-export.ts`
    - Iterate pages, call selected format engine per page
    - Wrap results in ZIP using `jszip` with naming pattern `{name}-page-{NNN}.{ext}` (NNN = zero-padded 3 digits)
    - ZIP named `{document-name}-batch.zip`
    - Continue on per-page failure, collect errors
    - Report summary: which pages succeeded, which failed
    - Progress reporting: current page / total pages
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ]\* 9.6 Write property tests for export engines
    - **Property 27: DPI-to-pixel dimension calculation**
    - **Property 28: Multi-page export file count**
    - **Property 29: Batch export naming and packaging**
    - **Property 30: Batch export resilience**
    - **Validates: Requirements 11.2, 11.4, 12.5, 14.1, 14.2, 14.3, 14.4**

- [x] 10. Checkpoint - Export engines verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Navigation integration and routing
  - [x] 11.1 Add navigation category and route
    - Add `design` category to `src/features/navigation/categories.ts` (or equivalent navigation config) with label "Design" and tool entry `{ path: '/canvas-editor', label: 'Canvas Editor', categoryId: 'design' }`, positioned after existing categories
    - Add route `<Route path="/canvas-editor" element={<CanvasEditorPage />} />` to `src/app/router.tsx`
    - Ensure CanvasEditorPage renders within existing Layout component
    - Support direct URL navigation (deep linking) to `/canvas-editor`
    - _Requirements: 15.1, 15.2, 15.4_

  - [x] 11.2 Implement PDF pipeline integration
    - Implement "Insert into PDF" flow: render current page as PDF blob via pdf-lib, navigate to `/merge` with rendered PDF pre-loaded
    - Implement "Open PDF page in canvas" flow: render PDF page to canvas using pdfjs-dist, convert to PNG data URL, create locked ImageElement as background layer (z-index 0)
    - Handle corrupted/unsupported PDF gracefully with error message and empty canvas fallback
    - _Requirements: 15.3, 15.5, 15.6_

  - [x] 11.3 Install docx dependency
    - Add `docx` package to project dependencies (exact version pinned)
    - Verify build still passes with new dependency
    - _Requirements: 13.1_

- [x] 12. Final wiring and polish
  - [x] 12.1 Wire all components together in CanvasEditorPage
    - Connect CanvasEditorPage to render: CanvasWorkspace, FloatingToolbar, PropertiesPanel, PageNavigator, MinimapOverlay, ExportDialog, TemplatePicker, ShortcutPanel, EmptyState
    - Wire input handler hook to canvas element
    - Wire renderer hook to canvas element
    - Wire shortcuts hook to document-level key events
    - Wire auto-save hook to store
    - Ensure all state transitions use CSS transitions/spring animations (150-300ms)
    - Apply consistent typography scale (24/20/16px headings, 14px body, 12px captions, Inter/system font stack)
    - _Requirements: 15.2, 16.2, 16.4, 16.7, 16.15_

  - [x] 12.2 Implement responsive layout adaptations
    - Properties panel → bottom sheet (max-height 50vh) with drag handle on viewports < 768px
    - Toolbar → compact single-row layout on viewports < 768px
    - Ensure all interactive controls maintain 44×44px minimum touch targets
    - _Requirements: 16.3, 16.6_

  - [ ]\* 12.3 Write unit tests for integration points
    - Test navigation category registration
    - Test route loading and deep linking
    - Test PDF pipeline handoff (Insert into PDF, Open PDF in canvas)
    - Test localStorage persistence and recovery
    - Test error boundary behavior for export failures
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 17.7_

- [x] 13. Checkpoint - Core feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement onboarding flow
  - [x] 14.1 Create onboarding store
    - Create `src/features/canvas-editor/store/onboarding-store.ts` using Zustand
    - Implement state: `isOnboarded`, `tourActive`, `currentStep`, `totalSteps`
    - Implement actions: `checkOnboardingStatus()` (reads `canvas-editor-onboarded` from localStorage), `startTour()`, `nextStep()`, `skipTour()`, `completeTour()`, `resetTour()`
    - On `completeTour` or `skipTour`: set `canvas-editor-onboarded` to `"true"` in localStorage
    - On `resetTour`: set `tourActive = true`, `currentStep = 0` (for replay from help menu)
    - _Requirements: 18.1, 18.4, 18.5_

  - [x] 14.2 Create OnboardingTour component
    - Create `src/features/canvas-editor/components/OnboardingTour.tsx`
    - Render semi-transparent dark overlay (`bg-black/60`) over entire viewport
    - Cut out spotlight region around target element with 4px glow border
    - Position tooltip card adjacent to spotlight with step title, description, "Next" and "Skip" buttons
    - Define 5 steps: Toolbar → Canvas Area → Properties Panel → Export Button → Page Navigator
    - Each step targets a CSS selector for the highlighted region
    - Support keyboard navigation: Enter/→ for next, Escape to dismiss
    - Include "X" close button on each step for dismissal
    - On final step completion or skip: call `completeTour()` / `skipTour()` from onboarding store
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.6_

  - [x] 14.3 Wire onboarding into CanvasEditorPage
    - On mount: call `checkOnboardingStatus()` from onboarding store
    - If `isOnboarded === false`: automatically trigger `startTour()`
    - Add "Show Tour" button to ShortcutPanel / help menu that calls `resetTour()`
    - Ensure tour does not block interaction when dismissed (no pointer-events on overlay after dismiss)
    - _Requirements: 18.1, 18.5, 18.6_

  - [ ]\* 14.4 Write property test for onboarding persistence
    - **Property 35: Onboarding completion persists flag**
    - **Validates: Requirements 18.4**

- [x] 15. Implement recent files
  - [x] 15.1 Create recent files store
    - Create `src/features/canvas-editor/store/recent-files-store.ts` using Zustand
    - Implement state: `recentFiles: RecentFileEntry[]`, `isLoading: boolean`
    - Implement `loadRecentFiles()`: read from localStorage key `pdf-editor-recent-files`, parse JSON array, sort by `lastOpened` descending
    - Implement `addRecentFile(entry)`: if list length ≥ 20, remove oldest entry before adding; re-sort by `lastOpened` descending; write back to localStorage
    - Implement `removeRecentFile(id)`: remove entry from list, optionally delete associated document data from localStorage, write back
    - Implement `openRecentFile(id)`: read document data from localStorage using `documentRef` key, load into canvas store
    - Implement `generateThumbnail(document)`: render page 1 to 120×160 off-screen canvas, export as JPEG at quality 0.6, ensure ≤ 10KB via quality reduction loop, return base64 string
    - Handle corrupted entries: if JSON parse fails or document data missing, remove entry and show toast
    - _Requirements: 19.1, 19.2, 19.4, 19.5, 19.6, 19.7_

  - [x] 15.2 Create RecentFilesPanel component
    - Create `src/features/canvas-editor/components/RecentFilesPanel.tsx`
    - Display last 10 documents as visual cards with thumbnail, name, and relative time (e.g., "2 hours ago")
    - Each card clickable to open document via `openRecentFile(id)`
    - Each card has a delete button to remove from recent list
    - Show on home page or canvas editor landing when no document is open
    - Sort by most recent first
    - _Requirements: 19.3, 19.4, 19.5, 19.7_

  - [x] 15.3 Wire recent files into document lifecycle
    - On document open/create: call `addRecentFile` with document metadata and generated thumbnail
    - On document save: update the `lastOpened` timestamp for the existing entry
    - Integrate RecentFilesPanel into CanvasEditorPage empty state or landing view
    - _Requirements: 19.1, 19.3_

  - [ ]\* 15.4 Write property tests for recent files
    - **Property 36: Recent files capacity and ordering invariant**
    - **Property 37: Recent file entry structural completeness**
    - **Property 38: Recent file deletion correctness**
    - **Validates: Requirements 19.1, 19.2, 19.5, 19.7**

- [x] 16. Implement PWA support
  - [x] 16.1 Update manifest.json and add PWA icons
    - Update `public/manifest.json` with: name "PDF Editor", short_name "PDF Editor", start_url "/", display "standalone", theme_color "#1a1a2e", background_color "#ffffff", categories ["productivity", "utilities"], description
    - Add icons: `public/icons/icon-192.png` (192×192), `public/icons/icon-512.png` (512×512), `public/icons/icon-512-maskable.png` (512×512, purpose "maskable")
    - Ensure `<link rel="manifest" href="/manifest.json">` exists in `index.html`
    - _Requirements: 20.1, 20.5_

  - [x] 16.2 Create Service Worker
    - Create `public/service-worker.js` implementing cache-first strategy for app shell and network-first for dynamic content
    - On `install`: pre-cache all app shell assets (HTML, CSS, JS bundles, fonts, manifest, icons)
    - On `activate`: clean up old cache versions (`pdf-editor-shell-v{version}`), claim all clients
    - On `fetch`: route requests through appropriate cache strategy (cache-first for shell/fonts/static, network-first for dynamic)
    - On `message`: handle `SKIP_WAITING` message to activate new SW version
    - Implement Tesseract language pack caching: intercept language pack downloads, cache in `pdf-editor-tesseract-v1` cache for offline OCR
    - _Requirements: 20.2, 20.3, 20.6, 20.7_

  - [x] 16.3 Create Service Worker registration
    - Create `src/app/sw-register.ts`
    - Register `/service-worker.js` on app startup (only if `'serviceWorker' in navigator`)
    - Listen for `updatefound` event on registration
    - When new SW activates while existing controller exists: show "New version available — Refresh" toast
    - Toast click handler: post `SKIP_WAITING` message to new SW, reload page
    - Call `registerServiceWorker()` from app entry point (`src/app/App.tsx` or `src/main.tsx`)
    - _Requirements: 20.2, 20.6_

  - [x] 16.4 Create InstallPrompt component and hook
    - Create `src/features/canvas-editor/hooks/useInstallPrompt.ts`
    - Listen for `beforeinstallprompt` event, store event reference in state
    - Detect standalone mode via `window.matchMedia('(display-mode: standalone)')` — hide prompt if already installed
    - Check localStorage for dismissed state (`pwa-install-dismissed`)
    - Create `src/features/canvas-editor/components/InstallPrompt.tsx`
    - Render as slim banner in navigation area: app icon + "Install PDF Editor for offline use" + Install button + X dismiss
    - On Install click: call `event.prompt()`, await user choice
    - On dismiss: set `pwa-install-dismissed` in localStorage, hide banner
    - _Requirements: 20.4, 20.5_

- [x] 17. Implement performance optimizations for mobile
  - [x] 17.1 Implement code splitting and lazy loading
    - Convert canvas editor route to lazy-loaded: `const CanvasEditorPage = lazy(() => import(...))`
    - Convert OCR route to lazy-loaded if not already
    - Convert export engines to a separate chunk loaded on-demand (only when user initiates export)
    - Wrap lazy routes in `<Suspense fallback={<EditorSkeleton />}>` (skeleton from task 18)
    - Verify initial bundle stays under 200KB gzipped (React, Zustand, Router, Layout, NavBar)
    - _Requirements: 21.2, 21.4_

  - [x] 17.2 Implement mobile canvas dimension clamping
    - Add `calculateCanvasDimensions(pageWidth, pageHeight, dpr, isMobile)` utility to `src/features/canvas-editor/engine/geometry.ts`
    - Detect mobile via viewport width or `navigator.maxTouchPoints`
    - Limit canvas pixel dimensions to max 4096×4096 on mobile while preserving aspect ratio
    - Apply clamped dimensions in `useCanvasRenderer` hook when setting up canvas element
    - _Requirements: 21.6_

  - [x] 17.3 Implement GPU compositing and touch optimizations
    - Add `touch-action: none` to canvas element for native touch handling without browser interference
    - Add `will-change: transform` to animated elements: toolbar transitions, panel slides, page transitions, onboarding spotlight, skeleton animations
    - Ensure all touch interactions (tap, drag, pinch) respond within 100ms with visual feedback
    - Handle pinch-to-zoom and two-finger pan natively in input handler (from task 5.1)
    - _Requirements: 21.3, 21.5, 21.7_

  - [ ]\* 17.4 Write property test for mobile canvas clamping
    - **Property 39: Mobile canvas dimension clamping**
    - **Validates: Requirements 21.6**

- [x] 18. Implement loading states and skeleton UI
  - [x] 18.1 Create skeleton layout components
    - Create `src/features/canvas-editor/components/skeletons/EditorSkeleton.tsx`: toolbar skeleton (row of rounded rects) + canvas area skeleton (large rect with subtle pulse animation) + properties panel skeleton (stacked lines)
    - Create `src/features/canvas-editor/components/skeletons/ExportProgressSkeleton.tsx`: format icon + "Exporting page X of Y" text + determinate progress bar (not spinner)
    - Create `src/features/canvas-editor/components/skeletons/ImageUploadPlaceholder.tsx`: positioned placeholder at target coordinates with pulse animation + "Loading image..." text
    - Create `src/features/canvas-editor/components/skeletons/TemplateLoadSkeleton.tsx`: full-size template thumbnail with shimmer overlay (CSS gradient animation)
    - All skeletons appear within 100ms of operation starting
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 18.2 Create loading state hook and integrate
    - Create `src/features/canvas-editor/hooks/useLoadingState.ts`
    - Manage centralized loading context: `LoadingContext` type with variants (editor-init, export, image-upload, template-load)
    - Track operation start time; when operation exceeds 5 seconds, set `showExtendedMessage = true`
    - Extended message: "Large file — this may take a moment" displayed below progress indicator
    - Never display full-page blocking spinner — all loading states localized to affected region
    - Integrate skeletons into: CanvasEditorPage (route transition), ExportDialog (export progress), CanvasWorkspace (image upload), TemplatePicker (template load)
    - _Requirements: 23.5, 23.6, 23.7_

  - [ ]\* 18.3 Write property test for export progress format
    - **Property 43: Export progress text format**
    - **Validates: Requirements 23.2**

- [x] 19. Implement error recovery system
  - [x] 19.1 Create RecoveryPrompt component
    - Create `src/features/canvas-editor/components/RecoveryPrompt.tsx`
    - Display as modal dialog when auto-saved data from previous session is detected
    - Show document name and relative time since last auto-save (e.g., "Last saved: 5 minutes ago")
    - "Restore" button: load auto-saved document into canvas store, delete auto-save key, resume editing within 1 second
    - "Discard" button: delete auto-save entry from localStorage, present fresh canvas
    - _Requirements: 22.3, 22.4, 22.5, 22.6_

  - [x] 19.2 Wire recovery into canvas editor lifecycle
    - On CanvasEditorPage mount: call `checkForRecovery(documentId)` from auto-save hook
    - If recovery data exists: show RecoveryPrompt before loading canvas
    - If recovery data is corrupted (JSON parse fails): remove key, show toast "Recovery data was corrupted", present fresh canvas
    - Ensure auto-save key `canvas-editor-autosave-{id}` is separate from manual save key `canvas-editor-document-{id}`
    - _Requirements: 22.3, 22.5, 22.6, 22.7_

  - [ ]\* 19.3 Write property tests for auto-save and recovery
    - **Property 40: Auto-save triggers only when dirty**
    - **Property 41: Auto-save restore round-trip**
    - **Property 42: Auto-save key isolation from manual saves**
    - **Validates: Requirements 22.1, 22.5, 22.7**

- [x] 20. Checkpoint - Product polish verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Final integration of product polish features
  - [x] 21.1 Wire all product polish components into app
    - Add OnboardingTour to CanvasEditorPage (conditional on onboarding state)
    - Add RecentFilesPanel to canvas editor landing/empty state
    - Add InstallPrompt to app Layout or NavBar component
    - Add RecoveryPrompt to CanvasEditorPage (conditional on recovery data)
    - Add EditorSkeleton as Suspense fallback for lazy-loaded canvas editor route
    - Call `registerServiceWorker()` from app entry point
    - _Requirements: 18.1, 19.3, 20.2, 20.4, 22.3, 23.1_

  - [ ]\* 21.2 Write unit tests for product polish integration
    - Test onboarding tour step navigation and localStorage persistence
    - Test recent files panel rendering, card click, and delete
    - Test PWA install prompt visibility logic (standalone detection, dismiss persistence)
    - Test Service Worker registration and update toast
    - Test recovery prompt display logic and restore/discard flows
    - Test skeleton components render correctly for each loading context
    - Test mobile canvas dimension clamping with various DPR values
    - _Requirements: 18.1-18.6, 19.1-19.7, 20.1-20.7, 21.6, 22.1-22.8, 23.1-23.7_

- [x] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties from the design document (43 total across 15 test files)
- Unit tests validate specific examples, edge cases, and integration points
- The design uses TypeScript throughout — all implementation uses TypeScript
- Existing dependencies leveraged: `pdf-lib`, `jszip`, `zustand`, `pdfjs-dist`
- Only new dependency: `docx` for DOCX export
- All rendering is client-side using HTML5 Canvas 2D API
- State management follows existing app pattern (Zustand + Immer)
- Product polish features (tasks 14-21) build on the core canvas editor and can be developed in parallel after task 13
- PWA Service Worker is written as vanilla JS in `public/service-worker.js` (not bundled by Vite)
- Auto-save uses a separate localStorage key namespace from manual saves to prevent data conflicts
- Mobile performance optimizations (task 17) apply to the existing canvas engine without architectural changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["2.4", "2.5", "3.6"] },
    { "id": 4, "tasks": ["3.7", "3.8", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "6.1"] },
    { "id": 6, "tasks": ["5.5", "6.2", "6.3", "6.5", "6.6"] },
    { "id": 7, "tasks": ["6.4", "6.7", "8.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "9.1", "9.2", "9.3", "9.4", "11.3"] },
    { "id": 9, "tasks": ["9.5", "9.6", "11.1"] },
    { "id": 10, "tasks": ["11.2", "12.1"] },
    { "id": 11, "tasks": ["12.2", "12.3"] },
    { "id": 12, "tasks": ["14.1", "15.1", "16.1", "17.1", "18.1"] },
    { "id": 13, "tasks": ["14.2", "15.2", "16.2", "17.2", "17.3", "18.2"] },
    { "id": 14, "tasks": ["14.3", "14.4", "15.3", "15.4", "16.3", "16.4", "17.4", "18.3"] },
    { "id": 15, "tasks": ["19.1", "19.2", "19.3"] },
    { "id": 16, "tasks": ["21.1", "21.2"] }
  ]
}
```
