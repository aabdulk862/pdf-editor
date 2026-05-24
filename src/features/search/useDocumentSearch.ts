import { useCallback, useMemo, useRef, useState } from 'react';

import { useOcrStore } from '../ocr/store/ocr-store';
import { useToastStore } from '../../store/toast';
import { searchDocument, hasUnprocessedScannedPages, type SearchResults } from './ocr-search';

/**
 * Hook that provides document search functionality integrated with OCR results.
 *
 * Searches both native extracted text and OCR-recognized text when available.
 * Shows a suggestion notification when the document has unprocessed scanned pages.
 *
 * Requirements: 8.1, 8.2, 8.4
 *
 * @param nativeTexts - Array of extracted text per page (index 0 = page 1)
 * @returns Search state and actions
 */
export function useDocumentSearch(nativeTexts: string[]) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Track whether we've already shown the OCR suggestion toast to avoid repeats
  const hasShownSuggestionRef = useRef(false);

  // Read OCR state from the store
  const ocrResults = useOcrStore((s) => s.results);
  const scannedPages = useOcrStore((s) => s.scannedPages);

  const addToast = useToastStore((s) => s.addToast);

  /**
   * Perform a search across native text and OCR results.
   * Shows a suggestion toast if there are unprocessed scanned pages.
   *
   * Requirements: 8.1, 8.2, 8.4
   */
  const search = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      if (!searchQuery.trim()) {
        setResults(null);
        setActiveMatchIndex(0);
        return;
      }

      // Search both native and OCR text (Req 8.1, 8.2)
      const searchResults = searchDocument(nativeTexts, ocrResults, searchQuery);
      setResults(searchResults);
      setActiveMatchIndex(0);

      // Show suggestion notification for unprocessed scanned pages (Req 8.4)
      if (!hasShownSuggestionRef.current && hasUnprocessedScannedPages(scannedPages, ocrResults)) {
        addToast('Some pages are scanned. Run OCR to search all content.', 'info', 7000);
        hasShownSuggestionRef.current = true;
      }
    },
    [nativeTexts, ocrResults, scannedPages, addToast],
  );

  /**
   * Navigate to the next search match.
   */
  const nextMatch = useCallback(() => {
    if (!results || results.totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % results.totalMatches);
  }, [results]);

  /**
   * Navigate to the previous search match.
   */
  const previousMatch = useCallback(() => {
    if (!results || results.totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + results.totalMatches) % results.totalMatches);
  }, [results]);

  /**
   * Clear the search state.
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setActiveMatchIndex(0);
  }, []);

  /**
   * Reset the suggestion toast flag (e.g., when a new document is loaded).
   */
  const resetSuggestion = useCallback(() => {
    hasShownSuggestionRef.current = false;
  }, []);

  /**
   * Get OCR matches for a specific page (for rendering highlights).
   */
  const getOcrMatchesForPage = useCallback(
    (pageNumber: number) => {
      if (!results) return [];
      return results.ocrMatches.filter((m) => m.pageNumber === pageNumber);
    },
    [results],
  );

  return useMemo(
    () => ({
      // State
      query,
      results,
      activeMatchIndex,
      hasResults: results !== null && results.totalMatches > 0,
      totalMatches: results?.totalMatches ?? 0,

      // Actions
      search,
      nextMatch,
      previousMatch,
      clearSearch,
      resetSuggestion,

      // Helpers
      getOcrMatchesForPage,
    }),
    [
      query,
      results,
      activeMatchIndex,
      search,
      nextMatch,
      previousMatch,
      clearSearch,
      resetSuggestion,
      getOcrMatchesForPage,
    ],
  );
}
