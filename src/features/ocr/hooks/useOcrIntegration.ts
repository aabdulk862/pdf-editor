import { useCallback, useMemo } from 'react';

import { useOcrStore } from '../store/ocr-store';
import type { OcrProcessingResult } from '../../../core/ocr-engine/types';

/**
 * Result of merging native text with OCR text in page order.
 */
export interface MergedTextResult {
  /** Combined text from all pages using "--- Page Break ---" delimiter */
  text: string;
  /** Page numbers that used OCR */
  ocrPageNumbers: number[];
  /** Page numbers that failed OCR */
  failedPageNumbers: number[];
  /** Average confidence across OCR pages (null if none succeeded) */
  averageConfidence: number | null;
}

/**
 * Merge native extracted text with OCR results in page order.
 *
 * For each page in the document:
 * - If the page has native text (non-empty), use native text
 * - If the page is scanned and OCR succeeded, use OCR text
 * - If the page is scanned and OCR failed, use placeholder
 *
 * @param nativeTexts - Array of extracted text per page (index 0 = page 1)
 * @param ocrResults - OCR processing results (may be null if not run)
 * @param scannedPages - Page numbers detected as scanned
 * @returns Merged text result with metadata
 */
export function mergeNativeAndOcrText(
  nativeTexts: string[],
  ocrResults: OcrProcessingResult | null,
  scannedPages: number[],
): MergedTextResult {
  const totalPages = nativeTexts.length;
  const scannedSet = new Set(scannedPages);
  const ocrPageNumbers: number[] = [];
  const failedPageNumbers: number[] = [];

  // Build a map of OCR results by page number for quick lookup
  const ocrResultsByPage = new Map<number, string>();
  if (ocrResults) {
    for (const page of ocrResults.pages) {
      ocrResultsByPage.set(page.pageNumber, page.text);
    }
    for (const failure of ocrResults.failedPages) {
      failedPageNumbers.push(failure.pageNumber);
    }
  }

  const pageTexts: string[] = [];

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    const nativeText = nativeTexts[i] || '';

    if (scannedSet.has(pageNum)) {
      // This is a scanned page — use OCR text if available
      const ocrText = ocrResultsByPage.get(pageNum);
      if (ocrText !== undefined) {
        pageTexts.push(ocrText);
        ocrPageNumbers.push(pageNum);
      } else {
        // OCR failed or wasn't run for this page
        pageTexts.push(`[Page ${pageNum}: OCR recognition failed]`);
        if (!failedPageNumbers.includes(pageNum)) {
          failedPageNumbers.push(pageNum);
        }
      }
    } else {
      // Text page — use native text
      pageTexts.push(nativeText);
    }
  }

  // Calculate average confidence from OCR results
  let averageConfidence: number | null = null;
  if (ocrResults && ocrResults.averageConfidence !== null) {
    averageConfidence = Math.round(ocrResults.averageConfidence);
  }

  const text = pageTexts.join('\n\n--- Page Break ---\n\n');

  return {
    text,
    ocrPageNumbers,
    failedPageNumbers,
    averageConfidence,
  };
}

/**
 * Hook that exposes OCR state and actions for use by extract-text and redact features.
 *
 * Wraps useOcrStore and provides a simpler API for consuming features:
 * - initializeOcr: Initialize the OCR engine with selected languages
 * - processPages: Process specific pages through OCR
 * - ocrResults: The OCR processing results
 * - isProcessing: Whether OCR is currently processing
 * - progress: Current processing progress
 * - mergeTexts: Helper to merge native + OCR text in page order
 *
 * Requirements: 7.1
 */
export function useOcrIntegration() {
  const engineStatus = useOcrStore((s) => s.engineStatus);
  const engineError = useOcrStore((s) => s.engineError);
  const initProgress = useOcrStore((s) => s.initProgress);
  const selectedLanguages = useOcrStore((s) => s.selectedLanguages);
  const scannedPages = useOcrStore((s) => s.scannedPages);
  const progress = useOcrStore((s) => s.progress);
  const results = useOcrStore((s) => s.results);
  const isCancelled = useOcrStore((s) => s.isCancelled);

  const storeInitialize = useOcrStore((s) => s.initialize);
  const storeProcessPages = useOcrStore((s) => s.processPages);
  const storeCancel = useOcrStore((s) => s.cancel);
  const storeReset = useOcrStore((s) => s.reset);

  const isProcessing = engineStatus === 'processing';
  const isInitializing = engineStatus === 'initializing';
  const isReady = engineStatus === 'ready';

  /**
   * Initialize the OCR engine with the currently selected languages.
   */
  const initializeOcr = useCallback(async () => {
    await storeInitialize(selectedLanguages);
  }, [storeInitialize, selectedLanguages]);

  /**
   * Process the given pages through OCR.
   * Assumes the engine is already initialized.
   */
  const processPages = useCallback(
    async (pdfData: ArrayBuffer, pages: number[]) => {
      await storeProcessPages(pdfData, pages);
    },
    [storeProcessPages],
  );

  /**
   * Helper to merge native text with OCR results in page order.
   * Uses the current store's results and scannedPages.
   */
  const mergeTexts = useCallback(
    (nativeTexts: string[]): MergedTextResult => {
      return mergeNativeAndOcrText(nativeTexts, results, scannedPages);
    },
    [results, scannedPages],
  );

  return useMemo(
    () => ({
      // State
      engineStatus,
      engineError,
      initProgress,
      isProcessing,
      isInitializing,
      isReady,
      isCancelled,
      progress,
      ocrResults: results,
      scannedPages,

      // Actions
      initializeOcr,
      processPages,
      cancel: storeCancel,
      reset: storeReset,

      // Helpers
      mergeTexts,
    }),
    [
      engineStatus,
      engineError,
      initProgress,
      isProcessing,
      isInitializing,
      isReady,
      isCancelled,
      progress,
      results,
      scannedPages,
      initializeOcr,
      processPages,
      storeCancel,
      storeReset,
      mergeTexts,
    ],
  );
}
