# Technical Design Document — OCR, Letterhead Editor & Navigation Redesign

## Overview

This design covers three major features for the PDF Editor: (1) Client-side OCR via Tesseract.js enabling scanned PDF text extraction, search, and redaction; (2) A letterhead creator/editor with WYSIWYG preview and reusable templates; (3) A navigation redesign with categorized tool groups, search filter, favorites, and collapsible sidebar. All processing remains client-side to maintain the privacy-first approach.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Browser Main Thread                                │
│                                                                             │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────────────┐  │
│  │  React UI    │   │  Zustand Stores   │   │  Core Engines              │  │
│  │              │   │                    │   │                            │  │
│  │ OCR Page     │◄──┤ ocr-store         │◄──┤ ocr-engine (coordinator)   │  │
│  │ Letterhead   │◄──┤ letterhead-store   │   │ render-engine (pdfjs)      │  │
│  │ CategorizedNav│◄─┤ nav-store          │   │ pdf-engine (pdf-lib)       │  │
│  │ ExtractText* │   │                    │   │                            │  │
│  │ Redact*      │   │                    │   │                            │  │
│  └──────────────┘   └──────────────────┘   └─────────────┬──────────────┘  │
│                                                            │                 │
└────────────────────────────────────────────────────────────┼─────────────────┘
                                                             │ postMessage
                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Web Worker Thread                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ocr-worker.ts                                                       │    │
│  │  - Tesseract.js scheduler + worker                                   │    │
│  │  - Language pack management                                          │    │
│  │  - Page image → recognized text + bounding boxes                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Data Flow — OCR Processing

```
User triggers OCR → ocr-store dispatches → ocr-engine.processPages()
  → render-engine.renderPage(doc, pageNum, scale=4.17) → canvas (300 DPI)
  → canvas.toBlob() → ImageBitmap transferred to Worker
  → ocr-worker: Tesseract.recognize(image) → OcrPageResult
  → postMessage back to main thread
  → ocr-store updates results + progress
  → UI re-renders (ProgressBar, results panel)
```

#### Data Flow — Searchable PDF Generation

```
OCR results available → user clicks "Generate Searchable PDF"
  → ocr-engine.generateSearchablePdf(pdfData, ocrResults)
  → pdf-lib: load original PDF
  → For each page with OCR results:
      → Create transparent text layer using word bounding boxes
      → Embed text at correct coordinates (scaled from 300 DPI to PDF points)
  → pdf-lib: save modified PDF → download
```

#### Data Flow — Letterhead Application

```
User designs letterhead → letterhead-store saves template to localStorage
User clicks "Apply" → letterhead-renderer.applyToDocument(pdfData, template, pageRange)
  → pdf-lib: load PDF
  → For each target page: embed logo image, draw text fields at configured positions
  → pdf-lib: save → download
```

### New Modules

| Module                                                           | Purpose                                                                           | Requirements   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------- |
| `src/core/ocr-engine/`                                           | OCR processing core — worker management, Tesseract.js integration, page detection | Req 1–6, 10–11 |
| `src/features/ocr/`                                              | OCR feature UI — page, components, store                                          | Req 1–11, 13   |
| `src/features/letterhead/`                                       | Letterhead editor feature — WYSIWYG editor, template management                   | Req 12, 13     |
| Updated `src/components/ui/NavBar.tsx` → `CategorizedNavBar.tsx` | Redesigned navigation with categories, icons, filter, favorites                   | Req 14         |

## Data Models

#### OCR Result Types (Req 3.2, 3.3, 3.6)

```typescript
/** Bounding box for a recognized word, in pixels relative to 300 DPI rendered image */
interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single recognized word with position and confidence */
interface OcrWord {
  text: string;
  bbox: OcrBoundingBox;
  confidence: number; // 0-100
}

/** A line of recognized text composed of words */
interface OcrLine {
  text: string;
  words: OcrWord[];
  bbox: OcrBoundingBox;
  confidence: number;
}

/** OCR result for a single page */
interface OcrPageResult {
  pageNumber: number;
  text: string; // Full text with line breaks and paragraph separation
  lines: OcrLine[];
  words: OcrWord[];
  confidence: number; // Average confidence for the page
  processingTimeMs: number;
}

/** Summary of OCR processing across all pages */
interface OcrProcessingResult {
  pages: OcrPageResult[];
  failedPages: OcrPageFailure[];
  totalPagesProcessed: number;
  totalPagesFailed: number;
  averageConfidence: number | null; // null if all pages failed
  totalProcessingTimeMs: number;
}

/** Record of a page that failed OCR processing */
interface OcrPageFailure {
  pageNumber: number;
  error: string;
}
```

#### Letterhead Template Types (Req 12.1, 12.5, 12.6)

```typescript
type Alignment = 'left' | 'center' | 'right';

interface LetterheadTextField {
  content: string;
  fontFamily: string;
  fontSize: number; // 8-24 pt
  color: string; // hex color
  alignment: Alignment;
}

interface LetterheadLogo {
  data: ArrayBuffer; // PNG or JPG image data
  mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  fileName: string;
  width: number; // 50-300 px
  alignment: Alignment;
}

interface LetterheadTemplate {
  id: string;
  name: string; // 1-50 characters
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  logo: LetterheadLogo | null;
  companyName: LetterheadTextField; // max 100 chars
  addressLines: LetterheadTextField[]; // up to 3 lines, max 80 chars each
  phone: LetterheadTextField; // max 30 chars
  email: LetterheadTextField; // max 100 chars
  website: LetterheadTextField; // max 100 chars
  tagline: LetterheadTextField | null; // optional
}

/** Page range specification for letterhead application */
type LetterheadPageTarget =
  | { type: 'first' }
  | { type: 'all' }
  | { type: 'custom'; pages: number[] };
```

#### Navigation Category Types (Req 14.1, 14.6, 14.7, 14.9)

```typescript
interface NavCategory {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  tools: NavTool[];
}

interface NavTool {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  categoryId: string;
}

interface NavState {
  favorites: string[]; // tool paths, max 8
  recentTools: string[]; // tool paths, max 5
  collapsedCategories: Record<string, boolean>;
  sidebarCollapsed: boolean;
  filterQuery: string;
}
```

### State Management

## Components and Interfaces

### OCR Store — `src/features/ocr/store/ocr-store.ts` (Req 1, 3, 5, 10)

```typescript
import { create } from 'zustand';

type OcrEngineStatus = 'idle' | 'initializing' | 'ready' | 'processing' | 'error';

interface OcrProgress {
  currentPage: number;
  totalPages: number;
  percentComplete: number; // 0-100 integer
  estimatedTimeRemainingMs: number | null; // null until 2 pages processed
  pageTimings: number[]; // ms per completed page, for ETA calculation
}

interface OcrStoreState {
  // Engine state
  engineStatus: OcrEngineStatus;
  engineError: string | null;
  initProgress: number | null; // language pack download 0-100

  // Language
  selectedLanguages: string[]; // ISO codes, max 3
  loadedLanguages: string[];

  // Page detection
  scannedPages: number[];
  textPages: number[];
  detectionComplete: boolean;

  // Processing
  progress: OcrProgress | null;
  results: OcrProcessingResult | null;
  isCancelled: boolean;

  // Actions
  initialize: (languages: string[]) => Promise<void>;
  detectScannedPages: (pdfData: ArrayBuffer) => Promise<void>;
  processPages: (pdfData: ArrayBuffer, pages: number[]) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  setLanguages: (languages: string[]) => void;
}
```

### Letterhead Store — `src/features/letterhead/store/letterhead-store.ts` (Req 12.6, 12.7)

```typescript
import { create } from 'zustand';

interface LetterheadStoreState {
  templates: LetterheadTemplate[];
  activeTemplateId: string | null;
  lastUsedTemplateId: string | null;
  editorState: 'idle' | 'editing' | 'previewing' | 'applying';

  // CRUD actions
  createTemplate: (template: Omit<LetterheadTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<LetterheadTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => string;
  renameTemplate: (id: string, name: string) => void;

  // Editor actions
  selectTemplate: (id: string) => void;
  setEditorState: (state: LetterheadStoreState['editorState']) => void;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}
```

### Navigation Store — `src/features/navigation/store/nav-store.ts` (Req 14.6, 14.7, 14.9, 14.10, 14.11)

```typescript
import { create } from 'zustand';

interface NavStoreState {
  favorites: string[]; // tool paths, max 8
  recentTools: string[]; // tool paths, max 5
  collapsedCategories: Record<string, boolean>;
  sidebarCollapsed: boolean;
  filterQuery: string;

  // Actions
  addFavorite: (path: string) => boolean; // returns false if at max
  removeFavorite: (path: string) => void;
  toggleFavorite: (path: string) => boolean;
  addRecentTool: (path: string) => void;
  toggleCategory: (categoryId: string) => void;
  toggleSidebar: () => void;
  setFilterQuery: (query: string) => void;

  // Persistence
  loadFromStorage: () => void;
}
```

---

### OCR Engine (`src/core/ocr-engine/`)

#### `ocr-engine.ts` — Singleton OCR Coordinator (Req 1.1, 1.2, 1.5, 1.7, 10.1)

Manages the lifecycle of the OCR Web Worker, coordinates page rendering and recognition, and provides the public API consumed by the OCR store.

```typescript
type OcrEngineEventType = 'progress' | 'pageComplete' | 'error' | 'initProgress';

interface OcrEngineEvents {
  progress: (progress: OcrProgress) => void;
  pageComplete: (result: OcrPageResult) => void;
  error: (error: string) => void;
  initProgress: (percent: number) => void;
}

class OcrEngine {
  private static instance: OcrEngine | null = null;
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private loadedLanguages: Set<string> = new Set();
  private initPromise: Promise<void> | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  static getInstance(): OcrEngine;

  /**
   * Initialize the OCR worker and load language packs.
   * Lazy-loads Tesseract.js only on first call. (Req 1.2)
   * Reuses existing worker if already initialized. (Req 1.5)
   * Queues if initialization is already in progress. (Req 1.7)
   */
  async initialize(languages: string[]): Promise<void>;

  /**
   * Detect which pages in a document are scanned (image-only).
   * Uses render-engine extractText and checks character count < 10. (Req 2.1, 2.2)
   */
  async detectScannedPages(pdfData: ArrayBuffer): Promise<{
    scannedPages: number[];
    textPages: number[];
    totalPages: number;
  }>;

  /**
   * Process selected pages through OCR recognition.
   * Renders each page at 300 DPI, sends to worker, collects results. (Req 3.1, 3.4)
   * Processes sequentially to limit memory usage. (Req 11.3)
   */
  async processPages(
    pdfData: ArrayBuffer,
    pages: number[],
    onProgress?: (progress: OcrProgress) => void,
  ): Promise<OcrProcessingResult>;

  /**
   * Generate a searchable PDF by embedding transparent text layers. (Req 6.2, 6.3, 6.4)
   */
  async generateSearchablePdf(
    pdfData: ArrayBuffer,
    results: OcrProcessingResult,
  ): Promise<ArrayBuffer>;

  /** Cancel in-progress OCR processing. (Req 5.5) */
  cancel(): void;

  /** Terminate worker and release resources. (Req 10.4) */
  destroy(): void;

  /** Event subscription */
  on<T extends OcrEngineEventType>(event: T, callback: OcrEngineEvents[T]): () => void;
}
```

#### `ocr-worker.ts` — Web Worker for Tesseract.js (Req 10.1, 10.5, 10.6, 10.7)

Runs in a dedicated Web Worker thread. Handles Tesseract.js initialization, language loading, and page recognition. Communicates with the main thread via structured messages.

```typescript
// Worker message protocol (main → worker)
type WorkerInMessage =
  | { type: 'init'; languages: string[]; langDataPath: string }
  | { type: 'recognize'; pageNumber: number; imageData: ImageBitmap }
  | { type: 'terminate' };

// Worker message protocol (worker → main)
type WorkerOutMessage =
  | { type: 'initProgress'; percent: number }
  | { type: 'initComplete' }
  | { type: 'initError'; error: string }
  | { type: 'recognizeComplete'; pageNumber: number; result: OcrPageResult }
  | { type: 'recognizeError'; pageNumber: number; error: string }
  | { type: 'terminated' };

// Inside the worker:
// - Creates Tesseract.js worker with createWorker()
// - Loads language data with worker.loadLanguage() + worker.initialize()
// - Reports download progress via initProgress messages
// - On recognize: runs worker.recognize(imageData) → extracts words, lines, confidence
// - Maps Tesseract.js output to OcrPageResult format
// - Handles 30-second timeout per page (Req 10.7)
```

#### `page-detector.ts` — Scanned Page Detection (Req 2.1, 2.2, 2.4, 2.6)

```typescript
const SCANNED_PAGE_TEXT_THRESHOLD = 10; // non-whitespace characters

/**
 * Analyze a PDF document to classify pages as scanned or text-bearing.
 * Uses the existing PdfjsRenderEngine.extractText() for each page.
 *
 * Algorithm:
 * 1. Load document via render engine
 * 2. For each page, extract text using pdfjs-dist
 * 3. Count non-whitespace characters in extracted text
 * 4. If count < SCANNED_PAGE_TEXT_THRESHOLD → classify as scanned
 * 5. If extractText throws → classify as scanned (Req 2.6)
 *
 * Performance: Must complete 50 pages within 5 seconds (Req 2.4)
 * pdfjs text extraction is fast (~50-100ms/page) so this is achievable.
 */
async function detectScannedPages(
  pdfData: ArrayBuffer,
): Promise<{ scannedPages: number[]; textPages: number[]; totalPages: number }>;
```

#### `searchable-pdf.ts` — Text Layer Generation (Req 6.2, 6.3, 6.4, 6.5)

```typescript
/**
 * Generate a searchable PDF by embedding invisible text layers.
 *
 * Algorithm:
 * 1. Load original PDF with pdf-lib
 * 2. For each page with OCR results:
 *    a. Get page dimensions in PDF points (72 DPI)
 *    b. Calculate scale factor: pageWidthPt / (pageWidthInches * 300)
 *       For US Letter: 612pt / (8.5 * 300) = 0.24
 *    c. For each recognized word:
 *       - Convert pixel bbox to PDF points using scale factor
 *       - Embed font (Helvetica for Latin, appropriate font for CJK)
 *       - Calculate font size to fit word within bbox height
 *       - Draw text at (x * scale, pageHeight - (y + height) * scale)
 *         with renderingMode = 3 (invisible/transparent) (Req 6.3)
 * 3. Preserve non-OCR pages without modification (Req 6.4)
 * 4. Save and return the modified PDF
 *
 * Output filename: originalName_searchable.pdf (Req 6.5)
 */
async function generateSearchablePdf(
  pdfData: ArrayBuffer,
  ocrResults: OcrProcessingResult,
): Promise<{ data: ArrayBuffer; sizeIncrease: number }>;
```

### Letterhead Editor

#### `letterhead-store.ts` — Template CRUD & Persistence (Req 12.6, 12.7, 12.9, 12.10, 12.13)

```typescript
const STORAGE_KEY = 'pdf-editor-letterhead-templates';
const LAST_USED_KEY = 'pdf-editor-letterhead-last-used';
const MAX_TEMPLATES = 20;

/**
 * Zustand store managing letterhead templates with localStorage persistence.
 *
 * - Stores up to 20 templates (Req 12.6)
 * - Tracks last-used template for "quick apply" (Req 12.9)
 * - Handles localStorage quota errors gracefully (Req 12.13)
 * - Logo images stored as base64 in localStorage (limited by 5MB file size cap)
 */
export const useLetterheadStore = create<LetterheadStoreState>((set, get) => ({
  templates: [],
  activeTemplateId: null,
  lastUsedTemplateId: null,
  editorState: 'idle',

  createTemplate: (template) => {
    /* ... */
  },
  updateTemplate: (id, updates) => {
    /* ... */
  },
  deleteTemplate: (id) => {
    /* ... */
  },
  duplicateTemplate: (id) => {
    /* ... */
  },
  renameTemplate: (id, name) => {
    /* ... */
  },
  selectTemplate: (id) => {
    /* ... */
  },
  setEditorState: (state) => {
    /* ... */
  },
  loadFromStorage: () => {
    /* ... */
  },
  saveToStorage: () => {
    /* ... */
  },
}));
```

#### `LetterheadEditor.tsx` — WYSIWYG Canvas Preview (Req 12.1, 12.2, 12.3, 12.5, 13.7)

```typescript
interface LetterheadEditorProps {
  template: LetterheadTemplate;
  pdfData?: ArrayBuffer; // If provided, shows letterhead on first page
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}

/**
 * WYSIWYG letterhead editor component.
 *
 * Layout: Two-column on desktop (controls left, preview right) (Req 13.3)
 * - Left panel (max-w-[320px]): Form inputs for all template fields
 * - Right panel: Live canvas preview updating within 200ms of changes (Req 13.7)
 *
 * Preview rendering:
 * - Uses an HTML5 Canvas element sized to A4/Letter proportions
 * - White background with shadow-lg (matching PreviewPanel styling)
 * - Renders logo at configured position and size
 * - Renders text fields with configured font, size, color, alignment
 * - Header area occupies top 100px of page (Req 12.1)
 * - Debounces re-render to 200ms for smooth interaction
 *
 * Form controls:
 * - Logo upload with drag-drop, format/size validation (Req 12.3, 12.4)
 * - Text inputs with character limits and inline validation (Req 12.5, 13.11)
 * - Font family dropdown, font size slider, color picker
 * - Alignment toggle buttons (left/center/right)
 */
function LetterheadEditor({ template, pdfData, onChange }: LetterheadEditorProps): JSX.Element;
```

#### `letterhead-renderer.ts` — pdf-lib Integration (Req 12.8, 12.12)

```typescript
/**
 * Apply a letterhead template to a PDF document using pdf-lib.
 *
 * Algorithm:
 * 1. Load PDF with PDFDocument.load()
 * 2. Determine target pages from LetterheadPageTarget
 * 3. For each target page:
 *    a. Get page dimensions
 *    b. Calculate header area (top 100px scaled to PDF points)
 *    c. Embed logo image (embedPng/embedJpg) and draw at configured position
 *    d. Embed font and draw text fields at configured positions
 *    e. Respect alignment: left=margin, center=pageWidth/2, right=pageWidth-margin
 * 4. Save modified PDF
 *
 * Does NOT modify existing page content — only overlays new elements (Req 12.8)
 */
async function applyLetterhead(
  pdfData: ArrayBuffer,
  template: LetterheadTemplate,
  target: LetterheadPageTarget,
): Promise<ArrayBuffer>;

/**
 * Export a letterhead template as a standalone single-page PDF. (Req 12.12)
 * Creates a blank A4 page and renders the letterhead onto it.
 */
async function exportLetterheadAsPdf(template: LetterheadTemplate): Promise<ArrayBuffer>;
```

### Navigation Redesign

#### `nav-store.ts` — Favorites, Recent, Collapsed State (Req 14.6, 14.7, 14.9, 14.10, 14.11)

```typescript
const FAVORITES_KEY = 'pdf-editor-nav-favorites';
const RECENT_KEY = 'pdf-editor-nav-recent';
const COLLAPSED_KEY = 'pdf-editor-nav-collapsed';
const SIDEBAR_KEY = 'pdf-editor-sidebar-collapsed';
const MAX_FAVORITES = 8;
const MAX_RECENT = 5;

export const useNavStore = create<NavStoreState>((set, get) => ({
  favorites: [], // loaded from localStorage on init
  recentTools: [], // loaded from localStorage on init
  collapsedCategories: {}, // all default to expanded (Req 14.6)
  sidebarCollapsed: false,
  filterQuery: '',

  addFavorite: (path) => {
    const { favorites } = get();
    if (favorites.length >= MAX_FAVORITES) return false; // Req 14.7
    if (favorites.includes(path)) return true;
    const updated = [...favorites, path];
    set({ favorites: updated });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return true;
  },

  removeFavorite: (path) => {
    /* ... */
  },
  toggleFavorite: (path) => {
    /* ... */
  },

  addRecentTool: (path) => {
    const { recentTools } = get();
    const filtered = recentTools.filter((p) => p !== path);
    const updated = [path, ...filtered].slice(0, MAX_RECENT); // Req 14.9
    set({ recentTools: updated });
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  },

  toggleCategory: (categoryId) => {
    const { collapsedCategories } = get();
    const updated = { ...collapsedCategories, [categoryId]: !collapsedCategories[categoryId] };
    set({ collapsedCategories: updated });
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(updated));
  },

  toggleSidebar: () => {
    const collapsed = !get().sidebarCollapsed;
    set({ sidebarCollapsed: collapsed });
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(collapsed));
  },

  setFilterQuery: (query) => set({ filterQuery: query }),

  loadFromStorage: () => {
    try {
      const favs = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const collapsed = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}');
      const sidebar = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || 'false');
      set({
        favorites: favs,
        recentTools: recent,
        collapsedCategories: collapsed,
        sidebarCollapsed: sidebar,
      });
    } catch {
      /* graceful fallback to defaults */
    }
  },
}));
```

#### `CategorizedNavBar.tsx` — New Navigation Component (Req 14.1, 14.2, 14.3, 14.6, 14.10, 14.13)

```typescript
/**
 * Redesigned navigation component with categorized tool groups.
 *
 * Structure:
 * ┌─────────────────────────┐
 * │ App Title               │
 * │ [Filter tools... input] │ ← NavFilterInput (Req 14.3)
 * │ ─── Favorites ───       │ ← Pinned tools (Req 14.7)
 * │ ─── Recent ───          │ ← Last 5 used (Req 14.9)
 * │ ▼ Organize              │ ← Collapsible category (Req 14.6)
 * │   🔀 Merge              │
 * │   ✂️ Split              │
 * │   ...                   │
 * │ ▼ Edit                  │
 * │   ...                   │
 * │ ▼ Convert               │
 * │   ...                   │
 * │ ▼ Protect               │
 * │   ...                   │
 * │ ▼ Analyze               │
 * │   ...                   │
 * │ ▼ OCR                   │
 * │   ...                   │
 * │ [Collapse toggle]       │ ← Sidebar collapse (Req 14.10)
 * │ [Theme toggle]          │
 * └─────────────────────────┘
 *
 * Active link: primary bg + 3px left border (Req 14.13)
 * Collapsed mode: 48px width, icons only, tooltip on hover (Req 14.10)
 */
function CategorizedNavBar(): JSX.Element;
```

#### `NavFilterInput.tsx` — Real-Time Filter (Req 14.3, 14.4, 14.5)

```typescript
/**
 * Search/filter input for the navigation sidebar.
 *
 * - Placeholder: "Filter tools..."
 * - Filters case-insensitively against tool names AND category names (Req 14.4)
 * - Updates within 100ms of each keystroke (no debounce needed for local filtering)
 * - Shows "No tools found" when zero matches (Req 14.5)
 * - Minimum 44x44px touch target (Req 13.8)
 * - Clear button appears when input has value
 */
interface NavFilterInputProps {
  value: string;
  onChange: (query: string) => void;
}

function NavFilterInput({ value, onChange }: NavFilterInputProps): JSX.Element;
```

#### `NavContextMenu.tsx` — Pin/Unpin Context Menu (Req 14.8)

```typescript
/**
 * Context menu for pinning/unpinning tools to favorites.
 *
 * Trigger:
 * - Desktop: right-click on a navigation link
 * - Mobile: long-press (500ms) on a navigation link
 *
 * Actions:
 * - "Add to Favorites" (if not pinned)
 * - "Remove from Favorites" (if pinned)
 *
 * Positioning: Appears at cursor position, constrained to viewport bounds.
 * Dismissal: Click outside, Escape key, or selecting an action.
 */
interface NavContextMenuProps {
  toolPath: string;
  position: { x: number; y: number };
  onClose: () => void;
}

function NavContextMenu({ toolPath, position, onClose }: NavContextMenuProps): JSX.Element;
```

#### Category Definitions and Icon Mappings (Req 14.1, 14.2)

```typescript
// src/features/navigation/categories.ts

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'organize',
    label: 'Organize',
    icon: FolderIcon,
    tools: [
      { path: '/merge', label: 'Merge', icon: MergeIcon, categoryId: 'organize' },
      { path: '/split', label: 'Split', icon: ScissorsIcon, categoryId: 'organize' },
      { path: '/rotate', label: 'Rotate', icon: RotateIcon, categoryId: 'organize' },
      { path: '/reorder', label: 'Reorder', icon: ReorderIcon, categoryId: 'organize' },
      { path: '/delete-pages', label: 'Delete Pages', icon: TrashIcon, categoryId: 'organize' },
      {
        path: '/duplicate-pages',
        label: 'Duplicate Pages',
        icon: CopyIcon,
        categoryId: 'organize',
      },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: PencilIcon,
    tools: [
      { path: '/text-overlay', label: 'Text Overlay', icon: TextIcon, categoryId: 'edit' },
      { path: '/highlight', label: 'Highlight', icon: HighlightIcon, categoryId: 'edit' },
      { path: '/signature', label: 'Signature', icon: SignatureIcon, categoryId: 'edit' },
      { path: '/stamps', label: 'Stamps', icon: StampIcon, categoryId: 'edit' },
      { path: '/watermarks', label: 'Watermarks', icon: WatermarkIcon, categoryId: 'edit' },
      {
        path: '/headers-footers',
        label: 'Headers & Footers',
        icon: HeaderIcon,
        categoryId: 'edit',
      },
      { path: '/crop', label: 'Crop', icon: CropIcon, categoryId: 'edit' },
      { path: '/letterhead', label: 'Letterhead', icon: LetterheadIcon, categoryId: 'edit' },
      { path: '/form-fill', label: 'Form Fill', icon: FormIcon, categoryId: 'edit' },
    ],
  },
  {
    id: 'convert',
    label: 'Convert',
    icon: ConvertIcon,
    tools: [
      { path: '/image-to-pdf', label: 'Image to PDF', icon: ImageIcon, categoryId: 'convert' },
      {
        path: '/pdf-to-image',
        label: 'PDF to Image',
        icon: ExportImageIcon,
        categoryId: 'convert',
      },
      {
        path: '/extract-images',
        label: 'Extract Images',
        icon: ExtractIcon,
        categoryId: 'convert',
      },
      {
        path: '/extract-text',
        label: 'Extract Text',
        icon: ExtractTextIcon,
        categoryId: 'convert',
      },
      { path: '/flatten', label: 'Flatten', icon: FlattenIcon, categoryId: 'convert' },
      { path: '/linearize', label: 'Linearize', icon: LinearizeIcon, categoryId: 'convert' },
    ],
  },
  {
    id: 'protect',
    label: 'Protect',
    icon: ShieldIcon,
    tools: [
      {
        path: '/password-protect',
        label: 'Password Protect',
        icon: LockIcon,
        categoryId: 'protect',
      },
      { path: '/unlock', label: 'Unlock', icon: UnlockIcon, categoryId: 'protect' },
      { path: '/redact', label: 'Redact', icon: RedactIcon, categoryId: 'protect' },
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: ChartIcon,
    tools: [
      { path: '/compare', label: 'Compare', icon: CompareIcon, categoryId: 'analyze' },
      { path: '/bookmarks', label: 'Bookmarks', icon: BookmarkIcon, categoryId: 'analyze' },
      { path: '/metadata', label: 'Metadata', icon: InfoIcon, categoryId: 'analyze' },
      { path: '/page-numbers', label: 'Page Numbers', icon: HashIcon, categoryId: 'analyze' },
      { path: '/page-size', label: 'Page Size', icon: ResizeIcon, categoryId: 'analyze' },
      { path: '/compress', label: 'Compress', icon: CompressIcon, categoryId: 'analyze' },
    ],
  },
  {
    id: 'ocr',
    label: 'OCR',
    icon: ScanIcon,
    tools: [
      { path: '/ocr', label: 'OCR Scan', icon: ScanIcon, categoryId: 'ocr' },
      {
        path: '/ocr/searchable-pdf',
        label: 'Searchable PDF',
        icon: SearchDocIcon,
        categoryId: 'ocr',
      },
    ],
  },
];
```

### Integration Points

#### OCR → Extract Text Feature (Req 7.1–7.7)

The existing `ExtractTextPage` component currently uses `PdfjsRenderEngine.extractText()` and shows a warning when no text is found. The integration modifies this flow:

```typescript
// Modified ExtractTextPage behavior:
// 1. After text extraction, check for pages with no text (emptyPages)
// 2. If emptyPages.length > 0, show OCR prompt banner:
//    "X pages appear to be scanned. Run OCR to extract text from these pages?"
//    [Run OCR] [Skip]
// 3. If user accepts:
//    - Initialize OCR engine with selected language
//    - Process scannedPages via ocr-store
//    - Show ProgressBar during processing
// 4. On completion:
//    - Merge native text + OCR text in page order (Req 7.4)
//    - Use same "--- Page Break ---" delimiter
//    - Show summary label: "Pages X, Y, Z used OCR (avg confidence: N%)" (Req 7.6)
// 5. Failed OCR pages get placeholder: "[Page N: OCR recognition failed]" (Req 7.5)
// 6. Copy/download actions work on combined text (Req 7.7)
```

#### OCR → Search Functionality (Req 8.1–8.4)

```typescript
// OCR results are stored in the ocr-store and made available globally.
// The search feature checks ocr-store for results when searching:
//
// 1. If document has OCR results → search both native + OCR text (Req 8.2)
// 2. Highlight matches using word bounding boxes from OCR results (Req 8.3)
// 3. If document has unprocessed scanned pages → show suggestion toast (Req 8.4)
```

#### OCR → Redact Feature (Req 9.1–9.6)

```typescript
// The RedactPage component gains OCR-aware text selection:
//
// 1. If OCR results exist for a page:
//    - Render word bounding boxes as invisible hit targets
//    - On click/drag: select words by their bounding boxes (Req 9.1)
//    - Show semi-transparent highlight on selected words (Req 9.2)
//    - On confirm: draw black rectangle over bbox in page image (Req 9.3)
//    - Remove corresponding text from OCR results (Req 9.4)
//
// 2. If page is scanned but not OCR-processed:
//    - Show notification: "Run OCR to enable text-based redaction" (Req 9.5)
//    - Offer action button to initiate OCR
//
// 3. Redaction saves modified image back into PDF (Req 9.6)
//    - Uses pdf-lib to replace page content stream with redacted image
```

#### Letterhead → Existing Template Engine (Req 12.8)

```typescript
// Letterhead templates are independent from the operation template engine
// (src/store/templates.ts) but follow similar patterns:
//
// - Both use localStorage for persistence
// - Both support CRUD operations
// - Letterhead uses pdf-lib directly (like PdfEngine operations)
// - Letterhead does NOT go through the PdfWorkerClient since it needs
//   canvas rendering for preview (main thread operation)
//
// The letterhead feature adds a new route /letterhead and a new entry
// in the "Edit" navigation category.
```

#### Navigation → Existing NavBar Replacement (Req 14)

```typescript
// The new CategorizedNavBar replaces the existing NavBar component.
//
// Migration:
// 1. src/components/ui/NavBar.tsx → deprecated (kept for reference)
// 2. src/features/navigation/CategorizedNavBar.tsx → new component
// 3. src/app/router.tsx: Layout sidebar prop updated to <CategorizedNavBar />
// 4. src/components/ui/Layout.tsx: sidebar width adjusts based on collapsed state
//    - Expanded: md:w-64 lg:w-72 (current)
//    - Collapsed: md:w-12 (48px) (Req 14.10)
//
// The Layout component reads sidebarCollapsed from nav-store to adjust width.
// Mobile navigation uses full-screen overlay (Req 14.12, 14.14).
```

### Key Algorithms

#### Scanned Page Detection Algorithm (Req 2.1, 2.2, 2.4, 2.6)

```typescript
/**
 * Determines if a page is scanned by checking embedded text content.
 *
 * Complexity: O(n) where n = number of pages
 * Target: < 100ms per page (text extraction via pdfjs is fast)
 * Total for 50 pages: < 5 seconds (Req 2.4)
 */
async function isScannedPage(
  renderEngine: PdfjsRenderEngine,
  doc: RenderableDocument,
  pageNum: number,
): Promise<boolean> {
  try {
    const text = await renderEngine.extractText(doc, pageNum);
    const nonWhitespace = text.replace(/\s/g, '');
    return nonWhitespace.length < 10; // Req 2.2: threshold of 10 chars
  } catch {
    return true; // Req 2.6: treat render failures as scanned
  }
}
```

#### Page Rendering at 300 DPI (Req 3.1, 11.1)

```typescript
/**
 * Render a PDF page to a canvas at 300 DPI for OCR processing.
 *
 * PDF pages are defined in points (72 DPI).
 * To render at 300 DPI: scale = 300 / 72 = 4.1667
 *
 * For US Letter (8.5" × 11"):
 * - PDF dimensions: 612 × 792 points
 * - At 300 DPI: 2550 × 3300 pixels
 * - Memory per page: 2550 × 3300 × 4 bytes (RGBA) ≈ 33.7 MB
 *
 * Memory management (Req 10.3, 11.2):
 * - Render one page at a time
 * - Transfer ImageBitmap to worker (zero-copy via transferable)
 * - Release canvas and ImageData immediately after transfer
 * - Peak memory: ~34 MB for image + Tesseract working memory ≈ < 500 MB
 */
const DPI_SCALE = 300 / 72; // 4.1667

async function renderPageForOcr(
  renderEngine: PdfjsRenderEngine,
  doc: RenderableDocument,
  pageNum: number,
): Promise<ImageBitmap> {
  const canvas = await renderEngine.renderPage(doc, pageNum, DPI_SCALE);
  const bitmap = await createImageBitmap(canvas);
  // Release canvas memory immediately
  canvas.width = 0;
  canvas.height = 0;
  return bitmap; // Transfer to worker via postMessage transferable
}
```

#### OCR Progress Calculation and ETA (Req 5.1, 5.2, 5.3, 5.6)

```typescript
/**
 * Calculate progress and estimated time remaining.
 *
 * Progress: (pagesCompleted / totalPages) * 100, rounded to integer (Req 5.1)
 * ETA: Available after 2+ pages completed (Req 5.3)
 *      = averageTimePerPage * remainingPages
 *      Displayed as "Xm Ys" format
 *
 * Updated within 1 second of each page completion (Req 5.6)
 */
function calculateProgress(
  pagesCompleted: number,
  totalPages: number,
  pageTimings: number[], // ms per page
): OcrProgress {
  const percentComplete = Math.round((pagesCompleted / totalPages) * 100);
  const currentPage = pagesCompleted + 1;

  let estimatedTimeRemainingMs: number | null = null;
  if (pageTimings.length >= 2) {
    const avgTime = pageTimings.reduce((a, b) => a + b, 0) / pageTimings.length;
    const remaining = totalPages - pagesCompleted;
    estimatedTimeRemainingMs = Math.round(avgTime * remaining);
  }

  return {
    currentPage,
    totalPages,
    percentComplete,
    estimatedTimeRemainingMs,
    pageTimings,
  };
}

/** Format milliseconds as "Xm Ys" */
function formatEta(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
```

#### Letterhead Positioning and Scaling (Req 12.1, 12.3, 12.8)

```typescript
/**
 * Calculate positions for letterhead elements within the header area.
 *
 * Header area: top 100px of page (in PDF points, relative to page height)
 * PDF coordinate system: origin at bottom-left, Y increases upward
 *
 * For A4 page (595.28 × 841.89 pt):
 * - Header Y range: 741.89 to 841.89 (top 100pt)
 * - Margin: 36pt (0.5 inch) on each side
 * - Usable width: 595.28 - 72 = 523.28pt
 *
 * Logo positioning:
 * - Left aligned: x = margin (36pt)
 * - Center aligned: x = (pageWidth - logoWidth) / 2
 * - Right aligned: x = pageWidth - margin - logoWidth
 *
 * Logo scaling:
 * - User specifies width in px (50-300), converted to pt: width * 0.75
 * - Height calculated from aspect ratio
 * - Positioned at top of header area
 *
 * Text positioning:
 * - Below logo (or at top if no logo)
 * - Each line offset by (fontSize + 4pt) vertically
 * - Alignment determines X position (same logic as logo)
 */
interface LetterheadLayout {
  pageWidth: number; // PDF points
  pageHeight: number;
  headerTop: number; // pageHeight
  headerBottom: number; // pageHeight - 100
  margin: number; // 36pt
  usableWidth: number; // pageWidth - 2 * margin
}

function calculateElementPosition(
  layout: LetterheadLayout,
  alignment: Alignment,
  elementWidth: number,
): number {
  switch (alignment) {
    case 'left':
      return layout.margin;
    case 'center':
      return (layout.pageWidth - elementWidth) / 2;
    case 'right':
      return layout.pageWidth - layout.margin - elementWidth;
  }
}
```

#### Navigation Filtering Logic (Req 14.3, 14.4, 14.5)

```typescript
/**
 * Filter navigation tools based on user query.
 *
 * Algorithm:
 * 1. Normalize query to lowercase
 * 2. For each category:
 *    a. Check if category label contains query → show all tools in category
 *    b. Otherwise, filter tools whose label contains query
 *    c. If category has zero matching tools → hide entire category
 * 3. If zero total matches → show "No tools found" message
 *
 * Performance: O(n) where n = total tools (~30), runs on every keystroke
 * No debounce needed — filtering is synchronous and fast (< 1ms)
 */
function filterNavigation(
  categories: NavCategory[],
  query: string,
): { filteredCategories: NavCategory[]; hasResults: boolean } {
  if (!query.trim()) {
    return { filteredCategories: categories, hasResults: true };
  }

  const normalizedQuery = query.toLowerCase().trim();

  const filteredCategories = categories
    .map((category) => {
      // If category name matches, show all its tools
      if (category.label.toLowerCase().includes(normalizedQuery)) {
        return category;
      }
      // Otherwise filter individual tools
      const matchingTools = category.tools.filter((tool) =>
        tool.label.toLowerCase().includes(normalizedQuery),
      );
      if (matchingTools.length === 0) return null;
      return { ...category, tools: matchingTools };
    })
    .filter((c): c is NavCategory => c !== null);

  return {
    filteredCategories,
    hasResults: filteredCategories.length > 0,
  };
}
```

#### Worker Lifecycle and Error Recovery (Req 1.4, 1.6, 10.4, 10.7, 11.5)

```typescript
/**
 * OCR Worker lifecycle management.
 *
 * Initialization:
 * 1. Create Web Worker from ocr-worker.ts
 * 2. Send 'init' message with language codes and CDN path for lang data
 * 3. Worker downloads Tesseract core + language packs
 * 4. Worker reports progress via 'initProgress' messages
 * 5. On success: 'initComplete' → engine ready
 * 6. On failure: 'initError' → retry once after 2s (Req 1.4)
 *    If retry fails → report error to user (Req 1.6)
 *
 * Processing:
 * 1. For each page: send 'recognize' with ImageBitmap (transferable)
 * 2. Set 30-second timeout per page (Req 10.7)
 * 3. On timeout: terminate worker, report partial results
 * 4. On page error: skip page, continue (Req 10.6)
 *
 * Cleanup:
 * - On tab close/navigate: terminate worker (Req 10.4)
 * - Register beforeunload listener to call destroy()
 * - On cancel: let current page finish, then stop (Req 5.5)
 *
 * Memory pressure (Req 11.5):
 * - Monitor performance.memory (Chrome) or catch OOM errors
 * - On pressure: pause, release buffers, offer reduced resolution option
 */
```

#### Multi-Language Loading Strategy (Req 4.1–4.8)

```typescript
/**
 * Language pack management.
 *
 * Supported languages (Req 4.1):
 * - eng (English) — default
 * - spa (Spanish)
 * - fra (French)
 * - deu (German)
 * - por (Portuguese)
 * - ita (Italian)
 * - nld (Dutch)
 * - chi_sim (Chinese Simplified)
 *
 * Loading strategy:
 * 1. Check if language already loaded in current session (Req 1.5)
 * 2. If not loaded: download from CDN (tessdata_fast for smaller files)
 * 3. Show download progress indicator (Req 4.4)
 * 4. Timeout: 30 seconds per language pack (Req 4.7)
 * 5. Multi-language: load up to 3 packs before processing (Req 4.5)
 *    Tesseract.js supports multi-language via "eng+fra+deu" syntax
 *
 * Persistence:
 * - Selected language stored in localStorage (Req 4.6)
 * - Language packs NOT cached in localStorage (too large)
 * - Rely on browser HTTP cache for repeat downloads
 * - If localStorage unavailable: continue without persistence (Req 4.8)
 */
const LANGUAGE_OPTIONS = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'por', label: 'Portuguese' },
  { code: 'ita', label: 'Italian' },
  { code: 'nld', label: 'Dutch' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
] as const;

const LANGUAGE_STORAGE_KEY = 'pdf-editor-ocr-language';
const MAX_LANGUAGES = 3;
const LANGUAGE_DOWNLOAD_TIMEOUT_MS = 30_000;
```

### File Structure Summary

```
src/
├── core/
│   └── ocr-engine/
│       ├── index.ts              # Public exports (OcrEngine, types)
│       ├── ocr-engine.ts         # Singleton coordinator class
│       ├── ocr-worker.ts         # Web Worker (Tesseract.js operations)
│       ├── page-detector.ts      # Scanned page detection logic
│       ├── searchable-pdf.ts     # Text layer generation via pdf-lib
│       └── types.ts              # OCR-specific type definitions
│
├── features/
│   ├── ocr/
│   │   ├── components/
│   │   │   ├── OcrPage.tsx           # Main OCR feature page
│   │   │   ├── OcrProgressPanel.tsx  # Progress display with ETA
│   │   │   ├── OcrResultsPanel.tsx   # Results display with confidence
│   │   │   ├── LanguageSelector.tsx  # Multi-language selection control
│   │   │   └── PageSelector.tsx      # Page range selection for OCR
│   │   ├── store/
│   │   │   └── ocr-store.ts         # Zustand store for OCR state
│   │   └── hooks/
│   │       └── useOcrIntegration.ts  # Hook for extract-text/redact integration
│   │
│   ├── letterhead/
│   │   ├── components/
│   │   │   ├── LetterheadPage.tsx        # Main letterhead feature page
│   │   │   ├── LetterheadEditor.tsx      # WYSIWYG editor component
│   │   │   ├── LetterheadPreview.tsx     # Canvas preview component
│   │   │   ├── LetterheadTemplateList.tsx # Template list with CRUD
│   │   │   └── LetterheadApplyModal.tsx  # Apply confirmation dialog
│   │   ├── store/
│   │   │   └── letterhead-store.ts       # Zustand store
│   │   ├── utils/
│   │   │   └── letterhead-renderer.ts    # pdf-lib rendering logic
│   │   └── types.ts                      # Letterhead type definitions
│   │
│   └── navigation/
│       ├── CategorizedNavBar.tsx      # New navigation component
│       ├── NavFilterInput.tsx         # Filter input component
│       ├── NavContextMenu.tsx         # Pin/unpin context menu
│       ├── NavCategoryGroup.tsx       # Collapsible category section
│       ├── NavToolLink.tsx            # Individual tool link with icon
│       ├── categories.ts             # Category definitions + icon mappings
│       ├── icons.tsx                  # Inline SVG icon components
│       └── store/
│           └── nav-store.ts          # Navigation state store
│
└── components/ui/
    └── NavBar.tsx                     # Deprecated (replaced by CategorizedNavBar)
```

### New Dependencies

```json
{
  "dependencies": {
    "tesseract.js": "^5.1.0"
  }
}
```

Tesseract.js is the only new runtime dependency. It includes:

- Core WASM recognition engine (~2.5 MB, loaded lazily)
- Language data files (~1-15 MB each, loaded on demand from CDN)
- Worker wrapper for Web Worker execution

No other new dependencies are required. The existing stack (pdf-lib, pdfjs-dist, Zustand, React, Tailwind) covers all other needs.

### New Routes

```typescript
// Added to src/app/router.tsx
<Route path="/ocr" element={<OcrPage />} />
<Route path="/letterhead" element={<LetterheadPage />} />
```

### Performance Budgets

| Operation                 | Target    | Constraint                   | Requirement |
| ------------------------- | --------- | ---------------------------- | ----------- |
| Engine initialization     | < 10s     | Standard broadband (10 Mbps) | Req 1.1     |
| Page detection (50 pages) | < 5s      | Mid-range CPU                | Req 2.4     |
| Single page OCR           | < 15s     | Mid-range CPU, 300 DPI       | Req 11.1    |
| Peak memory per page      | < 500 MB  | Single page processing       | Req 11.2    |
| Searchable PDF (50 pages) | < 30s     | Mid-range CPU                | Req 6.8     |
| Main thread blocking      | < 50ms    | During OCR processing        | Req 10.2    |
| Letterhead preview update | < 200ms   | After field change           | Req 13.7    |
| Nav filter response       | < 100ms   | Per keystroke                | Req 14.4    |
| Max document size         | 200 pages | 8 GB RAM device              | Req 11.6    |

## Error Handling

### OCR Engine Errors

- **Language pack download failure**: Retry once after 2s delay. If retry fails, show error toast with "Check your connection and try again" message. Allow manual retry. (Req 1.4)
- **Tesseract.js core load failure**: Display error message, allow retry initialization. (Req 1.6)
- **Page render failure**: Skip page, record failure with page number and error description, continue processing remaining pages. (Req 3.5)
- **Worker crash/timeout (30s)**: Terminate worker, notify user, report which pages succeeded before failure. (Req 10.7)
- **Out-of-memory**: Pause processing, release buffers, offer reduced resolution (150 DPI) or cancel. (Req 11.5)
- **All pages fail**: Report zero success, total failures with per-page details, no average confidence. (Req 3.7)

### Letterhead Errors

- **Invalid logo format/size**: Reject upload immediately, show inline error with accepted formats and 5MB limit. (Req 12.4)
- **localStorage quota exceeded**: Show error toast suggesting deletion of unused templates. (Req 12.13)
- **pdf-lib rendering failure**: Show error toast with page number where failure occurred, do not produce partial output. (Req 6.7)

### Navigation Errors

- **localStorage unavailable**: Continue with defaults, no persistence for session. (Req 4.8)
- **Favorites at max (8)**: Show inline message, do not add tool. (Req 14.7)

## Correctness Properties

### Property 1: OCR Text Format Consistency

OCR output matches the same plain text format as `PdfjsRenderEngine.extractText()` — line breaks between lines, blank lines between paragraphs.

**Validates: Requirements 3.3**

### Property 2: Bounding Box Coordinate System

All word bounding boxes are in pixels relative to the 300 DPI rendered image (x, y, width, height). Conversion to PDF points uses scale factor `72/300 = 0.24`.

**Validates: Requirements 3.2**

### Property 3: Searchable PDF Text Positioning

Each word positioned within 2 pixels of its detected location. Text rendered with renderingMode=3 (invisible).

**Validates: Requirements 6.2, 6.3**

### Property 4: Sequential Processing Invariant

Only one page is rendered/processed at a time. Previous page's image data is released before next page begins.

**Validates: Requirements 3.4, 10.3**

### Property 5: Letterhead Overlay-Only

Applying letterhead never modifies existing page content — only adds new drawing operations on top.

**Validates: Requirements 12.8**

### Property 6: Navigation State Persistence

Favorites, recent tools, category collapse state, and sidebar collapse state survive page reloads via localStorage.

**Validates: Requirements 14.6, 14.7, 14.9, 14.11**

### Property 7: Progress Accuracy

Progress percentage = floor(pagesCompleted / totalPages \* 100). ETA only shown after 2+ pages complete.

**Validates: Requirements 5.1, 5.3**

## Testing Strategy

### Unit Tests

- **OCR Engine**: Test page detection logic (threshold of 10 chars), progress calculation, ETA formatting, coordinate scaling (300 DPI → PDF points)
- **Letterhead Store**: Test CRUD operations, max template limit (20), localStorage persistence, quota error handling
- **Navigation Store**: Test favorites (max 8), recent tools (max 5, deduplication), category toggle persistence, filter logic
- **Navigation Filter**: Test case-insensitive matching, category name matching, empty results state, clearing filter

### Integration Tests

- **OCR → Extract Text**: Verify OCR prompt appears when scanned pages detected, combined text output in correct page order
- **OCR → Redact**: Verify word selection via bounding boxes, redaction removes text from results
- **Letterhead → PDF**: Verify pdf-lib overlay produces valid PDF, logo and text positioned correctly
- **Navigation → Router**: Verify recent tools update on navigation, active link indicator matches current route

### Component Tests

- **OcrProgressPanel**: Renders progress bar, page counter, ETA, cancel button; updates on state changes
- **LanguageSelector**: Multi-select up to 3, persists selection, shows download progress
- **LetterheadEditor**: Live preview updates within 200ms, validates input lengths, handles logo upload
- **CategorizedNavBar**: Categories collapse/expand, filter hides non-matching tools, favorites section shows pinned tools
- **NavContextMenu**: Opens on right-click/long-press, pins/unpins correctly, dismisses on outside click
