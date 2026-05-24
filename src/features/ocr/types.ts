import type { OcrProcessingResult, OcrProgress } from '../../core/ocr-engine/types';

/** OCR engine lifecycle status */
export type OcrEngineStatus = 'idle' | 'initializing' | 'ready' | 'processing' | 'error';

/** Language option for OCR recognition */
export interface LanguageOption {
  code: string;
  label: string;
}

/** Supported OCR languages with Tesseract.js language codes */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'por', label: 'Portuguese' },
  { code: 'ita', label: 'Italian' },
  { code: 'nld', label: 'Dutch' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
];

/** OCR Zustand store state and actions */
export interface OcrStoreState {
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
