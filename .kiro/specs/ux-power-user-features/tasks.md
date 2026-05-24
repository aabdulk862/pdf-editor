# Implementation Plan: UX Power User Features

## Overview

This plan implements seven interconnected power-user productivity modules for the PDF Editor: Command Palette, Shortcut Manager, Tab Manager, Recent Files Store, Template Engine, Global Drop Zone, and Quick Actions Bar. Each module is built as an independent Zustand store with React components that integrate into the existing Layout shell. Tasks are ordered to build foundational modules first (shortcuts, stores) then layer UI components and integration on top.

## Tasks

- [x] 1. Set up project structure and shared types
  - [x] 1.1 Create feature directory structure and shared type definitions
    - Create directories: `src/features/command-palette/`, `src/features/shortcuts/`, `src/features/tabs/`, `src/features/recent-files/`, `src/features/templates/`, `src/features/global-drop-zone/`, `src/features/quick-actions/`
    - Create `src/store/` files: `command-palette.ts`, `shortcuts.ts`, `tabs.ts`, `recent-files.ts`, `templates.ts`, `drop-zone.ts`, `quick-actions.ts`
    - Define TypeScript interfaces and types for each module as specified in the design (`types.ts` in each feature directory)
    - _Requirements: 2.1, 3.1, 5.1, 7.1, 8.1, 10.6, 11.1_

- [x] 2. Implement Command Palette
  - [x] 2.1 Implement command palette store and filter logic
    - Create `src/store/command-palette.ts` with `useCommandPaletteStore` (isOpen, query, activeIndex, items, filteredItems, open/close/setQuery/moveSelection)
    - Create `src/features/command-palette/filter.ts` implementing `filterCommands()` — case-insensitive multi-token substring matching against name and description
    - Populate the items list with all 29 PDF operations including name, description, route, and keywords
    - _Requirements: 2.1, 2.2, 2.9_

  - [x]\* 2.2 Write property test for command search filter correctness
    - **Property 1: Command search filter correctness**
    - **Validates: Requirements 2.2**

  - [x] 2.3 Implement command palette circular navigation logic
    - Implement `moveSelection('up' | 'down')` with circular wrapping: down from index N-1 → 0, up from index 0 → N-1
    - Implement `getActiveItem()` returning the item at `activeIndex`
    - _Requirements: 2.3, 2.4, 2.5_

  - [x]\* 2.4 Write property test for command palette circular navigation
    - **Property 2: Command palette circular navigation**
    - **Validates: Requirements 2.4, 2.5**

  - [x] 2.5 Implement CommandPalette React component
    - Create `src/features/command-palette/CommandPalette.tsx` as a modal overlay rendered via React portal to `document.body`
    - Implement auto-focus on search input, ARIA role="dialog" with accessible label
    - Handle keyboard events: Escape to close, Enter to navigate, ArrowUp/ArrowDown for selection
    - Handle click-outside to close, restore focus to previously focused element
    - Display "No results found" when filter returns empty, limit input to 100 characters
    - Prevent interaction with elements behind overlay (modal backdrop)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 2.6, 2.7, 2.8_

  - [x]\* 2.6 Write unit tests for CommandPalette component
    - Test open/close lifecycle, keyboard event handling (Cmd+K, Escape, Enter), focus management, click-outside behavior
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [x] 3. Implement Shortcut Manager
  - [x] 3.1 Implement shortcut store and resolution logic
    - Create `src/store/shortcuts.ts` with `useShortcutStore` (bindings Map, register/unregister/resolve/getAll/getByCategory)
    - Implement `resolve(event, focusContext)`: suppress shortcuts when text input focused (unless `bypassInputFocus`), prioritize most specific scope
    - Handle conflict resolution: most specific scope wins when same key combo registered at different scopes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x]\* 3.2 Write property test for shortcut resolution with context
    - **Property 3: Shortcut resolution with context**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 3.3 Implement shortcut formatting and platform detection
    - Create `src/features/shortcuts/format.ts` with `formatShortcut(keys, platform)` and `detectPlatform()`
    - Format: "⌘" for meta on mac, "Ctrl" for ctrl on windows/linux, consistent modifier order
    - _Requirements: 4.3_

  - [x]\* 3.4 Write property test for shortcut key formatting by platform
    - **Property 4: Shortcut key formatting by platform**
    - **Validates: Requirements 4.3**

  - [x] 3.5 Implement ShortcutProvider component
    - Create `src/features/shortcuts/ShortcutProvider.tsx` — context provider attaching global `keydown` listener to `document`
    - Dispatch to store's `resolve` method, call matched binding's action within 50ms
    - Register default shortcuts: Cmd+K (palette), Shift+? (reference panel), theme toggle, close modal
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.6 Implement ShortcutReferencePanel component
    - Create `src/features/shortcuts/ShortcutReferencePanel.tsx` — modal overlay listing all shortcuts grouped by category (Navigation, Operations, Application)
    - Display formatted key combinations per OS, searchable by name or key combination
    - Open via Shift+?, close via Escape or click-outside
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]\* 3.7 Write property test for shortcut reference panel search
    - **Property 5: Shortcut reference panel search**
    - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Tab Manager
  - [x] 5.1 Implement tab store with state management
    - Create `src/store/tabs.ts` with `useTabStore` (tabs array, activeTabId, clipboard, maxTabs=10)
    - Implement `openTab`, `closeTab`, `switchTab`, `cycleTab`, `updateTabState`, `getActiveTab`
    - Implement file name truncation: max 24 characters with "…" suffix
    - Enforce max 10 tabs with toast notification on rejection
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9_

  - [x]\* 5.2 Write property test for file name truncation
    - **Property 6: File name truncation**
    - **Validates: Requirements 5.1**

  - [x]\* 5.3 Write property test for tab state preservation on switch
    - **Property 7: Tab state preservation on switch**
    - **Validates: Requirements 5.4**

  - [x]\* 5.4 Write property test for tab close active selection
    - **Property 8: Tab close active selection**
    - **Validates: Requirements 5.5**

  - [x]\* 5.5 Write property test for tab cycling wraps correctly
    - **Property 9: Tab cycling wraps correctly**
    - **Validates: Requirements 5.9**

  - [x] 5.6 Implement cross-tab copy and paste
    - Implement `copyPages` (store up to 50 pages in clipboard, truncate with toast if >50)
    - Implement `pastePages` (insert after selected page or at end, preserve content/dimensions)
    - Retain clipboard data when source tab is closed, show toast if clipboard empty on paste
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x]\* 5.7 Write property test for copy-paste page data round trip
    - **Property 10: Copy-paste page data round trip**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 5.8 Implement TabBar and TabContent components
    - Create `src/features/tabs/TabBar.tsx` — horizontal tab strip with file names, close buttons, horizontal scroll when overflow
    - Create `src/features/tabs/TabContent.tsx` — wrapper rendering active tab's feature page with preserved state
    - Handle tab click to switch, close button to remove, keyboard shortcut Ctrl+Tab to cycle
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 6. Implement Recent Files Store
  - [x] 6.1 Implement recent files store with localStorage persistence
    - Create `src/store/recent-files.ts` with `useRecentFilesStore` (entries, maxEntries=20, addEntry/removeEntry/clearAll/getEntries)
    - Create `src/features/recent-files/storage.ts` with `loadRecentFiles`, `saveRecentFiles`, `clearRecentFiles`
    - Implement capacity enforcement: evict oldest by `lastOpenedAt` when exceeding 20
    - Implement deduplication: match by fileName + fileSize, update timestamp instead of creating duplicate
    - Handle localStorage unavailable/corrupted gracefully (memory-only mode, clear on corruption)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7, 7.8_

  - [x]\* 6.2 Write property test for recent files capacity invariant
    - **Property 11: Recent files capacity invariant**
    - **Validates: Requirements 7.2, 7.3**

  - [x]\* 6.3 Write property test for recent files sorted by recency
    - **Property 12: Recent files sorted by recency**
    - **Validates: Requirements 7.4**

  - [x]\* 6.4 Write property test for recent files deduplication
    - **Property 13: Recent files deduplication**
    - **Validates: Requirements 7.7**

  - [x] 6.5 Implement RecentFilesSection component
    - Create `src/features/recent-files/RecentFilesSection.tsx` — home page section showing entries sorted by recency
    - Display file name (truncated to 60 chars), file size, relative time, operation name
    - Handle click to navigate to operation route, clear button to remove all entries
    - Show empty state message when no entries
    - _Requirements: 7.4, 7.5, 7.6_

- [x] 7. Implement Template Engine
  - [x] 7.1 Implement template store and predefined templates
    - Create `src/store/templates.ts` with `useTemplateStore` (templates, execution state, selectTemplate/updateStepParams/execute/cancel/reset)
    - Define predefined templates: "Prepare for Print", "Secure Document", "Clean and Optimize" with their operation steps
    - _Requirements: 8.1, 8.3_

  - [x] 7.2 Implement template sequential execution logic
    - Implement `execute(inputFile)`: run steps sequentially, pipe output of step i as input to step i+1
    - Implement 30s timeout per step, halt on failure preserving intermediate result
    - Implement cancel: wait for current step to finish, present last completed result
    - Handle first-step failure: retain original input unchanged
    - Integrate with existing `PdfWorkerClient` for operation execution
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x]\* 7.3 Write property test for template sequential execution piping
    - **Property 14: Template sequential execution piping**
    - **Validates: Requirements 8.4**

  - [x]\* 7.4 Write property test for template failure preserves intermediate result
    - **Property 15: Template failure preserves intermediate result**
    - **Validates: Requirements 9.1**

  - [x] 7.5 Implement Template UI components
    - Create `src/features/templates/TemplateSection.tsx` — home page section displaying templates with name, description, steps
    - Create `src/features/templates/TemplateConfigScreen.tsx` — modal with step list, editable parameters, execute button
    - Create `src/features/templates/TemplateProgress.tsx` — execution overlay with step indicator, current step name, cancel button
    - Show error toast on failure (step name, position, reason), success toast on completion
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Global Drop Zone
  - [x] 9.1 Implement drop zone store and file validation
    - Create `src/store/drop-zone.ts` with `useDropZoneStore` (isDragging, isValidType, setDragging)
    - Create `src/features/global-drop-zone/validation.ts` with `validateDroppedFile` and `validateDroppedFiles`
    - Enforce accepted types (application/pdf, image/png, image/jpeg), max 100 MB per file, max 20 files per drop
    - _Requirements: 10.4, 10.5, 10.6_

  - [x]\* 9.2 Write property test for drop zone file validation
    - **Property 16: Drop zone file validation**
    - **Validates: Requirements 10.4, 10.6**

  - [x] 9.3 Implement GlobalDropZone component
    - Create `src/features/global-drop-zone/GlobalDropZone.tsx` — wraps entire viewport, listens for dragenter/dragover/dragleave/drop
    - Show full-screen overlay within 100ms on drag, distinguish valid/invalid file types visually
    - On drop: route to current operation's file handler (operation page) or open command palette pre-filtered (home page)
    - Show error toasts for unsupported types, oversized files, truncation warnings (>20 files)
    - Hide overlay when drag leaves viewport
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

- [x] 10. Implement Quick Actions Bar
  - [x] 10.1 Implement quick actions store and suggestion mapping
    - Create `src/store/quick-actions.ts` with `useQuickActionsStore` (isVisible, actions, resultFile, show/dismiss/hide)
    - Create `src/features/quick-actions/suggestions.ts` with `getSuggestions(operationType)` returning 2-3 contextual follow-up actions
    - Define suggestion mappings: merge→[compress, add page numbers], compress→[download, linearize], redact→[encrypt, flatten], add-page-numbers→[compress, add headers]
    - Return empty array for operations without defined suggestions
    - _Requirements: 11.1, 11.2, 11.9_

  - [x]\* 10.2 Write property test for quick actions suggestion mapping
    - **Property 17: Quick actions suggestion mapping**
    - **Validates: Requirements 11.2, 11.9**

  - [x] 10.3 Implement QuickActionsBar component
    - Create `src/features/quick-actions/QuickActionsBar.tsx` — horizontal bar near download button, non-blocking layout
    - Display 2-3 suggestion buttons with icons and accessible labels (ariaLabel)
    - On click: pass result file to selected operation, navigate to operation page with file pre-loaded
    - Dismiss button to close, auto-hide on page navigation
    - Appear within 500ms of operation completion
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [x] 11. Integration and wiring
  - [x] 11.1 Integrate modules into Layout and App shell
    - Wrap `Layout.tsx` children with `<GlobalDropZone>`, render `<CommandPalette>` and `<ShortcutReferencePanel>` as portals
    - Add `<ShortcutProvider>` at top level in `App.tsx`
    - Integrate `<TabBar>` and `<TabContent>` into Layout above main content area
    - Register all default keyboard shortcuts (29 operation shortcuts + application shortcuts)
    - _Requirements: 1.1, 3.1, 3.2, 5.1, 10.1_

  - [x] 11.2 Integrate Recent Files and Templates into home page
    - Add `<RecentFilesSection>` and `<TemplateSection>` to the home page
    - Wire recent files tracking: call `addEntry` when files are opened across all operation pages
    - _Requirements: 7.4, 7.5, 8.2_

  - [x] 11.3 Wire Quick Actions Bar into operation result flows
    - Integrate `<QuickActionsBar>` into operation pages, trigger `show()` on successful operation completion
    - Pass result file through to next operation on suggestion click
    - _Requirements: 11.1, 11.3, 11.4_

  - [x]\* 11.4 Write integration tests for end-to-end flows
    - Test: open palette → search → select → navigate to operation page
    - Test: upload file → create tab → switch tabs → verify state preserved
    - Test: select template → configure → execute → download result
    - Test: drag file → drop → file loaded in operation
    - Test: complete operation → quick action → file passed to next operation
    - _Requirements: 1.1, 2.6, 5.2, 5.4, 8.4, 10.2, 11.3_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check` and `@fast-check/vitest`
- Unit tests validate specific examples and edge cases
- All stores follow the existing Zustand pattern: `create<StateInterface>((set, get) => ({...}))`
- The project uses Vitest for testing (`npm run test` / `vitest --run`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.3", "6.1", "9.1", "10.1"] },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "3.2", "3.4", "3.5", "5.1", "6.2", "6.3", "6.4", "9.2", "10.2"]
    },
    {
      "id": 3,
      "tasks": [
        "2.4",
        "2.5",
        "3.6",
        "3.7",
        "5.2",
        "5.3",
        "5.4",
        "5.5",
        "5.6",
        "6.5",
        "7.1",
        "9.3",
        "10.3"
      ]
    },
    { "id": 4, "tasks": ["2.6", "5.7", "5.8", "7.2"] },
    { "id": 5, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 6, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 7, "tasks": ["11.4"] }
  ]
}
```
