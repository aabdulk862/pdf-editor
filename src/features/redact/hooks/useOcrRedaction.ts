import { useCallback, useState } from 'react';

import { useOcrStore } from '@/features/ocr/store/ocr-store';
import type { OcrWord, OcrPageResult } from '@/core/ocr-engine/types';

/**
 * A word selected for redaction, with its page context.
 */
export interface SelectedWord {
  word: OcrWord;
  pageNumber: number;
  /** Index in the OcrPageResult.words array for removal on confirm */
  wordIndex: number;
}

/**
 * Hook that manages OCR word selection state for the redact feature.
 *
 * Provides:
 * - Word-level selection via click (single word) and drag (word range)
 * - Deselection by clicking already-selected words
 * - Access to OCR results for the current page
 * - Confirmation action that returns selected words for redaction
 *
 * Requirements: 9.1, 9.2
 */
export function useOcrRedaction() {
  const results = useOcrStore((s) => s.results);
  const scannedPages = useOcrStore((s) => s.scannedPages);
  const engineStatus = useOcrStore((s) => s.engineStatus);

  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);

  /**
   * Get OCR results for a specific page number.
   */
  const getPageOcrResult = useCallback(
    (pageNumber: number): OcrPageResult | null => {
      if (!results) return null;
      return results.pages.find((p) => p.pageNumber === pageNumber) ?? null;
    },
    [results],
  );

  /**
   * Check if a page has OCR results available.
   */
  const hasOcrResults = useCallback(
    (pageNumber: number): boolean => {
      return getPageOcrResult(pageNumber) !== null;
    },
    [getPageOcrResult],
  );

  /**
   * Check if a page is a scanned page that hasn't been OCR-processed yet.
   */
  const isUnprocessedScannedPage = useCallback(
    (pageNumber: number): boolean => {
      return scannedPages.includes(pageNumber) && !hasOcrResults(pageNumber);
    },
    [scannedPages, hasOcrResults],
  );

  /**
   * Toggle selection of a single word. If already selected, deselect it.
   */
  const toggleWordSelection = useCallback(
    (word: OcrWord, pageNumber: number, wordIndex: number) => {
      setSelectedWords((prev) => {
        const existingIndex = prev.findIndex(
          (sw) => sw.pageNumber === pageNumber && sw.wordIndex === wordIndex,
        );

        if (existingIndex >= 0) {
          // Deselect
          return prev.filter((_, i) => i !== existingIndex);
        }

        // Select
        return [...prev, { word, pageNumber, wordIndex }];
      });
    },
    [],
  );

  /**
   * Select a range of words on a page (for drag selection).
   * Adds all words in the range that aren't already selected.
   */
  const selectWordRange = useCallback(
    (words: OcrWord[], pageNumber: number, startIndex: number, endIndex: number) => {
      const minIdx = Math.min(startIndex, endIndex);
      const maxIdx = Math.max(startIndex, endIndex);

      setSelectedWords((prev) => {
        const newSelections: SelectedWord[] = [];

        for (let i = minIdx; i <= maxIdx; i++) {
          const alreadySelected = prev.some(
            (sw) => sw.pageNumber === pageNumber && sw.wordIndex === i,
          );
          if (!alreadySelected && words[i]) {
            newSelections.push({
              word: words[i],
              pageNumber,
              wordIndex: i,
            });
          }
        }

        return [...prev, ...newSelections];
      });
    },
    [],
  );

  /**
   * Clear all selected words.
   */
  const clearSelection = useCallback(() => {
    setSelectedWords([]);
  }, []);

  /**
   * Get selected words for a specific page.
   */
  const getSelectedWordsForPage = useCallback(
    (pageNumber: number): SelectedWord[] => {
      return selectedWords.filter((sw) => sw.pageNumber === pageNumber);
    },
    [selectedWords],
  );

  /**
   * Check if a specific word is selected.
   */
  const isWordSelected = useCallback(
    (pageNumber: number, wordIndex: number): boolean => {
      return selectedWords.some((sw) => sw.pageNumber === pageNumber && sw.wordIndex === wordIndex);
    },
    [selectedWords],
  );

  return {
    // State
    selectedWords,
    hasOcrProcessed: engineStatus === 'ready' && results !== null,
    scannedPages,

    // Queries
    getPageOcrResult,
    hasOcrResults,
    isUnprocessedScannedPage,
    getSelectedWordsForPage,
    isWordSelected,

    // Actions
    toggleWordSelection,
    selectWordRange,
    clearSelection,
  };
}
