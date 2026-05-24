import { create } from 'zustand';

import { OcrEngine, detectScannedPages } from '../../../core/ocr-engine';
import type { OcrProgress, OcrProcessingResult } from '../../../core/ocr-engine/types';
import type { OcrEngineStatus, OcrStoreState } from '../types';

const LANGUAGES_STORAGE_KEY = 'pdf-editor-ocr-languages';

/**
 * Load persisted language selection from localStorage.
 * Falls back to ['eng'] if unavailable or invalid.
 */
function loadPersistedLanguages(): string[] {
  try {
    const stored = localStorage.getItem(LANGUAGES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((l) => typeof l === 'string')
      ) {
        return parsed.slice(0, 3); // max 3 languages
      }
    }
  } catch {
    // localStorage unavailable or parse error — use default
  }
  return ['eng'];
}

export const useOcrStore = create<OcrStoreState>((set, get) => ({
  // Engine state
  engineStatus: 'idle' as OcrEngineStatus,
  engineError: null,
  initProgress: null,

  // Language — load persisted selection on store creation
  selectedLanguages: loadPersistedLanguages(),
  loadedLanguages: [],

  // Page detection
  scannedPages: [],
  textPages: [],
  detectionComplete: false,

  // Processing
  progress: null,
  results: null,
  isCancelled: false,

  // --- Actions ---

  /**
   * Initialize the OCR engine with the given languages.
   * Transitions engineStatus: idle → initializing → ready (or error).
   * Subscribes to initProgress events to update download progress.
   * (Req 1.1, 1.3, 1.6)
   */
  initialize: async (languages: string[]) => {
    const engine = OcrEngine.getInstance();

    set({
      engineStatus: 'initializing',
      engineError: null,
      initProgress: 0,
    });

    // Subscribe to initProgress events from the engine
    const unsubscribeProgress = engine.on('initProgress', (percent: number) => {
      set({ initProgress: percent });
    });

    try {
      await engine.initialize(languages);
      set({
        engineStatus: 'ready',
        initProgress: 100,
        loadedLanguages: [...languages],
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize OCR engine';
      set({
        engineStatus: 'error',
        engineError: errorMessage,
        initProgress: null,
      });
    } finally {
      unsubscribeProgress();
    }
  },

  /**
   * Detect which pages in the PDF are scanned (image-only) vs text-bearing.
   * Updates scannedPages, textPages, and detectionComplete state.
   * (Req 2.1, 2.3)
   */
  detectScannedPages: async (pdfData: ArrayBuffer) => {
    set({
      scannedPages: [],
      textPages: [],
      detectionComplete: false,
    });

    try {
      const result = await detectScannedPages(pdfData);
      set({
        scannedPages: result.scannedPages,
        textPages: result.textPages,
        detectionComplete: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect scanned pages';
      set({
        engineError: errorMessage,
        detectionComplete: true,
      });
    }
  },

  /**
   * Process selected pages through OCR recognition.
   * Subscribes to progress and pageComplete events, updates progress state,
   * and stores the final OcrProcessingResult.
   * (Req 3.1, 5.1)
   */
  processPages: async (pdfData: ArrayBuffer, pages: number[]) => {
    const engine = OcrEngine.getInstance();

    set({
      engineStatus: 'processing',
      progress: {
        currentPage: 0,
        totalPages: pages.length,
        percentComplete: 0,
        estimatedTimeRemainingMs: null,
        pageTimings: [],
      },
      results: null,
      isCancelled: false,
      engineError: null,
    });

    // Subscribe to progress events from the engine
    const unsubscribeProgress = engine.on('progress', (progress: OcrProgress) => {
      set({ progress });
    });

    try {
      const result: OcrProcessingResult = await engine.processPages(pdfData, pages);

      // Check if processing was cancelled
      const { isCancelled } = get();
      set({
        engineStatus: isCancelled ? 'ready' : 'ready',
        results: result,
        progress: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      set({
        engineStatus: 'error',
        engineError: errorMessage,
        progress: null,
      });
    } finally {
      unsubscribeProgress();
    }
  },

  /**
   * Cancel in-progress OCR processing.
   * Sets isCancelled flag and calls OcrEngine.cancel().
   * (Req 4.6, 5.5)
   */
  cancel: () => {
    const engine = OcrEngine.getInstance();
    set({ isCancelled: true });
    engine.cancel();
  },

  /**
   * Reset all processing state back to defaults.
   * Preserves selectedLanguages and loadedLanguages.
   */
  reset: () => {
    set({
      engineStatus: 'idle',
      engineError: null,
      initProgress: null,
      scannedPages: [],
      textPages: [],
      detectionComplete: false,
      progress: null,
      results: null,
      isCancelled: false,
    });
  },

  /**
   * Update selected languages and persist to localStorage.
   * (Req 4.6, 5.5)
   */
  setLanguages: (languages: string[]) => {
    const clamped = languages.slice(0, 3); // max 3 languages
    set({ selectedLanguages: clamped });
    try {
      localStorage.setItem(LANGUAGES_STORAGE_KEY, JSON.stringify(clamped));
    } catch {
      // localStorage unavailable or quota exceeded — continue without persisting (Req 4.8)
    }
  },
}));
