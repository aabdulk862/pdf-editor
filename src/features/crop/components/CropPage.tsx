import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorRecovery, type ToolErrorState } from '@/components/ui/ErrorRecovery';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import {
  annotationEngine,
  createRectSelectionHandler,
  attachInputListeners,
  destroyAnnotationCanvas,
} from '@/core/annotation-engine/tools';
import { validateCropRegion } from '@/utils/validation';
import type { AnnotationCanvas } from '@/core/annotation-engine/index';
import type { Rect } from '@/types/common';
import type { CropBox } from '@/types/operations';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/** Minimum crop rectangle size in pixels */
const MIN_CROP_SIZE = 10;

type PageApplyMode = 'current' | 'selected' | 'all';

/**
 * CropPage component - Allows users to crop PDF pages to a specific region.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Draw a crop rectangle on the page preview (min 10x10px)
 * - Display crop region dimensions (width and height in points) and position
 * - Enter numeric crop coordinates (x, y, width, height) as an alternative to drawing
 * - Apply crop to single page, selected pages, or all pages
 * - Show preview of cropped result
 * - Validate region within page bounds and non-zero area
 *
 * Requirements: 41.1, 41.2, 41.3, 41.4, 41.5, 41.6, 41.7, 41.8
 */
export function CropPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);

  // Crop region state
  const [cropRect, setCropRect] = useState<Rect | null>(null);

  // Numeric input state (alternative to drawing)
  const [numericX, setNumericX] = useState<string>('');
  const [numericY, setNumericY] = useState<string>('');
  const [numericWidth, setNumericWidth] = useState<string>('');
  const [numericHeight, setNumericHeight] = useState<string>('');

  // Page application mode
  const [applyMode, setApplyMode] = useState<PageApplyMode>('current');
  const [selectedPages, setSelectedPages] = useState<string>('');

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<ArrayBuffer | null>(null);
  const [errorState, setErrorState] = useState<ToolErrorState | null>(null);

  // Preview/navigation state
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  // Page dimensions (in rendered canvas pixels at scale 1.5)
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  // Canvas refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<AnnotationCanvas | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!pdfData) {
      pdfDocRef.current = null;
      setPageCount(0);
      setCropRect(null);
      setResultData(null);
      setCurrentPage(1);
      setPageWidth(0);
      setPageHeight(0);
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

  // Render current page and set up annotation canvas for crop selection
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

        setPageWidth(viewport.width);
        setPageHeight(viewport.height);

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

        const ctx = renderCanvas.getContext('2d');
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        // Initialize annotation canvas overlay for crop selection
        const pdfPage = {
          pageNumber: currentPage,
          width: viewport.width,
          height: viewport.height,
          rotation: 0,
        };

        const annotCanvas = annotationEngine.initCanvas(container, pdfPage);
        annotationEngine.setTool(annotCanvas, 'highlight');
        annotationCanvasRef.current = annotCanvas;

        // If there's an existing crop rect, render it
        if (cropRect) {
          renderCropOverlay(annotCanvas, cropRect);
        }

        // Set up rectangular selection handler for drawing crop region
        const selectionHandler = createRectSelectionHandler(annotCanvas, (rect: Rect) => {
          handleCropDrawn(rect);
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
  }, [pdfData, pageCount, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render crop overlay on the annotation canvas
  function renderCropOverlay(canvas: AnnotationCanvas, rect: Rect): void {
    const ctx = canvas.element.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.element.width, canvas.element.height);

    // Draw semi-transparent overlay outside the crop region
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    // Top
    ctx.fillRect(0, 0, canvas.element.width, rect.y);
    // Bottom
    ctx.fillRect(
      0,
      rect.y + rect.height,
      canvas.element.width,
      canvas.element.height - rect.y - rect.height,
    );
    // Left
    ctx.fillRect(0, rect.y, rect.x, rect.height);
    // Right
    ctx.fillRect(
      rect.x + rect.width,
      rect.y,
      canvas.element.width - rect.x - rect.width,
      rect.height,
    );
    ctx.restore();

    // Draw crop border
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();

    // Draw corner handles
    const handleSize = 8;
    ctx.save();
    ctx.fillStyle = '#3B82F6';
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x, y: rect.y + rect.height },
      { x: rect.x + rect.width, y: rect.y + rect.height },
    ];
    for (const corner of corners) {
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
    }
    ctx.restore();
  }

  // Handle a new crop region drawn on the canvas
  const handleCropDrawn = useCallback(
    (rect: Rect) => {
      // Enforce minimum size of 10x10 pixels
      if (rect.width < MIN_CROP_SIZE || rect.height < MIN_CROP_SIZE) {
        toast.warning('Crop region must be at least 10×10 pixels.');
        return;
      }

      setCropRect(rect);
      setResultData(null);

      // Update numeric inputs to reflect drawn region
      setNumericX(Math.round(rect.x).toString());
      setNumericY(Math.round(rect.y).toString());
      setNumericWidth(Math.round(rect.width).toString());
      setNumericHeight(Math.round(rect.height).toString());

      // Render the crop overlay
      if (annotationCanvasRef.current) {
        renderCropOverlay(annotationCanvasRef.current, rect);
      }
    },
    [toast],
  );

  // Handle numeric coordinate input
  const handleApplyNumericCoords = useCallback(() => {
    const x = parseFloat(numericX);
    const y = parseFloat(numericY);
    const w = parseFloat(numericWidth);
    const h = parseFloat(numericHeight);

    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
      toast.warning('Please enter valid numeric values for all coordinates.');
      return;
    }

    if (w < MIN_CROP_SIZE || h < MIN_CROP_SIZE) {
      toast.warning('Crop region must be at least 10×10 pixels.');
      return;
    }

    const rect: Rect = { x, y, width: w, height: h };

    // Validate against page bounds
    if (pageWidth > 0 && pageHeight > 0) {
      const validation = validateCropRegion(rect, pageWidth, pageHeight);
      if (!validation.valid) {
        toast.error(validation.error ?? 'Invalid crop region.');
        return;
      }
    }

    setCropRect(rect);
    setResultData(null);

    // Render the crop overlay
    if (annotationCanvasRef.current) {
      renderCropOverlay(annotationCanvasRef.current, rect);
    }
  }, [numericX, numericY, numericWidth, numericHeight, pageWidth, pageHeight, toast]);

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
        setCropRect(null);
        setCurrentPage(1);
        setNumericX('');
        setNumericY('');
        setNumericWidth('');
        setNumericHeight('');
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

  // Parse selected pages from input string
  function parseSelectedPages(input: string, total: number): number[] | null {
    const pages: Set<number> = new Set();
    const parts = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end > total || start > end) {
          return null;
        }
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      } else {
        const num = parseInt(part, 10);
        if (isNaN(num) || num < 1 || num > total) {
          return null;
        }
        pages.add(num);
      }
    }

    return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
  }

  // Get the pages to apply the crop to
  function getTargetPages(): number[] | null {
    switch (applyMode) {
      case 'current':
        return [currentPage];
      case 'all':
        return Array.from({ length: pageCount }, (_, i) => i + 1);
      case 'selected': {
        const parsed = parseSelectedPages(selectedPages, pageCount);
        if (!parsed) {
          toast.error('Invalid page selection. Use format: 1, 3-5, 7');
          return null;
        }
        return parsed;
      }
    }
  }

  // Apply crop operation
  /* eslint-disable react-hooks/exhaustive-deps */
  const handleApplyCrop = useCallback(async () => {
    if (!pdfData || !cropRect) {
      toast.warning('Please define a crop region first.');
      return;
    }

    // Validate crop region against page bounds
    if (pageWidth > 0 && pageHeight > 0) {
      const validation = validateCropRegion(cropRect, pageWidth, pageHeight);
      if (!validation.valid) {
        toast.error(validation.error ?? 'The crop region is invalid.');
        return;
      }
    }

    const targetPages = getTargetPages();
    if (!targetPages) return;

    setIsProcessing(true);
    setResultData(null);
    setErrorState(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });

      const cropBox: CropBox = {
        x: cropRect.x,
        y: cropRect.y,
        width: cropRect.width,
        height: cropRect.height,
      };

      const result = await client.cropPages(pdfData, targetPages, cropBox);

      if (result.success && result.data) {
        setResultData(result.data);
        toast.success('Pages cropped successfully.');
      } else {
        const message = result.error ?? 'Failed to crop pages.';
        setErrorState({
          type: 'processing-failed',
          message,
          recoverable: true,
          retryAction: () => handleApplyCrop(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorState({
        type: 'unknown',
        message,
        recoverable: true,
        retryAction: () => handleApplyCrop(),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    pdfData,
    cropRect,
    pageWidth,
    pageHeight,
    applyMode,
    selectedPages,
    currentPage,
    pageCount,
    toast,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Download the result
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_cropped.pdf';
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

  // Clear crop region
  const handleClearCrop = useCallback(() => {
    setCropRect(null);
    setResultData(null);
    setNumericX('');
    setNumericY('');
    setNumericWidth('');
    setNumericHeight('');
    if (annotationCanvasRef.current) {
      const ctx = annotationCanvasRef.current.element.getContext('2d');
      if (ctx) {
        ctx.clearRect(
          0,
          0,
          annotationCanvasRef.current.element.width,
          annotationCanvasRef.current.element.height,
        );
      }
    }
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Crop Pages
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to crop pages to a specific region. Draw a rectangle or enter coordinates to
          define the crop area.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/crop"
          operationName="Crop"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Crop Pages
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
            setCropRect(null);
          }}
        >
          Upload different file
        </Button>
      </div>

      {/* Drawing area with page navigation */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
            Draw Crop Region — Page {currentPage} of {pageCount}
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

        {/* Canvas container for PDF page + crop overlay */}
        <div
          ref={canvasContainerRef}
          className="relative border border-secondary-200 dark:border-secondary-700 rounded-lg overflow-hidden bg-secondary-100 dark:bg-secondary-800 max-w-full"
          style={{ maxHeight: '600px', overflow: 'auto' }}
        >
          {/* PDF page and annotation canvas are rendered here dynamically */}
        </div>

        <p className="text-xs text-secondary-400 dark:text-secondary-500">
          Click and drag on the page to define the crop region. The area outside the selection will
          be removed.
        </p>
      </div>

      {/* Crop region dimensions display */}
      {cropRect && (
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
              Position:
            </span>
            <span className="text-sm text-text-light dark:text-text-dark">
              ({Math.round(cropRect.x)}, {Math.round(cropRect.y)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
              Size:
            </span>
            <span className="text-sm text-text-light dark:text-text-dark">
              {Math.round(cropRect.width)} × {Math.round(cropRect.height)} pts
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearCrop}
            className="text-xs text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Numeric coordinate input (alternative to drawing) */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
          Numeric Coordinates (alternative)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="crop-x"
              className="block text-xs text-secondary-500 dark:text-secondary-400 mb-1"
            >
              X (pts)
            </label>
            <Input
              id="crop-x"
              type="number"
              min={0}
              value={numericX}
              onChange={(e) => setNumericX(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label
              htmlFor="crop-y"
              className="block text-xs text-secondary-500 dark:text-secondary-400 mb-1"
            >
              Y (pts)
            </label>
            <Input
              id="crop-y"
              type="number"
              min={0}
              value={numericY}
              onChange={(e) => setNumericY(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label
              htmlFor="crop-width"
              className="block text-xs text-secondary-500 dark:text-secondary-400 mb-1"
            >
              Width (pts)
            </label>
            <Input
              id="crop-width"
              type="number"
              min={MIN_CROP_SIZE}
              value={numericWidth}
              onChange={(e) => setNumericWidth(e.target.value)}
              placeholder="100"
            />
          </div>
          <div>
            <label
              htmlFor="crop-height"
              className="block text-xs text-secondary-500 dark:text-secondary-400 mb-1"
            >
              Height (pts)
            </label>
            <Input
              id="crop-height"
              type="number"
              min={MIN_CROP_SIZE}
              value={numericHeight}
              onChange={(e) => setNumericHeight(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleApplyNumericCoords}>
          Apply Coordinates
        </Button>
      </div>

      {/* Page application mode */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Apply Crop To</h2>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              name="apply-mode"
              value="current"
              checked={applyMode === 'current'}
              onChange={() => setApplyMode('current')}
              className="w-4 h-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
            />
            <span className="text-sm text-text-light dark:text-text-dark">
              Current page ({currentPage})
            </span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              name="apply-mode"
              value="all"
              checked={applyMode === 'all'}
              onChange={() => setApplyMode('all')}
              className="w-4 h-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
            />
            <span className="text-sm text-text-light dark:text-text-dark">All pages</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="radio"
              name="apply-mode"
              value="selected"
              checked={applyMode === 'selected'}
              onChange={() => setApplyMode('selected')}
              className="w-4 h-4 text-primary-600 border-secondary-300 focus:ring-primary-500"
            />
            <span className="text-sm text-text-light dark:text-text-dark">Selected pages</span>
          </label>
        </div>
        {applyMode === 'selected' && (
          <div className="max-w-xs">
            <Input
              type="text"
              value={selectedPages}
              onChange={(e) => setSelectedPages(e.target.value)}
              placeholder="e.g. 1, 3-5, 7"
              aria-label="Page selection"
            />
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              Enter page numbers or ranges separated by commas.
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleApplyCrop}
          loading={isProcessing}
          disabled={isProcessing || !cropRect}
        >
          Crop Pages
        </Button>
        {resultData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Cropped PDF
          </Button>
        )}
      </div>

      {/* Error recovery state */}
      {errorState && (
        <ErrorRecovery
          error={errorState}
          onReset={() => {
            setPdfData(null);
            setFileName('');
            setResultData(null);
            setErrorState(null);
          }}
        />
      )}

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

CropPage.displayName = 'CropPage';
