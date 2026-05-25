# Requirements Document

## Introduction

The Visual Canvas Editor is a Canva/Figma-style design canvas integrated into the PDF Editor application. It enables users to create rich visual compositions from scratch using text, images, shapes, and effects, then export them to multiple formats (PDF, PNG, SVG, DOCX). The editor operates entirely client-side, maintaining the application's privacy-first architecture. It integrates with the existing PDF pipeline so users can design pages and insert them into existing PDF documents.

## Glossary

- **Canvas**: The interactive drawing surface where users compose visual elements on a page
- **Element**: Any object placed on the Canvas (text box, image, shape)
- **Layer**: The z-order position of an Element within the Canvas page
- **Page**: A single design surface with defined dimensions (e.g., A4, Letter, custom)
- **Document**: A collection of one or more Pages that form a complete design
- **Template**: A pre-configured Document with placeholder Elements for common use cases
- **Snap_Guide**: A visual alignment indicator that appears when Elements approach grid lines or other Element edges
- **Export_Engine**: The subsystem responsible for converting Canvas content into output file formats
- **Canvas_Store**: The Zustand-based state management layer holding all Document, Page, and Element data
- **Design_Category**: The navigation category in the sidebar under which the Canvas Editor is accessible

## Requirements

### Requirement 1: Canvas Page Management

**User Story:** As a user, I want to create and manage pages with standard or custom dimensions, so that I can design content for any target format.

#### Acceptance Criteria

1. WHEN the user creates a new Document, THE Canvas SHALL display a blank Page with default A4 dimensions (210mm × 297mm) within 500ms of the user action
2. WHEN the user selects a page size preset, THE Canvas SHALL resize the Page to the selected dimensions (A4 210mm×297mm, Letter 215.9mm×279.4mm, or custom user-defined width and height between 10mm and 5000mm per axis)
3. IF the user enters a custom dimension value outside the range of 10mm to 5000mm, THEN THE Canvas SHALL reject the input and display an error message indicating the allowed range
4. THE Canvas SHALL support zoom levels from 10% to 400% with each zoom transition completing within 100ms
5. WHEN the user performs a pinch gesture or scroll-wheel with Ctrl (Windows/Linux) or Cmd (macOS) held, THE Canvas SHALL adjust the zoom level in increments of 5%
6. WHEN the user holds the spacebar and drags, THE Canvas SHALL pan the viewport without modifying any Element, updating the viewport position at 60fps
7. WHEN the user adds a new Page to the Document, THE Canvas SHALL append the Page after the currently active Page and the Document SHALL support a maximum of 100 Pages
8. IF the user attempts to add a Page beyond the 100-Page limit, THEN THE Canvas SHALL reject the action and display an error message indicating the maximum page count has been reached

### Requirement 2: Text Element Creation and Formatting

**User Story:** As a user, I want to add and format text boxes on the canvas, so that I can create visually styled text content.

#### Acceptance Criteria

1. WHEN the user activates the text tool and clicks on the Canvas, THE Canvas SHALL create a new text box Element at the click position with a default width of 200px and placeholder text "Type here"
2. WHEN the user double-clicks a text box Element, THE Canvas SHALL enter inline text editing mode for that Element within 100ms, displaying a blinking cursor at the click position
3. WHILE the user is editing text, THE Canvas SHALL apply the selected font family from the available system and bundled fonts
4. WHILE the user is editing text, THE Canvas SHALL apply the selected font size in points ranging from 8pt to 144pt in 1pt increments
5. IF the user enters a font size outside the range of 8pt to 144pt, THEN THE Canvas SHALL clamp the value to the nearest valid bound (8pt or 144pt)
6. WHILE the user is editing text, THE Canvas SHALL apply the selected font color using a hex color value (#000000 to #FFFFFF)
7. WHILE the user is editing text, THE Canvas SHALL apply bold, italic, and underline formatting to the selected text range independently (any combination allowed)
8. WHILE the user is editing text, THE Canvas SHALL apply paragraph alignment (left, center, right, justify) to the active paragraph
9. WHEN the user drags a text box Element, THE Canvas SHALL reposition the Element to the new coordinates, updating the position at 60fps during the drag
10. THE Canvas SHALL support text content of up to 10,000 characters per text box Element

### Requirement 3: Image Placement and Manipulation

**User Story:** As a user, I want to place and manipulate images on the canvas, so that I can incorporate photos and graphics into my designs.

#### Acceptance Criteria

1. WHEN the user uploads an image file (PNG, JPEG, SVG, or WebP) of 50MB or less, THE Canvas SHALL place the image as a new Element at the center of the visible viewport, scaled to fit within the viewport while maintaining aspect ratio
2. IF the user uploads a file that is not PNG, JPEG, SVG, or WebP, THEN THE Canvas SHALL reject the upload and display an error message indicating the supported formats
3. IF the user uploads an image file exceeding 50MB, THEN THE Canvas SHALL reject the upload and display an error message indicating the maximum file size
4. WHEN the user drags a resize handle on an image Element with aspect ratio lock enabled, THE Canvas SHALL scale the image proportionally, updating the preview at 60fps during the drag
5. WHEN the user drags a resize handle on an image Element with aspect ratio lock disabled, THE Canvas SHALL scale the image freely in the dragged direction
6. WHEN the user activates the crop tool on an image Element, THE Canvas SHALL display a crop overlay allowing the user to define a visible sub-region by dragging the crop handles
7. WHEN the user rotates an image Element using the rotation handle, THE Canvas SHALL rotate the image around its center point in 1-degree increments
8. WHEN the user holds Shift while rotating, THE Canvas SHALL snap the rotation to the nearest 15-degree increment (0°, 15°, 30°, ..., 345°)

### Requirement 4: Shape Primitives

**User Story:** As a user, I want to draw basic shapes on the canvas, so that I can create diagrams, decorations, and visual structure.

#### Acceptance Criteria

1. WHEN the user selects a shape tool and drags on the Canvas, THE Canvas SHALL create a shape Element of the selected type (rectangle, circle, line, arrow, star, polygon) with dimensions matching the drag distance, rendering at 60fps during creation
2. WHEN the user holds Shift while drawing a rectangle, THE Canvas SHALL constrain the shape to a square with side length equal to the shorter drag axis
3. WHEN the user holds Shift while drawing an ellipse, THE Canvas SHALL constrain the shape to a perfect circle with diameter equal to the shorter drag axis
4. THE Canvas SHALL allow the user to set fill color (hex value or transparent), stroke color (hex value), and stroke width (0px to 50px in 1px increments) for any shape Element
5. WHEN the user selects a polygon shape, THE Canvas SHALL allow configuration of the number of sides from 3 to 12 via a numeric input
6. IF the user enters a polygon side count outside the range of 3 to 12, THEN THE Canvas SHALL clamp the value to the nearest valid bound (3 or 12)

### Requirement 5: Layer Management

**User Story:** As a user, I want to control the stacking order and visibility of elements, so that I can organize complex compositions.

#### Acceptance Criteria

1. THE Canvas SHALL render Elements in ascending z-order (lowest z-index at the back, highest at the front) with no perceptible delay when z-order changes for up to 500 Elements per Page
2. WHEN the user sends an Element to back, THE Canvas SHALL assign the Element the lowest z-index in the current Page and re-render the stacking order within 50ms
3. WHEN the user brings an Element to front, THE Canvas SHALL assign the Element the highest z-index in the current Page and re-render the stacking order within 50ms
4. WHEN the user moves an Element one layer up, THE Canvas SHALL swap the Element's z-index with the Element directly above it
5. WHEN the user moves an Element one layer down, THE Canvas SHALL swap the Element's z-index with the Element directly below it
6. WHEN the user locks an Element, THE Canvas SHALL prevent selection, movement, resizing, rotation, and editing of that Element until unlocked, and SHALL display a lock indicator on the Element in the layers panel
7. WHEN the user hides an Element, THE Canvas SHALL remove the Element from the visible rendering and from export output without deleting the Element data from the Canvas_Store
8. WHEN the user groups selected Elements (minimum 2 Elements), THE Canvas SHALL treat the group as a single selectable and movable unit that can be resized and rotated as one
9. WHEN the user ungroups a group Element, THE Canvas SHALL restore each child Element as an independent selectable Element preserving their absolute positions and styles

### Requirement 6: Snap-to-Grid and Smart Alignment

**User Story:** As a user, I want alignment assistance while positioning elements, so that I can create precise, professional layouts.

#### Acceptance Criteria

1. WHILE the user drags an Element and snap-to-grid is enabled, THE Canvas SHALL snap the Element position to the nearest grid intersection when the Element edge is within 5px of a grid line
2. WHILE the user drags an Element near another Element's edge or center (within 5px), THE Canvas SHALL display a Snap_Guide line indicating alignment
3. WHEN the user disables snap-to-grid, THE Canvas SHALL allow free positioning without grid constraints and hide all grid lines
4. THE Canvas SHALL display Snap_Guide lines for horizontal center, vertical center, top edge, bottom edge, left edge, and right edge alignment with other Elements on the same Page
5. THE Canvas SHALL render Snap_Guide lines and update snapping calculations without adding more than 16ms of latency to drag operations (maintaining 60fps)
6. WHEN the user configures the grid spacing, THE Canvas SHALL accept values between 5px and 100px in 1px increments

### Requirement 7: Undo and Redo

**User Story:** As a user, I want to undo and redo my actions on the canvas, so that I can experiment freely without fear of losing work.

#### Acceptance Criteria

1. WHEN the user triggers undo (Ctrl+Z on Windows/Linux, Cmd+Z on macOS), THE Canvas_Store SHALL revert the Document state to the previous history entry within 100ms
2. WHEN the user triggers redo (Ctrl+Shift+Z on Windows/Linux, Cmd+Shift+Z on macOS), THE Canvas_Store SHALL advance the Document state to the next history entry within 100ms
3. THE Canvas_Store SHALL maintain a history stack of at least 50 state entries per Document
4. WHEN the user performs a new action after undoing, THE Canvas_Store SHALL discard all redo entries beyond the current position
5. IF the history stack exceeds 50 entries, THEN THE Canvas_Store SHALL discard the oldest entry to make room for the new entry
6. IF there are no previous history entries when the user triggers undo, THEN THE Canvas_Store SHALL take no action and the undo control SHALL appear disabled
7. IF there are no forward history entries when the user triggers redo, THEN THE Canvas_Store SHALL take no action and the redo control SHALL appear disabled

### Requirement 8: Templates

**User Story:** As a user, I want to start from pre-designed templates, so that I can quickly create common document types without starting from scratch.

#### Acceptance Criteria

1. WHEN the user opens the template picker, THE Canvas SHALL display available templates categorized by type (blank page, invoice, resume, letter, presentation slide) within 300ms
2. WHEN the user selects a template, THE Canvas SHALL create a new Document pre-populated with the template Elements and Page dimensions within 500ms
3. THE Canvas SHALL include at least one template for each category: blank page, invoice, resume, letter, and presentation slide (minimum 5 templates total)
4. WHEN the user modifies a template-based Document, THE Canvas SHALL treat the Document as an independent copy without affecting the original template
5. WHEN the user opens the template picker, THE Canvas SHALL display a visual thumbnail preview for each template at a minimum size of 120px × 160px

### Requirement 9: Visual Styling and Effects

**User Story:** As a user, I want to apply visual effects to elements, so that I can create polished, professional-looking designs.

#### Acceptance Criteria

1. WHEN the user adjusts the opacity slider for an Element, THE Canvas SHALL render the Element at the specified opacity level (0% fully transparent to 100% fully opaque, in 1% increments)
2. WHEN the user configures border settings for a shape Element, THE Canvas SHALL render the border with the specified color (hex value), width (0px to 50px in 1px increments), and style (solid, dashed, dotted)
3. WHEN the user enables a drop shadow on an Element, THE Canvas SHALL render a shadow with configurable offset-x (-50px to 50px), offset-y (-50px to 50px), blur radius (0px to 100px), and shadow color (hex value with alpha)
4. WHEN the user opens the color picker, THE Canvas SHALL display a color selection interface supporting hex input (6-character), RGB sliders (0-255 per channel), and a visual color spectrum
5. WHEN the user saves a color to a custom palette, THE Canvas SHALL persist the color in the palette using browser localStorage for reuse across sessions, supporting up to 32 saved colors
6. THE Canvas SHALL apply styling changes to Elements and re-render the affected Element within 50ms of the user input

### Requirement 10: PDF Export

**User Story:** As a user, I want to export my canvas design as a high-quality PDF, so that I can share and print my work in a universally accepted format.

#### Acceptance Criteria

1. WHEN the user exports as PDF, THE Export_Engine SHALL generate a valid PDF file (openable by standard PDF readers) containing all visible Elements from the Document within 5 seconds for a Document of up to 10 Pages with up to 100 Elements per Page
2. THE Export_Engine SHALL render text Elements as vector text in the PDF output (not rasterized), preserving font family, size, color, and formatting
3. THE Export_Engine SHALL render shape Elements as vector paths in the PDF output preserving fill color, stroke color, stroke width, and opacity
4. THE Export_Engine SHALL embed image Elements at their original resolution in the PDF output (not downsampled)
5. WHEN the user selects individual page export, THE Export_Engine SHALL generate a PDF containing only the selected Pages in their original order
6. WHEN the user selects full document export, THE Export_Engine SHALL generate a PDF containing all Pages in document order
7. IF the PDF export fails due to insufficient memory or processing error, THEN THE Export_Engine SHALL display an error message indicating the failure reason and no corrupted file SHALL be downloaded
8. WHEN the export begins, THE Export_Engine SHALL display a progress indicator showing the current page being processed out of the total page count

### Requirement 11: PNG Export

**User Story:** As a user, I want to export my canvas design as a PNG image, so that I can use my designs in contexts that require raster images.

#### Acceptance Criteria

1. WHEN the user exports as PNG, THE Export_Engine SHALL rasterize the Canvas content into a PNG file within 3 seconds per Page at 72 DPI for a Page with up to 100 Elements
2. WHEN the user selects a DPI setting (72, 150, or 300), THE Export_Engine SHALL render the PNG at the specified resolution, producing pixel dimensions equal to (page width in inches × DPI) by (page height in inches × DPI)
3. THE Export_Engine SHALL preserve alpha transparency in the PNG output for Elements with opacity less than 100% and for areas of the Page with no Element coverage
4. WHEN the user exports a multi-page Document as PNG, THE Export_Engine SHALL generate one PNG file per Page
5. IF the PNG export fails due to canvas size exceeding browser memory limits, THEN THE Export_Engine SHALL display an error message indicating the export failed and suggest reducing DPI or page count

### Requirement 12: SVG Export

**User Story:** As a user, I want to export my canvas design as SVG, so that I can use scalable vector graphics in web and print workflows.

#### Acceptance Criteria

1. WHEN the user exports as SVG, THE Export_Engine SHALL generate a valid SVG 1.1 file containing vector representations of all visible Elements within 3 seconds for a Page with up to 100 Elements
2. THE Export_Engine SHALL represent text Elements as SVG text nodes with preserved font-family, font-size, font-weight, font-style, fill color, and text-anchor attributes
3. THE Export_Engine SHALL represent shape Elements as SVG path or primitive elements (rect, circle, line, polygon) preserving fill, stroke, stroke-width, and opacity attributes
4. THE Export_Engine SHALL embed image Elements as base64-encoded data URIs within the SVG file
5. WHEN the user exports a multi-page Document as SVG, THE Export_Engine SHALL generate one SVG file per Page
6. IF the SVG export fails due to memory constraints from large embedded images, THEN THE Export_Engine SHALL display an error message indicating the failure and suggest reducing image sizes

### Requirement 13: DOCX Export

**User Story:** As a user, I want to export my canvas design as a DOCX file, so that I can continue editing the content in word processors.

#### Acceptance Criteria

1. WHEN the user exports as DOCX, THE Export_Engine SHALL generate a valid DOCX file (openable by Microsoft Word, Google Docs, and LibreOffice Writer) within 5 seconds for a Document of up to 10 Pages
2. THE Export_Engine SHALL convert text Elements into DOCX paragraphs preserving font family, font size, bold, italic, underline, font color, and paragraph alignment
3. THE Export_Engine SHALL embed image Elements as inline images in the DOCX output at their original resolution
4. IF a shape Element cannot be represented natively in DOCX format, THEN THE Export_Engine SHALL rasterize the shape at 150 DPI and embed the rasterized image in place of the shape
5. IF the DOCX export fails, THEN THE Export_Engine SHALL display an error message indicating the failure reason and no corrupted file SHALL be downloaded

### Requirement 14: Batch Export

**User Story:** As a user, I want to export all pages as separate files in one action, so that I can efficiently produce multiple output files.

#### Acceptance Criteria

1. WHEN the user selects batch export, THE Export_Engine SHALL generate one output file per Page in the selected format (PDF, PNG, SVG, or DOCX)
2. THE Export_Engine SHALL package batch export files into a single ZIP archive for download using the naming pattern "{document-name}-batch.zip"
3. THE Export_Engine SHALL name batch export files within the ZIP using the pattern "{document-name}-page-{number}.{extension}" where {number} is zero-padded to 3 digits (e.g., 001, 002)
4. WHEN a batch export encounters an error on one Page, THE Export_Engine SHALL continue processing remaining Pages, include successfully exported files in the ZIP, and display a summary indicating which Pages failed
5. WHEN the batch export begins, THE Export_Engine SHALL display a progress indicator showing the number of Pages completed out of the total (e.g., "Exporting page 3 of 10")

### Requirement 15: Navigation Integration and PDF Pipeline

**User Story:** As a user, I want to access the canvas editor from the navigation sidebar and insert designed pages into existing PDFs, so that the editor integrates seamlessly with my existing workflow.

#### Acceptance Criteria

1. THE Design_Category SHALL appear in the navigation sidebar with a "Design" label and a dedicated icon, positioned after existing navigation categories
2. WHEN the user navigates to the "/canvas-editor" route, THE Canvas SHALL load within the existing application Layout component and be interactive within 1 second of navigation
3. WHEN the user selects "Insert into PDF" from the export options, THE Export_Engine SHALL render the current Page as a PDF page using pdf-lib and open the merge tool with the rendered page pre-loaded
4. THE Canvas SHALL be accessible at the "/canvas-editor" route path and respond to direct URL navigation (deep linking)
5. WHEN the user opens a PDF page in the canvas editor, THE Canvas SHALL render the PDF page as a background image Element (non-editable, locked) for overlay design within 2 seconds for a single PDF page
6. IF the PDF page fails to render as a background (corrupted PDF or unsupported features), THEN THE Canvas SHALL display an error message indicating the PDF page could not be loaded and present an empty Canvas as fallback

### Requirement 16: UI/UX Quality and Visual Polish

**User Story:** As a user, I want the canvas editor and overall application to feel modern, responsive, and visually polished, so that the experience matches professional design tools like Canva and Figma.

#### Acceptance Criteria

1. THE Canvas editor toolbar SHALL use a floating toolbar pattern positioned at the top of the canvas viewport with rounded corners (rounded-xl), subtle shadow (shadow-md), and a semi-transparent backdrop blur (backdrop-blur-sm) to feel modern and non-intrusive
2. WHEN the user selects an Element, THE Canvas SHALL display a contextual properties panel on the right side (320px width on desktop) with smooth slide-in animation (duration-200 ease-out), showing only controls relevant to the selected Element type
3. ALL interactive controls in the canvas editor (buttons, sliders, color pickers, dropdowns) SHALL have a minimum touch target of 44×44px and include hover states with 150ms transition, active/pressed states, and focus-visible ring indicators
4. THE Canvas editor SHALL use a neutral dark canvas background (#1a1a2e or equivalent dark tone) with the Page rendered as a white elevated surface with shadow-xl, matching the visual metaphor of a physical page on a desk
5. WHEN the user hovers over a toolbar icon, THE Canvas SHALL display a tooltip with the tool name and keyboard shortcut (e.g., "Text Tool (T)") after a 500ms delay
6. THE Canvas editor layout SHALL be fully responsive: on viewports below 768px, the properties panel SHALL collapse to a bottom sheet (max-height 50vh) with a drag handle, and the toolbar SHALL reflow to a compact single-row layout
7. ALL state transitions in the canvas editor (panel open/close, tool switch, element selection, zoom changes) SHALL use CSS transitions or spring animations with duration between 150ms and 300ms to feel fluid without being sluggish
8. THE Canvas editor SHALL display a minimap in the bottom-right corner (120×160px) showing the full page with a viewport indicator rectangle, allowing click-to-navigate for large or zoomed-in pages
9. WHEN no Element is selected, THE properties panel SHALL display page-level settings (page size, background color, grid toggle) instead of being empty
10. THE Canvas editor SHALL support keyboard shortcuts for all primary tools: V (select/move), T (text), R (rectangle), C (circle), L (line), I (image upload), Delete/Backspace (delete selected), Escape (deselect), +/- (zoom in/out)
11. WHEN the user drags an Element, THE Canvas SHALL display the Element with a subtle lift effect (scale 1.02, shadow-lg) to provide tactile feedback that the element is being moved
12. THE Canvas editor SHALL display a clean, minimal toolbar with icon-only buttons grouped by function (selection tools | shape tools | text/image tools | zoom controls) separated by subtle 1px dividers, with the active tool highlighted using the primary color
13. WHEN the Canvas is empty (no Elements on the current Page), THE Canvas SHALL display a centered empty state with a large icon, "Start designing" message, and quick-action buttons for "Add Text", "Add Image", "Add Shape", and "Use Template"
14. ALL loading states in the canvas editor (template loading, export processing, image upload) SHALL display a skeleton or spinner animation within the affected area rather than blocking the entire interface
15. THE application's overall typography SHALL use a consistent type scale: headings at 24/20/16px (h1/h2/h3), body at 14px, captions at 12px, with line-height 1.5 for body text and 1.2 for headings, using the Inter or system font stack

### Requirement 17: Keyboard Shortcuts and Productivity

**User Story:** As a user, I want comprehensive keyboard shortcuts and productivity features, so that I can work efficiently without constantly reaching for the mouse.

#### Acceptance Criteria

1. WHEN the user presses Ctrl+A (Cmd+A on macOS), THE Canvas SHALL select all Elements on the current Page
2. WHEN the user presses Ctrl+D (Cmd+D on macOS) with an Element selected, THE Canvas SHALL duplicate the selected Element with a 10px offset from the original
3. WHEN the user presses Ctrl+G (Cmd+G on macOS) with multiple Elements selected, THE Canvas SHALL group the selected Elements
4. WHEN the user presses Ctrl+Shift+G (Cmd+Shift+G on macOS) with a group selected, THE Canvas SHALL ungroup the group
5. WHEN the user presses arrow keys with an Element selected, THE Canvas SHALL move the Element by 1px in the arrow direction (or 10px if Shift is held)
6. WHEN the user presses Ctrl+C and Ctrl+V (Cmd+C/V on macOS), THE Canvas SHALL copy and paste the selected Element(s) with a 10px offset
7. WHEN the user presses Ctrl+S (Cmd+S on macOS), THE Canvas SHALL save the current Document state to browser localStorage and display a brief "Saved" confirmation toast
8. THE Canvas SHALL display a keyboard shortcut reference panel accessible via "?" key or a help button, listing all available shortcuts grouped by category

### Requirement 18: Onboarding Flow

**User Story:** As a first-time user, I want a guided introduction to the canvas editor, so that I can quickly understand the key features without reading documentation.

#### Acceptance Criteria

1. WHEN a user opens the canvas editor for the first time (no localStorage flag `canvas-editor-onboarded` exists), THE Application SHALL display a step-by-step onboarding tour overlay
2. THE onboarding tour SHALL consist of 4-6 steps, each highlighting a specific UI region (toolbar, canvas, properties panel, export button) with a tooltip explanation and a "Next" / "Skip" button
3. EACH onboarding step SHALL dim the rest of the interface (semi-transparent dark overlay) and spotlight the highlighted region with a visible border or glow effect
4. WHEN the user completes or skips the onboarding tour, THE Application SHALL set `canvas-editor-onboarded` in localStorage and never show the tour again automatically
5. THE Application SHALL provide a "Show Tour" button in the help menu or shortcut panel to allow users to replay the onboarding tour at any time
6. THE onboarding tour SHALL be dismissible at any step via an "X" close button or pressing Escape, and SHALL not block the user from interacting with the application if dismissed

### Requirement 19: Recent Files and Document History

**User Story:** As a user, I want to see my recently opened and created documents, so that I can quickly resume work without re-uploading files.

#### Acceptance Criteria

1. THE Application SHALL maintain a list of up to 20 recent documents in localStorage under the key `pdf-editor-recent-files`
2. EACH recent file entry SHALL store: document name, last opened timestamp, document type (canvas design, PDF tool operation), thumbnail (base64, max 10KB), and a reference to the saved document data (localStorage key or identifier)
3. WHEN the user opens the home page or canvas editor, THE Application SHALL display a "Recent" section showing the last 10 documents as visual cards with thumbnail, name, and relative time (e.g., "2 hours ago")
4. WHEN the user clicks a recent document card, THE Application SHALL load the document from localStorage and open it in the appropriate tool within 1 second
5. WHEN the user deletes a recent file entry, THE Application SHALL remove it from the recent list and optionally delete the associated saved document data from localStorage
6. IF localStorage is unavailable or the saved document data is corrupted, THEN THE Application SHALL remove the entry from the recent list and display a toast indicating the document could not be recovered
7. THE recent files list SHALL be sorted by last opened timestamp (most recent first)

### Requirement 20: PWA Support (Installable, Works Offline)

**User Story:** As a user, I want to install the app on my device and use it offline, so that I can work on documents without an internet connection.

#### Acceptance Criteria

1. THE Application SHALL include a valid `manifest.json` with: app name "PDF Editor", short name "PDF Editor", start URL "/", display mode "standalone", theme color matching the primary brand color, and icons at 192×192px and 512×512px
2. THE Application SHALL register a Service Worker that caches all application shell assets (HTML, CSS, JS bundles, fonts) using a cache-first strategy
3. WHEN the user has no internet connection, THE Application SHALL load from the Service Worker cache and function fully for all client-side operations (PDF tools, canvas editor, export)
4. WHEN the browser supports the `beforeinstallprompt` event, THE Application SHALL display a subtle "Install App" banner or button in the navigation area (not a modal popup) that triggers the native install prompt when clicked
5. AFTER installation, THE Application SHALL open in standalone mode (no browser chrome) with the configured theme color in the title bar
6. THE Service Worker SHALL update cached assets in the background when a new version is deployed, and display a "New version available — Refresh" toast when the update is ready
7. THE Application SHALL pre-cache Tesseract.js language packs that the user has previously downloaded, so OCR works offline for those languages

### Requirement 21: Performance on Mobile

**User Story:** As a user on a mobile device, I want the app to feel fast and responsive, so that I can productively use it on phones and tablets.

#### Acceptance Criteria

1. THE Application SHALL achieve a Lighthouse Performance score of 90+ on mobile (simulated 4G throttling, mid-tier device)
2. THE Application SHALL load and become interactive (Time to Interactive) within 3 seconds on a 4G connection
3. ALL touch interactions (tap, drag, pinch) SHALL respond within 100ms with visual feedback (no perceptible lag between touch and UI response)
4. THE Application SHALL lazy-load feature modules (canvas editor, OCR engine, export engines) only when the user navigates to the corresponding route, keeping the initial bundle under 200KB gzipped
5. THE Canvas editor SHALL use `touch-action: none` on the canvas element and handle touch events natively for smooth pinch-to-zoom and two-finger pan without browser interference
6. WHEN rendering the canvas on mobile devices, THE Application SHALL detect device pixel ratio and render at the appropriate resolution while limiting canvas pixel dimensions to prevent memory exhaustion (max 4096×4096 pixels on mobile)
7. THE Application SHALL use `will-change: transform` and GPU-composited layers for animated elements (toolbar transitions, panel slides, page transitions) to maintain 60fps on mobile

### Requirement 22: Error Recovery (Auto-Save and Crash Recovery)

**User Story:** As a user, I want my work to be automatically saved and recoverable after a crash, so that I never lose progress.

#### Acceptance Criteria

1. THE Application SHALL auto-save the current canvas document to localStorage every 30 seconds while the document has unsaved changes (dirty flag)
2. THE Application SHALL auto-save immediately before the `beforeunload` event fires (tab close, navigation away)
3. WHEN the user opens the canvas editor and a previously auto-saved document exists in localStorage that was not explicitly closed, THE Application SHALL display a recovery prompt: "We found unsaved work from your last session. Restore it?" with "Restore" and "Discard" buttons
4. THE recovery prompt SHALL display the document name and the timestamp of the last auto-save (e.g., "Last saved: 5 minutes ago")
5. IF the user selects "Restore", THE Application SHALL load the auto-saved document and resume editing from the last saved state within 1 second
6. IF the user selects "Discard", THE Application SHALL delete the auto-saved data from localStorage and present a fresh canvas
7. THE Application SHALL store auto-save data under the key `canvas-editor-autosave-{documentId}` separately from manual saves, so manual saves are never overwritten by auto-saves
8. IF localStorage write fails during auto-save (quota exceeded), THE Application SHALL display a non-blocking warning toast: "Auto-save failed — storage full. Consider exporting your work." and continue operating normally

### Requirement 23: Loading States and Skeleton UI

**User Story:** As a user, I want loading states to feel intentional and informative, so that I know the app is working and not broken.

#### Acceptance Criteria

1. WHEN the canvas editor is loading (route transition), THE Application SHALL display a skeleton layout matching the editor structure (toolbar skeleton, canvas area skeleton, properties panel skeleton) within 100ms of navigation
2. WHEN an export operation is in progress, THE Application SHALL display a progress indicator within the export dialog showing: format icon, "Exporting page X of Y" text, and a determinate progress bar (not a spinner)
3. WHEN an image is being uploaded/processed, THE Application SHALL display a placeholder in the canvas at the target position with a subtle pulse animation and "Loading image..." text
4. WHEN a template is being loaded, THE Application SHALL display the template thumbnail at full size with a shimmer animation overlay until the document is ready
5. ALL loading indicators SHALL appear within 100ms of the operation starting (no blank/frozen states)
6. WHEN an operation takes longer than 5 seconds, THE Application SHALL display additional context (e.g., "Large file — this may take a moment") below the progress indicator
7. THE Application SHALL never display a full-page blocking spinner. All loading states SHALL be localized to the affected region of the interface, allowing the user to interact with other parts of the app
