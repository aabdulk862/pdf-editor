# Design Document: UI/UX Redesign

## Overview

This design document describes the technical implementation plan for a comprehensive UI/UX redesign of the PDF Editor application. The redesign transforms the current layout, navigation, visual system, interactions, and performance characteristics to achieve a polished, professional experience inspired by Canva, Adobe Acrobat, Apple HIG, and Figma UI3 principles.

The implementation preserves the existing React 18 + Vite + Tailwind CSS + TypeScript + Zustand stack while introducing a formalized design token system, layered component architecture, and performance optimizations.

### Strategic Alignment with Product Roadmap

This redesign is explicitly designed as a **foundation layer** for the product roadmap's highest-impact features:

1. **Inline Text Editing** (not yet implemented): The new Canvas Area architecture introduces an extensible rendering pipeline with a plugin system. The canvas uses a layered approach (render layer → interaction layer → overlay layer) that will allow a future text-editing plugin to intercept clicks on text content streams, render editable text overlays, and commit changes back to the PDF. The design token system ensures any future inline editor inherits consistent typography and spacing.

2. **AI-Powered Features**: The contextual Toolbar is designed with an extensible slot system. AI actions (summarize, auto-fill, smart redaction) can be injected as toolbar plugins without modifying the shell. The Command Palette already supports action registration, making AI commands discoverable via Cmd+K.

3. **Collaboration**: The Tab Bar and workspace state architecture support multi-user presence indicators. The toast/notification system is designed to handle real-time events (comments, annotations from collaborators). The layout accommodates a future right-side panel for comments/activity.

4. **OCR Integration** (partially implemented via Tesseract.js): The tool workspace pattern standardizes progress reporting and Web Worker communication, making OCR's long-running operations fit naturally into the UX.

5. **Performance on Large Files**: Virtualized thumbnail rendering and Web Worker processing directly address the 500+ page document goal. The canvas rendering pipeline supports progressive/streaming page display.

The redesign does **not** implement inline text editing, AI features, or collaboration — but every architectural decision is made with these future capabilities in mind, ensuring they can be added without layout or architecture rework.

## Architecture

### Component Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Pages (HomePage, ToolWorkspacePage, CanvasEditorPage)   │
├─────────────────────────────────────────────────────────┤
│  Feature Components (CategorizedNavBar, CommandPalette)  │
├─────────────────────────────────────────────────────────┤
│  Composite Components (ToolCard, FileUploadZone, Toast)  │
├─────────────────────────────────────────────────────────┤
│  Design System Primitives (Button, Input, Modal, Icon)   │
├─────────────────────────────────────────────────────────┤
│  Design Tokens (colors, spacing, typography, shadows)    │
└─────────────────────────────────────────────────────────┘
```

### Layout Architecture (App Shell)

```
┌──────────────────────────────────────────────────────────────┐
│ App Shell                                                     │
├────────┬─────────────────────────────────────────────────────┤
│        │  Tab Bar                                             │
│        ├─────────────────────────────────────────────────────┤
│ Side-  │  Contextual Toolbar (tool-specific controls)        │
│ bar    ├─────────────────────────────────────────────────────┤
│ (col-  │                                                     │
│ laps-  │  Canvas Area (PDF preview / tool workspace)         │
│ ible)  │    ┌─────────────────────────────────────────┐      │
│        │    │ Render Layer (PDF page pixels)           │      │
│        │    ├─────────────────────────────────────────┤      │
│        │    │ Interaction Layer (click/drag handlers)  │      │
│        │    ├─────────────────────────────────────────┤      │
│        │    │ Overlay Layer (selections, cursors, UI)  │      │
│        │    └─────────────────────────────────────────┘      │
│        │                                                     │
│        ├─────────────────────────────────────────────────────┤
│        │  Status Bar (optional: progress, file info)         │
├────────┼─────────────────────────────────────────────────────┤
│        │  [Future: Right Panel (comments, AI, properties)]   │
└────────┴─────────────────────────────────────────────────────┘
```

The Canvas Area uses a **three-layer rendering architecture**:

- **Render Layer**: Displays PDF page content via pdf.js canvas rendering at device-pixel-ratio
- **Interaction Layer**: Captures mouse/touch/keyboard events and routes them to the active tool plugin
- **Overlay Layer**: Renders tool-specific UI (selection handles, text cursors, annotation previews)

This layered approach is specifically designed to support future **inline text editing**: a text-edit plugin would intercept clicks on the Interaction Layer, identify the text content stream at that position, render an editable `<textarea>` or contenteditable overlay on the Overlay Layer, and commit changes back to the PDF content stream via pdf-lib. The architecture makes this possible without restructuring the canvas system.

### State Management

```
┌─────────────────────────────────────────┐
│  Zustand Stores (with Immer middleware) │
├─────────────────────────────────────────┤
│  useNavStore        - sidebar, favorites, recents, filter    │
│  useThemeStore      - theme preference, reduced-motion       │
│  useTabStore        - open tabs, active tab                  │
│  useToastStore      - notification queue                     │
│  useOnboardingStore - first-visit, hints, milestones         │
│  useWorkspaceStore  - active tool, processing state          │
└─────────────────────────────────────────┘
```

## Design Token System

### Source of Truth

A single `src/design-system/tokens.ts` file defines all tokens as TypeScript constants. A build-time script generates the corresponding Tailwind theme extension from these tokens, ensuring consistency.

### Token Categories

| Category      | Tokens                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| Colors        | primary, secondary, accent, success, error, background, text (light + dark)               |
| Spacing       | 4px grid: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96                                 |
| Typography    | font-family (Inter, JetBrains Mono), sizes (xs–5xl), weights (400, 500, 600, 700)         |
| Border Radius | sm (4px), md (8px), lg (12px), xl (16px), full (9999px)                                   |
| Shadows       | level-0 (none), level-1 (subtle), level-2 (raised), level-3 (floating), level-4 (overlay) |
| Border Width  | thin (1px), medium (1.5px), thick (2px)                                                   |
| Motion        | duration (50ms, 100ms, 150ms, 200ms, 300ms), easing (ease-out, ease-in, ease-in-out)      |
| Icons         | sizes (16px, 20px, 24px), stroke-width (1.5px)                                            |

### WCAG Compliance

All foreground/background color pairs are validated at build time:

- Normal text: minimum 4.5:1 contrast ratio
- Large text (≥18px or ≥14px bold): minimum 3:1 contrast ratio
- Interactive components: minimum 3:1 against adjacent colors

## Component Design

### AppShell (Layout)

The redesigned `Layout.tsx` implements:

- CSS Grid with `grid-template-columns: auto 1fr` for sidebar + content
- Sidebar width transitions via `transition: width 200ms ease-in-out`
- Collapsed state: `width: 48px` with icon-only rail
- Expanded state: `width: 280px` (lg: 288px)
- Mobile: sidebar becomes a fixed overlay with backdrop blur
- Canvas area enforces `min-width: 320px`
- **Right panel slot** (initially hidden): reserved for future collaboration panel, AI assistant, or properties inspector
- **Toolbar plugin system**: tools register their toolbar controls via a `useToolbar()` hook, making it trivial to add AI action buttons or inline-edit controls in the future

### Contextual Toolbar

The toolbar uses a **slot-based architecture**:

```
┌─────────────────────────────────────────────────────────┐
│ [Back] │ [Tool-specific controls...] │ [Actions slot] │ [Overflow ⋯] │
└─────────────────────────────────────────────────────────┘
```

- **Left slot**: Back/home navigation
- **Center slot**: Tool-specific controls (registered by each tool feature)
- **Right slot**: Common actions (download, share, undo/redo)
- **Overflow**: Controls that don't fit collapse into a "more" menu on smaller viewports

Future features (AI summarize, inline text edit mode toggle, collaboration presence) register into the Actions slot without modifying the toolbar component itself.

### Sidebar Navigation

Preserves existing `CategorizedNavBar` structure but enhances:

- Smoother collapse/expand animation using GPU-accelerated `transform`
- Tooltip delay reduced to 300ms with fade-in
- Context menu with "Add to Favorites" and "Open in New Tab"
- Filter input with debounced fuzzy matching (50ms threshold)

### Home Dashboard

Redesigned `HomePage` with:

- Hero section: large drop zone with animated border on drag-over
- Quick Actions: 4 most-used tools as prominent cards (computed from usage frequency in nav store)
- Recent Files: horizontal scroll with thumbnail previews
- Tool Grid: category-grouped cards with hover elevation animation
- Empty states: illustrated placeholders with CTAs

### Tool Workspace

Each tool page follows a consistent pattern:

- Contextual toolbar at top with tool-specific controls + back button
- Canvas area with file upload empty state or PDF preview
- Progress bar during processing (percentage + ETA)
- Completion state with download button and "Start Over"
- Error state with message and retry

### Micro-Interactions

All animations use GPU-accelerated properties (`transform`, `opacity`):

- Page enter: `opacity: 0 → 1`, `translateY(8px) → 0` over 200ms ease-out
- Tab switch: active indicator slides via `translateX` over 150ms
- Toast: `translateY(100%) → 0` over 200ms ease-out (enter), reverse for exit
- Button press: `scale(0.97)` for 100ms
- Card hover: `translateY(-2px)` + shadow elevation over 150ms
- Command palette: backdrop `opacity: 0 → 1` over 100ms, modal `scale(0.95) → 1` over 150ms

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- All transitions set to `duration: 0ms`
- Animations replaced with instant state changes
- Only opacity changes retained (no transforms)

## Performance Strategy

### Bundle Optimization

- Route-level code splitting via `React.lazy()` for all tool pages
- Canvas editor remains lazy-loaded (already implemented)
- Shared design system primitives in a common chunk
- Target: initial bundle < 150KB gzipped

### Rendering Performance

- Thumbnail virtualization using a lightweight virtual scroll (render only visible items + buffer)
- PDF page rendering at `window.devicePixelRatio` for HiDPI sharpness
- Canvas operations offloaded to Web Workers (existing pattern extended)
- Skeleton placeholders during lazy-load to prevent layout shift

### Asset Optimization

- Font preloading: `<link rel="preload" href="inter.woff2" as="font" crossorigin>`
- Vite content-hash filenames for immutable caching
- SVG icons inlined as React components (no network requests)
- Image thumbnails lazy-loaded with `loading="lazy"` and `IntersectionObserver`

## Accessibility Implementation

### Focus Management

- Custom focus ring: `ring-2 ring-offset-2 ring-primary-500` on all interactive elements
- Focus trap in modals using a `useFocusTrap` hook
- Focus restoration on modal/dialog close

### ARIA Structure

- `<header role="banner">` for app header
- `<nav role="navigation">` for sidebar
- `<main role="main">` for canvas area
- `<aside role="complementary">` for panels
- `aria-live="polite"` on toast container and progress updates
- `aria-live="assertive"` on error messages

### Keyboard Navigation

- Tab/Shift+Tab for sequential navigation
- Arrow keys within menus and lists
- Enter/Space to activate
- Escape to close overlays
- `?` to open shortcuts panel (when not in text input)
- Cmd+K / Ctrl+K for command palette

## Onboarding Strategy

### First Visit

- Non-blocking welcome banner at top of home page
- Highlights: "Your files stay private", "30+ tools", "Works offline"
- Dismissible, state persisted in localStorage

### Progressive Hints

- Command palette hint after 3 sessions without usage
- Keyboard shortcut hints shown inline on first tool use
- "Don't show again" option on all hints

### Milestone Celebrations

- Brief confetti/checkmark animation on first successful operation
- Subtle, non-intrusive, auto-dismisses in 2 seconds

## File Structure

```
src/
├── design-system/
│   ├── tokens.ts              # Single source of truth for all design tokens
│   ├── tokens.generated.css   # Generated CSS custom properties
│   ├── primitives/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Icon.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   └── composites/
│       ├── ToolCard.tsx
│       ├── FileUploadZone.tsx
│       ├── ProgressBar.tsx
│       ├── EmptyState.tsx
│       └── ContextMenu.tsx
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx           # Redesigned layout shell (grid-based)
│   ├── Toolbar.tsx            # Slot-based contextual toolbar
│   ├── CanvasArea.tsx         # Three-layer canvas (render/interaction/overlay)
│   ├── router.tsx
│   └── providers.tsx
├── features/
│   ├── navigation/            # Sidebar, filter, categories
│   ├── command-palette/       # Cmd+K overlay (extensible action registry)
│   ├── home/                  # Dashboard, quick actions, recent files
│   ├── onboarding/            # Welcome banner, hints, milestones
│   ├── tabs/                  # Tab bar, tab management
│   ├── shortcuts/             # Keyboard shortcuts system
│   └── [tool-name]/           # Each PDF tool as a feature module
│       ├── components/
│       │   └── [ToolName]Page.tsx
│       ├── toolbar-controls.tsx  # Tool-specific toolbar registration
│       └── index.ts
├── store/
│   ├── nav-store.ts
│   ├── theme.ts
│   ├── tabs.ts
│   ├── toast.ts
│   ├── onboarding.ts
│   └── workspace.ts
└── hooks/
    ├── useToolbar.ts          # Hook for tools to register toolbar controls
    ├── useFocusTrap.ts        # Accessibility focus management
    ├── useReducedMotion.ts    # prefers-reduced-motion detection
    └── useVirtualScroll.ts    # Virtualized list rendering
```

### Extensibility for Roadmap Features

The architecture explicitly supports future additions without structural changes:

| Future Feature          | Extension Point                             | What to Add                                           |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Inline Text Editing     | Canvas Interaction Layer + Overlay Layer    | Text-edit plugin that renders contenteditable overlay |
| AI Assistant            | Right Panel slot + Command Palette registry | AI panel component + registered AI commands           |
| Collaboration           | Right Panel slot + Toast system + Tab Bar   | Presence indicators, comment panel, real-time events  |
| Advanced Form Creation  | Canvas Overlay Layer + Toolbar slots        | Form field placement tool with drag handles           |
| Content-Aware Redaction | Command Palette + Toolbar Actions slot      | AI-powered pattern detection + bulk redact action     |

## Correctness Properties

### Property 1: Sidebar State Persistence Round-Trip

**Validates: Requirements 1.5**

**Property:** For any sidebar collapsed state (true or false), writing the state to localStorage and reading it back produces the same value.

**Tested via:** Property-based test generating random boolean states, writing to localStorage mock, and verifying read-back equality.

### Property 2: Navigation Filter Subset Invariant

**Validates: Requirements 2.4**

**Property:** For any filter query string, the filtered tool list is always a subset of the complete tool list, and every item in the filtered list contains the query as a substring (case-insensitive) in its name, description, or category label.

**Tested via:** Property-based test generating arbitrary query strings and verifying the subset and match invariants.

### Property 3: Recent Tools Length Invariant

**Validates: Requirements 2.3**

**Property:** After any sequence of tool additions to the recent list, the list length never exceeds 5 items, and items are ordered most-recent-first with no duplicates.

**Tested via:** Property-based test generating sequences of tool path additions and verifying length ≤ 5, ordering, and uniqueness invariants.

### Property 4: Command Palette Fuzzy Match Completeness

**Validates: Requirements 2.6**

**Property:** For any exact tool name used as a query, the fuzzy matcher always returns that tool in its results. For an empty query, all tools are returned.

**Tested via:** Property-based test selecting random tools from the registry and verifying they appear in results when their exact name is queried.

### Property 5: Spacing Token Grid Alignment

**Validates: Requirements 3.4**

**Property:** Every spacing token value in the design system is a multiple of 4 (the sub-grid unit).

**Tested via:** Property-based test iterating all spacing token values and verifying `value % 4 === 0`.

### Property 6: Color Contrast WCAG Compliance

**Validates: Requirements 3.2**

**Property:** For every defined foreground/background color pair in the theme, the computed contrast ratio meets WCAG AA minimums (4.5:1 for normal text, 3:1 for large text).

**Tested via:** Property-based test computing relative luminance and contrast ratio for all theme color pairs.

### Property 7: Quick Actions Frequency Ordering

**Validates: Requirements 5.5**

**Property:** The 4 tools displayed in Quick Actions always have usage counts greater than or equal to any tool not displayed, and they are ordered by descending frequency.

**Tested via:** Property-based test generating random usage count maps and verifying the top-4 selection and ordering.

### Property 8: Touch Target Minimum Size

**Validates: Requirements 7.3**

**Property:** All interactive component variants rendered at mobile breakpoint have computed min-height and min-width of at least 44px (via CSS class inspection).

**Tested via:** Property-based test generating all button/link size variants and verifying minimum dimension classes are present.

### Property 9: Heading Hierarchy Invariant

**Validates: Requirements 10.8**

**Property:** On any rendered page, heading elements follow a strictly non-skipping sequence (h1 before h2, h2 before h3, etc.) with exactly one h1 per page.

**Tested via:** Property-based test rendering each route and extracting heading levels to verify the sequence invariant.

### Property 10: Animation Easing Curve Invariant

**Validates: Requirements 12.10**

**Property:** No CSS transition or animation definition in the codebase uses the `linear` timing function. All use one of: ease-out, ease-in, ease-in-out, or a cubic-bezier curve.

**Tested via:** Property-based test scanning all component style definitions for transition/animation properties and verifying easing values.

### Property 11: Icon Size Consistency

**Validates: Requirements 12.2**

**Property:** Every SVG icon component renders with dimensions from the allowed set {16, 20, 24}px and uses a stroke-width of 1.5.

**Tested via:** Property-based test rendering all icon components and verifying their width/height attributes and stroke-width values.

## Components and Interfaces

### Design System Primitives

```typescript
// src/design-system/primitives/Icon.tsx
interface IconProps {
  name: string;
  size?: 16 | 20 | 24;
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

// src/design-system/primitives/SegmentedControl.tsx
interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

// src/design-system/primitives/Skeleton.tsx
interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

// src/design-system/composites/EmptyState.tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

### App Shell Interfaces

```typescript
// src/app/Toolbar.tsx
interface ToolbarSlot {
  id: string;
  position: 'left' | 'center' | 'right';
  component: ReactNode;
  priority?: number;
}

// src/hooks/useToolbar.ts
function useToolbar(controls: ToolbarSlot[]): void;

// src/app/AppShell.tsx
interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
}
```

### Store Interfaces

```typescript
// src/store/onboarding.ts
interface OnboardingState {
  welcomeDismissed: boolean;
  sessionCount: number;
  firstSuccessShown: boolean;
  hintsDismissed: Record<string, boolean>;
  cmdKUsed: boolean;
  dismissWelcome: () => void;
  incrementSession: () => void;
  markFirstSuccess: () => void;
  dismissHint: (hintId: string) => void;
  markCmdKUsed: () => void;
}

// src/store/workspace.ts
interface WorkspaceState {
  activeTool: string | null;
  processingState: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  errorMessage: string | null;
  setActiveTool: (tool: string | null) => void;
  setProcessingState: (state: WorkspaceState['processingState']) => void;
  setProgress: (progress: number) => void;
  setError: (message: string) => void;
  reset: () => void;
}
```

## Data Models

### Design Tokens Data Model

```typescript
// src/design-system/tokens.ts
interface DesignTokens {
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;
    success: ColorScale;
    error: ColorScale;
    background: { light: string; dark: string };
    text: { light: string; muted: string; dark: string };
  };
  spacing: Record<string, number>; // key → px value (all multiples of 4)
  typography: {
    fontFamily: { sans: string[]; mono: string[] };
    fontSize: Record<string, [string, { lineHeight: string }]>;
    fontWeight: Record<string, number>;
  };
  borderRadius: Record<'sm' | 'md' | 'lg' | 'xl' | 'full', string>;
  shadows: Record<'level-0' | 'level-1' | 'level-2' | 'level-3' | 'level-4', string>;
  borderWidth: Record<'thin' | 'medium' | 'thick', string>;
  motion: {
    duration: Record<string, string>;
    easing: Record<'ease-out' | 'ease-in' | 'ease-in-out', string>;
  };
  icons: {
    sizes: [16, 20, 24];
    strokeWidth: 1.5;
  };
}

type ColorScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;
```

### Onboarding Persistence Model

```typescript
// Stored in localStorage
interface OnboardingPersistence {
  welcomeDismissed: boolean;
  sessionCount: number;
  firstSuccessShown: boolean;
  hintsDismissed: Record<string, boolean>;
  cmdKUsed: boolean;
}
```

### Toolbar Registration Model

```typescript
// Tools register their controls via useToolbar hook
interface ToolbarRegistration {
  toolId: string;
  controls: ToolbarSlot[];
}
```

## Error Handling

### Strategy

The redesign maintains the existing three-tier ErrorBoundary pattern (app/feature/component) and enhances it:

1. **App-level**: Full-page fallback with reload — catches catastrophic failures
2. **Feature-level**: Error message with retry — wraps each tool workspace, preserves uploaded file state across retries
3. **Component-level**: Inline placeholder — for non-critical UI failures (thumbnails, previews)

### Enhancements

- All error states use design token colors (replacing hardcoded `gray-*` and `red-*`)
- Error boundaries preserve file upload state so users don't lose work on retry
- Processing errors show specific messages (corrupt file, password-protected, unsupported feature) with actionable recovery
- Network errors (font loading, asset loading) degrade gracefully with fallback fonts/icons
- Toast errors use `aria-live="assertive"` for immediate screen reader announcement

### Error Recovery Patterns

```typescript
// Tool workspace error recovery
interface ToolErrorState {
  type:
    | 'corrupt-file'
    | 'password-protected'
    | 'unsupported-feature'
    | 'processing-failed'
    | 'unknown';
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
  alternativeAction?: { label: string; action: () => void };
}
```

## Testing Strategy

### Unit Tests

- Design token validation (spacing multiples, contrast ratios)
- Store logic (nav store, onboarding store, workspace store)
- Utility functions (fuzzy matching, frequency calculation)

### Property-Based Tests (11 properties)

- Sidebar state round-trip, filter subset invariant, recent tools cap
- Fuzzy match completeness, spacing grid alignment, WCAG contrast
- Quick actions ordering, touch targets, heading hierarchy
- Easing curve invariant, icon size consistency

### Integration Tests

- AppShell renders all zones correctly at different breakpoints
- Tool workspace lifecycle (upload → process → complete → download)
- Keyboard navigation flows (Tab through sidebar, arrow keys in lists)
- Focus trap in modals

### Visual Regression Tests

- Snapshot tests for key states (home page, tool workspace, empty states)
- Dark mode vs light mode comparison
- Mobile vs desktop layout

### Performance Tests

- Bundle size check (< 150KB gzipped initial)
- Lighthouse CI in pipeline (target 90+ on all categories)

## API and Integration Points

### LocalStorage Keys

| Key                               | Type                    | Purpose                   |
| --------------------------------- | ----------------------- | ------------------------- |
| `pdf-editor-sidebar-collapsed`    | boolean                 | Sidebar state persistence |
| `pdf-editor-favorites`            | string[]                | Favorited tool paths      |
| `pdf-editor-recent-tools`         | string[]                | Recent tool paths (max 5) |
| `pdf-editor-theme`                | 'light' \| 'dark'       | Theme preference          |
| `pdf-editor-onboarding-dismissed` | boolean                 | Welcome banner state      |
| `pdf-editor-session-count`        | number                  | Session counter for hints |
| `pdf-editor-first-success`        | boolean                 | First operation milestone |
| `pdf-editor-hint-dismissed`       | Record<string, boolean> | Per-hint dismissal state  |

### CSS Custom Properties (Generated from Tokens)

```css
:root {
  --color-primary-500: #3b82f6;
  --color-background: #ffffff;
  --spacing-4: 1rem;
  --radius-md: 0.5rem;
  --shadow-level-2: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --duration-200: 200ms;
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  /* ... */
}
```

### Route Registration Pattern

New tools follow this convention:

1. Create `src/features/[tool-name]/` directory
2. Add `components/[ToolName]Page.tsx` with standard workspace layout
3. Register route in `src/app/router.tsx`
4. Add entry to `src/features/navigation/categories.ts`

No modifications to `Layout.tsx`, `AppShell.tsx`, or shared components required.

## Migration Strategy

The redesign is implemented incrementally:

1. **Phase 1**: Design token system + primitives (non-breaking, additive)
2. **Phase 2**: AppShell layout refactor (replaces Layout.tsx)
3. **Phase 3**: Home dashboard redesign
4. **Phase 4**: Navigation enhancements
5. **Phase 5**: Micro-interactions and animations
6. **Phase 6**: Onboarding system
7. **Phase 7**: Performance optimizations
8. **Phase 8**: Accessibility audit and fixes
9. **Phase 9**: Mobile responsiveness polish
10. **Phase 10**: Visual QA and pixel-perfection pass

## Existing Issues to Fix

The codebase audit reveals several inconsistencies and quality issues that this redesign addresses:

### 1. Inconsistent Color Token Usage

Multiple components (ErrorBoundary, canvas editor EmptyState, RecoveryPrompt, ColorPicker, MinimapOverlay, export skeletons) use raw Tailwind `gray-*` classes instead of the project's `secondary-*` design tokens. This breaks theme consistency and makes dark mode unreliable.

**Fix**: Replace all `bg-gray-*`, `text-gray-*`, `border-gray-*` with corresponding `secondary-*` token classes. Enforce via ESLint rule (`no-restricted-syntax` for gray color classes).

### 2. No Dark Mode Support in Canvas Editor Components

The canvas editor's EmptyState, RecoveryPrompt, ColorPicker, and skeleton components use hardcoded light-mode colors (`bg-white`, `text-gray-800`) without `dark:` variants. Users in dark mode see jarring white panels.

**Fix**: Add dark mode variants to all canvas editor components using the design token palette.

### 3. Inconsistent Transition Durations

Components use a mix of `duration-100`, `duration-150`, `duration-200`, `duration-300` without a clear system. Some use `ease-in-out`, others use `ease-out`, and some have no easing specified.

**Fix**: Standardize on token-based durations: 50ms (micro-feedback), 150ms (state changes), 200ms (layout transitions), 300ms (complex animations). All transitions use explicit easing curves.

### 4. Duplicated Button/Interactive Patterns

Many tool pages (RotatePage, PageSizePage, WatermarksPage, PageNumbersPage) duplicate the same button styling inline rather than using the shared `Button` component. This creates maintenance burden and visual inconsistency.

**Fix**: Extract a `ToggleButton` / `SegmentedControl` composite component. Refactor tool pages to use shared primitives.

### 5. Missing Loading States

Several tool pages jump from "no file" to "processing" without intermediate feedback. The transition feels abrupt.

**Fix**: Add skeleton loading states and smooth transitions between file-upload → processing → complete states.

### 6. Toast Positioning Inconsistency

The Toast container positions toasts at bottom-right on mobile and top-right on desktop (`sm:justify-start`). This is confusing — toasts should consistently appear in one location.

**Fix**: Standardize toast position to bottom-center on mobile (thumb-reachable) and top-right on desktop. Add slide-up/slide-down animations.

### 7. No Error Recovery in File Processing

When PDF processing fails, most tool pages show a generic error without actionable recovery. Users must reload or re-upload.

**Fix**: Add retry buttons, preserve uploaded file state across errors, and show specific error messages (corrupt file, password-protected, unsupported feature).

### 8. Keyboard Navigation Gaps

The sidebar navigation doesn't support arrow-key navigation between tool items. Tab cycling through 30+ tools is tedious.

**Fix**: Implement roving tabindex pattern in the sidebar tool list. Arrow keys move between items, Tab moves to next section.

### 9. No Skeleton Placeholders for Lazy-Loaded Routes

Only the canvas editor has a skeleton placeholder during lazy loading. Other routes show nothing during code-split chunk loading.

**Fix**: Add route-level skeleton placeholders for all lazy-loaded tool pages.

### 10. Inconsistent Icon Sizing

Icons across the app use varying sizes (h-4 w-4, h-5 w-5, h-6 w-6) without a clear system. Some use `strokeWidth={1.5}`, others use `strokeWidth={2}`.

**Fix**: Standardize on three icon sizes (16px, 20px, 24px) with consistent 1.5px stroke weight. Create an `Icon` wrapper component that enforces sizing.

### 11. No Reduced Motion Support

No component checks `prefers-reduced-motion`. Users who need reduced motion still see all animations.

**Fix**: Add a `useReducedMotion()` hook and conditionally disable animations. Apply `motion-safe:` and `motion-reduce:` Tailwind variants.

### 12. Missing Focus Visible Styles on Some Elements

Some interactive elements (tab close buttons, context menu items, toast dismiss buttons) lack `focus-visible` ring styles, making keyboard navigation invisible.

**Fix**: Audit all interactive elements and ensure consistent `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` styling.
