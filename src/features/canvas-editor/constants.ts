// === Unit Conversion ===

/** Conversion factor from millimeters to pixels at 96 DPI */
export const MM_TO_PX = 96 / 25.4;

// === Zoom ===

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4.0;
export const ZOOM_STEP = 0.05;

// === Page Dimensions (mm) ===

export const PAGE_DIMENSION_MIN = 10;
export const PAGE_DIMENSION_MAX = 5000;

// Default page size: A4
export const DEFAULT_PAGE_WIDTH = 210; // mm
export const DEFAULT_PAGE_HEIGHT = 297; // mm

// === Font ===

export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 144;

// === Shapes ===

export const POLYGON_SIDES_MIN = 3;
export const POLYGON_SIDES_MAX = 12;
export const STROKE_WIDTH_MIN = 0;
export const STROKE_WIDTH_MAX = 50;

// === Grid & Snap ===

export const GRID_SPACING_MIN = 5;
export const GRID_SPACING_MAX = 100;
export const SNAP_THRESHOLD = 5; // px

// === Document Limits ===

export const MAX_PAGES = 100;
export const MAX_TEXT_CHARS = 10000;
export const MAX_HISTORY = 50;
export const MAX_SAVED_COLORS = 32;

// === Text ===

export const DEFAULT_TEXT_WIDTH = 200; // px

// === Auto-Save ===

export const AUTO_SAVE_INTERVAL = 30000; // ms (30 seconds)

// === Recent Files ===

export const MAX_RECENT_FILES = 20;

// === Mobile / Performance ===

export const MAX_MOBILE_CANVAS_DIMENSION = 4096; // px

// === Thumbnails ===

export const MAX_THUMBNAIL_SIZE = 10240; // bytes (10KB)
