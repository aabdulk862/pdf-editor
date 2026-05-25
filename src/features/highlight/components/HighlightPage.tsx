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

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * Default highlight opacity (40%).
 */
const HIGHLIGHT_OPACITY = 0.4;

/**
 * Predefined highlight color options.
 */
const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Green', value: '#00FF00' },
  { name: 'Blue', value: '#87CEEB' },
  { name: 'Pink', value: '#FF69B4' },
  { name: 'Orange', value: '#FFA500' },
] as const;

const DEFAULT_COLOR = HIGHLIGHT_COLORS[0].value;

/**
 * HighlightPage component - Allows users to draw rectangular highlights on PDF pages.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Choose highlight color from 5 predefined options (default yellow)
 * - Draw rectangular highlights on the page with real-time preview
 * - Support multiple highlights per page
 * - Embed highlights into the PDF at 40% opacity
 * - Download the highlighted PDF
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export function HighlightPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);

  // Annotation state
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [highlights, setHighlights] = useState<AnnotationData[]>([]);

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
      setHighlights([]);
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
        annotationEngine.setTool(annotCanvas, 'highlight');
        annotationCanvasRef.current = annotCanvas;

        // Re-render existing highlights for this page
        const pageHighlights = highlights.filter((h) => h.page === currentPage);
        for (const h of pageHighlights) {
          annotationEngine.addHighlight(
            annotCanvas,
            h.rect,
            h.data.color as string,
            h.data.opacity as number,
          );
        }

        // Set up rectangular selection handler
        const selectionHandler = createRectSelectionHandler(annotCanvas, (rect: Rect) => {
          handleHighlightDrawn(rect);
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
  }, [pdfData, pageCount, currentPage, highlights]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle a new highlight drawn on the canvas
  const handleHighlightDrawn = useCallback(
    (rect: Rect) => {
      if (!annotationCanvasRef.current) return;

      // Add highlight via annotation engine for immediate visual feedback
      const id = annotationEngine.addHighlight(
        annotationCanvasRef.current,
        rect,
        selectedColor,
        HIGHLIGHT_OPACITY,
      );

      // Store the highlight data
      const annotationData: AnnotationData = {
        id,
        tool: 'highlight',
        page: currentPage,
        rect,
        data: {
          color: selectedColor,
          opacity: HIGHLIGHT_OPACITY,
        },
      };

      setHighlights((prev) => [...prev, annotationData]);
      // Clear any previous result since we have new annotations
      setResultData(null);
    },
    [selectedColor, currentPage],
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
        setHighlights([]);
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

  // Remove a specific highlight
  const handleRemoveHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setResultData(null);
  }, []);

  // Clear all highlights
  const handleClearAll = useCallback(() => {
    setHighlights([]);
    setResultData(null);
  }, []);

  // Apply highlights and generate the output PDF
  const handleApply = useCallback(async () => {
    if (!pdfData || highlights.length === 0) {
      toast.warning('Please draw at least one highlight before applying.');
      return;
    }

    setIsProcessing(true);
    setResultData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });

      // Embed each highlight annotation into the PDF sequentially
      let currentData = pdfData;
      for (const highlight of highlights) {
        const result = await client.embedAnnotation(currentData, highlight);
        if (result.success && result.data) {
          currentData = result.data;
        } else {
          toast.error(result.error ?? 'Failed to embed highlight.');
          setIsProcessing(false);
          return;
        }
      }

      setResultData(currentData);
      toast.success('Highlights applied successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, highlights, toast]);

  // Download the result
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_highlighted.pdf';
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
          Highlight
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to draw rectangular highlights on its pages.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/highlight"
          operationName="Highlight"
        />
      </div>
    );
  }

  const currentPageHighlights = highlights.filter((h) => h.page === currentPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Highlight
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
            setHighlights([]);
          }}
        >
          Upload different file
        </Button>
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Highlight Color</h2>
        <div className="flex flex-wrap gap-2">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color.value)}
              className={[
                'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-normal ease-in-out',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'dark:focus-visible:ring-offset-background-dark',
                selectedColor === color.value
                  ? 'border-primary-500 ring-2 ring-primary-500'
                  : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400 dark:hover:border-secondary-500',
              ].join(' ')}
              aria-pressed={selectedColor === color.value}
              aria-label={`${color.name} highlight color`}
              title={color.name}
            >
              <span
                className="w-6 h-6 rounded-sm border border-secondary-300 dark:border-secondary-500"
                style={{ backgroundColor: color.value, opacity: HIGHLIGHT_OPACITY }}
                aria-hidden="true"
              />
              <span className="ml-2 text-secondary-700 dark:text-secondary-200">{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drawing area with page navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
            Draw Highlights — Page {currentPage} of {pageCount}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out"
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
                  strokeWidth={1.5}
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
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md border border-secondary-300 dark:border-secondary-600 text-secondary-600 dark:text-secondary-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out"
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
                  strokeWidth={1.5}
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
          Click and drag on the page to draw a highlight rectangle. You can add multiple highlights.
        </p>
      </div>

      {/* Highlights list for current page */}
      {currentPageHighlights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
              Highlights on Page {currentPage} ({currentPageHighlights.length})
            </h2>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              Clear all highlights
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentPageHighlights.map((h, index) => (
              <div
                key={h.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-sm"
              >
                <span
                  className="w-4 h-4 rounded-sm border border-secondary-300 dark:border-secondary-500"
                  style={{ backgroundColor: h.data.color as string, opacity: HIGHLIGHT_OPACITY }}
                  aria-hidden="true"
                />
                <span className="text-secondary-700 dark:text-secondary-200">#{index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(h.id)}
                  className="ml-1 text-secondary-400 hover:text-error-500 dark:text-secondary-500 dark:hover:text-error-400 min-w-[24px] min-h-[24px] inline-flex items-center justify-center"
                  aria-label={`Remove highlight ${index + 1}`}
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
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total highlights summary */}
      {highlights.length > 0 && (
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Total highlights: {highlights.length} across {new Set(highlights.map((h) => h.page)).size}{' '}
          page(s)
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleApply}
          loading={isProcessing}
          disabled={isProcessing || highlights.length === 0}
        >
          Apply Highlights
        </Button>
        {resultData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Highlighted PDF
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

HighlightPage.displayName = 'HighlightPage';
