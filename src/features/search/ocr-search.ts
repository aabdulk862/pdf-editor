import type { OcrPageResult, OcrProcessingResult, OcrWord } from '../../core/ocr-engine/types';

/**
 * A search match found in OCR-recognized text, including the word's bounding box
 * for visual highlighting on the page.
 */
export interface OcrSearchMatch {
  /** The page number where the match was found */
  pageNumber: number;
  /** The matched OCR word */
  word: OcrWord;
  /** Index of the word within the page's words array */
  wordIndex: number;
}

/**
 * A search match found in native (non-OCR) extracted text.
 */
export interface NativeSearchMatch {
  /** The page number where the match was found */
  pageNumber: number;
  /** The matched text snippet */
  text: string;
  /** Character offset within the page's text where the match starts */
  startOffset: number;
  /** Character offset within the page's text where the match ends */
  endOffset: number;
}

/**
 * Combined search results from both native text and OCR text.
 */
export interface SearchResults {
  /** Matches found in native extracted text */
  nativeMatches: NativeSearchMatch[];
  /** Matches found in OCR-recognized text (with bounding boxes) */
  ocrMatches: OcrSearchMatch[];
  /** Total number of matches across both sources */
  totalMatches: number;
  /** The query that was searched */
  query: string;
}

/**
 * Search OCR-recognized text for a query string.
 * Performs case-insensitive matching against individual OCR words.
 *
 * @param ocrResults - The OCR processing results containing recognized words
 * @param query - The search query string
 * @returns Array of OcrSearchMatch objects with bounding box data for highlighting
 */
export function searchOcrText(
  ocrResults: OcrProcessingResult | null,
  query: string,
): OcrSearchMatch[] {
  if (!ocrResults || !query.trim()) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matches: OcrSearchMatch[] = [];

  for (const page of ocrResults.pages) {
    const pageMatches = searchOcrPage(page, normalizedQuery);
    matches.push(...pageMatches);
  }

  return matches;
}

/**
 * Search a single OCR page's words for matches against the query.
 * Matches words that contain the query as a substring (case-insensitive).
 *
 * @param page - The OCR page result containing words with bounding boxes
 * @param normalizedQuery - The lowercase, trimmed search query
 * @returns Array of matches for this page
 */
export function searchOcrPage(page: OcrPageResult, normalizedQuery: string): OcrSearchMatch[] {
  const matches: OcrSearchMatch[] = [];

  for (let i = 0; i < page.words.length; i++) {
    const word = page.words[i];
    if (word.text.toLowerCase().includes(normalizedQuery)) {
      matches.push({
        pageNumber: page.pageNumber,
        word,
        wordIndex: i,
      });
    }
  }

  return matches;
}

/**
 * Search native extracted text for a query string.
 * Performs case-insensitive substring matching within each page's text.
 *
 * @param nativeTexts - Array of extracted text per page (index 0 = page 1)
 * @param query - The search query string
 * @returns Array of NativeSearchMatch objects
 */
export function searchNativeText(nativeTexts: string[], query: string): NativeSearchMatch[] {
  if (!query.trim() || nativeTexts.length === 0) {
    return [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matches: NativeSearchMatch[] = [];

  for (let i = 0; i < nativeTexts.length; i++) {
    const pageText = nativeTexts[i];
    if (!pageText) continue;

    const lowerText = pageText.toLowerCase();
    let startIndex = 0;

    while (startIndex < lowerText.length) {
      const foundIndex = lowerText.indexOf(normalizedQuery, startIndex);
      if (foundIndex === -1) break;

      matches.push({
        pageNumber: i + 1,
        text: pageText.slice(foundIndex, foundIndex + normalizedQuery.length),
        startOffset: foundIndex,
        endOffset: foundIndex + normalizedQuery.length,
      });

      startIndex = foundIndex + 1;
    }
  }

  return matches;
}

/**
 * Perform a combined search across both native extracted text and OCR-recognized text.
 * This is the main search function that integrates OCR results with the search feature.
 *
 * Requirements: 8.1, 8.2
 *
 * @param nativeTexts - Array of extracted text per page (index 0 = page 1)
 * @param ocrResults - OCR processing results (null if OCR hasn't been run)
 * @param query - The search query string
 * @returns Combined search results from both sources
 */
export function searchDocument(
  nativeTexts: string[],
  ocrResults: OcrProcessingResult | null,
  query: string,
): SearchResults {
  if (!query.trim()) {
    return { nativeMatches: [], ocrMatches: [], totalMatches: 0, query };
  }

  const nativeMatches = searchNativeText(nativeTexts, query);
  const ocrMatches = searchOcrText(ocrResults, query);

  return {
    nativeMatches,
    ocrMatches,
    totalMatches: nativeMatches.length + ocrMatches.length,
    query,
  };
}

/**
 * Check whether a document has unprocessed scanned pages.
 * Used to determine if the OCR suggestion notification should be shown.
 *
 * Requirements: 8.4
 *
 * @param scannedPages - Page numbers detected as scanned
 * @param ocrResults - OCR processing results (null if OCR hasn't been run)
 * @returns true if there are scanned pages without OCR results
 */
export function hasUnprocessedScannedPages(
  scannedPages: number[],
  ocrResults: OcrProcessingResult | null,
): boolean {
  if (scannedPages.length === 0) {
    return false;
  }

  if (!ocrResults) {
    return true;
  }

  // Check if all scanned pages have been processed
  const processedPageNumbers = new Set(ocrResults.pages.map((p) => p.pageNumber));
  return scannedPages.some((pageNum) => !processedPageNumbers.has(pageNum));
}
