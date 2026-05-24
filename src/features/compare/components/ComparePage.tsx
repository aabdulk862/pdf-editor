import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PdfjsRenderEngine } from '@/core/render-engine/renderer';
import type { RenderableDocument } from '@/core/render-engine/index';

/**
 * Represents the type of difference for a page.
 */
export type DiffType = 'added' | 'removed' | 'changed';

/**
 * Represents a single page difference between two PDFs.
 */
export interface PageDifference {
  pageNumber: number;
  type: DiffType;
}

/**
 * Summary of comparison results between two PDFs.
 */
export interface ComparisonResult {
  pagesAdded: number;
  pagesRemoved: number;
  pagesChanged: number;
  differences: PageDifference[];
}

/**
 * ComparePage component - Allows users to compare two PDF documents side by side
 * and see differences highlighted.
 *
 * Features:
 * - Dual file upload for two PDF documents
 * - Side-by-side synchronized page navigation
 * - Highlight differing pages with distinct border color
 * - Summary of differences (added/removed/changed)
 * - Previous/next difference navigation
 * - Toast if documents are identical
 *
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6
 */
export function ComparePage(): JSX.Element {
  const toast = useToast();
  const renderEngine = useRef(new PdfjsRenderEngine());

  // File state
  const [file1Data, setFile1Data] = useState<ArrayBuffer | null>(null);
  const [file1Name, setFile1Name] = useState<string>('');
  const [file2Data, setFile2Data] = useState<ArrayBuffer | null>(null);
  const [file2Name, setFile2Name] = useState<string>('');

  // Document state
  const [doc1, setDoc1] = useState<RenderableDocument | null>(null);
  const [doc2, setDoc2] = useState<RenderableDocument | null>(null);

  // Comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0);

  // View state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  // Canvas refs for rendering
  const canvas1Ref = useRef<HTMLDivElement>(null);
  const canvas2Ref = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(doc1?.pageCount ?? 0, doc2?.pageCount ?? 0);

  // Load document when file data changes
  useEffect(() => {
    let cancelled = false;
    async function loadDoc1() {
      if (!file1Data) {
        setDoc1(null);
        return;
      }
      try {
        const doc = await renderEngine.current.loadDocument(file1Data);
        if (!cancelled) setDoc1(doc);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load the first PDF. The file may be corrupted or invalid.');
          setDoc1(null);
        }
      }
    }
    loadDoc1();
    return () => {
      cancelled = true;
    };
  }, [file1Data, toast]);

  useEffect(() => {
    let cancelled = false;
    async function loadDoc2() {
      if (!file2Data) {
        setDoc2(null);
        return;
      }
      try {
        const doc = await renderEngine.current.loadDocument(file2Data);
        if (!cancelled) setDoc2(doc);
      } catch {
        if (!cancelled) {
          toast.error('Failed to load the second PDF. The file may be corrupted or invalid.');
          setDoc2(null);
        }
      }
    }
    loadDoc2();
    return () => {
      cancelled = true;
    };
  }, [file2Data, toast]);

  // Render pages when currentPage, zoom, or documents change
  useEffect(() => {
    let cancelled = false;

    async function renderPages() {
      // Render doc1 page
      if (doc1 && currentPage <= doc1.pageCount && canvas1Ref.current) {
        try {
          const canvas = await renderEngine.current.renderPage(doc1, currentPage, zoom);
          if (!cancelled && canvas1Ref.current) {
            canvas1Ref.current.innerHTML = '';
            canvas.className = 'max-w-full h-auto';
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `Document 1 page ${currentPage}`);
            canvas1Ref.current.appendChild(canvas);
          }
        } catch {
          if (!cancelled && canvas1Ref.current) {
            canvas1Ref.current.innerHTML =
              '<p class="text-sm text-error-500 p-4">Failed to render page</p>';
          }
        }
      } else if (canvas1Ref.current) {
        if (doc1 && currentPage > doc1.pageCount) {
          canvas1Ref.current.innerHTML =
            '<p class="text-sm text-secondary-400 p-4 text-center">No page (document has fewer pages)</p>';
        }
      }

      // Render doc2 page
      if (doc2 && currentPage <= doc2.pageCount && canvas2Ref.current) {
        try {
          const canvas = await renderEngine.current.renderPage(doc2, currentPage, zoom);
          if (!cancelled && canvas2Ref.current) {
            canvas2Ref.current.innerHTML = '';
            canvas.className = 'max-w-full h-auto';
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', `Document 2 page ${currentPage}`);
            canvas2Ref.current.appendChild(canvas);
          }
        } catch {
          if (!cancelled && canvas2Ref.current) {
            canvas2Ref.current.innerHTML =
              '<p class="text-sm text-error-500 p-4">Failed to render page</p>';
          }
        }
      } else if (canvas2Ref.current) {
        if (doc2 && currentPage > doc2.pageCount) {
          canvas2Ref.current.innerHTML =
            '<p class="text-sm text-secondary-400 p-4 text-center">No page (document has fewer pages)</p>';
        }
      }
    }

    if (doc1 || doc2) {
      renderPages();
    }

    return () => {
      cancelled = true;
    };
  }, [doc1, doc2, currentPage, zoom]);

  // Handle file uploads
  const handleFile1Accepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setFile1Data(reader.result as ArrayBuffer);
        setFile1Name(file.name);
        setComparisonResult(null);
        setCurrentDiffIndex(0);
        setCurrentPage(1);
      };
      reader.onerror = () => toast.error('Failed to read the first file.');
      reader.readAsArrayBuffer(file);
    },
    [toast],
  );

  const handleFile2Accepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setFile2Data(reader.result as ArrayBuffer);
        setFile2Name(file.name);
        setComparisonResult(null);
        setCurrentDiffIndex(0);
        setCurrentPage(1);
      };
      reader.onerror = () => toast.error('Failed to read the second file.');
      reader.readAsArrayBuffer(file);
    },
    [toast],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`File "${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  // Compare documents
  const handleCompare = useCallback(async () => {
    if (!doc1 || !doc2) return;

    setIsComparing(true);
    setComparisonResult(null);
    setCurrentDiffIndex(0);

    try {
      const pageCount1 = doc1.pageCount;
      const pageCount2 = doc2.pageCount;
      const differences: PageDifference[] = [];

      // Compare common pages
      const commonPages = Math.min(pageCount1, pageCount2);
      for (let i = 1; i <= commonPages; i++) {
        const isSame = await renderEngine.current.comparePages(doc1, doc2, i);
        if (!isSame) {
          differences.push({ pageNumber: i, type: 'changed' });
        }
      }

      // Pages only in doc2 (added)
      for (let i = commonPages + 1; i <= pageCount2; i++) {
        differences.push({ pageNumber: i, type: 'added' });
      }

      // Pages only in doc1 (removed)
      for (let i = commonPages + 1; i <= pageCount1; i++) {
        differences.push({ pageNumber: i, type: 'removed' });
      }

      const result: ComparisonResult = {
        pagesAdded: differences.filter((d) => d.type === 'added').length,
        pagesRemoved: differences.filter((d) => d.type === 'removed').length,
        pagesChanged: differences.filter((d) => d.type === 'changed').length,
        differences,
      };

      setComparisonResult(result);

      if (differences.length === 0) {
        toast.success('The two documents are identical. No differences found.');
      } else {
        toast.success(
          `Comparison complete: ${result.pagesChanged} changed, ${result.pagesAdded} added, ${result.pagesRemoved} removed.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Comparison failed: ${message}`);
    } finally {
      setIsComparing(false);
    }
  }, [doc1, doc2, toast]);

  // Navigate to previous difference
  const handlePrevDiff = useCallback(() => {
    if (!comparisonResult || comparisonResult.differences.length === 0) return;
    const newIndex =
      currentDiffIndex > 0 ? currentDiffIndex - 1 : comparisonResult.differences.length - 1;
    setCurrentDiffIndex(newIndex);
    setCurrentPage(comparisonResult.differences[newIndex].pageNumber);
  }, [comparisonResult, currentDiffIndex]);

  // Navigate to next difference
  const handleNextDiff = useCallback(() => {
    if (!comparisonResult || comparisonResult.differences.length === 0) return;
    const newIndex =
      currentDiffIndex < comparisonResult.differences.length - 1 ? currentDiffIndex + 1 : 0;
    setCurrentDiffIndex(newIndex);
    setCurrentPage(comparisonResult.differences[newIndex].pageNumber);
  }, [comparisonResult, currentDiffIndex]);

  // Page navigation
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  }, [currentPage, totalPages]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2, Math.round((z + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setFile1Data(null);
    setFile1Name('');
    setFile2Data(null);
    setFile2Name('');
    setDoc1(null);
    setDoc2(null);
    setComparisonResult(null);
    setCurrentDiffIndex(0);
    setCurrentPage(1);
    setZoom(1);
  }, []);

  // Get the diff type for the current page
  const getCurrentPageDiffType = (): DiffType | null => {
    if (!comparisonResult) return null;
    const diff = comparisonResult.differences.find((d) => d.pageNumber === currentPage);
    return diff?.type ?? null;
  };

  const currentPageDiffType = getCurrentPageDiffType();

  // Border color based on diff type
  const getBorderClass = (diffType: DiffType | null): string => {
    switch (diffType) {
      case 'changed':
        return 'border-amber-500 dark:border-amber-400';
      case 'added':
        return 'border-success-500 dark:border-success-400';
      case 'removed':
        return 'border-error-500 dark:border-error-400';
      default:
        return 'border-secondary-200 dark:border-secondary-700';
    }
  };

  // If no files uploaded, show dual upload zones
  if (!file1Data || !file2Data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Compare PDFs
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload two PDF documents to compare them side by side and see differences highlighted.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File 1 upload */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
              Document 1 {file1Name && <span className="text-secondary-400">({file1Name})</span>}
            </h2>
            {!file1Data ? (
              <FileUploadZone
                accept={['application/pdf']}
                maxFiles={1}
                multiple={false}
                onFilesAccepted={handleFile1Accepted}
                onFileRejected={handleFileRejected}
                operationRoute="/compare"
                operationName="Compare"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-success-300 bg-success-50 p-3 dark:border-success-700 dark:bg-success-900/20">
                <svg
                  className="h-5 w-5 text-success-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-success-700 dark:text-success-300 truncate">
                  {file1Name}
                </span>
              </div>
            )}
          </div>

          {/* File 2 upload */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
              Document 2 {file2Name && <span className="text-secondary-400">({file2Name})</span>}
            </h2>
            {!file2Data ? (
              <FileUploadZone
                accept={['application/pdf']}
                maxFiles={1}
                multiple={false}
                onFilesAccepted={handleFile2Accepted}
                onFileRejected={handleFileRejected}
                operationRoute="/compare"
                operationName="Compare"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-success-300 bg-success-50 p-3 dark:border-success-700 dark:bg-success-900/20">
                <svg
                  className="h-5 w-5 text-success-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-success-700 dark:text-success-300 truncate">
                  {file2Name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Compare PDFs
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            {file1Name} vs {file2Name}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Start over
        </Button>
      </div>

      {/* Compare button */}
      {!comparisonResult && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handleCompare}
            loading={isComparing}
            disabled={isComparing || !doc1 || !doc2}
          >
            {isComparing ? 'Comparing...' : 'Compare Documents'}
          </Button>
        </div>
      )}

      {/* Comparison summary */}
      {comparisonResult && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
            Comparison Summary
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">
                {comparisonResult.pagesChanged} changed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full bg-success-500"
                aria-hidden="true"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">
                {comparisonResult.pagesAdded} added
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-error-500" aria-hidden="true" />
              <span className="text-sm text-secondary-700 dark:text-secondary-300">
                {comparisonResult.pagesRemoved} removed
              </span>
            </div>
          </div>

          {/* Difference navigation */}
          {comparisonResult.differences.length > 0 && (
            <div className="mt-3 flex items-center gap-2 border-t border-secondary-200 pt-3 dark:border-secondary-700">
              <Button variant="outline" size="sm" onClick={handlePrevDiff}>
                ← Previous diff
              </Button>
              <span className="text-sm text-secondary-500 dark:text-secondary-400">
                {currentDiffIndex + 1} of {comparisonResult.differences.length}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextDiff}>
                Next diff →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Zoom out"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span
            className="text-sm font-medium text-text-light dark:text-text-dark min-w-[48px] text-center"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Zoom in"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Previous page"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span
            className="text-sm font-medium text-text-light dark:text-text-dark min-w-[80px] text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {totalPages > 0 ? `${currentPage} / ${totalPages}` : '0 / 0'}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Next page"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Current page diff indicator */}
        {currentPageDiffType && (
          <span
            className={[
              'text-xs font-medium px-2 py-1 rounded',
              currentPageDiffType === 'changed'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : currentPageDiffType === 'added'
                  ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                  : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
            ].join(' ')}
          >
            {currentPageDiffType === 'changed' && 'Changed'}
            {currentPageDiffType === 'added' && 'Added'}
            {currentPageDiffType === 'removed' && 'Removed'}
          </span>
        )}
      </div>

      {/* Side-by-side preview panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document 1 panel */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 px-1">
            Document 1 — {file1Name}
          </h3>
          <div
            className={[
              'relative rounded-lg border-2 bg-white dark:bg-secondary-800 overflow-auto min-h-[200px] flex items-center justify-center transition-colors duration-150',
              getBorderClass(currentPageDiffType),
            ].join(' ')}
          >
            <div ref={canvas1Ref} className="flex items-center justify-center p-2" />
          </div>
        </div>

        {/* Document 2 panel */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 px-1">
            Document 2 — {file2Name}
          </h3>
          <div
            className={[
              'relative rounded-lg border-2 bg-white dark:bg-secondary-800 overflow-auto min-h-[200px] flex items-center justify-center transition-colors duration-150',
              getBorderClass(currentPageDiffType),
            ].join(' ')}
          >
            <div ref={canvas2Ref} className="flex items-center justify-center p-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

ComparePage.displayName = 'ComparePage';
