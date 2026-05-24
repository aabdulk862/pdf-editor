# Implementation Plan: PDF Editor Revamp

## Overview

This plan migrates the existing Create React App + Bootstrap + JavaScript PDF editor to a modern Vite + TypeScript + Tailwind CSS application with feature-based architecture, dual PDF library approach (pdf-lib + pdfjs-dist), Zustand state management, Web Workers, Canvas-based annotations, and comprehensive testing with Vitest + fast-check.

## Tasks

- [x] 1. Project scaffolding and build system setup
  - [x] 1.1 Initialize Vite + TypeScript project structure
    - Create vite.config.ts, tsconfig.json with strict mode enabled
    - Install core dependencies: react, react-dom, react-router-dom, typescript
    - Install dev dependencies: vite, @vitejs/plugin-react, vitest, @testing-library/react
    - Set up dist/ output directory configuration
    - Create src/app/App.tsx, src/app/router.tsx, src/app/providers.tsx entry points
    - Create public/index.html with proper Vite script tag
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 1.2 Configure Tailwind CSS and design tokens
    - Install tailwindcss, postcss, autoprefixer
    - Create tailwind.config.ts with color palette (primary, secondary, accent, background, text, error, success), spacing scale, typography settings
    - Create src/index.css with Tailwind directives
    - Configure dark mode support via class strategy
    - _Requirements: 4.1, 4.3, 4.4, 26.1_

  - [x] 1.3 Configure ESLint, Prettier, and pre-commit hooks
    - Install eslint, prettier, eslint-config-prettier, @typescript-eslint/eslint-plugin, eslint-plugin-react-hooks
    - Create .eslintrc.cjs with TypeScript-aware and React-specific rules
    - Create .prettierrc with shared formatting config
    - Install husky and lint-staged for pre-commit hooks
    - Add lint, format, and prepare scripts to package.json
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6_

  - [x] 1.4 Set up testing framework
    - Install vitest, @testing-library/react, @testing-library/jest-dom, jsdom
    - Install fast-check and @fast-check/vitest for property-based testing
    - Create vitest.config.ts with jsdom environment
    - Create test/ directory structure (unit/, property/, integration/, fixtures/)
    - Add test fixtures: sample-1page.pdf, sample-5pages.pdf
    - Add test script to package.json
    - _Requirements: 2.1, 33.1_

  - [x] 1.5 Create feature directory scaffold
    - Create src/features/ with all 28 feature directories (merge, split, rotate, delete-pages, reorder, compress, image-to-pdf, page-numbers, extract-images, text-overlay, highlight, signature, stamps, watermarks, password-protect, unlock, redact, metadata, form-fill, compare, extract-text, pdf-to-image, flatten, crop, headers-footers, bookmarks, page-size, linearize, duplicate-pages)
    - Each with internal components/, hooks/, utils/ subdirectories
    - Create src/components/ui/, src/core/, src/store/, src/hooks/, src/types/, src/utils/, src/workers/ directories
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Core type definitions and shared interfaces
  - [x] 2.1 Define core TypeScript types
    - Create src/types/pdf.ts with PdfDocument, PdfMetadata, PdfPage, Bookmark, FormField interfaces
    - Create src/types/operations.ts with PageRange, PageNumberConfig, HeaderFooterConfig, WatermarkConfig, CropBox, PageSize, StampType, OperationResult
    - Create src/types/annotations.ts with AnnotationTool, Stroke, TextStyle, AnnotationData, AnnotationId
    - Create src/types/common.ts with Point, Rect, Size, and shared utility types
    - _Requirements: 2.2, 2.5, 5.3_

  - [x] 2.2 Define engine interfaces
    - Create src/core/pdf-engine/index.ts with IPdfEngine interface (load, save, rotatePages, deletePages, reorderPages, duplicatePages, splitByRanges, merge, addPageNumbers, addHeadersFooters, addWatermark, addTextOverlay, embedAnnotation, imagesToPdf, compress, flatten, cropPages, resizePages, linearize, getMetadata, setMetadata, getBookmarks, setBookmarks, getFormFields, fillFormFields, encrypt, decrypt, redact)
    - Create src/core/render-engine/index.ts with IRenderEngine interface (loadDocument, renderPage, renderThumbnail, extractText, extractImages, getPageCount, comparePages)
    - Create src/core/annotation-engine/index.ts with IAnnotationEngine interface (initCanvas, setTool, addHighlight, addSignature, addStamp, addTextOverlay, removeAnnotation, getAnnotations, clear)
    - _Requirements: 2.5, 5.3_

- [x] 3. State management layer
  - [x] 3.1 Implement Zustand store with theme state
    - Install zustand
    - Create src/store/index.ts with AppState interface
    - Create src/store/theme.ts with light/dark toggle and localStorage persistence
    - _Requirements: 34.1, 34.2, 26.1, 26.3, 26.4, 26.5_

  - [ ]\* 3.2 Write property test for theme persistence round-trip
    - **Property 16: Theme persistence round-trip**
    - **Validates: Requirements 26.3, 26.4**

  - [x] 3.3 Implement operation history store (undo/redo)
    - Create src/store/history.ts with undo/redo stacks, pushOperation, undo, redo, canUndo, canRedo
    - Implement 50-entry max stack with oldest-discard behavior
    - Implement redo stack clearing on new operation
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [ ]\* 3.4 Write property tests for undo/redo stack
    - **Property 13: Undo stack bounded size invariant**
    - **Validates: Requirements 25.1**

  - [ ]\* 3.5 Write property test for undo/redo round-trip
    - **Property 14: Undo/redo round-trip restores state**
    - **Validates: Requirements 25.2, 25.3**

  - [ ]\* 3.6 Write property test for new operation clearing redo stack
    - **Property 15: New operation after undo clears redo stack**
    - **Validates: Requirements 25.5**

  - [x] 3.7 Implement download history store
    - Create src/store/downloads.ts with bounded FIFO queue (max 50 entries)
    - Implement addDownload, clearDownloads, re-download functionality
    - Store file data in memory with DownloadEntry interface
    - _Requirements: 24.1, 24.2, 24.3, 24.5, 24.6_

  - [ ]\* 3.8 Write property test for download history FIFO queue
    - **Property 12: Download history bounded FIFO queue**
    - **Validates: Requirements 24.1, 24.6**

- [x] 4. Shared UI components
  - [x] 4.1 Implement shared UI primitives
    - Create src/components/ui/Button.tsx with variants, sizes, disabled state, loading state
    - Create src/components/ui/Input.tsx with validation states, labels, error messages
    - Create src/components/ui/Modal.tsx with accessible dialog, close on escape/outside click
    - Create src/components/ui/Skeleton.tsx for loading placeholders
    - All components use Tailwind CSS, support dark mode, meet 44x44px touch targets
    - _Requirements: 4.1, 27.3, 27.4, 30.1, 30.2, 32.1_

  - [x] 4.2 Implement Toast notification system
    - Create src/components/ui/Toast.tsx with success/warning/error severity, auto-dismiss (5s), manual dismiss, stacking (max 3 visible)
    - Create src/hooks/useToast.ts hook for triggering toasts
    - Implement aria-live regions (assertive for errors, polite for success/warning)
    - Implement hover-to-pause auto-dismiss behavior
    - _Requirements: 31.1, 31.4, 31.5, 31.7_

  - [x] 4.3 Implement ProgressBar component
    - Create src/components/ui/ProgressBar.tsx with determinate (percentage) and indeterminate modes
    - Show after 500ms delay, disappear within 300ms on completion
    - Include accessible ARIA label for progress state
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6_

  - [x] 4.4 Implement FileUploadZone component
    - Create src/components/ui/FileUploadZone.tsx with drag-and-drop and click-to-browse
    - Support PDF, PNG, JPG file types, max 100MB per file, max 20 files
    - Display distinct border/background on drag-over
    - Show file name and size for accepted files
    - Reject invalid types and oversized files with toast notifications
    - Minimum 44x44px touch target
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 27.3_

  - [x] 4.5 Implement ErrorBoundary component
    - Create src/components/ui/ErrorBoundary.tsx with three-tier strategy (app-level, feature-level, component-level)
    - Feature-level shows retry button to re-mount component
    - App-level shows full-page fallback with reload option
    - Preserve user input and uploaded files on error
    - _Requirements: 31.2, 31.3, 31.6_

- [x] 5. Utility functions and validation
  - [x] 5.1 Implement file size formatting utilities
    - Create src/utils/file-size.ts with formatFileSize and calculatePercentChange functions
    - formatFileSize: bytes for <1024, KB with 1 decimal for <1MB, MB with 1 decimal for ≥1MB
    - calculatePercentChange: rounded to 1 decimal, "+" prefix for increase, "−" for decrease, "0.0%" for equal
    - _Requirements: 29.1, 29.2, 29.3, 29.4_

  - [ ]\* 5.2 Write property test for file size formatting
    - **Property 17: File size formatting correctness**
    - **Validates: Requirements 29.1**

  - [ ]\* 5.3 Write property test for percentage change calculation
    - **Property 18: Percentage change calculation correctness**
    - **Validates: Requirements 29.3, 29.4**

  - [x] 5.4 Implement validation utilities
    - Create src/utils/validation.ts with file type validation, file size validation, page range validation, password validation, metadata field validation, bookmark title validation, dimension validation, crop region validation
    - _Requirements: 21.4, 21.5, 45.4, 18.5, 35.2, 43.5, 46.7, 41.6_

  - [ ]\* 5.5 Write property test for file type validation
    - **Property 10: File type validation rejects unsupported types**
    - **Validates: Requirements 21.4, 6.3, 7.4, 8.6, 9.5**

  - [ ]\* 5.6 Write property test for file size validation
    - **Property 11: File size validation rejects files exceeding maximum**
    - **Validates: Requirements 21.5, 44.6**

  - [ ]\* 5.7 Write property test for page range validation
    - **Property 21: Page range validation rejects invalid ranges**
    - **Validates: Requirements 45.4**

  - [ ]\* 5.8 Write property test for password validation
    - **Property 32: Password validation rejects empty and oversized passwords**
    - **Validates: Requirements 18.5**

  - [ ]\* 5.9 Write property test for metadata field validation
    - **Property 33: Metadata field validation**
    - **Validates: Requirements 35.2**

  - [ ]\* 5.10 Write property test for bookmark title validation
    - **Property 28: Bookmark title validation**
    - **Validates: Requirements 43.5**

  - [ ]\* 5.11 Write property test for dimension validation
    - **Property 25: Dimension validation rejects out-of-range values**
    - **Validates: Requirements 46.7**

  - [ ]\* 5.12 Write property test for crop region validation
    - **Property 26: Crop region validation rejects invalid regions**
    - **Validates: Requirements 41.6**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Navigation, layout, and theme
  - [x] 7.1 Implement Navigation Bar with routing
    - Create src/app/router.tsx with React Router routes for all 28 features + home
    - Create src/components/ui/NavBar.tsx with route links, active route indicator, theme toggle, hamburger menu for mobile (<768px)
    - Implement responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
    - _Requirements: 27.1, 27.2, 30.3, 30.4, 30.5_

  - [x] 7.2 Implement Theme Provider and dark mode toggle
    - Create src/app/providers.tsx wrapping app with theme context
    - Apply theme class to root element within 100ms of toggle
    - Read from localStorage on load, default to light if no preference
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_

  - [x] 7.3 Implement responsive layout shell
    - Create main layout with sidebar navigation (desktop) and stacked layout (mobile)
    - Implement CSS transitions (150-300ms) for page changes and interactive states
    - Hide non-essential UI behind expandable sections on <640px
    - Ensure modals/dropdowns render within viewport bounds on mobile
    - _Requirements: 27.1, 27.5, 27.7, 27.9, 30.4_

- [x] 8. Core PDF Engine implementation
  - [x] 8.1 Implement PDF Engine with pdf-lib
    - Create src/core/pdf-engine/operations.ts implementing IPdfEngine
    - Implement load (with optional password), save operations
    - Implement merge: combine multiple ArrayBuffers into single PDF
    - Implement splitByRanges: produce separate PDFs per range
    - _Requirements: 44.1, 45.1_

  - [ ]\* 8.2 Write property test for merge page count
    - **Property 19: Merge produces PDF with sum of all page counts**
    - **Validates: Requirements 44.1**

  - [ ]\* 8.3 Write property test for split page counts
    - **Property 20: Split produces PDFs with correct page counts per range**
    - **Validates: Requirements 45.1**

  - [x] 8.4 Implement page manipulation operations
    - Implement rotatePages: apply rotation angle (90/180/270) to selected pages
    - Implement deletePages: remove pages, update numbering
    - Implement reorderPages: rearrange pages per permutation
    - Implement duplicatePages: insert copies after originals, enforce 500-page limit
    - _Requirements: 6.1, 7.1, 8.4, 48.1, 48.2, 48.6_

  - [ ]\* 8.5 Write property test for rotation
    - **Property 1: Rotation preserves page count and applies correct angle**
    - **Validates: Requirements 6.1**

  - [ ]\* 8.6 Write property test for page deletion
    - **Property 2: Page deletion reduces page count by exactly the number of deleted pages**
    - **Validates: Requirements 7.1**

  - [ ]\* 8.7 Write property test for page reordering
    - **Property 3: Page reordering preserves all pages in specified sequence**
    - **Validates: Requirements 8.4**

  - [ ]\* 8.8 Write property test for page duplication
    - **Property 22: Page duplication increases page count correctly**
    - **Validates: Requirements 48.1, 48.2**

  - [ ]\* 8.9 Write property test for duplication page limit
    - **Property 23: Duplication rejects operations exceeding 500 pages**
    - **Validates: Requirements 48.6**

  - [x] 8.10 Implement content operations
    - Implement addPageNumbers with position and starting number config
    - Implement addHeadersFooters with placeholder resolution ({page}, {total}, {date})
    - Implement addWatermark (text or image) with opacity and rotation
    - Implement addTextOverlay for text annotations
    - Implement embedAnnotation for canvas-based annotations
    - _Requirements: 11.1, 11.2, 11.3, 42.1, 42.2, 42.3, 17.1, 17.2, 17.3, 13.4_

  - [ ]\* 8.11 Write property test for page numbering
    - **Property 7: Sequential page numbering from starting number**
    - **Validates: Requirements 11.1, 11.3**

  - [ ]\* 8.12 Write property test for header/footer placeholder resolution
    - **Property 27: Header/footer placeholder resolution**
    - **Validates: Requirements 42.2, 42.3**

  - [x] 8.13 Implement conversion and optimization operations
    - Implement imagesToPdf: create PDF from images preserving aspect ratio and order
    - Implement compress: remove redundant objects, optimize streams
    - Implement flatten: merge annotations/form fields into page content
    - Implement cropPages: adjust CropBox to specified region
    - Implement resizePages: scale content to target dimensions
    - Implement linearize: produce web-optimized PDF
    - _Requirements: 10.1, 10.2, 9.1, 40.1, 40.4, 41.5, 46.3, 47.1_

  - [ ]\* 8.14 Write property test for image-to-PDF conversion
    - **Property 5: Image-to-PDF conversion produces one page per image in order**
    - **Validates: Requirements 10.1**

  - [ ]\* 8.15 Write property test for image aspect ratio
    - **Property 6: Image aspect ratio preservation**
    - **Validates: Requirements 10.2**

  - [ ]\* 8.16 Write property test for compression
    - **Property 4: Compression produces valid PDF with same page count**
    - **Validates: Requirements 9.1**

  - [ ]\* 8.17 Write property test for flatten
    - **Property 29: Flatten removes all interactive form fields**
    - **Validates: Requirements 40.4**

  - [ ]\* 8.18 Write property test for page resize
    - **Property 24: Page resize applies target dimensions**
    - **Validates: Requirements 46.3**

  - [x] 8.19 Implement metadata and structure operations
    - Implement getMetadata, setMetadata with modification date update
    - Implement getBookmarks, setBookmarks with nesting hierarchy
    - Implement getFormFields, fillFormFields
    - _Requirements: 35.1, 35.2, 35.3, 43.1, 43.3, 43.7, 36.1, 36.3_

  - [x] 8.20 Implement security operations
    - Implement encrypt with password (1-128 chars)
    - Implement decrypt with password verification
    - Implement redact: permanently remove content in regions, replace with black rectangles
    - _Requirements: 18.1, 19.1, 19.2, 20.1, 20.3_

  - [ ]\* 8.21 Write property test for encrypt/decrypt round-trip
    - **Property 8: Encrypt/decrypt round-trip preserves PDF content**
    - **Validates: Requirements 18.1, 19.1**

  - [ ]\* 8.22 Write property test for incorrect password rejection
    - **Property 9: Incorrect password rejection**
    - **Validates: Requirements 19.2**

  - [ ]\* 8.23 Write property test for redacted content irrecoverability
    - **Property 31: Redacted content is irrecoverable**
    - **Validates: Requirements 20.3**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Render Engine and Web Worker
  - [x] 10.1 Implement Render Engine with pdfjs-dist
    - Install pdfjs-dist
    - Create src/core/render-engine/renderer.ts implementing IRenderEngine
    - Implement loadDocument, renderPage, renderThumbnail (150px min width)
    - Implement extractText with reading order, paragraph separation, page delimiters
    - Implement extractImages preserving format and resolution
    - Implement comparePages for diff view
    - _Requirements: 23.1, 23.4, 38.1, 12.1, 37.1_

  - [x] 10.2 Implement Web Worker for PDF operations
    - Create src/workers/pdf.worker.ts with message-based API
    - Implement worker communication protocol (postMessage/onmessage)
    - Offload heavy operations (merge, split, compress, encrypt/decrypt) to worker
    - Handle worker errors with graceful fallback and toast notification
    - _Requirements: 28.1, 31.1_

  - [x] 10.3 Implement Preview Panel component
    - Create src/components/ui/PreviewPanel.tsx with original/modified side-by-side view
    - Implement zoom (50%-200%), page navigation, current page/total display
    - Implement on-demand page rendering for PDFs >50 pages (virtual scrolling)
    - Stacked layout on mobile (<768px)
    - Render pages within 2 seconds for PDFs up to 50 pages
    - Show placeholder with error message for failed page renders
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 27.5_

- [x] 11. Annotation Engine
  - [x] 11.1 Implement Canvas-based Annotation Engine
    - Create src/core/annotation-engine/canvas-manager.ts for canvas lifecycle
    - Create src/core/annotation-engine/tools.ts implementing IAnnotationEngine
    - Implement highlight tool: rectangular selection with configurable color and 40% opacity
    - Implement signature tool: freehand drawing with ≤16ms latency, configurable stroke color/width (1-10px)
    - Implement stamp tool: predefined stamps (APPROVED, DRAFT, CONFIDENTIAL) with resize (50x50 to 500x500) and reposition
    - Implement text overlay tool: configurable font size (6-144pt), color, position, max 1000 chars
    - Implement redact tool: rectangular selection for redaction regions
    - Support touch-based drawing on mobile with 44x44px annotation controls
    - _Requirements: 14.1, 14.2, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.6, 16.1, 16.2, 16.3, 16.5, 13.1, 13.2, 20.4, 27.8_

- [x] 12. Feature implementations - PDF operations
  - [x] 12.1 Implement Merge feature UI
    - Create src/features/merge/components/ with upload zone (max 20 files, 50MB each), drag-and-drop reorder, merge trigger
    - Wire to PDF Engine merge operation via Web Worker
    - Show preview of merged result, file size display
    - Validate minimum 2 files, reject invalid PDFs with toast
    - _Requirements: 44.1, 44.2, 44.3, 44.4, 44.5, 44.6_

  - [x] 12.2 Implement Split feature UI
    - Create src/features/split/components/ with page count display, range input (comma-separated "start-end" format, max 20 ranges)
    - Wire to PDF Engine splitByRanges operation
    - Show downloadable list with file name and page count per result
    - Support overlapping ranges, validate ranges with toast errors
    - _Requirements: 45.1, 45.2, 45.3, 45.4, 45.5_

  - [x] 12.3 Implement Rotate feature UI
    - Create src/features/rotate/components/ with page thumbnail selection, angle picker (90°/180°/270°)
    - Wire to PDF Engine rotatePages, show preview of rotated pages
    - Validate at least one page and angle selected
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 12.4 Implement Delete Pages feature UI
    - Create src/features/delete-pages/components/ with page thumbnail selection, delete confirmation
    - Wire to PDF Engine deletePages, show updated preview within 2s
    - Prevent deletion of all pages with toast warning
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 12.5 Implement Reorder Pages feature UI
    - Create src/features/reorder/components/ with draggable page thumbnails, visible page numbers, drop indicators
    - Update displayed order within 200ms on drop
    - Wire to PDF Engine reorderPages on confirm
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 12.6 Implement Compress feature UI
    - Create src/features/compress/components/ with upload, compress trigger, before/after file size display with percentage
    - Show toast if <5% reduction achieved
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 12.7 Implement Image-to-PDF feature UI
    - Create src/features/image-to-pdf/components/ with multi-image upload (1-50, PNG/JPG only), drag-and-drop reorder
    - Wire to PDF Engine imagesToPdf, show preview
    - Reject non-PNG/JPG files with toast
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 12.8 Implement Page Numbers feature UI
    - Create src/features/page-numbers/components/ with position selector (6 options, default bottom-center), starting number input (1-9999)
    - Wire to PDF Engine addPageNumbers, show preview
    - Validate starting number range with toast
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 12.9 Implement Duplicate Pages feature UI
    - Create src/features/duplicate-pages/components/ with page selection, copy count input (1-10, default 1)
    - Wire to PDF Engine duplicatePages, show updated preview within 2s
    - Reject if result would exceed 500 pages
    - _Requirements: 48.1, 48.2, 48.3, 48.4, 48.5, 48.6_

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Feature implementations - Annotations and content
  - [x] 14.1 Implement Text Overlay feature UI
    - Create src/features/text-overlay/components/ with text input (max 1000 chars), font size (6-144pt), color picker, click-to-place on page
    - Wire to Annotation Engine and PDF Engine embedAnnotation
    - Show preview within 500ms of edit, validate non-empty text
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 14.2 Implement Highlight feature UI
    - Create src/features/highlight/components/ with color picker (4+ options, default yellow), rectangular draw tool
    - Wire to Annotation Engine addHighlight with 40% opacity
    - Real-time preview, support multiple highlights per page
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 14.3 Implement Signature feature UI
    - Create src/features/signature/components/ with freehand canvas, stroke color/width (1-10px) controls, position controls
    - Wire to Annotation Engine addSignature with ≤16ms latency
    - Support clear and redraw, validate non-empty strokes
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 14.4 Implement Stamps feature UI
    - Create src/features/stamps/components/ with stamp picker (APPROVED, DRAFT, CONFIDENTIAL), resize (50-500px), reposition
    - Wire to Annotation Engine addStamp, real-time preview
    - Support cancel to discard stamp
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [x] 14.5 Implement Watermarks feature UI
    - Create src/features/watermarks/components/ with text input (1-200 chars) or image upload (PNG/JPG), opacity (1-100%), rotation (0-359°)
    - Wire to PDF Engine addWatermark, show preview
    - Validate non-empty text or valid image
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 14.6 Implement Headers/Footers feature UI
    - Create src/features/headers-footers/components/ with 6 text inputs (header left/center/right, footer left/center/right, max 100 chars each)
    - Support placeholders ({page}, {total}, {date}), font size (6-36pt), margins (0-72pt)
    - Wire to PDF Engine addHeadersFooters, show preview with resolved placeholders
    - _Requirements: 42.1, 42.2, 42.3, 42.4, 42.5, 42.6_

- [x] 15. Feature implementations - Security and metadata
  - [x] 15.1 Implement Password Protect feature UI
    - Create src/features/password-protect/components/ with password input, confirm password input, encrypt trigger
    - Validate password match, length (1-128 chars)
    - Wire to PDF Engine encrypt, show download on success
    - Show toast on mismatch, empty, or oversized password
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

  - [x] 15.2 Implement Unlock PDF feature UI
    - Create src/features/unlock/components/ with password input, decrypt trigger
    - Wire to PDF Engine decrypt, allow re-entry on wrong password without re-upload
    - Show toast if file is not encrypted, show download on success
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 15.3 Implement Redact feature UI
    - Create src/features/redact/components/ with rectangular selection tool on page preview
    - Support multiple regions across multiple pages, adjust/reposition/remove before confirm
    - Wire to PDF Engine redact, show black rectangles in preview
    - Validate at least one area selected
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [x] 15.4 Implement Metadata feature UI
    - Create src/features/metadata/components/ with form for title, author, subject (max 255 chars), keywords (max 20, each max 100 chars)
    - Display existing metadata on upload, show placeholders for empty fields
    - Wire to PDF Engine setMetadata, update modification date
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5_

  - [x] 15.5 Implement Form Fill feature UI
    - Create src/features/form-fill/components/ with detected field list and editable overlays
    - Map text fields to text inputs, checkboxes to checkboxes, dropdowns to selects, radio to radio inputs
    - Wire to PDF Engine fillFormFields, show toast if no form fields
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5_

- [x] 16. Feature implementations - Extraction and conversion
  - [x] 16.1 Implement Extract Images feature UI
    - Create src/features/extract-images/components/ with extraction trigger, downloadable list (format, dimensions, size)
    - Support individual download or ZIP archive
    - Show toast if no images found
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 16.2 Implement Extract Text feature UI
    - Create src/features/extract-text/components/ with extraction trigger, selectable text area with copy support
    - Download as UTF-8 .txt file, show toast if no extractable text
    - Indicate pages with no text, complete within 5s for ≤100 pages
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_

  - [x] 16.3 Implement PDF-to-Image feature UI
    - Create src/features/pdf-to-image/components/ with format selector (PNG/JPG), page selection (numbers/ranges), DPI selector (72/150/300, default 150)
    - Support individual download or ZIP archive
    - Validate page numbers against total count
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5, 39.6_

  - [x] 16.4 Implement Flatten feature UI
    - Create src/features/flatten/components/ with flatten trigger, before/after file size display
    - Show preview of flattened result, toast if nothing to flatten
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6_

  - [x] 16.5 Implement Crop feature UI
    - Create src/features/crop/components/ with drawable crop rectangle (min 10x10px), dimension display, numeric coordinate input alternative
    - Apply to single/selected/all pages, show preview
    - Validate region within page bounds and non-zero area
    - _Requirements: 41.1, 41.2, 41.3, 41.4, 41.5, 41.6, 41.7, 41.8_

  - [x] 16.6 Implement Page Size feature UI
    - Create src/features/page-size/components/ with predefined sizes (A4, Letter, Legal), custom dimensions (25-3000mm), orientation toggle
    - Apply to single/selected/all pages, show preview
    - Validate custom dimensions in range
    - _Requirements: 46.1, 46.2, 46.3, 46.4, 46.5, 46.6, 46.7_

  - [x] 16.7 Implement Linearize feature UI
    - Create src/features/linearize/components/ with linearization status display, linearize trigger
    - Show before/after file size with percentage change
    - Toast if already linearized
    - _Requirements: 47.1, 47.2, 47.3, 47.4, 47.5_

- [x] 17. Feature implementations - Advanced features
  - [x] 17.1 Implement Compare/Diff feature UI
    - Create src/features/compare/components/ with dual file upload, side-by-side synchronized view
    - Highlight differing pages with distinct border, show summary (added/removed/changed)
    - Previous/next difference navigation, toast if identical
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6_

  - [ ]\* 17.2 Write property test for comparison diff summary
    - **Property 34: Comparison diff summary consistency**
    - **Validates: Requirements 37.3**

  - [x] 17.3 Implement Bookmarks feature UI
    - Create src/features/bookmarks/components/ with bookmark tree display (up to 5 levels), add/rename/delete controls
    - Title input (1-200 chars), target page validation
    - Wire to PDF Engine setBookmarks, show empty state prompt if no bookmarks
    - _Requirements: 43.1, 43.2, 43.3, 43.4, 43.5, 43.6, 43.7_

  - [x] 17.4 Implement Batch Processing
    - Create src/core/batch/processor.ts implementing BatchJob interface
    - Support 2-50 files, sequential processing with progress (file X of Y)
    - Skip failed files, continue processing, report failures via toast
    - Support cancellation after current file completes
    - Present results as downloadable list (file name, size, download action)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]\* 17.5 Write property test for batch processing resilience
    - **Property 30: Batch processing resilience**
    - **Validates: Requirements 22.4**

- [x] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. UX features and polish
  - [x] 19.1 Implement Download History panel
    - Create download history UI with file name (truncated 60 chars), operation, locale timestamp
    - Re-download on click, disable if data unavailable with toast
    - Clear on session end
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6_

  - [x] 19.2 Implement Undo/Redo UI controls
    - Add undo/redo buttons with disabled state when stacks empty
    - Implement Ctrl+Z / Cmd+Z for undo, Ctrl+Y / Cmd+Shift+Z for redo keyboard shortcuts
    - Wire to operation history store
    - _Requirements: 25.4, 25.6_

  - [x] 19.3 Implement loading and empty states
    - Add skeleton placeholders during file upload/processing
    - Add empty state messages with call-to-action for each feature page
    - Show toast if loading exceeds 10 seconds with cancel option
    - Maintain previous content during transitions (complete within 500ms)
    - _Requirements: 32.1, 32.2, 32.3, 32.4_

  - [x] 19.4 Implement Home page with tool cards
    - Create src/features/ home page listing all 28 PDF operations as navigable cards
    - Each card shows operation name, brief description, and icon
    - Responsive grid layout adapting to screen size
    - _Requirements: 5.1, 30.1, 30.2_

  - [x] 19.5 Implement mobile touch gestures
    - Add pinch-to-zoom on preview panels
    - Add swipe to navigate pages
    - Ensure all annotation tools work with touch input
    - _Requirements: 27.6, 27.8_

- [x] 20. Integration wiring and final assembly
  - [x] 20.1 Wire all features to router and navigation
    - Connect all 28 feature routes in src/app/router.tsx
    - Ensure navigation bar shows all features with active route indicator
    - Wrap each feature route with feature-level ErrorBoundary
    - _Requirements: 5.1, 30.3, 30.5, 31.2_

  - [x] 20.2 Wire operation history to all features
    - Integrate pushOperation call after each PDF operation completes
    - Ensure undo restores previous document state in preview
    - Ensure redo re-applies operation
    - Reset feature-specific local state on navigation, preserve cross-cutting state
    - _Requirements: 25.1, 25.2, 25.3, 34.5_

  - [x] 20.3 Wire download history to all features
    - Integrate addDownload call when user downloads any processed file
    - Record file name, operation type, timestamp, and file data
    - _Requirements: 24.1, 24.2_

  - [ ]\* 20.4 Write integration tests for critical flows
    - Test merge flow: upload → reorder → merge → preview → download
    - Test split flow: upload → enter ranges → split → download list
    - Test encrypt/decrypt round-trip flow
    - Test batch processing with mixed valid/invalid files
    - _Requirements: 44.1, 45.1, 18.1, 19.1, 22.4_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript throughout as specified in the design document
- All features run entirely client-side in the browser
- Web Workers are used for heavy PDF operations to keep UI responsive
- pdf-lib handles PDF manipulation; pdfjs-dist handles rendering and extraction

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1", "3.3", "3.7", "5.1", "5.4"] },
    {
      "id": 4,
      "tasks": [
        "3.2",
        "3.4",
        "3.5",
        "3.6",
        "3.8",
        "5.2",
        "5.3",
        "5.5",
        "5.6",
        "5.7",
        "5.8",
        "5.9",
        "5.10",
        "5.11",
        "5.12"
      ]
    },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["8.1", "8.4", "8.10", "8.13", "8.19", "8.20"] },
    {
      "id": 8,
      "tasks": [
        "8.2",
        "8.3",
        "8.5",
        "8.6",
        "8.7",
        "8.8",
        "8.9",
        "8.11",
        "8.12",
        "8.14",
        "8.15",
        "8.16",
        "8.17",
        "8.18",
        "8.21",
        "8.22",
        "8.23"
      ]
    },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3", "11.1"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9"] },
    { "id": 11, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5", "14.6"] },
    { "id": 12, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5"] },
    { "id": 13, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5", "16.6", "16.7"] },
    { "id": 14, "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5"] },
    { "id": 15, "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5"] },
    { "id": 16, "tasks": ["20.1", "20.2", "20.3", "20.4"] }
  ]
}
```
