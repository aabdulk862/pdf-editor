// === Document Structure ===

export interface CanvasDocument {
  id: string;
  name: string;
  pages: CanvasPage[];
  activePageIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasPage {
  id: string;
  width: number; // in mm (10-5000)
  height: number; // in mm (10-5000)
  backgroundColor: string; // hex color, default '#FFFFFF'
  elements: CanvasElement[];
}

// === Element Types (Discriminated Union) ===

export type CanvasElement = TextElement | ImageElement | ShapeElement | GroupElement;

export type ElementType = 'text' | 'image' | 'shape' | 'group';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // mm from page left
  y: number; // mm from page top
  width: number; // mm
  height: number; // mm
  rotation: number; // degrees (0-359)
  opacity: number; // 0-100
  zIndex: number;
  locked: boolean;
  visible: boolean;
  shadow?: ShadowConfig;
}

// === Text Element ===

export interface TextElement extends BaseElement {
  type: 'text';
  content: string; // up to 10,000 characters
  fontFamily: string;
  fontSize: number; // 8-144 pt
  fontColor: string; // hex
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: TextAlignment;
  runs?: TextRun[];
}

export interface TextRun {
  start: number; // character offset
  end: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

// === Image Element ===

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // object URL or data URI
  originalWidth: number; // original image px width
  originalHeight: number; // original image px height
  aspectRatioLocked: boolean;
  cropRect?: CropRect; // visible sub-region (normalized 0-1)
}

export interface CropRect {
  x: number; // 0-1 normalized
  y: number;
  width: number;
  height: number;
}

// === Shape Element ===

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fill: string; // hex or 'transparent'
  stroke: string; // hex
  strokeWidth: number; // 0-50 px
  borderStyle: BorderStyle;
  polygonSides?: number; // 3-12, only for polygon type
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'star' | 'polygon';

export type BorderStyle = 'solid' | 'dashed' | 'dotted';

// === Group Element ===

export interface GroupElement extends BaseElement {
  type: 'group';
  children: CanvasElement[]; // minimum 2 elements
}

// === Styling ===

export interface ShadowConfig {
  offsetX: number; // -50 to 50 px
  offsetY: number; // -50 to 50 px
  blur: number; // 0 to 100 px
  color: string; // hex with alpha (8-char hex)
}

// === Viewport ===

export interface Viewport {
  panX: number; // document-space offset
  panY: number;
  zoom: number; // 0.1 to 4.0 (10% to 400%)
}

// === Tools ===

export type CanvasTool =
  | 'select'
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'star'
  | 'polygon'
  | 'image'
  | 'crop'
  | 'pan';

// === Selection State ===

export interface SelectionState {
  selectedIds: string[];
  selectionBounds: BoundingBox | null;
  activeHandle: ResizeHandle | RotateHandle | null;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type RotateHandle = 'rotate';

// === Snap ===

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  guides: SnapGuide[];
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number; // in document coordinates
  sourceId: string; // element that caused the snap
}

// === Export ===

export interface ExportOptions {
  format: 'pdf' | 'png' | 'svg' | 'docx';
  pages: 'all' | number[]; // page indices
  dpi?: 72 | 150 | 300; // PNG only
  batch: boolean;
}

export interface ExportProgress {
  status: 'idle' | 'exporting' | 'complete' | 'error';
  currentPage: number;
  totalPages: number;
  error?: string;
}

// === Templates ===

export interface CanvasTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnail: string; // base64 or URL to preview image
  pages: CanvasPage[];
}

export type TemplateCategory =
  | 'blank'
  | 'invoice'
  | 'resume'
  | 'letter'
  | 'presentation'
  | 'letterhead';

// === Onboarding ===

export interface OnboardingStep {
  id: string;
  targetSelector: string; // CSS selector for spotlight target
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

// === Recent Files ===

export interface RecentFileEntry {
  id: string;
  name: string;
  lastOpened: number; // Unix timestamp
  type: 'canvas-design' | 'pdf-tool-operation';
  thumbnail: string; // base64 JPEG, max 10KB
  documentRef: string; // localStorage key for saved data
}

// === Auto-Save ===

export interface AutoSaveEntry {
  document: CanvasDocument;
  savedAt: number; // Unix timestamp
  documentId: string;
}

// === Loading States ===

export type LoadingContext =
  | { type: 'editor-init' }
  | { type: 'export'; currentPage: number; totalPages: number; format: string }
  | { type: 'image-upload'; targetPosition: { x: number; y: number } }
  | { type: 'template-load'; templateId: string; thumbnailSrc: string };

// === PWA / Service Worker ===

export interface ServiceWorkerMessage {
  type: 'NEW_VERSION_AVAILABLE' | 'CACHE_UPDATED' | 'SKIP_WAITING';
  payload?: unknown;
}
