// Barrel export for ocr-engine module

export { OcrEngine } from './ocr-engine';
export { detectScannedPages } from './page-detector';
export { generateSearchablePdf, generateOutputFilename } from './searchable-pdf';
export type {
  OcrBoundingBox,
  OcrWord,
  OcrLine,
  OcrPageResult,
  OcrProcessingResult,
  OcrPageFailure,
  OcrProgress,
  WorkerInMessage,
  WorkerOutMessage,
} from './types';
