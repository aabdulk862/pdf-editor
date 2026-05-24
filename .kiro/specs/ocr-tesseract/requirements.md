# Requirements Document

## Introduction

This document defines the requirements for adding client-side Optical Character Recognition (OCR) to the PDF Editor application using Tesseract.js. This feature enables scanned PDF documents (which contain page images rather than embedded text) to become searchable and editable. OCR processing unlocks the existing extract-text, search, and redact features for scanned documents. All processing occurs entirely in the browser using Web Workers to maintain the application's privacy-first approach — no document data is uploaded to any server.

## Glossary

- **OCR_Engine**: The module responsible for coordinating Tesseract.js workers to perform optical character recognition on rendered PDF page images
- **OCR_Worker**: A Web Worker instance running Tesseract.js that processes page images and returns recognized text with positional data
- **Scanned_Page**: A PDF page that contains no embedded text content and consists primarily of rasterized image data
- **Text_Layer**: An invisible overlay of recognized text positioned to match the visual location of characters on the page, enabling text selection, search, and copy operations on scanned content
- **Searchable_PDF**: A PDF document that has been augmented with a text layer derived from OCR results, making previously image-only content indexable and selectable
- **Language_Pack**: A trained data file for Tesseract.js that enables recognition of a specific written language
- **Confidence_Score**: A numeric value between 0 and 100 representing Tesseract.js's certainty that a character or word was recognized correctly
- **Application**: The PDF Editor web application running entirely in the browser
- **Render_Engine**: The existing pdfjs-dist based module that renders PDF pages to canvas elements and extracts text content
- **Progress_Reporter**: The component responsible for communicating OCR processing status to the user including page progress, estimated time remaining, and per-page completion

## Requirements

### Requirement 1: OCR Engine Initialization

**User Story:** As a user, I want the OCR engine to load efficiently when needed, so that I do not experience unnecessary delays or bandwidth usage when I am not using OCR features.

#### Acceptance Criteria

1. WHEN the user initiates an OCR operation for the first time in a session, THE OCR_Engine SHALL initialize a Tesseract.js worker and load the requested Language_Pack within 10 seconds on a standard broadband connection (10 Mbps)
2. THE OCR_Engine SHALL lazy-load Tesseract.js and Language_Pack files only when the user explicitly triggers an OCR operation
3. WHILE the OCR_Engine is initializing, THE Application SHALL display a loading indicator with the message "Loading OCR engine..." and the percentage of Language_Pack data downloaded
4. IF the Language_Pack download fails due to a network error, THEN THE OCR_Engine SHALL retry the download once after a 2-second delay, and if the retry also fails, THE Application SHALL display an error message indicating the network failure and suggesting the user check their connection and try again
5. WHEN the OCR_Engine has been initialized in the current session, THE OCR_Engine SHALL reuse the existing worker for subsequent OCR operations without re-downloading Language_Pack files, loading a new Language_Pack onto the existing worker only if the user selects a different language
6. IF the Tesseract.js core library fails to load during initialization, THEN THE OCR_Engine SHALL display an error message indicating that the OCR engine could not be loaded and allow the user to retry the initialization
7. IF the user triggers an OCR operation while the OCR_Engine is already initializing, THEN THE OCR_Engine SHALL queue the new operation and begin processing it once the in-progress initialization completes, without starting a duplicate initialization

### Requirement 2: Scanned Page Detection

**User Story:** As a user, I want the application to automatically detect which pages in my PDF are scanned images, so that I know which pages need OCR processing.

#### Acceptance Criteria

1. WHEN a PDF document is loaded for OCR processing, THE OCR_Engine SHALL analyze each page to determine whether it contains embedded text or is a Scanned_Page by attempting text extraction via the Render_Engine
2. WHEN the Render_Engine completes text extraction for a page, THE OCR_Engine SHALL classify that page as a Scanned_Page if the extracted text contains fewer than 10 non-whitespace characters
3. WHEN page analysis is complete, THE Application SHALL display a summary indicating the total number of pages, the number of Scanned_Pages detected, and the number of pages with existing text
4. THE OCR_Engine SHALL complete page detection analysis for a 50-page document within 5 seconds on a device with a mid-range processor (equivalent to an Intel i5 or Apple M1)
5. WHEN all pages contain embedded text and zero Scanned_Pages are detected, THE Application SHALL display a notification informing the user that OCR is not needed and offer to proceed with standard text extraction instead
6. IF the Render_Engine fails to extract text from a page due to a rendering error, THEN THE OCR_Engine SHALL classify that page as a Scanned_Page and include it in the set of pages requiring OCR processing

### Requirement 3: OCR Text Recognition

**User Story:** As a user, I want to extract text from scanned PDF pages using OCR, so that I can search, copy, and work with the text content of scanned documents.

#### Acceptance Criteria

1. WHEN the user triggers OCR processing on selected pages, THE OCR_Engine SHALL render each selected page to an image at 300 DPI resolution and pass the image to the OCR_Worker for text recognition
2. WHEN OCR recognition completes for a page, THE OCR_Engine SHALL return recognized text for that page including the full text content, word-level bounding box coordinates expressed as pixel offsets relative to the 300 DPI rendered image (x, y, width, height), and a Confidence_Score for each recognized word
3. WHEN OCR processing completes for a page, THE OCR_Engine SHALL make the recognized text available to the extract-text feature as a plain text string with line breaks separating lines and blank lines separating paragraphs, matching the format returned by the Render_Engine extractText method
4. WHILE OCR processing is active, THE OCR_Engine SHALL process pages sequentially one at a time, releasing the rendered image data from memory for each page after recognition completes before rendering the next page
5. IF a page image fails to render or OCR recognition produces an error, THEN THE OCR_Engine SHALL skip that page, record the failure including the page number and a description of the error condition, and continue processing remaining pages
6. WHEN all selected pages have been processed, THE OCR_Engine SHALL report the total number of pages processed successfully, the number of pages that failed, and the average Confidence_Score across all recognized text
7. IF all selected pages fail during OCR processing, THEN THE OCR_Engine SHALL report zero pages processed successfully, the total number of failures with per-page error details, and shall not produce an average Confidence_Score

### Requirement 4: Multi-Language Support

**User Story:** As a user, I want to select the language of my scanned document before OCR processing, so that the recognition engine produces accurate results for documents in different languages.

#### Acceptance Criteria

1. THE Application SHALL provide a language selection control that offers at minimum: English, Spanish, French, German, Portuguese, Italian, Dutch, and Chinese (Simplified)
2. WHEN the user selects a language, THE OCR_Engine SHALL load the corresponding Language_Pack for that language within 10 seconds
3. THE Application SHALL default the language selection to English when no previous selection has been stored
4. WHEN the user selects a language that has not been previously loaded in the current session, THE OCR_Engine SHALL download the Language_Pack and display a progress indicator showing download percentage to the user
5. THE Application SHALL allow the user to select up to 3 languages simultaneously for documents containing mixed-language content, and THE OCR_Engine SHALL load all selected Language_Packs before processing begins
6. WHEN the user changes the language selection, THE Application SHALL persist the selection in localStorage for use in future sessions
7. IF a Language_Pack download fails or does not complete within 30 seconds, THEN THE OCR_Engine SHALL cancel the download, display an error message indicating the failure, and allow the user to retry the download
8. IF localStorage is unavailable or the write fails, THEN THE Application SHALL continue operating with the selected language for the current session without persisting the preference

### Requirement 5: Progress Indication

**User Story:** As a user, I want to see detailed progress during OCR processing, so that I know how long the operation will take and can decide whether to wait or cancel.

#### Acceptance Criteria

1. WHILE OCR processing is active, THE Progress_Reporter SHALL display a progress bar showing the percentage of pages completed as an integer from 0 to 100 (pages processed divided by total pages selected, multiplied by 100, rounded to the nearest whole number)
2. WHILE OCR processing is active, THE Progress_Reporter SHALL display the current page number being processed and the total number of pages selected
3. WHEN at least 2 pages have been processed, THE Progress_Reporter SHALL display an estimated time remaining in the format "Xm Ys" (minutes and seconds) calculated from the average processing time per page multiplied by the number of remaining pages
4. WHILE OCR processing is active, THE Application SHALL display a cancel button that the user can activate to stop processing
5. WHEN the user activates the cancel button, THE OCR_Engine SHALL terminate processing after the current page completes and make results from all previously completed pages available to the user
6. WHEN a page completes processing, THE Progress_Reporter SHALL update the progress bar percentage, current page number, and estimated time remaining within 1 second of page completion
7. IF the user activates the cancel button before any page has completed processing, THEN THE OCR_Engine SHALL terminate processing and THE Application SHALL display a message indicating that processing was cancelled with no results available
8. WHEN OCR processing begins and before the first page completes, THE Progress_Reporter SHALL display the progress bar at 0% with the total page count and without an estimated time remaining

### Requirement 6: Searchable PDF Generation

**User Story:** As a user, I want to create a searchable PDF from my scanned document, so that the text becomes permanently selectable and searchable without re-running OCR.

#### Acceptance Criteria

1. WHEN OCR processing completes, THE Application SHALL offer the user an option to generate a Searchable_PDF
2. WHEN the user requests Searchable_PDF generation, THE OCR_Engine SHALL create a Text_Layer for each OCR-processed page by positioning recognized text using the word-level bounding box coordinates returned by the OCR_Worker, aligning each word within 2 pixels of its detected position on the page image
3. THE Text_Layer SHALL be rendered as transparent (zero-opacity) text so that the visual appearance of the scanned page remains unchanged while enabling text selection and search in PDF reader applications
4. THE OCR_Engine SHALL embed the Text_Layer into the PDF document using pdf-lib, producing a new PDF file that contains both the original page images and the overlaid text, preserving any existing native text on non-OCR-processed pages without modification
5. WHEN Searchable_PDF generation completes, THE Application SHALL offer the result as a downloadable file with the original filename appended with "\_searchable" before the .pdf extension
6. IF the generated Searchable_PDF exceeds the original file size by more than 20%, THEN THE Application SHALL display a notification informing the user of the size increase and the new file size
7. IF pdf-lib encounters an error during Searchable_PDF generation, THEN THE Application SHALL display an error message indicating that PDF generation failed, identify the page where the failure occurred, and shall not produce a partial or corrupted output file
8. THE OCR_Engine SHALL complete Searchable_PDF generation for a 50-page document within 30 seconds on a device with a mid-range processor (equivalent to an Intel i5 or Apple M1)

### Requirement 7: Integration with Extract Text Feature

**User Story:** As a user, I want OCR results to integrate with the existing extract-text feature, so that I can extract text from scanned PDFs using the same workflow I use for native PDFs.

#### Acceptance Criteria

1. WHEN the extract-text feature detects that a PDF contains one or more Scanned_Pages with no extractable text, THE Application SHALL display a prompt offering to run OCR on those pages, identifying the count of Scanned_Pages detected
2. IF the user declines the OCR prompt, THEN THE Application SHALL display the natively extracted text from text-containing pages only, with a placeholder line per Scanned_Page indicating that page was skipped
3. WHEN the user accepts the OCR prompt from the extract-text feature, THE Application SHALL initiate OCR processing on the detected Scanned_Pages and display progress using the Progress_Reporter
4. WHEN OCR processing completes from the extract-text workflow, THE Application SHALL combine natively extracted text from text-containing pages with OCR-recognized text from Scanned_Pages in page-number order, separated by the same page break delimiter used for native extraction
5. IF OCR processing fails on one or more Scanned_Pages during the extract-text workflow, THEN THE Application SHALL include a placeholder line for each failed page indicating the page number and that recognition failed, and shall display the successfully recognized text for all other pages
6. THE Application SHALL visually distinguish OCR-extracted text from natively extracted text by displaying a summary label above the text display area indicating which page numbers used OCR and the average Confidence_Score for those pages rounded to the nearest whole number
7. WHEN the combined text result is displayed, THE Application SHALL support the same copy-to-clipboard and download-as-txt actions available for natively extracted text, including the full combined content from both native and OCR sources

### Requirement 8: Integration with Search Functionality

**User Story:** As a user, I want to search within OCR-recognized text, so that I can find specific content in scanned documents.

#### Acceptance Criteria

1. WHEN OCR processing has completed for a document, THE Application SHALL make the recognized text available to the search functionality
2. WHEN the user performs a text search on a document that has been OCR-processed, THE Application SHALL search both natively extracted text and OCR-recognized text and highlight matching results on the corresponding pages
3. THE Application SHALL display search results from OCR-processed pages with the same visual highlighting used for search results on native text pages
4. IF the user performs a search on a document containing Scanned_Pages that have not been OCR-processed, THEN THE Application SHALL display a notification suggesting the user run OCR to enable searching scanned content

### Requirement 9: Integration with Redact Feature

**User Story:** As a user, I want to redact text in scanned PDF pages after OCR processing, so that I can remove sensitive information from scanned documents.

#### Acceptance Criteria

1. WHEN OCR processing has completed for a document, THE Application SHALL enable word-level text selection on OCR-processed pages within the redact feature, allowing the user to click or drag across recognized words using the word-level bounding box coordinates from OCR results to define redaction regions
2. WHEN the user selects text for redaction on an OCR-processed page, THE Application SHALL display a semi-transparent highlight overlay on the selected word bounding boxes to indicate the pending redaction region before confirmation
3. WHEN the user confirms a redaction on an OCR-processed page, THE Application SHALL replace the pixel content within the selected bounding box coordinates in the page image with a solid black rectangle, permanently destroying the underlying image data at those coordinates
4. WHEN redaction is applied to an OCR-processed page, THE Application SHALL remove the corresponding text entries from the Text_Layer so that the redacted content is not recoverable through text extraction, copy, or search operations
5. IF the user attempts to use the redact feature on Scanned_Pages that have not been OCR-processed, THEN THE Application SHALL display a notification indicating that OCR must be run before text-based redaction is available on scanned pages, and offer an action to initiate OCR processing on those pages
6. WHEN the user confirms a redaction on an OCR-processed page, THE Application SHALL save the modified page image back into the PDF so that the redacted content cannot be recovered by extracting the original image from the file

### Requirement 10: Worker-Based Processing

**User Story:** As a user, I want OCR processing to run in the background without freezing the interface, so that I can continue interacting with the application while pages are being processed.

#### Acceptance Criteria

1. THE OCR_Engine SHALL execute all Tesseract.js recognition operations inside a Web Worker, keeping the main browser thread free for user interaction
2. WHILE OCR processing is active in the OCR_Worker, THE Application SHALL remain responsive to user interactions including scrolling, clicking navigation elements, and switching between tabs, with no main-thread task blocking input for more than 50 milliseconds
3. THE OCR_Engine SHALL limit memory usage by processing one page at a time and releasing the rendered page image data from memory immediately after recognition completes for that page, before the next page begins rendering
4. IF the browser tab is closed or navigated away during OCR processing, THEN THE OCR_Engine SHALL terminate the OCR_Worker and release all associated memory
5. WHEN the OCR_Worker completes recognition of a page, THE OCR_Engine SHALL send a progress message to the main thread containing the completed page number, the total page count, and the recognized text result for that page
6. IF Tesseract.js recognition fails for a single page, THEN THE OCR_Engine SHALL skip the failed page, include an error indication for that page in the results, and continue processing the remaining pages
7. IF the OCR_Worker crashes or becomes unresponsive for more than 30 seconds on a single page, THEN THE OCR_Engine SHALL terminate the worker, notify the user that processing failed, and report which pages were successfully processed before the failure

### Requirement 11: Performance and Resource Management

**User Story:** As a user, I want OCR to handle large documents efficiently, so that I can process multi-page scanned documents without the browser becoming unresponsive or running out of memory.

#### Acceptance Criteria

1. THE OCR_Engine SHALL process a single standard-size page (US Letter 8.5"×11" or A4 at 300 DPI resolution) within 15 seconds on a device with a mid-range processor (equivalent to an Intel i5 or Apple M1)
2. THE OCR_Engine SHALL maintain peak memory usage below 500 MB during processing of any single page by releasing rendered image buffers before processing the next page
3. WHEN processing a document with more than 20 pages, THE OCR_Engine SHALL process pages in sequential batches of 1 page at a time to prevent memory accumulation
4. THE Application SHALL allow the user to select individual pages or contiguous page ranges for OCR processing, with a minimum selection of 1 page
5. IF the browser reports a memory pressure warning or the OCR_Worker encounters an out-of-memory error, THEN THE OCR_Engine SHALL pause processing, release rendered page image buffers and intermediate recognition data for unprocessed pages, preserve results from all previously completed pages, and offer the user the option to continue with reduced resolution (150 DPI) or cancel the operation
6. THE OCR_Engine SHALL support processing documents of up to 200 pages (standard US Letter or A4 size) on a device with 8 GB RAM without the browser crashing or becoming permanently unresponsive, where individual page recognition failures are handled per Requirement 3 criterion 5

### Requirement 12: Letterhead Creator and Editor

**User Story:** As a user, I want to easily create and edit letterheads for my PDF documents, so that I can produce professional-looking correspondence and branded documents without needing external design tools.

#### Acceptance Criteria

1. THE Application SHALL provide a letterhead editor accessible from the tools menu that allows the user to design a letterhead layout by placing a logo image, company name, address lines, contact information, and optional tagline in configurable positions (left, center, or right aligned) within a header area occupying the top 100px of the page
2. WHEN the user opens the letterhead editor, THE Application SHALL display a live preview of the letterhead applied to the first page of the current document or a blank A4/Letter page if no document is loaded, updating the preview within 1 second of any field change
3. THE Application SHALL allow the user to upload a logo image (PNG, JPG, or SVG, maximum file size 5MB) and position it at the left, center, or right of the header area, with adjustable size (width between 50px and 300px, maintaining aspect ratio)
4. IF the user uploads a logo file that is not PNG, JPG, or SVG format, or exceeds 5MB in size, THEN THE Application SHALL reject the upload and display an error message indicating the accepted formats and maximum file size
5. THE Application SHALL provide text fields for company name (maximum 100 characters), address (up to 3 lines, maximum 80 characters per line), phone number (maximum 30 characters), email (maximum 100 characters), and website (maximum 100 characters), each with configurable font family (from available system fonts), font size (8pt to 24pt), color, and alignment (left, center, right)
6. WHEN the user saves the letterhead design, THE Application SHALL store the letterhead as a reusable template in localStorage with a user-provided name (1 to 50 characters), allowing a maximum of 20 saved templates
7. THE Application SHALL display a list of saved letterhead templates that the user can select, edit, duplicate, rename, or delete
8. WHEN the user applies a letterhead template to a document, THE Application SHALL overlay the letterhead elements onto the selected pages (first page only, all pages, or a custom page range specified as comma-separated page numbers or ranges such as "1,3,5-8") using pdf-lib without modifying the existing page content
9. THE Application SHALL provide a "quick apply" action that applies the most recently used letterhead template to the current document's first page with a single click
10. IF the user triggers "quick apply" and no letterhead template has been previously used, THEN THE Application SHALL display a message indicating no recent template is available and prompt the user to select or create a template
11. IF the user edits a saved letterhead template, THEN THE Application SHALL update the template in localStorage and display the updated preview within 1 second
12. THE Application SHALL support exporting a letterhead template as a standalone single-page PDF that can be shared or used as a background in other applications
13. IF localStorage quota is exceeded when saving or updating a letterhead template, THEN THE Application SHALL display an error message indicating that storage is full and suggest deleting unused templates to free space

### Requirement 13: Unified UI Design and Visual Consistency

**User Story:** As a user, I want the OCR and letterhead features to have a consistent, polished visual design that matches the rest of the application, so that the experience feels cohesive and professional.

#### Acceptance Criteria

1. ALL new UI components introduced by this spec (OCR processing panel, language selector, progress display, letterhead editor, template list) SHALL use the existing Tailwind CSS design tokens (primary-_, secondary-_, text-light, text-dark, background-light, background-dark) and follow the same border-radius (rounded-md for containers, rounded-lg for panels), shadow (shadow-lg for elevated elements, shadow-xl for modals), and spacing scale (gap-2, gap-3, gap-4, px-4, px-6, py-4) used in existing components (Button, Modal, Toast, Layout)
2. ALL new pages and panels SHALL support dark mode using the existing dark: variant classes, with proper contrast ratios meeting WCAG 2.1 AA (minimum 4.5:1 for normal text, 3:1 for large text)
3. THE OCR feature page SHALL follow the same two-column layout pattern used by other tool pages: a configuration/controls panel on the left (max-width 320px on desktop) and a document preview panel on the right occupying remaining space, collapsing to a single stacked column on viewports below 768px width
4. ALL loading states (OCR engine initialization, language pack download, page processing) SHALL use the existing Skeleton component for content placeholders and the existing ProgressBar component for determinate progress
5. ALL error messages and notifications SHALL use the existing Toast component with appropriate severity levels (error for failures, warning for size increases or low confidence, info for suggestions like "run OCR first")
6. ALL confirmation dialogs (apply letterhead, generate searchable PDF, confirm redaction) SHALL use the existing Modal component with consistent header, body, and footer layout
7. WHEN a user modifies letterhead properties (position, text, logo), THE letterhead editor SHALL update the WYSIWYG canvas preview within 200 milliseconds of the input change, using a white page background with a drop shadow (shadow-lg) matching the existing PreviewPanel document container styling
8. ALL interactive controls (buttons, dropdowns, inputs) SHALL meet a minimum touch target size of 44x44px and include visible focus indicators using the existing focus-visible:ring-2 pattern
9. WHEN no data is present for a feature view (no saved letterhead templates, no OCR results yet), THE Application SHALL display an empty state containing an inline SVG icon (minimum 48x48px), a descriptive message (maximum 120 characters) explaining the empty condition, and a primary action Button component to initiate the relevant workflow
10. THE Application SHALL use inline SVG icons from the same icon set used throughout the app for all new actions (OCR scan, language select, letterhead apply, template save/delete), with each icon rendered at a consistent size of 20x20px (w-5 h-5) within controls and 24x24px (w-6 h-6) for standalone action indicators
11. ALL form inputs in the letterhead editor and OCR language selector SHALL include visible labels, placeholder text, and inline validation feedback using the existing Input component patterns
12. WHEN transitioning between OCR processing states (detecting → processing → results) or letterhead editor states (editing → previewing → applying), THE Application SHALL apply CSS transitions with duration-200 for opacity and color changes and duration-300 for layout and transform changes, consistent with existing component animations

### Requirement 14: Navigation Redesign with Categorized Tool Groups

**User Story:** As a user, I want the sidebar navigation to be organized into logical categories with icons and a search filter, so that I can quickly find the tool I need among 30+ features without scrolling through a flat list.

#### Acceptance Criteria

1. THE sidebar navigation SHALL organize all tools into collapsible category groups: "Organize" (merge, split, rotate, reorder, delete pages, duplicate pages), "Edit" (text overlay, highlight, signature, stamps, watermarks, headers & footers, crop, letterhead, form fill), "Convert" (image to PDF, PDF to image, extract images, extract text, flatten, linearize), "Protect" (password protect, unlock, redact), "Analyze" (compare, bookmarks, metadata, page numbers, page size, compress), and "OCR" (OCR scan, searchable PDF)
2. EACH navigation link SHALL display a 20x20px inline SVG icon to the left of the label text with 8px spacing between the icon and label, where each icon uses a distinct shape recognizable at 20x20px scale (e.g., scissors for split, lock for password protect, eye for OCR)
3. THE sidebar SHALL include a search/filter text input at the top (below the app title) with placeholder text "Filter tools..." that filters visible navigation links as the user types, matching case-insensitively against tool names and category names
4. WHEN the user types in the navigation filter input, THE sidebar SHALL show only tools whose name or parent category name contains the typed substring, with their parent category header visible, hiding non-matching tools and categories that contain zero matching tools, within 100ms of each keystroke
5. IF the navigation filter input value matches zero tools, THEN THE sidebar SHALL display a "No tools found" message in place of the category list
6. EACH category group SHALL be collapsible via a chevron toggle icon, with the collapsed/expanded state persisted per-category in localStorage so it survives page reloads, and all categories SHALL default to expanded on first visit (no prior localStorage entry)
7. THE sidebar SHALL display a "Favorites" section at the top (below the filter input) showing tools the user has pinned, with a maximum of 8 pinned tools persisted in localStorage; IF the user attempts to pin a 9th tool, THEN THE system SHALL display an inline message indicating the maximum of 8 favorites has been reached and not add the tool
8. THE user SHALL be able to pin/unpin a tool by right-clicking (desktop) or long-pressing for 500ms (mobile) a navigation link, which opens a context menu with a single action: "Add to Favorites" if unpinned, or "Remove from Favorites" if already pinned
9. THE sidebar SHALL display a "Recent" section (below Favorites, above categories) showing up to the 5 most recently used tools persisted in localStorage, updated when the user navigates to a tool page; IF fewer than 5 tools have been used, THEN THE section SHALL display only those tools that have been visited; IF no tools have been visited, THEN THE "Recent" section SHALL be hidden
10. WHEN the sidebar is in its collapsed state on desktop (triggered by a toggle button at the bottom of the sidebar), THE sidebar SHALL shrink to 48px width showing only tool icons with tool names appearing as tooltips on hover after a 300ms delay
11. THE collapsed/expanded sidebar state SHALL be persisted in localStorage and the toggle SHALL animate the sidebar width change using a 200ms ease transition
12. ON mobile viewports (below 768px), THE navigation SHALL render as a full-screen overlay triggered by a menu button, containing the same category grouping, search filter, favorites section, and recent section, with a visible close button (minimum 44x44px touch target) in the top-right corner
13. THE active tool link SHALL display a 3px solid primary-600 left border in addition to the existing background highlight, providing a visual indicator of the current location
14. WHEN the user opens the navigation on mobile, THE full-screen overlay SHALL animate in from the bottom with a 200ms ease transition and include a semi-transparent backdrop that closes the overlay when tapped
