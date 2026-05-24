# Implementation Plan: OCR, Letterhead Editor & Navigation Redesign

## Overview

This plan implements three major features for the PDF Editor: (1) Client-side OCR via Tesseract.js enabling scanned PDF text extraction, search, and redaction; (2) A letterhead creator/editor with WYSIWYG preview and reusable templates; (3) A navigation redesign with categorized tool groups, search filter, favorites, and collapsible sidebar. Tasks are ordered so foundational types and core logic come first, then stores, UI components, integrations, and final wiring.

## Tasks

- [x] 1. OCR Types and Interfaces
  - [x] 1.1 Create `src/core/ocr-engine/types.ts` with OcrBoundingBox, OcrWord, OcrLine, OcrPageResult, OcrProcessingResult, OcrPageFailure, OcrProgress, and worker message protocol types (WorkerInMessage, WorkerOutMessage)
    - Define all OCR data model interfaces as specified in the design document
    - Include worker message discriminated unions for type-safe postMessage communication
    - _Requirements: 3.2, 3.3, 3.6_
  - [x] 1.2 Create `src/features/ocr/types.ts` with OcrEngineStatus, OcrStoreState, and language option constants (LANGUAGE_OPTIONS array with 8 supported languages)
    - Define OcrEngineStatus union type: 'idle' | 'initializing' | 'ready' | 'processing' | 'error'
    - Define LANGUAGE_OPTIONS constant with code and label for eng, spa, fra, deu, por, ita, nld, chi_sim
    - _Requirements: 4.1_

- [x] 2. OCR Web Worker
  - [x] 2.1 Create `src/core/ocr-engine/ocr-worker.ts` Web Worker that initializes Tesseract.js createWorker, loads language packs, and reports initProgress/initComplete/initError messages
    - Handle 'init' message: create Tesseract worker, load languages, report download progress
    - Handle initialization retry logic and error reporting
    - _Requirements: 1.1, 1.4_
  - [x] 2.2 Implement the `recognize` message handler in the worker that runs Tesseract.js recognition on an ImageBitmap and maps output to OcrPageResult format with word-level bounding boxes
    - Map Tesseract.js output (words, lines, paragraphs) to OcrPageResult structure
    - Extract bounding boxes as pixel coordinates relative to 300 DPI image
    - Calculate per-page confidence score
    - _Requirements: 3.2_
  - [x] 2.3 Add 30-second per-page timeout handling and terminate message support in the worker
    - Set timeout per recognize call, send error message on timeout
    - Handle 'terminate' message to cleanly shut down Tesseract worker
    - _Requirements: 10.7_

- [x] 3. OCR Engine Core
  - [x] 3.1 Create `src/core/ocr-engine/ocr-engine.ts` singleton class with getInstance(), initialize(), destroy(), cancel(), and event emitter (on/off)
    - Implement singleton pattern with private constructor and static getInstance()
    - Implement event emitter for progress, pageComplete, error, and initProgress events
    - _Requirements: 1.1, 10.1_
  - [x] 3.2 Implement lazy-loading initialization that creates the Web Worker, sends init message with languages, handles retry on failure (2s delay), and queues concurrent init requests
    - Lazy-load worker only on first OCR operation trigger
    - Retry language pack download once after 2-second delay on network failure
    - Queue operations if init already in progress (prevent duplicate initialization)
    - _Requirements: 1.2, 1.4, 1.7_
  - [x] 3.3 Implement worker reuse logic — skip re-initialization if already loaded, only reload language packs when language selection changes
    - Track loaded languages in a Set, compare against requested languages
    - Reuse existing worker instance for subsequent operations
    - _Requirements: 1.5_
  - [x] 3.4 Create `src/core/ocr-engine/page-detector.ts` with detectScannedPages() that uses render-engine extractText per page, classifies pages with <10 non-whitespace chars as scanned
    - Use existing PdfjsRenderEngine.extractText() for each page
    - Classify as scanned if non-whitespace character count < 10
    - Treat render failures as scanned pages
    - Target: complete 50 pages within 5 seconds
    - _Requirements: 2.1, 2.2, 2.4, 2.6_
  - [x] 3.5 Implement processPages() in ocr-engine that renders each page at 300 DPI (scale 4.1667), transfers ImageBitmap to worker, collects results sequentially, and releases memory between pages
    - Render page to canvas at scale 300/72, create ImageBitmap, transfer to worker
    - Release canvas memory immediately after bitmap creation
    - Process one page at a time to limit memory usage
    - _Requirements: 3.1, 3.4, 10.3, 11.2_
  - [x] 3.6 Implement progress calculation with ETA (available after 2+ pages), page timings tracking, and progress event emission
    - Calculate percentage as Math.round(pagesCompleted / totalPages \* 100)
    - Compute ETA from average page timing × remaining pages (only after 2+ pages)
    - Format ETA as "Xm Ys"
    - _Requirements: 5.1, 5.2, 5.3, 5.6_
  - [x] 3.7 Add error handling for page render failures (skip and record), worker crashes, and out-of-memory conditions with reduced resolution fallback option
    - Skip failed pages, record OcrPageFailure with page number and error description
    - Detect worker crash/unresponsive (30s timeout), terminate and report partial results
    - On memory pressure: pause, release buffers, offer 150 DPI fallback
    - _Requirements: 3.5, 10.6, 10.7, 11.5_
  - [x] 3.8 Create `src/core/ocr-engine/index.ts` barrel export for OcrEngine class and all types
    - Export OcrEngine, all type interfaces, and page-detector function
    - _Requirements: 1.1_

- [x] 4. OCR Searchable PDF Generation
  - [x] 4.1 Create `src/core/ocr-engine/searchable-pdf.ts` with generateSearchablePdf() that loads original PDF via pdf-lib and embeds transparent text layers using word bounding boxes
    - Load PDF with PDFDocument.load(), iterate pages with OCR results
    - For each word: calculate PDF point position from pixel bbox using scale factor 72/300
    - _Requirements: 6.2_
  - [x] 4.2 Implement coordinate scaling from 300 DPI pixel positions to PDF points (scale factor 72/300), position words within 2px accuracy, and set text rendering mode to invisible (renderingMode=3)
    - Scale x, y, width, height from pixels to points
    - Set font size to fit word within bbox height
    - Use transparent text rendering so visual appearance is unchanged
    - _Requirements: 6.3_
  - [x] 4.3 Preserve non-OCR pages without modification, calculate size increase percentage, and generate output filename with "\_searchable" suffix
    - Skip pages without OCR results (preserve original content)
    - Calculate (newSize - originalSize) / originalSize \* 100 for size increase notification
    - Append "\_searchable" before .pdf extension in output filename
    - _Requirements: 6.4, 6.5, 6.6_

- [x] 5. OCR Zustand Store
  - [x] 5.1 Create `src/features/ocr/store/ocr-store.ts` Zustand store with engineStatus, engineError, initProgress, selectedLanguages, scannedPages, textPages, progress, results, and isCancelled state
    - Define full store state matching OcrStoreState interface from design
    - Initialize with defaults: engineStatus='idle', selectedLanguages=['eng']
    - _Requirements: 1.1, 3.1, 5.1_
  - [x] 5.2 Implement initialize() action that calls OcrEngine.initialize(), updates engineStatus through idle→initializing→ready states, and handles errors
    - Subscribe to OcrEngine initProgress events to update initProgress state
    - Transition to 'error' state on failure, store error message
    - _Requirements: 1.1, 1.3, 1.6_
  - [x] 5.3 Implement detectScannedPages() action that calls OcrEngine.detectScannedPages() and updates scannedPages/textPages/detectionComplete state
    - Store arrays of scanned and text page numbers
    - Set detectionComplete flag when analysis finishes
    - _Requirements: 2.1, 2.3_
  - [x] 5.4 Implement processPages() action that calls OcrEngine.processPages(), subscribes to progress events, updates progress state, and stores final results
    - Update progress state on each pageComplete event
    - Store final OcrProcessingResult when all pages complete
    - _Requirements: 3.1, 5.1_
  - [x] 5.5 Implement cancel() and reset() actions, and setLanguages() with localStorage persistence
    - cancel(): set isCancelled, call OcrEngine.cancel()
    - reset(): clear all processing state back to defaults
    - setLanguages(): update selectedLanguages, persist to localStorage
    - _Requirements: 4.6, 5.5_

- [x] 6. OCR UI Components
  - [x] 6.1 Create `src/features/ocr/components/LanguageSelector.tsx` multi-select control (max 3 languages) with download progress indicator and localStorage persistence
    - Render checkboxes or multi-select dropdown for 8 languages
    - Show download progress bar when loading new language pack
    - Disable selection beyond 3 languages with inline message
    - _Requirements: 4.1, 4.4, 4.5_
  - [x] 6.2 Create `src/features/ocr/components/PageSelector.tsx` for selecting individual pages or page ranges for OCR processing, with scanned page pre-selection
    - Allow individual page selection and range input (e.g., "1-5, 8, 12")
    - Pre-select detected scanned pages by default
    - Minimum selection of 1 page
    - _Requirements: 11.4_
  - [x] 6.3 Create `src/features/ocr/components/OcrProgressPanel.tsx` displaying ProgressBar, current page/total, ETA (Xm Ys format after 2 pages), and cancel button
    - Use existing ProgressBar component for determinate progress
    - Show "Processing page X of Y" text
    - Show ETA only after 2+ pages processed
    - Cancel button with 44x44px touch target
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 6.4 Create `src/features/ocr/components/OcrResultsPanel.tsx` showing total pages processed, failures, average confidence, and "Generate Searchable PDF" action button
    - Display summary: N pages processed, M failed, average confidence X%
    - Show per-page failure details if any
    - "Generate Searchable PDF" button triggers searchable PDF generation
    - Size increase notification if >20%
    - _Requirements: 3.6, 6.1, 6.6_
  - [x] 6.5 Create `src/features/ocr/components/OcrPage.tsx` main page with two-column layout (controls left, preview right), file upload, detection summary, and state transitions (detecting→processing→results)
    - Left panel (max-w-[320px]): language selector, page selector, action buttons
    - Right panel: document preview with OCR status overlay
    - State transitions with duration-200 opacity animations
    - Empty state with icon, message, and upload action
    - _Requirements: 13.3, 13.9, 13.12_

- [x] 7. OCR Integration with Extract Text
  - [x] 7.1 Create `src/features/ocr/hooks/useOcrIntegration.ts` hook that exposes OCR state and actions for use by extract-text and redact features
    - Expose: initializeOcr, processPages, ocrResults, isProcessing, progress
    - Provide helper to merge native + OCR text in page order
    - _Requirements: 7.1_
  - [x] 7.2 Modify `ExtractTextPage.tsx` to detect scanned pages after text extraction and display OCR prompt banner with scanned page count
    - After native extraction, check for pages with empty/minimal text
    - Show banner: "X pages appear to be scanned. Run OCR to extract text?"
    - Offer [Run OCR] and [Skip] actions
    - _Requirements: 7.1, 7.2_
  - [x] 7.3 Implement OCR processing flow within extract-text: initialize engine, process scanned pages with progress display, merge native + OCR text in page order
    - On "Run OCR" acceptance: initialize OCR, process scanned pages
    - Show ProgressBar during processing
    - Merge results: native text for text pages, OCR text for scanned pages, in page order
    - Use same "--- Page Break ---" delimiter
    - _Requirements: 7.3, 7.4_
  - [x] 7.4 Add OCR summary label showing which pages used OCR and average confidence, handle failed pages with placeholder text, and support copy/download of combined text
    - Label: "Pages X, Y, Z used OCR (avg confidence: N%)"
    - Failed pages: "[Page N: OCR recognition failed]" placeholder
    - Copy and download actions work on full combined text
    - _Requirements: 7.5, 7.6, 7.7_

- [x] 8. OCR Integration with Search
  - [x] 8.1 Extend search functionality to include OCR-recognized text when available in ocr-store results
    - Check ocr-store for results when performing text search
    - Search both native extracted text and OCR text
    - _Requirements: 8.1, 8.2_
  - [x] 8.2 Implement search result highlighting on OCR-processed pages using word bounding boxes for visual match indicators
    - Match search query against OCR words, highlight matching word bounding boxes
    - Use same visual highlighting style as native text search results
    - _Requirements: 8.3_
  - [x] 8.3 Add suggestion notification when searching a document with unprocessed scanned pages
    - Show info Toast: "Some pages are scanned. Run OCR to search all content."
    - Only show when document has unprocessed scanned pages
    - _Requirements: 8.4_

- [x] 9. OCR Integration with Redact
  - [x] 9.1 Extend RedactPage to enable word-level text selection on OCR-processed pages using bounding box hit targets
    - Render invisible hit targets over word bounding boxes
    - Support click to select single word, drag to select word range
    - _Requirements: 9.1_
  - [x] 9.2 Implement semi-transparent highlight overlay on selected word bounding boxes for pending redaction preview
    - Show semi-transparent colored overlay on selected words before confirmation
    - Allow deselection by clicking selected words
    - _Requirements: 9.2_
  - [x] 9.3 Implement redaction confirmation that draws black rectangles over selected bounding boxes in the page image and removes corresponding text from OCR results
    - On confirm: render black fill rectangles at word bbox coordinates in page image
    - Remove redacted words from OcrPageResult text and words arrays
    - _Requirements: 9.3, 9.4_
  - [x] 9.4 Add notification on unprocessed scanned pages offering to initiate OCR before redaction
    - Show warning Toast with action button: "Run OCR to enable text-based redaction"
    - _Requirements: 9.5_
  - [x] 9.5 Implement saving redacted page image back into PDF via pdf-lib so redacted content is unrecoverable
    - Replace page content stream with redacted image using pdf-lib
    - Ensure original image data is destroyed
    - _Requirements: 9.6_

- [x] 10. Letterhead Types and Store
  - [x] 10.1 Create `src/features/letterhead/types.ts` with LetterheadTextField, LetterheadLogo, LetterheadTemplate, LetterheadPageTarget, and Alignment types
    - Define all letterhead data model interfaces as specified in design
    - Include validation constraints as JSDoc comments (char limits, size limits)
    - _Requirements: 12.1, 12.5_
  - [x] 10.2 Create `src/features/letterhead/store/letterhead-store.ts` Zustand store with templates array, activeTemplateId, lastUsedTemplateId, editorState, and CRUD actions (create, update, delete, duplicate, rename)
    - Implement all CRUD operations with ID generation (crypto.randomUUID)
    - Track activeTemplateId and lastUsedTemplateId for quick-apply
    - _Requirements: 12.6, 12.7, 12.9_
  - [x] 10.3 Implement localStorage persistence (load/save) with max 20 templates limit and quota error handling
    - Save templates to localStorage on every mutation
    - Enforce 20 template maximum, reject creation beyond limit
    - Catch QuotaExceededError and show appropriate error message
    - _Requirements: 12.6, 12.13_

- [x] 11. Letterhead Renderer (pdf-lib)
  - [x] 11.1 Create `src/features/letterhead/utils/letterhead-renderer.ts` with applyLetterhead() that overlays logo and text fields onto target pages using pdf-lib without modifying existing content
    - Load PDF with PDFDocument.load()
    - Determine target pages from LetterheadPageTarget (first, all, custom)
    - Overlay elements without modifying existing page content
    - _Requirements: 12.8_
  - [x] 11.2 Implement logo embedding (PNG/JPG via pdf-lib embedPng/embedJpg) with alignment positioning and aspect-ratio-preserving scaling (50-300px width)
    - Embed logo image based on mimeType
    - Scale to configured width while maintaining aspect ratio
    - Position based on alignment (left/center/right) within header area
    - _Requirements: 12.3_
  - [x] 11.3 Implement text field rendering with configurable font family, size (8-24pt), color, and alignment within the 100px header area
    - Embed standard fonts (Helvetica, Times, Courier)
    - Draw text at calculated positions with configured styling
    - Respect alignment for each text field independently
    - _Requirements: 12.5_
  - [x] 11.4 Implement exportLetterheadAsPdf() that creates a blank A4 page and renders the letterhead template onto it for sharing
    - Create new PDFDocument with single A4 page
    - Render letterhead elements onto blank page
    - Return ArrayBuffer for download
    - _Requirements: 12.12_

- [x] 12. Letterhead UI Components
  - [x] 12.1 Create `src/features/letterhead/components/LetterheadEditor.tsx` WYSIWYG editor with form controls for all template fields (logo upload with drag-drop, text inputs with char limits, font/size/color/alignment controls)
    - Logo upload: accept PNG/JPG/SVG, max 5MB, drag-drop support
    - Text inputs with character limit validation and inline feedback
    - Font family dropdown, font size slider (8-24pt), color picker, alignment toggles
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 13.11_
  - [x] 12.2 Create `src/features/letterhead/components/LetterheadPreview.tsx` canvas-based live preview that updates within 200ms of field changes, with white background and shadow-lg styling
    - HTML5 Canvas sized to A4/Letter proportions
    - Debounce re-render to 200ms for smooth interaction
    - Render logo, company name, address, contact info at configured positions
    - _Requirements: 12.2, 13.7_
  - [x] 12.3 Create `src/features/letterhead/components/LetterheadTemplateList.tsx` displaying saved templates with select, edit, duplicate, rename, and delete actions
    - List view with template name, last updated date
    - Action buttons: edit, duplicate, rename, delete with confirmation
    - Empty state with create template CTA
    - _Requirements: 12.7_
  - [x] 12.4 Create `src/features/letterhead/components/LetterheadApplyModal.tsx` confirmation dialog with page target selection (first page, all pages, custom range) using existing Modal component
    - Radio buttons for page target: first page only, all pages, custom range
    - Custom range input accepting "1,3,5-8" format
    - Apply and Cancel buttons
    - _Requirements: 12.8, 13.6_
  - [x] 12.5 Create `src/features/letterhead/components/LetterheadPage.tsx` main page with two-column layout, template list sidebar, editor/preview area, quick-apply action, and empty state
    - Two-column layout: template list left, editor/preview right
    - Quick-apply button using lastUsedTemplateId
    - Handle "no recent template" case with prompt to select/create
    - Export as PDF action
    - _Requirements: 12.9, 12.10, 13.3, 13.9_

- [x] 13. Navigation Store and Categories
  - [x] 13.1 Create `src/features/navigation/categories.ts` with NAV_CATEGORIES array defining all 6 category groups (Organize, Edit, Convert, Protect, Analyze, OCR) with tool paths and labels
    - Define complete category structure matching design document
    - Include all existing tools plus new /ocr and /letterhead routes
    - _Requirements: 14.1_
  - [x] 13.2 Create `src/features/navigation/icons.tsx` with inline SVG icon components (20x20px) for all tools and categories — distinct recognizable shapes for each tool
    - Create ~35 SVG icon components (one per tool + category icons)
    - Each icon: 20x20px viewBox, stroke-based for consistency, currentColor fill
    - _Requirements: 14.2, 13.10_
  - [x] 13.3 Create `src/features/navigation/store/nav-store.ts` Zustand store with favorites (max 8), recentTools (max 5), collapsedCategories, sidebarCollapsed, filterQuery, and all actions with localStorage persistence
    - Implement addFavorite/removeFavorite/toggleFavorite with max 8 enforcement
    - Implement addRecentTool with max 5 and deduplication (most recent first)
    - Implement toggleCategory and toggleSidebar with localStorage persistence
    - Load all persisted state on initialization
    - _Requirements: 14.6, 14.7, 14.9, 14.10, 14.11_
  - [x] 13.4 Implement filterNavigation() utility function with case-insensitive matching against tool names and category names, returning filtered categories or empty state
    - Match query against tool labels and category labels
    - If category name matches, show all tools in that category
    - Return hasResults flag for empty state rendering
    - _Requirements: 14.3, 14.4, 14.5_

- [x] 14. Navigation UI Components
  - [x] 14.1 Create `src/features/navigation/NavFilterInput.tsx` search input with "Filter tools..." placeholder, clear button, 44x44px touch target, and real-time filtering within 100ms
    - Input with search icon, placeholder text, clear (X) button
    - Call setFilterQuery on every keystroke (no debounce needed)
    - Focus-visible ring styling matching existing Input component
    - _Requirements: 14.3, 13.8_
  - [x] 14.2 Create `src/features/navigation/NavCategoryGroup.tsx` collapsible category section with chevron toggle, category icon, label, and animated expand/collapse
    - Chevron rotates on collapse/expand with duration-200 transition
    - Category icon (20x20px) + label in header row
    - Children hidden when collapsed, animated height transition
    - _Requirements: 14.6_
  - [x] 14.3 Create `src/features/navigation/NavToolLink.tsx` individual tool link with 20x20px icon, 8px icon-label spacing, active state (3px left border + primary bg highlight), and right-click/long-press handler for context menu
    - NavLink from react-router-dom with active class detection
    - Icon + label with gap-2 (8px) spacing
    - Active: border-l-[3px] border-primary-600 + bg-primary-50/dark:bg-primary-900
    - onContextMenu (desktop) and onTouchStart/onTouchEnd (500ms long-press for mobile)
    - _Requirements: 14.2, 14.8, 14.13_
  - [x] 14.4 Create `src/features/navigation/NavContextMenu.tsx` context menu for pin/unpin favorites, positioned at cursor, dismissed on outside click or Escape
    - Position at click/touch coordinates, constrained to viewport
    - Single action: "Add to Favorites" or "Remove from Favorites"
    - Dismiss on click outside, Escape key, or action selection
    - _Requirements: 14.8_
  - [x] 14.5 Create `src/features/navigation/CategorizedNavBar.tsx` main navigation component with filter input, Favorites section, Recent section, category groups, collapse toggle, and theme toggle
    - Structure: app title → filter → favorites → recent → categories → collapse toggle → theme toggle
    - Favorites section: show pinned tools (hidden if empty)
    - Recent section: show last 5 used tools (hidden if empty)
    - "No tools found" message when filter matches nothing
    - _Requirements: 14.1, 14.7, 14.9_
  - [x] 14.6 Implement collapsed sidebar mode (48px width, icons only, tooltip on 300ms hover delay) and mobile full-screen overlay with bottom-up animation and backdrop
    - Collapsed: w-12, show only icons, tooltip with tool name on 300ms hover
    - Mobile (<768px): full-screen overlay, menu button trigger, close button (44x44px)
    - Overlay animates from bottom with duration-200 ease, semi-transparent backdrop
    - _Requirements: 14.10, 14.12, 14.14_

- [x] 15. Route Registration, Layout Integration, and Final Wiring
  - [x] 15.1 Update `src/components/ui/Layout.tsx` to read sidebarCollapsed from nav-store and adjust sidebar width (expanded: md:w-64/lg:w-72, collapsed: md:w-12) with 200ms ease transition
    - Import useNavStore, read sidebarCollapsed
    - Apply conditional width classes with transition-all duration-200 ease
    - _Requirements: 14.10, 14.11_
  - [x] 15.2 Update `src/app/router.tsx` to replace NavBar with CategorizedNavBar in Layout sidebar prop, add /ocr and /letterhead routes, and wire recent tool tracking on navigation
    - Import CategorizedNavBar, OcrPage, LetterheadPage
    - Add Route entries for /ocr and /letterhead
    - Call nav-store addRecentTool on route changes
    - _Requirements: 14.1_
  - [x] 15.3 Install tesseract.js dependency and configure Vite worker bundling for ocr-worker.ts
    - Run npm install tesseract.js
    - Configure vite.config.ts worker options if needed for proper bundling
    - _Requirements: 10.1_
  - [x] 15.4 Add beforeunload listener to destroy OCR worker on tab close, and verify main thread remains responsive (<50ms blocking) during OCR processing
    - Register window beforeunload handler calling OcrEngine.destroy()
    - Verify all heavy computation runs in worker thread
    - _Requirements: 10.2, 10.4_
  - [x] 15.5 End-to-end verification: test OCR flow (upload scanned PDF → detect → process → searchable PDF), letterhead flow (create template → preview → apply), and navigation (filter, favorites, collapse)
    - Verify complete OCR pipeline works end-to-end
    - Verify letterhead create/edit/apply/export workflow
    - Verify navigation filter, favorites pin/unpin, collapse/expand, mobile overlay
    - _Requirements: 13.1_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "10.1", "13.1", "13.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.8", "10.2", "10.3", "13.3", "13.4"] },
    {
      "id": 3,
      "tasks": [
        "3.5",
        "3.6",
        "3.7",
        "4.1",
        "4.2",
        "4.3",
        "11.1",
        "11.2",
        "11.3",
        "11.4",
        "14.1",
        "14.2",
        "14.3",
        "14.4"
      ]
    },
    {
      "id": 4,
      "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "12.1", "12.2", "12.3", "12.4", "14.5", "14.6"]
    },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "12.5"] },
    {
      "id": 6,
      "tasks": ["7.1", "7.2", "7.3", "7.4", "8.1", "8.2", "8.3", "9.1", "9.2", "9.3", "9.4", "9.5"]
    },
    { "id": 7, "tasks": ["15.1", "15.2", "15.3", "15.4"] },
    { "id": 8, "tasks": ["15.5"] }
  ]
}
```

## Notes

- All OCR processing runs in a Web Worker to keep the main thread responsive (<50ms blocking)
- Tesseract.js is the only new runtime dependency; language packs are loaded from CDN on demand
- Letterhead templates persist in localStorage (max 20 templates, 5MB logo size cap)
- Navigation state (favorites, recent, collapsed) persists in localStorage
- The existing NavBar.tsx is deprecated but kept for reference during migration
- All new components use existing Tailwind design tokens and UI primitives (Button, Modal, Toast, ProgressBar, Skeleton)
- Total sub-tasks: 65, organized into 15 parent task groups
