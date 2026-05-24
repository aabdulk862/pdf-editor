import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import {
  annotationEngine,
  createRectSelectionHandler,
  attachInputListeners,
  destroyAnnotationCanvas,
} from '@/core/annotation-engine/tools';
import type { AnnotationCanvas } from '@/core/annotation-engine/index';
import type { Rect } from '@/types/common';
import type { AnnotationData } from '@/types/annotations';
import type { RedactRegion } from '@/core/pdf-engine/index';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * RedactPage component - Allows users to select rectangular areas on PDF pages for redaction.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Draw rectangular redaction regions on any page
 * - Support multiple regions across multiple pages
 * - Adjust, reposition, or remove individual redaction selections before confirming
 * - Wire to PDF Engine redact to permanently remove content
 * - Show black rectangles in preview matching the final output
 * - Validate at least one area is selected before applying
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */
export function RedactPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);

  // Redaction regions state
  const [redactions, setRedactions] = useState<AnnotationData[]>([]);

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<ArrayBuffer | null>(null);

  // Preview/navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  // Canvas refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<AnnotationCanvas | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!pdfData) {
      pdfDocRef.current = null;
      setPageCount(0);
      setRedactions([]);
      setResultData(null);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;

    async function loadPdf() {
      try {
        const doc = await pdfjsLib.getDocument({ data: pdfData!.slice(0) }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setPageCount(doc.numPages);
      } catch {
        if (!cancelled) {
          toast.error('The uploaded file is not a valid PDF.');
          setPdfData(null);
          setFileName('');
        }
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render current page and set up annotation canvas
  useEffect(() => {
    if (!pdfDocRef.current || !canvasContainerRef.current || pageCount === 0) return;

    let cancelled = false;

    async function renderPage() {
      const doc = pdfDocRef.current;
      if (!doc) return;

      try {
        const page = await doc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.5 });

        // Clear container
        const container = canvasContainerRef.current!;
        container.innerHTML = '';

        // Create page render canvas
        const renderCanvas = document.createElement('canvas');
        renderCanvas.width = viewport.width;
        renderCanvas.height = viewport.height;
        renderCanvas.style.width = '100%';
        renderCanvas.style.height = 'auto';
        renderCanvas.style.display = 'block';
        container.appendChild(renderCanvas);
        pageCanvasRef.current = renderCanvas;

        const ctx = renderCanvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        // Initialize annotation canvas overlay
        const pdfPage = {
          pageNumber: currentPage,
          width: viewport.width,
          height: viewport.height,
          rotation: 0,
        };

        const annotCanvas = annotationEngine.initCanvas(container, pdfPage);
        annotationEngine.setTool(annotCanvas, 'redact');
        annotationCanvasRef.current = annotCanvas;

        // Re-render existing redaction regions for this page as black rectangles
        const pageRedactions = redactions.filter((r) => r.page === currentPage);
        for (const r of pageRedactions) {
          annotationEngine.addHighlight(annotCanvas, r.rect, '#000000', 1.0);
        }

        // Set up rectangular selection handler for drawing new redaction regions
        const selectionHandler = createRectSelectionHandler(annotCanvas, (rect: Rect) => {
          handleRedactionDrawn(rect);
        });

        const cleanup = attachInputListeners(annotCanvas, {
          start: selectionHandler.start,
          move: selectionHandler.move,
          end: selectionHandler.end,
        });

        cleanupListenersRef.current = cleanup;
      } catch {
        if (!cancelled) {
          toast.error('Failed to render page.');
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
      if (annotationCanvasRef.current) {
        destroyAnnotationCanvas(annotationCanvasRef.current);
        annotationCanvasRef.current = null;
      }
    };
  }, [pdfData, pageCount, currentPage, redactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle a new redaction region drawn on the canvas
  const handleRedactionDrawn = useCallback(
    (rect: Rect) => {
      if (!annotationCanvasRef.current) return;

      // Add redaction region via annotation engine for immediate visual feedback (black rectangle)
      const id = annotationEngine.addHighlight(annotationCanvasRef.current, rect, '#000000', 1.0);

      // Store the redaction data
      const annotationData: AnnotationData = {
        id,
        tool: 'redact',
        page: currentPage,
        rect,
        data: {},
      };

      setRedactions((prev) => [...prev, annotationData]);
      // Clear any previous result since we have new regions
      setResultData(null);
    },
    [currentPage],
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
        setFileName(file.name);
        setResultData(null);
        setRedactions([]);
        setCurrentPage(1);
      };
      reader.onerror = () => {
        toast.error('Failed to read the file.');
      };
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

  // Remove a specific redaction region
  const handleRemoveRedaction = useCallback((id: string) => {
    setRedactions((prev) => prev.filter((r) => r.id !== id));
    setResultData(null);
  }, []);

  // Clear all redaction regions
  const handleClearAll = useCallback(() => {
    setRedactions([]);
    setResultData(null);
  }, []);

  // Apply redaction and generate the output PDF
  const handleApply = useCallback(async () => {
    if (!pdfData || redactions.length === 0) {
      toast.warning('Please select at least one area to redact.');
      return;
    }

    setIsProcessing(true);
    setResultData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });

      // Convert annotation data to RedactRegion format for the PDF engine
      const regions: RedactRegion[] = redactions.map((r) => ({
        page: r.page,
        x: r.rect.x,
        y: r.rect.y,
        width: r.rect.width,
        height: r.rect.height,
      }));

      const result = await client.redact(pdfData, regions);

      if (result.success && result.data) {
        setResultData(result.data);
        toast.success('Redaction applied successfully. Content has been permanently removed.');
      } else {
        toast.error(result.error ?? 'Failed to apply redaction.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, redactions, toast]);

  // Download the result
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_redacted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [resultData, fileName]);

  // Page navigation
  const goToPreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(pageCount, p + 1));
  }, [pageCount]);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Redact
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to select areas for permanent redaction. Redacted content cannot be
          recovered.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
        />
      </div>
    );
  }

  const currentPageRedactions = redactions.filter((r) => r.page === currentPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Redact
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            {fileName} — {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPdfData(null);
            setFileName('');
            setResultData(null);
            setRedactions([]);
          }}
        >
          Upload different file
        </Button>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20">
        <svg
          className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5"
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
        <p className="text-sm text-error-700 dark:text-error-300">
          <strong>Warning:</strong> Redaction permanently removes content from the PDF. This action
          cannot be undone once applied. The original text, images, and graphics within selected
          areas will be irrecoverably deleted.
        </p>
      </div>

      {/* Drawing area with page navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
            Select Areas to Redact — Page {currentPage} of {pageCount}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              aria-label="Previous page"
            >
              <svg
                className="w-4 h-4"
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
            <span className="text-sm text-secondary-600 dark:text-secondary-300">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={goToNextPage}
              disabled={currentPage >= pageCount}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              aria-label="Next page"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Canvas container for PDF page + annotation overlay */}
        <div
          ref={canvasContainerRef}
          className="relative border border-secondary-200 dark:border-secondary-700 rounded-lg overflow-hidden bg-secondary-100 dark:bg-secondary-800 max-w-full"
          style={{ maxHeight: '600px', overflow: 'auto' }}
        >
          {/* PDF page and annotation canvas are rendered here dynamically */}
        </div>

        <p className="text-xs text-secondary-400 dark:text-secondary-500">
          Click and drag on the page to select an area for redaction. You can add multiple areas
          across different pages.
        </p>
      </div>

      {/* Redaction regions list for current page */}
      {currentPageRedactions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
              Redaction Areas on Page {currentPage} ({currentPageRedactions.length})
            </h2>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              Clear all areas
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentPageRedactions.map((r, index) => (
              <div
                key={r.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm"
              >
                <span
                  className="w-4 h-4 rounded-sm bg-black border border-secondary-300 dark:border-secondary-500"
                  aria-hidden="true"
                />
                <span className="text-secondary-700 dark:text-secondary-200">
                  Area #{index + 1}
                </span>
                <span className="text-xs text-secondary-400 dark:text-secondary-500">
                  ({Math.round(r.rect.width)}×{Math.round(r.rect.height)})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveRedaction(r.id)}
                  className="ml-1 text-secondary-400 hover:text-error-500 dark:text-secondary-500 dark:hover:text-error-400 min-w-[24px] min-h-[24px] inline-flex items-center justify-center"
                  aria-label={`Remove redaction area ${index + 1}`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total redaction regions summary */}
      {redactions.length > 0 && (
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Total redaction areas: {redactions.length} across{' '}
          {new Set(redactions.map((r) => r.page)).size} page(s)
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleApply}
          loading={isProcessing}
          disabled={isProcessing || redactions.length === 0}
        >
          Apply Redaction
        </Button>
        {resultData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Redacted PDF
          </Button>
        )}
      </div>

      {/* Preview of result */}
      {resultData && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Preview</h2>
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
  );
}

RedactPage.displayName = 'RedactPage';
