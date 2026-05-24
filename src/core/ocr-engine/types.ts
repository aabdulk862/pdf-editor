/** Bounding box for a recognized word, in pixels relative to 300 DPI rendered image */
export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single recognized word with position and confidence */
export interface OcrWord {
  text: string;
  bbox: OcrBoundingBox;
  /** Confidence score from 0 to 100 */
  confidence: number;
}

/** A line of recognized text composed of words */
export interface OcrLine {
  text: string;
  words: OcrWord[];
  bbox: OcrBoundingBox;
  /** Confidence score from 0 to 100 */
  confidence: number;
}

/** OCR result for a single page */
export interface OcrPageResult {
  pageNumber: number;
  /** Full text with line breaks separating lines and blank lines separating paragraphs */
  text: string;
  lines: OcrLine[];
  words: OcrWord[];
  /** Average confidence for the page (0-100) */
  confidence: number;
  /** Time taken to process this page in milliseconds */
  processingTimeMs: number;
}

/** Summary of OCR processing across all pages */
export interface OcrProcessingResult {
  pages: OcrPageResult[];
  failedPages: OcrPageFailure[];
  totalPagesProcessed: number;
  totalPagesFailed: number;
  /** Average confidence across all recognized text, null if all pages failed */
  averageConfidence: number | null;
  /** Total time for all OCR processing in milliseconds */
  totalProcessingTimeMs: number;
}

/** Record of a page that failed OCR processing */
export interface OcrPageFailure {
  pageNumber: number;
  error: string;
}

/** Progress information during OCR processing */
export interface OcrProgress {
  currentPage: number;
  totalPages: number;
  /** Percentage complete as an integer from 0 to 100 */
  percentComplete: number;
  /** Estimated time remaining in milliseconds, null until 2 pages have been processed */
  estimatedTimeRemainingMs: number | null;
  /** Processing time in ms for each completed page, used for ETA calculation */
  pageTimings: number[];
}

// --- Worker Message Protocol ---

/** Messages sent from the main thread to the OCR worker */
export type WorkerInMessage =
  | { type: 'init'; languages: string[]; langDataPath: string }
  | { type: 'recognize'; pageNumber: number; imageData: ImageBitmap }
  | { type: 'terminate' };

/** Messages sent from the OCR worker back to the main thread */
export type WorkerOutMessage =
  | { type: 'initProgress'; percent: number }
  | { type: 'initComplete' }
  | { type: 'initError'; error: string }
  | { type: 'recognizeComplete'; pageNumber: number; result: OcrPageResult }
  | { type: 'recognizeError'; pageNumber: number; error: string }
  | { type: 'terminated' };
