import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/** Maximum pages allowed in the resulting PDF */
const MAX_PAGES = 500;
/** Maximum copy count */
const MAX_COPIES = 10;
/** Minimum copy count */
const MIN_COPIES = 1;

/**
 * DuplicatePagesPage - Feature page for duplicating selected pages within a PDF.
 *
 * Features:
 * - Upload a PDF file
 * - View page thumbnails and select pages to duplicate
 * - Specify copy count (1-10, default 1)
 * - Preview the result after duplication
 * - Download the modified PDF
 * - Rejects operations that would exceed 500 pages
 *
 * Requirements: 48.1, 48.2, 48.3, 48.4, 48.5, 48.6
 */
export function DuplicatePagesPage(): JSX.Element {
  const toast = useToast();

  // PDF state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<(HTMLCanvasElement | null)[]>([]);

  // Selection state
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [copies, setCopies] = useState(1);
  const [copiesError, setCopiesError] = useState<string | undefined>(undefined);

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const workerClientRef = useRef(getPdfWorkerClient({ onError: (msg) => toast.error(msg) }));

  // Load PDF and generate thumbnails
  const loadPdf = useCallback(
    async (data: ArrayBuffer) => {
      try {
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
        setPageCount(doc.numPages);
        setSelectedPages(new Set());
        setResultData(null);
        setCurrentPage(1);

        // Generate thumbnails for all pages
        const thumbs: (HTMLCanvasElement | null)[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          try {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1 });
            const thumbnailWidth = 150;
            const scale = thumbnailWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            }
            thumbs.push(canvas);
          } catch {
            thumbs.push(null);
          }
        }
        setThumbnails(thumbs);
      } catch {
        toast.error('Failed to load PDF. The file may be corrupted or invalid.');
        setPdfData(null);
        setPageCount(0);
        setThumbnails([]);
      }
    },
    [toast],
  );

  // Handle file upload
  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        setPdfName(file.name);
        loadPdf(data);
      };
      reader.onerror = () => {
        toast.error('Failed to read the uploaded file.');
      };
      reader.readAsArrayBuffer(file);
    },
    [loadPdf, toast],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`File "${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  // Toggle page selection
  const togglePage = useCallback((pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  }, []);

  // Select all pages
  const selectAll = useCallback(() => {
    const all = new Set<number>();
    for (let i = 1; i <= pageCount; i++) {
      all.add(i);
    }
    setSelectedPages(all);
  }, [pageCount]);

  // Deselect all pages
  const deselectAll = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  // Handle copy count change
  const handleCopiesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const num = parseInt(value, 10);

    if (value === '') {
      setCopies(1);
      setCopiesError(undefined);
      return;
    }

    if (isNaN(num)) {
      setCopiesError('Please enter a valid number');
      return;
    }

    if (num < MIN_COPIES || num > MAX_COPIES) {
      setCopiesError(`Copy count must be between ${MIN_COPIES} and ${MAX_COPIES}`);
      setCopies(num);
      return;
    }

    setCopies(num);
    setCopiesError(undefined);
  }, []);

  // Calculate resulting page count
  const resultingPageCount = pageCount + selectedPages.size * copies;
  const wouldExceedLimit = resultingPageCount > MAX_PAGES;

  // Perform duplication
  const handleDuplicate = useCallback(async () => {
    if (!pdfData) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    if (selectedPages.size === 0) {
      toast.warning('Please select at least one page to duplicate.');
      return;
    }

    if (copies < MIN_COPIES || copies > MAX_COPIES) {
      toast.error(`Copy count must be between ${MIN_COPIES} and ${MAX_COPIES}.`);
      return;
    }

    if (wouldExceedLimit) {
      toast.error(
        `Duplication would result in ${resultingPageCount} pages, exceeding the 500-page limit.`,
      );
      return;
    }

    setIsProcessing(true);
    try {
      const pages = Array.from(selectedPages).sort((a, b) => a - b);
      const result = await workerClientRef.current.duplicatePages(pdfData, pages, copies);

      if (result.success && result.data) {
        setResultData(result.data);
        setCurrentPage(1);
        toast.success('Pages duplicated successfully.');
      } else {
        toast.error(result.error ?? 'Failed to duplicate pages.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, selectedPages, copies, wouldExceedLimit, resultingPageCount, toast]);

  // Download the result
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfName.replace(/\.pdf$/i, '') + '_duplicated.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultData, pdfName]);

  // Reset state for new upload
  const handleReset = useCallback(() => {
    setPdfData(null);
    setPdfName('');
    setPageCount(0);
    setThumbnails([]);
    setSelectedPages(new Set());
    setCopies(1);
    setCopiesError(undefined);
    setResultData(null);
    setIsProcessing(false);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Duplicate Pages
        </h1>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          Select pages to duplicate and specify how many copies to insert.
        </p>
      </div>

      {/* File Upload */}
      {!pdfData && (
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/duplicate-pages"
          operationName="Duplicate Pages"
        />
      )}

      {/* Main content when PDF is loaded */}
      {pdfData && pageCount > 0 && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4 dark:border-secondary-700 dark:bg-secondary-900">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-light dark:text-text-dark">
                {pdfName}
              </span>
              <span className="text-xs text-secondary-500 dark:text-secondary-400">
                ({pageCount} {pageCount === 1 ? 'page' : 'pages'})
              </span>
            </div>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Upload New File
              </Button>
            </div>
          </div>

          {/* Copy count input */}
          <div className="max-w-xs">
            <Input
              label="Number of copies"
              type="number"
              min={MIN_COPIES}
              max={MAX_COPIES}
              value={copies}
              onChange={handleCopiesChange}
              error={copiesError}
              helperText={`Insert 1 to 10 copies of each selected page (default: 1)`}
            />
          </div>

          {/* Page selection */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Select Pages
              </h2>
              <span className="text-sm text-secondary-500 dark:text-secondary-400">
                {selectedPages.size} of {pageCount} selected
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedPages.size === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Page limit warning */}
            {wouldExceedLimit && (
              <div
                className="rounded-md border border-error-300 bg-error-50 p-3 text-sm text-error-700 dark:border-error-600 dark:bg-error-900/20 dark:text-error-300"
                role="alert"
              >
                Duplication would result in {resultingPageCount} pages, exceeding the 500-page
                limit. Please reduce the number of selected pages or copies.
              </div>
            )}

            {/* Thumbnail grid */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {thumbnails.map((thumb, index) => {
                const pageNum = index + 1;
                const isSelected = selectedPages.has(pageNum);
                return (
                  <PageThumbnail
                    key={pageNum}
                    pageNum={pageNum}
                    canvas={thumb}
                    isSelected={isSelected}
                    onClick={() => togglePage(pageNum)}
                  />
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={handleDuplicate}
              loading={isProcessing}
              disabled={selectedPages.size === 0 || wouldExceedLimit || !!copiesError}
            >
              Duplicate Pages
            </Button>
            {resultData && (
              <Button variant="secondary" onClick={handleDownload}>
                Download Result
              </Button>
            )}
          </div>

          {/* Preview panel */}
          {(pdfData || resultData) && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Preview</h2>
              <PreviewPanel
                originalDoc={pdfData}
                modifiedDoc={resultData}
                zoom={zoom}
                onZoomChange={setZoom}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Individual page thumbnail with selection state */
function PageThumbnail({
  pageNum,
  canvas,
  isSelected,
  onClick,
}: {
  pageNum: number;
  canvas: HTMLCanvasElement | null;
  isSelected: boolean;
  onClick: () => void;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && canvas) {
      containerRef.current.innerHTML = '';
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = canvas.width;
      clonedCanvas.height = canvas.height;
      const ctx = clonedCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0);
      }
      clonedCanvas.className = 'w-full h-auto';
      clonedCanvas.setAttribute('aria-hidden', 'true');
      containerRef.current.appendChild(clonedCanvas);
    }
  }, [canvas]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Page ${pageNum}${isSelected ? ', selected' : ''}`}
      className={[
        'group relative flex flex-col items-center rounded-lg border-2 p-2 transition-all duration-normal ease-in-out',
        'min-h-[44px] min-w-[44px] cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-background-dark',
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-900/20'
          : 'border-secondary-200 bg-white hover:border-primary-300 hover:bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-800 dark:hover:border-primary-600 dark:hover:bg-secondary-700',
      ].join(' ')}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white dark:bg-primary-400">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Thumbnail */}
      <div
        ref={containerRef}
        className="flex w-full items-center justify-center overflow-hidden rounded"
      >
        {!canvas && (
          <div className="flex h-24 w-full items-center justify-center bg-secondary-100 dark:bg-secondary-700">
            <span className="text-xs text-secondary-400">No preview</span>
          </div>
        )}
      </div>

      {/* Page number */}
      <span className="mt-1 text-xs font-medium text-secondary-600 dark:text-secondary-300">
        {pageNum}
      </span>
    </button>
  );
}

DuplicatePagesPage.displayName = 'DuplicatePagesPage';
