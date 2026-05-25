import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import type { OperationResult } from '@/types/operations';
import type { PdfWorkerResponse } from '@/workers/pdf-worker.types';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface PageThumbnail {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  loading: boolean;
}

/**
 * DeletePagesPage - Feature page for deleting pages from a PDF.
 *
 * Features:
 * - Upload a PDF file
 * - View page thumbnails with selection
 * - Select pages to delete (click to toggle)
 * - Confirmation before deletion
 * - Prevents deletion of all pages (toast warning)
 * - Shows updated preview within 2s after deletion
 * - Download the modified PDF
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export function DeletePagesPage(): JSX.Element {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [modifiedData, setModifiedData] = useState<ArrayBuffer | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const workerRef = useRef<Worker | null>(null);
  const toast = useToast();

  // Initialize the web worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('@/workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
    });
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Load PDF and generate thumbnails
  const loadPdf = useCallback(
    async (data: ArrayBuffer) => {
      try {
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
        const numPages = doc.numPages;
        setPageCount(numPages);

        // Generate thumbnails for all pages
        const thumbs: PageThumbnail[] = [];
        for (let i = 1; i <= numPages; i++) {
          thumbs.push({ pageNumber: i, canvas: null, loading: true });
        }
        setThumbnails(thumbs);

        // Render thumbnails
        const renderedThumbs: PageThumbnail[] = [];
        for (let i = 1; i <= numPages; i++) {
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
            renderedThumbs.push({ pageNumber: i, canvas, loading: false });
          } catch {
            renderedThumbs.push({ pageNumber: i, canvas: null, loading: false });
          }
        }
        setThumbnails(renderedThumbs);
      } catch {
        toast.error('Failed to load PDF. The file may be corrupted or invalid.');
      }
    },
    [toast],
  );

  // Handle file upload
  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setFileName(file.name);
      setSelectedPages(new Set());
      setModifiedData(null);
      setShowConfirmation(false);
      setCurrentPage(1);

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        loadPdf(data);
      };
      reader.readAsArrayBuffer(file);
    },
    [loadPdf],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`File "${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  // Toggle page selection
  const togglePageSelection = useCallback((pageNumber: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) {
        next.delete(pageNumber);
      } else {
        next.add(pageNumber);
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

  // Handle delete button click - show confirmation
  const handleDeleteClick = useCallback(() => {
    if (selectedPages.size === 0) {
      toast.warning('Please select at least one page to delete.');
      return;
    }

    // Prevent deletion of all pages (Requirement 7.2)
    if (selectedPages.size >= pageCount) {
      toast.warning('Cannot delete all pages. At least one page must remain.');
      return;
    }

    setShowConfirmation(true);
  }, [selectedPages, pageCount, toast]);

  // Confirm deletion - execute via worker
  const handleConfirmDelete = useCallback(() => {
    if (!pdfData || !workerRef.current) return;

    setIsDeleting(true);
    setShowConfirmation(false);

    const requestId = crypto.randomUUID();
    const pages = Array.from(selectedPages).sort((a, b) => a - b);

    const handleMessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const response = event.data;
      if (response.id !== requestId) return;

      workerRef.current?.removeEventListener('message', handleMessage);
      setIsDeleting(false);

      if (response.success) {
        const result = response.result as OperationResult;
        if (result.success && result.data) {
          setModifiedData(result.data);
          setSelectedPages(new Set());
          toast.success(`Successfully deleted ${pages.length} page${pages.length > 1 ? 's' : ''}.`);
          // Reload thumbnails from modified data
          setPdfData(result.data);
          loadPdf(result.data);
          setCurrentPage(1);
        } else {
          toast.error(result.error ?? 'Failed to delete pages.');
        }
      } else {
        toast.error(response.error ?? 'An error occurred while deleting pages.');
      }
    };

    workerRef.current.addEventListener('message', handleMessage);
    workerRef.current.postMessage({
      id: requestId,
      operation: 'deletePages',
      payload: { data: pdfData, pages },
    });
  }, [pdfData, selectedPages, toast, loadPdf]);

  // Cancel confirmation
  const handleCancelDelete = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  // Download modified PDF
  const handleDownload = useCallback(() => {
    const dataToDownload = modifiedData ?? pdfData;
    if (!dataToDownload) return;

    const blob = new Blob([dataToDownload], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileName.replace(/\.pdf$/i, '');
    a.download = `${baseName}-pages-deleted.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [modifiedData, pdfData, fileName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark sm:text-3xl">
          Delete Pages
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Select pages to remove from your PDF document.
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
          operationRoute="/delete-pages"
          operationName="Delete Pages"
        />
      )}

      {/* Main content when PDF is loaded */}
      {pdfData && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3 dark:border-secondary-700 dark:bg-secondary-900">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-light dark:text-text-dark">{fileName}</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {pageCount} page{pageCount !== 1 ? 's' : ''} • {selectedPages.size} selected
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteClick}
                disabled={selectedPages.size === 0 || isDeleting}
                loading={isDeleting}
              >
                Delete Selected
              </Button>
            </div>
          </div>

          {/* Confirmation dialog */}
          {showConfirmation && (
            <div
              className="rounded-lg border border-error-300 bg-error-50 p-4 dark:border-error-700 dark:bg-error-900/20"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-error-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-error-800 dark:text-error-200">
                    Confirm Deletion
                  </p>
                  <p className="mt-1 text-sm text-error-700 dark:text-error-300">
                    Are you sure you want to delete {selectedPages.size} page
                    {selectedPages.size > 1 ? 's' : ''}? This action cannot be undone.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                      Yes, Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelDelete}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page thumbnails grid */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              Click pages to select them for deletion
            </h2>
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              role="listbox"
              aria-label="PDF pages"
              aria-multiselectable="true"
            >
              {thumbnails.map((thumb) => (
                <PageThumbnailItem
                  key={thumb.pageNumber}
                  thumbnail={thumb}
                  isSelected={selectedPages.has(thumb.pageNumber)}
                  onToggle={togglePageSelection}
                />
              ))}
            </div>
          </div>

          {/* Preview panel */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-secondary-600 dark:text-secondary-400">
              Preview
            </h2>
            <PreviewPanel
              originalDoc={pdfData}
              modifiedDoc={modifiedData}
              zoom={zoom}
              onZoomChange={setZoom}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Download button */}
          {modifiedData && (
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleDownload}>
                Download Modified PDF
              </Button>
            </div>
          )}

          {/* Upload new file */}
          <div className="border-t border-secondary-200 pt-4 dark:border-secondary-700">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPdfData(null);
                setModifiedData(null);
                setFileName('');
                setPageCount(0);
                setThumbnails([]);
                setSelectedPages(new Set());
                setShowConfirmation(false);
                setCurrentPage(1);
              }}
            >
              Upload Different File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual page thumbnail with selection state.
 */
interface PageThumbnailItemProps {
  thumbnail: PageThumbnail;
  isSelected: boolean;
  onToggle: (pageNumber: number) => void;
}

function PageThumbnailItem({
  thumbnail,
  isSelected,
  onToggle,
}: PageThumbnailItemProps): JSX.Element {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Mount the canvas element into the container
  useEffect(() => {
    if (canvasContainerRef.current && thumbnail.canvas) {
      canvasContainerRef.current.innerHTML = '';
      const canvas = thumbnail.canvas.cloneNode(true) as HTMLCanvasElement;
      canvas.className = 'w-full h-auto';
      canvas.setAttribute('aria-hidden', 'true');
      canvasContainerRef.current.appendChild(canvas);
    }
  }, [thumbnail.canvas]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-label={`Page ${thumbnail.pageNumber}${isSelected ? ', selected for deletion' : ''}`}
      tabIndex={0}
      onClick={() => onToggle(thumbnail.pageNumber)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(thumbnail.pageNumber);
        }
      }}
      className={[
        'relative cursor-pointer rounded-lg border-2 p-2 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-background-dark',
        'min-h-[44px] min-w-[44px]',
        isSelected
          ? 'border-error-500 bg-error-50 shadow-md dark:border-error-400 dark:bg-error-900/20'
          : 'border-secondary-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-secondary-700 dark:bg-secondary-800 dark:hover:border-primary-600',
      ].join(' ')}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white">
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      )}

      {/* Thumbnail content */}
      <div className="flex flex-col items-center gap-1">
        {thumbnail.loading ? (
          <div className="flex h-[120px] w-full items-center justify-center">
            <svg
              className="h-6 w-6 animate-spin motion-reduce:animate-none text-secondary-400"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : thumbnail.canvas ? (
          <div ref={canvasContainerRef} className="w-full overflow-hidden rounded" />
        ) : (
          <div className="flex h-[120px] w-full items-center justify-center rounded bg-secondary-100 dark:bg-secondary-700">
            <span className="text-xs text-secondary-400">Failed</span>
          </div>
        )}

        {/* Page number label */}
        <span
          className={[
            'text-xs font-medium',
            isSelected
              ? 'text-error-600 dark:text-error-400'
              : 'text-secondary-600 dark:text-secondary-400',
          ].join(' ')}
        >
          Page {thumbnail.pageNumber}
        </span>
      </div>
    </div>
  );
}

DeletePagesPage.displayName = 'DeletePagesPage';
