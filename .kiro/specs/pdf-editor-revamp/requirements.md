# Requirements Document

## Introduction

This document defines the requirements for a comprehensive revamp of the existing PDF Editor application. The current application is a React-based client-side tool (built with Create React App) that supports merging and splitting PDFs using pdf-lib. The revamp modernizes the tech stack (Vite, TypeScript, Tailwind CSS), restructures the project by feature, and introduces a wide range of new PDF operations, annotations, security features, and UX improvements — all running entirely client-side.

## Glossary

- **Application**: The PDF Editor web application running entirely in the browser
- **Build_System**: The Vite-based build toolchain that compiles and bundles the application
- **File_Upload_Zone**: The drag-and-drop area where users provide PDF or image files for processing
- **PDF_Engine**: The client-side module responsible for executing PDF manipulation operations using pdf-lib
- **Annotation_Engine**: The client-side module responsible for rendering and applying annotations, overlays, and drawings to PDF pages
- **Security_Module**: The client-side module responsible for encrypting, decrypting, and redacting PDF content
- **Preview_Panel**: The UI component that renders a visual preview of PDF pages before and after operations
- **Operation_History**: The in-memory stack that tracks user actions for undo/redo functionality
- **Toast_Notification**: A non-blocking UI message that informs the user of success, warning, or error states
- **Session_Download_History**: The in-memory list of files processed and downloaded during the current browser session
- **State_Manager**: The centralized state management layer (React Context or Zustand) that coordinates application state
- **Navigation_Bar**: The top-level navigation component with route links and active route indicators
- **Theme_Provider**: The module that manages light/dark mode preferences and applies corresponding styles
- **Progress_Indicator**: A visual bar or spinner that communicates ongoing operation progress to the user
- **Batch_Processor**: The module that applies a selected operation to multiple files sequentially

## Requirements

### Requirement 1: Vite Migration

**User Story:** As a developer, I want the project to use Vite as the build tool, so that I get faster development builds and hot module replacement.

#### Acceptance Criteria

1. THE Build_System SHALL use Vite as the development server and production bundler
2. THE Build_System SHALL support TypeScript compilation with only a vite.config.ts and tsconfig.json present in the project root
3. WHILE the development server is running, THE Build_System SHALL provide hot module replacement that reflects saved source file changes in the browser without a full page reload
4. WHEN a production build is triggered, THE Build_System SHALL output tree-shaken, code-split, and minified bundles to a dist/ directory
5. WHEN a production build is triggered, THE Build_System SHALL complete the build process and report any compilation errors to the terminal with file path and line number

### Requirement 2: TypeScript Conversion

**User Story:** As a developer, I want all source files written in TypeScript, so that I benefit from static type checking and improved code maintainability.

#### Acceptance Criteria

1. THE Application SHALL have all source files in the src/ and test/ directories written in TypeScript (.ts or .tsx extensions), excluding configuration files at the project root
2. THE Application SHALL define shared type definitions in a dedicated src/types/ directory, where a shared type is any type referenced by more than one feature directory
3. THE Build_System SHALL enforce strict TypeScript compiler options with at minimum strict mode enabled and no implicit any allowed in the tsconfig.json
4. WHEN a type error is present, THE Build_System SHALL fail the compilation and report the error with file path and line number
5. THE Application SHALL use explicit type annotations for all exported function signatures and component props

### Requirement 3: Functional Components and Hooks

**User Story:** As a developer, I want all React components to use functional components with hooks, so that the codebase follows modern React patterns.

#### Acceptance Criteria

1. THE Application SHALL use functional components exclusively (no class components)
2. THE Application SHALL use React hooks for state management, side effects, and context consumption
3. WHEN stateful logic is used by two or more components, THE Application SHALL extract that logic into a custom hook with a "use" prefix
4. WHEN a class component is detected in the source code, THE Build_System SHALL report a linting error during development

### Requirement 4: Tailwind CSS Styling

**User Story:** As a developer, I want Tailwind CSS as the styling solution, so that I can build consistent UIs with utility classes and remove the dependency on Bootstrap and App.css.

#### Acceptance Criteria

1. THE Application SHALL use Tailwind CSS as the sole utility-class styling framework, with no additional CSS framework dependencies
2. THE Application SHALL remove all Bootstrap, react-bootstrap, and react-bootstrap-icons packages from dependencies, and remove all import statements referencing Bootstrap or react-bootstrap from source files
3. WHEN a production build is triggered, THE Build_System SHALL include only the Tailwind CSS classes that are referenced in source files in the final output
4. THE Application SHALL define a design token configuration in the Tailwind config file that includes at minimum: a color palette (primary, secondary, accent, background, text, error, and success colors), a spacing scale, and typography settings (font families and font size scale)
5. THE Application SHALL not use the App.css file for styling, and all component styles SHALL be expressed using Tailwind utility classes or Tailwind's @apply directive in component-scoped styles

### Requirement 5: Feature-Based Project Structure

**User Story:** As a developer, I want the project organized by feature, so that related code is co-located and easy to navigate.

#### Acceptance Criteria

1. THE Application SHALL organize source code into feature directories under src/features/, with one directory per PDF operation (merge, split, rotate, delete-pages, reorder, compress, image-to-pdf, page-numbers, extract-images, text-overlay, highlight, signature, stamps, watermarks, password-protect, unlock, redact, metadata, form-fill, compare, extract-text, pdf-to-image, flatten, crop, headers-footers, bookmarks, page-size, linearize, duplicate-pages)
2. THE Application SHALL maintain a shared src/components/ui/ directory for reusable UI primitives (buttons, modals, inputs) that are used by two or more features
3. THE Application SHALL store shared type definitions in src/types/
4. WHEN a new PDF operation feature is added, THE Application SHALL contain all feature-specific components, hooks, and utilities within that feature's directory using a consistent internal structure (components/, hooks/, utils/)
5. IF a component or utility is used by only one feature, THEN THE Application SHALL place that component or utility within that feature's directory rather than in the shared directories

### Requirement 6: Rotate Pages

**User Story:** As a user, I want to rotate pages in a PDF by 90°, 180°, or 270°, so that I can correct page orientation.

#### Acceptance Criteria

1. WHEN the user selects one or more pages and a rotation angle (90°, 180°, or 270° clockwise), THE PDF_Engine SHALL rotate the selected pages by the specified angle in the clockwise direction
2. WHEN the user applies a rotation, THE Preview_Panel SHALL display the rotated pages before the user downloads the result
3. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
4. IF the user triggers rotation without selecting at least one page or without selecting a rotation angle, THEN THE Application SHALL display a Toast_Notification indicating that both a page selection and a rotation angle are required

### Requirement 7: Delete Pages

**User Story:** As a user, I want to delete specific pages from a PDF, so that I can remove unwanted content.

#### Acceptance Criteria

1. WHEN the user selects one or more pages for deletion and confirms the action, THE PDF_Engine SHALL remove those pages from the PDF and update page numbering sequentially
2. IF the user attempts to delete all pages, THEN THE Application SHALL display a Toast_Notification warning that at least one page must remain and SHALL NOT perform the deletion
3. WHEN the deletion is complete, THE Preview_Panel SHALL update within 2 seconds to reflect the remaining pages with correct page numbering
4. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 8: Reorder Pages

**User Story:** As a user, I want to reorder pages in a PDF via drag-and-drop, so that I can arrange pages in my preferred sequence.

#### Acceptance Criteria

1. THE Application SHALL display PDF pages as draggable thumbnails with visible page numbers
2. WHEN the user drags a page thumbnail, THE Application SHALL display a visual drop indicator showing the target position
3. WHEN the user drops a page thumbnail at a new position, THE Application SHALL update the displayed page order within 200ms
4. WHEN the user confirms the new order, THE PDF_Engine SHALL produce a PDF with pages in the user-specified sequence
5. THE Preview_Panel SHALL reflect the current page order at all times
6. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 9: Compress PDF

**User Story:** As a user, I want to compress a PDF to reduce its file size, so that I can share or store it more efficiently.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and triggers compression, THE PDF_Engine SHALL reduce the file size by removing redundant objects and optimizing streams
2. WHEN compression completes, THE Application SHALL display the file size before and after compression, including the percentage reduction
3. IF compression produces less than 5% size reduction, THEN THE Application SHALL inform the user via a Toast_Notification that the file could not be significantly reduced
4. THE Application SHALL allow the user to download the compressed PDF
5. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 10: Convert Images to PDF

**User Story:** As a user, I want to convert PNG or JPG images to a PDF, so that I can consolidate images into a single document.

#### Acceptance Criteria

1. WHEN the user uploads between 1 and 50 PNG or JPG images, THE PDF_Engine SHALL create a PDF with each image on a separate page in the order specified by the user
2. THE PDF_Engine SHALL scale each image to fit within the page dimensions while preserving the aspect ratio and center the image both horizontally and vertically on the page
3. IF an uploaded file is not a valid PNG or JPG, THEN THE Application SHALL display a Toast_Notification with an error message indicating which file was rejected and the accepted formats
4. THE Application SHALL allow the user to reorder uploaded images via drag-and-drop before triggering the conversion

### Requirement 11: Add Page Numbers

**User Story:** As a user, I want to add page numbers to a PDF, so that my document is easier to navigate when printed.

#### Acceptance Criteria

1. WHEN the user triggers the add-page-numbers operation, THE PDF_Engine SHALL embed sequential page numbers on each page of the PDF starting from the user-specified starting number
2. THE Application SHALL allow the user to select the position of page numbers (top-left, top-center, top-right, bottom-left, bottom-center, bottom-right) with bottom-center as the default selection
3. THE Application SHALL allow the user to specify a starting page number as an integer between 1 and 9999
4. IF the user enters a starting page number that is not an integer between 1 and 9999, THEN THE Application SHALL display a Toast_Notification indicating the valid range
5. THE Preview_Panel SHALL display the page numbers at the selected position before the user downloads the result
6. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 12: Extract Images from PDF

**User Story:** As a user, I want to extract all images from a PDF, so that I can reuse them individually.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and triggers image extraction, THE PDF_Engine SHALL identify and extract all embedded raster images, preserving each image's original format and resolution
2. WHEN extraction completes, THE Application SHALL present extracted images as a downloadable list displaying each image's file format, dimensions in pixels, and file size
3. IF the PDF contains no embedded images, THEN THE Application SHALL inform the user via a Toast_Notification
4. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
5. THE Application SHALL allow the user to download images individually or as a single ZIP archive

### Requirement 13: Text Overlay

**User Story:** As a user, I want to add text overlays to PDF pages, so that I can annotate documents with custom text.

#### Acceptance Criteria

1. WHEN the user places a text overlay on a page, THE Annotation_Engine SHALL render the text at the position indicated by the user's click or drag action on the page
2. THE Application SHALL allow the user to configure font size (between 6pt and 144pt), font color, and position of the text overlay, with a maximum text length of 1000 characters
3. THE Preview_Panel SHALL display the text overlay within 500ms of the user editing it
4. WHEN the user confirms the annotation, THE PDF_Engine SHALL embed the text into the PDF output preserving the configured font size, font color, and position
5. IF the user attempts to confirm a text overlay with empty text, THEN THE Application SHALL display a Toast_Notification indicating that text content is required

### Requirement 14: Highlight Text Areas

**User Story:** As a user, I want to highlight rectangular areas on a PDF page, so that I can draw attention to specific content.

#### Acceptance Criteria

1. WHEN the user draws a rectangular selection on a page, THE Annotation_Engine SHALL render a highlight with 40% opacity over the selected area
2. THE Application SHALL allow the user to choose the highlight color from at least 4 predefined color options, with yellow selected as the default
3. WHEN the user confirms the annotation, THE PDF_Engine SHALL embed the highlight into the PDF output
4. THE Preview_Panel SHALL display the highlight overlay in real time as the user draws and repositions it
5. THE Application SHALL allow the user to add multiple highlights to a single page before confirming

### Requirement 15: Freehand Signature Drawing

**User Story:** As a user, I want to draw a freehand signature on a PDF page, so that I can sign documents digitally.

#### Acceptance Criteria

1. THE Annotation_Engine SHALL provide a canvas for freehand drawing overlaid on the selected PDF page, matching the page dimensions
2. WHEN the user draws a signature, THE Annotation_Engine SHALL render the strokes with no more than 16ms latency per frame
3. THE Application SHALL allow the user to choose stroke color and stroke width between 1px and 10px
4. THE Application SHALL allow the user to position the signature canvas on the PDF page before or after drawing
5. WHEN the user confirms the signature, THE PDF_Engine SHALL embed the signature drawing into the PDF output at the user-specified position
6. THE Application SHALL allow the user to clear and redraw the signature before confirming
7. IF the user attempts to confirm a signature with no strokes drawn, THEN THE Application SHALL display a Toast_Notification indicating that a signature must be drawn before confirming

### Requirement 16: Stamps

**User Story:** As a user, I want to add predefined stamps (e.g., "APPROVED", "DRAFT", "CONFIDENTIAL") to a PDF page, so that I can mark document status.

#### Acceptance Criteria

1. THE Application SHALL provide predefined stamp options including "APPROVED", "DRAFT", and "CONFIDENTIAL"
2. WHEN the user selects a stamp and places it on a page, THE Annotation_Engine SHALL render the stamp at the specified position
3. WHILE the stamp is unconfirmed, THE Application SHALL allow the user to resize the stamp between 50x50 and 500x500 pixels and reposition it anywhere within the page boundaries
4. WHEN the user confirms the stamp, THE PDF_Engine SHALL embed the stamp into the PDF output
5. THE Preview_Panel SHALL display the stamp on the page in real time as the user positions and resizes it
6. IF the user cancels stamp placement before confirming, THEN THE Annotation_Engine SHALL discard the stamp and restore the page to its previous state
7. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 17: Watermarks

**User Story:** As a user, I want to insert a watermark (text or image) across PDF pages, so that I can protect or brand my documents.

#### Acceptance Criteria

1. THE Application SHALL allow the user to specify a text watermark (1 to 200 characters) or upload an image watermark in PNG or JPG format
2. WHEN the user applies a watermark, THE PDF_Engine SHALL render the watermark centered on every page of the PDF
3. THE Application SHALL allow the user to configure watermark opacity (1% to 100%) and rotation angle (0° to 359°)
4. THE Preview_Panel SHALL display the watermark before the user downloads the result
5. IF the user provides an empty text watermark or uploads a file that is not a valid PNG or JPG image, THEN THE Application SHALL display a Toast_Notification with a descriptive error message and not apply the watermark

### Requirement 18: Password Protection

**User Story:** As a user, I want to password-protect a PDF, so that only authorized recipients can open it.

#### Acceptance Criteria

1. WHEN the user provides a password and triggers encryption, THE Security_Module SHALL encrypt the PDF with the specified password
2. THE Application SHALL require the user to confirm the password by entering it twice
3. IF the two password entries do not match, THEN THE Application SHALL display a Toast_Notification indicating the mismatch
4. THE Application SHALL allow the user to download the encrypted PDF
5. IF the user submits an empty password or a password exceeding 128 characters, THEN THE Application SHALL display a Toast_Notification indicating the password must be between 1 and 128 characters
6. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
7. IF encryption fails, THEN THE Application SHALL display a Toast_Notification indicating the failure and SHALL NOT produce a downloadable file

### Requirement 19: Unlock PDF

**User Story:** As a user, I want to remove a password from a protected PDF, so that I can access and edit it freely.

#### Acceptance Criteria

1. WHEN the user uploads a password-protected PDF and provides the correct password, THE Security_Module SHALL decrypt the PDF and produce an unprotected version
2. IF the provided password is incorrect, THEN THE Security_Module SHALL display a Toast_Notification indicating the password is invalid and allow the user to re-enter the password without re-uploading the file
3. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
4. IF the uploaded PDF is not password-protected, THEN THE Application SHALL inform the user via a Toast_Notification that the file is not encrypted and does not require unlocking
5. THE Application SHALL allow the user to download the unlocked PDF

### Requirement 20: Redact Content

**User Story:** As a user, I want to redact sensitive content from a PDF, so that confidential information is permanently removed.

#### Acceptance Criteria

1. WHEN the user selects one or more rectangular areas on one or more pages for redaction, THE Security_Module SHALL permanently remove all content (text, images, and vector graphics) within each selected area and replace it with a black rectangle
2. THE Preview_Panel SHALL display the redacted areas as black rectangles matching the final output before the user downloads the result
3. THE Security_Module SHALL ensure redacted content is not recoverable from the output PDF by removing the underlying text, image data, and metadata within redacted regions from the file structure
4. THE Application SHALL allow the user to adjust, reposition, or remove individual redaction selections before confirming the redaction operation
5. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
6. IF the user triggers the redaction operation with no areas selected, THEN THE Application SHALL display a Toast_Notification indicating that at least one area must be selected

### Requirement 21: Drag-and-Drop File Upload

**User Story:** As a user, I want to upload files via drag-and-drop, so that I can quickly provide files without navigating file dialogs.

#### Acceptance Criteria

1. THE File_Upload_Zone SHALL accept files dragged from the user's file system, supporting PDF, PNG, and JPG file types up to 100 MB per file and up to 20 files per upload action
2. THE File_Upload_Zone SHALL also provide a click-to-browse fallback for file selection
3. WHEN one or more valid files are dropped or selected, THE Application SHALL display the file name and file size for each accepted file
4. IF a dropped or selected file has an unsupported type (not PDF, PNG, or JPG), THEN THE Application SHALL display a Toast_Notification indicating which file was rejected and the list of accepted file types
5. IF a dropped or selected file exceeds 100 MB, THEN THE Application SHALL display a Toast_Notification indicating the file exceeds the maximum allowed size
6. WHILE a file is being dragged over the File_Upload_Zone, THE File_Upload_Zone SHALL display a distinct border style and background color change to indicate it is a valid drop target

### Requirement 22: Batch Processing

**User Story:** As a user, I want to apply an operation to multiple files at once, so that I can process documents efficiently.

#### Acceptance Criteria

1. WHEN the user uploads between 2 and 50 files and selects an operation, THE Batch_Processor SHALL apply the operation to each file sequentially
2. WHILE batch processing is in progress, THE Progress_Indicator SHALL display the current file number and total file count (e.g., "Processing file 3 of 10")
3. WHEN batch processing completes, THE Application SHALL present all successful results as a downloadable list showing file name, output file size, and a download action for each entry
4. IF an individual file fails during batch processing, THEN THE Batch_Processor SHALL skip the failed file, continue processing remaining files, and report the failure via a Toast_Notification indicating which file failed
5. IF the user cancels batch processing, THEN THE Batch_Processor SHALL stop processing after the current file completes and present results for all files processed up to that point

### Requirement 23: PDF Preview

**User Story:** As a user, I want to preview PDF pages before and after operations, so that I can verify results before downloading.

#### Acceptance Criteria

1. THE Preview_Panel SHALL render PDF pages as visual thumbnails at a minimum resolution of 150px width per thumbnail
2. WHEN the user applies an operation, THE Preview_Panel SHALL display both the original and the modified PDF side by side
3. THE Preview_Panel SHALL support zooming from 50% to 200% in increments and scrolling through multi-page documents
4. THE Preview_Panel SHALL render pages within 2 seconds for PDFs up to 50 pages
5. THE Preview_Panel SHALL display the current page number and total page count
6. IF a PDF page fails to render, THEN THE Preview_Panel SHALL display a placeholder with an error message indicating the page could not be rendered
7. WHEN the user uploads a PDF with more than 50 pages, THE Preview_Panel SHALL render pages on demand as the user scrolls rather than loading all pages at once

### Requirement 24: Session Download History

**User Story:** As a user, I want to see a history of files I have downloaded in the current session, so that I can re-download previous results.

#### Acceptance Criteria

1. THE Session_Download_History SHALL record each file downloaded during the current browser session, retaining the file data in memory, up to a maximum of 50 entries
2. THE Application SHALL display the download history with file name (truncated to 60 characters with ellipsis if longer), operation performed, and timestamp in the user's locale format
3. WHEN the user clicks a history entry, THE Application SHALL re-trigger the download of that file using the retained file data
4. IF the file data for a history entry is no longer available in memory, THEN THE Application SHALL display a Toast_Notification indicating the file is unavailable and disable the re-download action for that entry
5. WHEN the browser session ends, THE Session_Download_History SHALL be cleared including all retained file data
6. WHEN the Session_Download_History reaches the maximum of 50 entries, THE Session_Download_History SHALL remove the oldest entry before recording a new one

### Requirement 25: Undo/Redo

**User Story:** As a user, I want to undo and redo operations, so that I can correct mistakes without starting over.

#### Acceptance Criteria

1. WHEN the user performs an operation, THE Operation_History SHALL push the operation onto the undo stack, retaining a maximum of 50 operations (discarding the oldest when the limit is exceeded)
2. WHEN the user triggers undo, THE Operation_History SHALL revert the most recent operation by restoring the document to its state before that operation and push the reverted operation onto the redo stack
3. WHEN the user triggers redo, THE Operation_History SHALL re-apply the most recently undone operation and move it back to the undo stack
4. THE Application SHALL display undo and redo buttons with disabled state when the respective stack is empty
5. WHEN the user performs a new operation after undoing one or more operations, THE Operation_History SHALL clear the redo stack
6. WHEN the user presses Ctrl+Z (Cmd+Z on macOS), THE Application SHALL trigger undo, and WHEN the user presses Ctrl+Y (Cmd+Shift+Z on macOS), THE Application SHALL trigger redo

### Requirement 26: Dark Mode

**User Story:** As a user, I want to toggle between light and dark mode, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Theme_Provider SHALL support light and dark color schemes
2. WHEN the user toggles the theme, THE Theme_Provider SHALL apply the selected color scheme to all UI components within 100ms without a full page reload
3. THE Theme_Provider SHALL persist the user's theme preference in local storage
4. WHEN the application loads and a previously saved theme preference exists in local storage, THE Theme_Provider SHALL apply the saved preference
5. IF no saved theme preference exists in local storage, THEN THE Theme_Provider SHALL apply the light color scheme as the default
6. THE Application SHALL provide a visible toggle control in the Navigation_Bar that allows the user to switch between light and dark mode

### Requirement 27: Mobile-Responsive Layout

**User Story:** As a user, I want the application to work well on mobile devices, so that I can process PDFs on any screen size.

#### Acceptance Criteria

1. THE Application SHALL adapt its layout to screen widths from 320px to 2560px using responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
2. WHILE the viewport is narrower than 768px, THE Navigation_Bar SHALL collapse into a hamburger menu that opens and closes on tap
3. THE File_Upload_Zone SHALL remain usable on touch devices with a minimum tap target size of 44x44px
4. WHILE the viewport is narrower than 768px, THE Application SHALL maintain a minimum body font size of 16px and a minimum tap target size of 44x44px for all interactive elements
5. WHILE the viewport is narrower than 768px, THE Preview_Panel SHALL switch from side-by-side layout to a stacked layout
6. THE Application SHALL support touch gestures (pinch-to-zoom on previews, swipe to navigate pages)
7. WHILE the viewport is narrower than 640px, THE Application SHALL hide non-essential UI elements (e.g., file size percentages, secondary actions) behind expandable sections
8. WHILE the viewport is narrower than 768px, THE Annotation_Engine SHALL support touch-based drawing and positioning with a minimum touch target size of 44x44px for annotation controls
9. WHILE the viewport is narrower than 768px, THE Application SHALL render all modals, dropdowns, and popovers within the visible viewport bounds without requiring horizontal scrolling, and SHALL allow dismissal via a visible close button or tap outside the element

### Requirement 28: Progress Indicator

**User Story:** As a user, I want to see a progress bar during long operations, so that I know the application is working and can estimate wait time.

#### Acceptance Criteria

1. WHEN an operation takes longer than 500ms, THE Progress_Indicator SHALL display a visual progress bar
2. WHILE deterministic progress is available (total steps known), THE Progress_Indicator SHALL display the percentage of completion and update at least every 1 second or every 5% increment, whichever occurs first
3. WHILE deterministic progress is not available, THE Progress_Indicator SHALL display an indeterminate animation (e.g., a continuous animated bar) to indicate the operation is in progress
4. WHEN the operation completes, THE Progress_Indicator SHALL disappear within 300ms
5. IF an operation fails while the Progress_Indicator is displayed, THEN THE Progress_Indicator SHALL disappear within 300ms and THE Application SHALL display a Toast_Notification with a descriptive error message
6. THE Progress_Indicator SHALL include an accessible label conveying the current progress state to assistive technologies (e.g., via ARIA attributes)

### Requirement 29: File Size Display

**User Story:** As a user, I want to see file sizes before and after processing, so that I can understand the impact of operations.

#### Acceptance Criteria

1. WHEN a file is uploaded, THE Application SHALL display the file size using bytes for sizes under 1 KB, KB with one decimal place for sizes under 1 MB, and MB with one decimal place for sizes 1 MB and above
2. WHEN an operation produces an output file, THE Application SHALL display the output file size next to the original file size using the same unit formatting rules
3. WHEN an operation produces an output file, THE Application SHALL calculate and display the size difference as a percentage change rounded to one decimal place, prefixed with "+" for size increases and "−" for size decreases
4. IF the output file size is equal to the original file size, THEN THE Application SHALL display a percentage change of "0.0%"

### Requirement 30: Modern UI Design

**User Story:** As a user, I want a clean, modern interface with consistent spacing and typography, so that the application feels professional and easy to use.

#### Acceptance Criteria

1. THE Application SHALL use a consistent spacing scale (based on Tailwind's default spacing) across all pages, with no arbitrary spacing values outside the defined scale
2. THE Application SHALL use a consistent typographic hierarchy with distinct font sizes for each level: page headings (24px–30px), section headings (18px–22px), body text (14px–16px), and captions (12px)
3. THE Navigation_Bar SHALL indicate the currently active route with a visually distinct style that differs from inactive links in at least one property (background color, border, or font weight)
4. THE Application SHALL apply CSS transitions with a duration between 150ms and 300ms for page changes, list item additions/removals, and interactive state changes (hover, focus)
5. IF the user navigates to a different route, THEN THE Navigation_Bar SHALL update the active route indicator to reflect the new route within the same render cycle

### Requirement 31: Error Handling and Notifications

**User Story:** As a user, I want clear error messages and notifications, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN an operation fails, THE Application SHALL display a Toast_Notification that identifies the failed operation and describes a corrective action the user can take
2. THE Application SHALL render error boundaries around each feature section to prevent full-page crashes
3. WHEN a component within an error boundary crashes, THE Application SHALL display a fallback UI that describes the error context and provides a retry button to re-mount the component
4. THE Toast_Notification SHALL auto-dismiss after 5 seconds unless the user hovers over or clicks on it
5. THE Application SHALL visually distinguish Toast_Notification severity levels (success, warning, error) using distinct color coding and an icon for each level
6. IF an error occurs during an operation, THEN THE Application SHALL preserve any user-provided input and uploaded files so the user can retry without re-entering data
7. THE Toast_Notification SHALL provide a manual dismiss button allowing the user to close it before the auto-dismiss timeout

### Requirement 32: Loading and Empty States

**User Story:** As a user, I want to see appropriate loading indicators and empty state messages, so that I always understand the current state of the application.

#### Acceptance Criteria

1. WHILE a file is being uploaded, parsed, or processed by an operation, THE Application SHALL display a skeleton placeholder or spinner in the content area where results will appear
2. WHEN a page has no content to display because no files have been uploaded or no operation has been performed, THE Application SHALL render an empty state with a message describing what the page is for and a call-to-action guiding the user to upload a file or select an operation
3. WHILE transitioning between application states (e.g., navigating routes, switching operations), THE Application SHALL continue to display the previous content or a placeholder until the new content is ready, with the transition completing within 500ms
4. IF a loading state persists for longer than 10 seconds, THEN THE Application SHALL display a Toast_Notification informing the user that the operation is taking longer than expected and provide an option to cancel

### Requirement 33: ESLint and Prettier Configuration

**User Story:** As a developer, I want ESLint and Prettier configured, so that code style is enforced consistently across the team.

#### Acceptance Criteria

1. THE Build_System SHALL include ESLint with TypeScript-aware linting rules and React-specific linting rules (including hooks rules) configured
2. THE Build_System SHALL include Prettier for code formatting with a shared configuration file at the project root
3. THE Build_System SHALL disable all ESLint formatting rules that conflict with Prettier so that no rule produces contradictory output
4. WHEN a linting violation is present, THE Build_System SHALL report the violation in the developer's terminal via a lint script defined in package.json
5. THE Build_System SHALL provide a format script in package.json that auto-formats all source files using Prettier
6. WHEN a developer attempts to commit code, THE Build_System SHALL run linting and formatting checks via a pre-commit hook and reject the commit if violations are found

### Requirement 34: State Management

**User Story:** As a developer, I want centralized state management, so that application state is predictable and shared across components without prop drilling.

#### Acceptance Criteria

1. THE State_Manager SHALL provide centralized state for cross-cutting concerns (theme, download history, operation history)
2. THE State_Manager SHALL allow feature-specific state to remain local to feature components
3. THE Application SHALL use the State_Manager instead of prop drilling for state shared across more than two component levels
4. WHEN a state update is dispatched, THE State_Manager SHALL apply the update synchronously and notify all subscribed components within the same render cycle
5. WHEN the user navigates away from a feature page, THE State_Manager SHALL reset feature-specific local state while preserving cross-cutting state

### Requirement 35: PDF Metadata Editing

**User Story:** As a software engineer, I want to view and edit PDF metadata (title, author, subject, keywords, creation date), so that I can properly catalog and organize documents.

#### Acceptance Criteria

1. WHEN the user uploads a PDF, THE Application SHALL display the existing metadata fields (title, author, subject, keywords, creation date, modification date), showing empty fields with a placeholder indicating no value is set
2. THE Application SHALL allow the user to edit the title (maximum 255 characters), author (maximum 255 characters), subject (maximum 255 characters), and keywords (maximum 20 keywords, each up to 100 characters) fields
3. WHEN the user saves metadata changes, THE PDF_Engine SHALL embed the updated metadata into the PDF and set the modification date to the current date and time
4. THE Application SHALL allow the user to download the PDF with updated metadata
5. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 36: PDF Form Filling

**User Story:** As a software engineer, I want to fill in PDF form fields programmatically, so that I can complete forms without printing them.

#### Acceptance Criteria

1. WHEN the user uploads a PDF containing form fields, THE PDF_Engine SHALL detect and list all fillable fields with their names and types (text fields, checkboxes, dropdowns, and radio buttons)
2. WHEN form fields are detected, THE Application SHALL render each field as an editable input overlaid on the PDF preview, mapping text fields to text inputs, checkboxes to checkbox inputs, dropdowns to select inputs, and radio buttons to radio inputs
3. WHEN the user fills in form fields and confirms, THE PDF_Engine SHALL embed the provided values into the PDF, leaving any unfilled fields at their default or empty state
4. IF the PDF contains no form fields, THEN THE Application SHALL inform the user via a Toast_Notification
5. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 37: Compare PDFs (Diff View)

**User Story:** As a software engineer, I want to compare two PDF documents side by side and see differences highlighted, so that I can review changes between document versions.

#### Acceptance Criteria

1. WHEN the user uploads two PDF files for comparison, THE Application SHALL render both documents side by side with synchronized page navigation
2. WHEN the comparison completes, THE Application SHALL highlight pages that differ between the two documents with a distinct border color on the page thumbnails
3. WHEN the comparison completes, THE Application SHALL display a summary of differences including the number of pages added, removed, or changed (where a page is considered changed if its rendered visual content differs from the corresponding page in the other document)
4. THE Preview_Panel SHALL allow the user to navigate between differing pages using previous/next difference controls
5. IF either uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
6. IF the two documents are identical, THEN THE Application SHALL inform the user via a Toast_Notification that no differences were found

### Requirement 38: Extract Text from PDF

**User Story:** As a software engineer, I want to extract all text content from a PDF, so that I can copy, search, or process the text programmatically.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and triggers text extraction, THE PDF_Engine SHALL extract all text content in reading order, separating paragraphs with double newlines and inserting a page delimiter between each page's content
2. WHEN text extraction completes, THE Application SHALL display the extracted text in a selectable text area that supports clipboard copy operations
3. WHEN the user triggers download of extracted text, THE Application SHALL download the extracted text as a UTF-8 encoded .txt file
4. IF the PDF contains no extractable text (e.g., scanned images only), THEN THE Application SHALL inform the user via a Toast_Notification
5. IF the PDF contains a mix of pages with and without extractable text, THEN THE Application SHALL extract text from available pages and display a Toast_Notification indicating which pages had no extractable text
6. THE PDF_Engine SHALL complete text extraction within 5 seconds for PDFs up to 100 pages

### Requirement 39: PDF to Image Conversion

**User Story:** As a software engineer, I want to convert PDF pages to PNG or JPG images, so that I can use them in presentations, documentation, or web pages.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and selects an output format (PNG or JPG), THE PDF_Engine SHALL convert each page to an image in the selected format
2. THE Application SHALL allow the user to select specific pages by entering page numbers or ranges (e.g., "1, 3, 5-8") or convert all pages
3. THE Application SHALL allow the user to configure output resolution (72, 150, or 300 DPI) with 150 DPI selected by default
4. THE Application SHALL allow the user to choose between downloading converted images individually from a list or as a single ZIP archive
5. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
6. IF a specified page number exceeds the total page count of the PDF, THEN THE Application SHALL display a Toast_Notification indicating the invalid page selection

### Requirement 40: Flatten PDF

**User Story:** As a software engineer, I want to flatten a PDF (merge annotations, form fields, and layers into the page content), so that the document appears the same across all viewers and cannot be edited.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and triggers flattening, THE PDF_Engine SHALL merge all annotations, form field values, and layers into the page content
2. WHEN flattening completes, THE Application SHALL display the file size before and after flattening in a human-readable format (KB, MB)
3. WHEN flattening completes, THE Preview_Panel SHALL display the flattened result before download
4. WHEN a PDF is flattened, THE PDF_Engine SHALL ensure form fields are no longer editable and annotations are no longer interactive in the output
5. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
6. IF the PDF contains no annotations, form fields, or layers, THEN THE Application SHALL inform the user via a Toast_Notification that the document has no interactive content to flatten

### Requirement 41: Crop Pages

**User Story:** As a software engineer, I want to crop PDF pages to a specific region, so that I can remove margins or isolate content areas.

#### Acceptance Criteria

1. THE Application SHALL allow the user to define a crop region by drawing a rectangle on the page preview with a minimum size of 10x10 pixels
2. THE Application SHALL display the crop region dimensions (width and height in points) and position as the user draws or adjusts the rectangle
3. THE Application SHALL allow the user to enter numeric crop coordinates (x, y, width, height in points) as an alternative to drawing
4. THE Application SHALL allow the user to apply the crop to a single page, selected pages, or all pages
5. WHEN the user confirms the crop, THE PDF_Engine SHALL adjust the page CropBox to the specified region
6. IF the defined crop region extends beyond the page boundaries or has zero area, THEN THE Application SHALL display a Toast_Notification indicating the crop region is invalid and prevent the operation
7. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
8. THE Preview_Panel SHALL display the cropped result before download

### Requirement 42: Add Headers and Footers

**User Story:** As a software engineer, I want to add custom headers and footers to PDF pages, so that I can include document titles, dates, or confidentiality notices.

#### Acceptance Criteria

1. THE Application SHALL allow the user to specify header text (left, center, right) and footer text (left, center, right), each position accepting up to 100 characters
2. THE Application SHALL support dynamic placeholders in headers and footers including page number, total pages, and current date (rendered in ISO 8601 date format YYYY-MM-DD)
3. WHEN the user confirms, THE PDF_Engine SHALL embed the headers and footers on each page of the PDF, replacing placeholders with their resolved values
4. THE Application SHALL allow the user to configure font size (between 6pt and 36pt) and margins (between 0pt and 72pt) for headers and footers
5. THE Preview_Panel SHALL display the headers and footers with resolved placeholder values before download
6. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 43: Bookmarks and Table of Contents

**User Story:** As a software engineer, I want to add, edit, or remove bookmarks (outline entries) in a PDF, so that I can create navigable documents.

#### Acceptance Criteria

1. WHEN the user uploads a PDF that contains existing bookmarks, THE Application SHALL display the bookmark tree showing each entry's title, target page number, and nesting hierarchy up to 5 levels deep
2. WHEN the user uploads a PDF that contains no existing bookmarks, THE Application SHALL display an empty bookmark panel with a prompt to add the first bookmark
3. THE Application SHALL allow the user to add new bookmarks by specifying a title (1 to 200 characters) and a target page number within the document's page range, and optionally nesting the bookmark under an existing parent entry
4. THE Application SHALL allow the user to rename existing bookmarks (1 to 200 characters) or delete existing bookmarks from the tree
5. IF the user attempts to add or rename a bookmark with an empty title or a title exceeding 200 characters, THEN THE Application SHALL display a Toast_Notification indicating the title must be between 1 and 200 characters
6. IF the user specifies a target page number that does not exist in the PDF, THEN THE Application SHALL display a Toast_Notification indicating the page number is invalid
7. WHEN the user confirms changes, THE PDF_Engine SHALL embed the updated bookmark tree into the PDF preserving the specified nesting hierarchy

### Requirement 44: Merge PDFs (Existing Feature Modernization)

**User Story:** As a user, I want to merge multiple PDFs into one, so that I can combine related documents.

#### Acceptance Criteria

1. WHEN the user uploads two or more PDF files and triggers the merge operation, THE PDF_Engine SHALL merge them into a single PDF in the user-specified order within 10 seconds for up to 20 files totaling no more than 100 MB combined
2. WHILE two or more PDF files are uploaded and merge has not been triggered, THE Application SHALL allow the user to reorder files via drag-and-drop and SHALL update the displayed file order in real time
3. WHEN the merge operation completes, THE Preview_Panel SHALL display the merged result before the user downloads the file
4. IF any uploaded file is not a valid PDF, THEN THE Application SHALL reject the invalid file, display a Toast_Notification with an error message indicating which file failed validation, and exclude it from the file list
5. IF the user has uploaded fewer than 2 valid PDF files when triggering merge, THEN THE Application SHALL disable the merge action and display a Toast_Notification indicating that at least 2 PDF files are required
6. THE Application SHALL accept individual PDF files up to 50 MB each and up to 20 files per merge operation

### Requirement 45: Split PDF (Existing Feature Completion)

**User Story:** As a user, I want to split a PDF into multiple separate PDFs, so that I can extract specific sections.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and specifies page ranges, THE PDF_Engine SHALL produce separate PDF files for each specified range
2. THE Application SHALL display the total page count of the uploaded PDF and allow the user to specify split points by selecting individual pages or entering comma-separated page ranges using the format "start-end" (e.g., "1-3, 5, 7-9"), supporting up to 20 range entries
3. WHEN the split operation completes, THE Application SHALL present all split results as a downloadable list displaying the file name and page count for each resulting PDF
4. IF a specified page range is invalid (page number less than 1, exceeding total pages, start page greater than end page, or non-numeric input), THEN THE Application SHALL display a Toast_Notification with an error message indicating which range entry is invalid
5. THE Application SHALL allow overlapping page ranges, producing separate output files that may contain the same pages

### Requirement 46: Change Page Size and Orientation

**User Story:** As a software engineer, I want to change the page size (A4, Letter, Legal, custom) and orientation (portrait/landscape) of PDF pages, so that I can prepare documents for different print formats.

#### Acceptance Criteria

1. THE Application SHALL allow the user to select a target page size from predefined options (A4: 210×297mm, Letter: 216×279mm, Legal: 216×356mm) or enter custom dimensions in millimeters within the range of 25mm to 3000mm for both width and height
2. THE Application SHALL allow the user to select portrait or landscape orientation, which determines whether the width is less than the height (portrait) or the height is less than the width (landscape) for predefined sizes
3. WHEN the user confirms, THE PDF_Engine SHALL resize the selected pages to the target dimensions, scaling content to fit within the new page boundaries while preserving the original aspect ratio and centering the content on the page
4. THE Application SHALL allow the user to apply the change to a single page, selected pages, or all pages
5. THE Preview_Panel SHALL display the resized pages before download
6. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
7. IF the user enters custom dimensions outside the allowed range (below 25mm or above 3000mm for either dimension), THEN THE Application SHALL display a Toast_Notification indicating the valid dimension range

### Requirement 47: Linearize PDF for Web Viewing

**User Story:** As a software engineer, I want to linearize (web-optimize) a PDF, so that it loads progressively in web browsers without downloading the entire file first.

#### Acceptance Criteria

1. WHEN the user uploads a PDF and triggers linearization, THE PDF_Engine SHALL produce a linearized version of the PDF that conforms to the PDF linearization specification (cross-reference table at the beginning of the file)
2. WHEN the user uploads a PDF, THE Application SHALL display whether the uploaded PDF is already linearized, indicating "Linearized" or "Not Linearized" status
3. WHEN linearization completes, THE Application SHALL display the file size before and after linearization in human-readable format (KB or MB) and the size difference as a percentage change
4. IF the uploaded PDF is already linearized, THEN THE Application SHALL inform the user via a Toast_Notification that the file is already optimized for web viewing
5. IF the provided file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message

### Requirement 48: Duplicate Pages

**User Story:** As a software engineer, I want to duplicate specific pages within a PDF, so that I can reuse page templates or repeat content.

#### Acceptance Criteria

1. WHEN the user selects one or more pages and triggers duplication, THE PDF_Engine SHALL insert copies of the selected pages immediately after their original positions, processing pages in document order so that each copy set appears after its source page
2. THE Application SHALL allow the user to specify how many copies to create (1 to 10), defaulting to 1
3. WHEN duplication completes, THE Preview_Panel SHALL update to reflect the duplicated pages within 2 seconds
4. WHEN duplication completes, THE Application SHALL update page numbering sequentially to account for all inserted pages
5. IF the uploaded file is not a valid PDF, THEN THE Application SHALL display a Toast_Notification with a descriptive error message
6. IF duplication would result in a PDF exceeding 500 pages, THEN THE Application SHALL display a Toast_Notification indicating the page limit and cancel the operation
