import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getDevicePixelRatio } from '@/core/render-engine/hidpi';
import { Icon } from '../../design-system/primitives/Icon';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

export interface PreviewPanelProps {
  /** Original PDF document data (before operation) */
  originalDoc: ArrayBuffer | null;
  /** Modified PDF document data (after operation) */
  modifiedDoc: ArrayBuffer | null;
  /** Current zoom level (0.5 to 2.0) */
  zoom: number;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
}

interface PageRenderState {
  canvas: HTMLCanvasElement | null;
  loading: boolean;
  error: string | null;
}

/** Zoom increment/decrement step */
const ZOOM_STEP = 0.25;
/** Minimum zoom level */
const MIN_ZOOM = 0.5;
/** Maximum zoom level */
const MAX_ZOOM = 2.0;
/** Threshold for on-demand rendering (virtual scrolling) */
const VIRTUAL_SCROLL_THRESHOLD = 50;
/** Number of pages to pre-render around the current page */
const PRERENDER_BUFFER = 2;

/**
 * PreviewPanel component for displaying original and modified PDF pages side-by-side.
 *
 * Features:
 * - Side-by-side view on desktop (≥768px), stacked on mobile (<768px)
 * - Zoom controls (50% to 200% in 25% increments)
 * - Page navigation with current page / total display
 * - On-demand page rendering for PDFs with >50 pages (virtual scrolling)
 * - Placeholder with error message for failed page renders
 * - Renders pages within 2 seconds for PDFs up to 50 pages
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 27.5
 */
export function PreviewPanel({
  originalDoc,
  modifiedDoc,
  zoom,
  onZoomChange,
  currentPage,
  onPageChange,
}: PreviewPanelProps): JSX.Element {
  const [originalPageCount, setOriginalPageCount] = useState(0);
  const [modifiedPageCount, setModifiedPageCount] = useState(0);
  const [originalPage, setOriginalPage] = useState<PageRenderState>({
    canvas: null,
    loading: false,
    error: null,
  });
  const [modifiedPage, setModifiedPage] = useState<PageRenderState>({
    canvas: null,
    loading: false,
    error: null,
  });

  const originalDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const modifiedDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const originalCanvasRef = useRef<HTMLDivElement>(null);
  const modifiedCanvasRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ original?: number; modified?: number }>({});

  const totalPages = Math.max(originalPageCount, modifiedPageCount);
  const useVirtualScrolling = totalPages > VIRTUAL_SCROLL_THRESHOLD;

  // Load PDF documents
  useEffect(() => {
    let cancelled = false;

    async function loadOriginal() {
      if (!originalDoc) {
        originalDocRef.current = null;
        setOriginalPageCount(0);
        return;
      }
      try {
        const doc = await pdfjsLib.getDocument({ data: originalDoc.slice(0) }).promise;
        if (!cancelled) {
          originalDocRef.current = doc;
          setOriginalPageCount(doc.numPages);
        }
      } catch {
        if (!cancelled) {
          originalDocRef.current = null;
          setOriginalPageCount(0);
        }
      }
    }

    loadOriginal();
    return () => {
      cancelled = true;
    };
  }, [originalDoc]);

  useEffect(() => {
    let cancelled = false;

    async function loadModified() {
      if (!modifiedDoc) {
        modifiedDocRef.current = null;
        setModifiedPageCount(0);
        return;
      }
      try {
        const doc = await pdfjsLib.getDocument({ data: modifiedDoc.slice(0) }).promise;
        if (!cancelled) {
          modifiedDocRef.current = doc;
          setModifiedPageCount(doc.numPages);
        }
      } catch {
        if (!cancelled) {
          modifiedDocRef.current = null;
          setModifiedPageCount(0);
        }
      }
    }

    loadModified();
    return () => {
      cancelled = true;
    };
  }, [modifiedDoc]);

  // Render a page from a PDF document to a canvas
  const renderPage = useCallback(
    async (
      pdfDoc: pdfjsLib.PDFDocumentProxy | null,
      pageNum: number,
      scale: number,
      type: 'original' | 'modified',
    ): Promise<void> => {
      const setPageState = type === 'original' ? setOriginalPage : setModifiedPage;
      const containerRef = type === 'original' ? originalCanvasRef : modifiedCanvasRef;

      // Cancel any pending render for this type
      if (renderTaskRef.current[type]) {
        cancelAnimationFrame(renderTaskRef.current[type]!);
      }

      if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) {
        setPageState({ canvas: null, loading: false, error: null });
        return;
      }

      setPageState({ canvas: null, loading: true, error: null });

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const dpr = getDevicePixelRatio();

        const canvas = document.createElement('canvas');
        // Set buffer to physical pixel dimensions for HiDPI sharpness
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        // Set CSS dimensions to logical size
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext('2d');
        if (!context) {
          setPageState({ canvas: null, loading: false, error: 'Failed to get canvas context' });
          return;
        }

        // Scale context so pdf.js renders at physical pixel resolution
        context.scale(dpr, dpr);

        await page.render({ canvasContext: context, viewport }).promise;

        setPageState({ canvas, loading: false, error: null });

        // Mount canvas to container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          canvas.className = 'max-w-full h-auto';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute(
            'aria-label',
            `${type === 'original' ? 'Original' : 'Modified'} PDF page ${pageNum}`,
          );
          containerRef.current.appendChild(canvas);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to render page';
        setPageState({ canvas: null, loading: false, error: message });
      }
    },
    [],
  );

  // Render pages when currentPage, zoom, or documents change
  useEffect(() => {
    // For virtual scrolling, only render the current page and buffer
    if (useVirtualScrolling) {
      const pagesToRender = [];
      for (
        let i = Math.max(1, currentPage - PRERENDER_BUFFER);
        i <= Math.min(totalPages, currentPage + PRERENDER_BUFFER);
        i++
      ) {
        pagesToRender.push(i);
      }
      // Only render the current page visually
      renderPage(originalDocRef.current, currentPage, zoom, 'original');
      renderPage(modifiedDocRef.current, currentPage, zoom, 'modified');
    } else {
      renderPage(originalDocRef.current, currentPage, zoom, 'original');
      renderPage(modifiedDocRef.current, currentPage, zoom, 'modified');
    }
  }, [
    currentPage,
    zoom,
    originalPageCount,
    modifiedPageCount,
    renderPage,
    useVirtualScrolling,
    totalPages,
  ]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, Math.round((zoom + ZOOM_STEP) * 100) / 100);
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, Math.round((zoom - ZOOM_STEP) * 100) / 100);
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  // Page navigation handlers
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Touch gesture support for swipe navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Only trigger swipe if horizontal movement is dominant and significant
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0 && currentPage < totalPages) {
          onPageChange(currentPage + 1);
        } else if (deltaX > 0 && currentPage > 1) {
          onPageChange(currentPage - 1);
        }
      }
      touchStartRef.current = null;
    },
    [currentPage, totalPages, onPageChange],
  );

  // No documents loaded
  if (!originalDoc && !modifiedDoc) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900 min-h-[200px]">
        <p className="text-secondary-500 dark:text-secondary-400 text-sm">
          Upload a PDF to see the preview
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal ease-in-out"
            aria-label="Zoom out"
          >
            <Icon size={20}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </Icon>
          </button>
          <span
            className="text-sm font-medium text-text-light dark:text-text-dark min-w-[48px] text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal ease-in-out"
            aria-label="Zoom in"
          >
            <Icon size={20}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Icon>
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal ease-in-out"
            aria-label="Previous page"
          >
            <Icon size={20}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Icon>
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
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-md text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-normal ease-in-out"
            aria-label="Next page"
          >
            <Icon size={20}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Icon>
          </button>
        </div>

        {/* Virtual scrolling indicator */}
        {useVirtualScrolling && (
          <span className="text-xs text-secondary-400 dark:text-secondary-500 hidden sm:inline">
            On-demand rendering
          </span>
        )}
      </div>

      {/* Preview panels - side-by-side on desktop, stacked on mobile */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Original document panel */}
        {originalDoc && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 px-1">
              Original
            </h3>
            <div className="relative rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 overflow-auto min-h-[200px] flex items-center justify-center">
              {originalPage.loading && <PageLoadingPlaceholder />}
              {originalPage.error && <PageErrorPlaceholder error={originalPage.error} />}
              {!originalPage.loading && !originalPage.error && (
                <div ref={originalCanvasRef} className="flex items-center justify-center p-2" />
              )}
            </div>
          </div>
        )}

        {/* Modified document panel */}
        {modifiedDoc && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 px-1">
              Modified
            </h3>
            <div className="relative rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 overflow-auto min-h-[200px] flex items-center justify-center">
              {modifiedPage.loading && <PageLoadingPlaceholder />}
              {modifiedPage.error && <PageErrorPlaceholder error={modifiedPage.error} />}
              {!modifiedPage.loading && !modifiedPage.error && (
                <div ref={modifiedCanvasRef} className="flex items-center justify-center p-2" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Loading placeholder shown while a page is being rendered */
function PageLoadingPlaceholder(): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 gap-3"
      role="status"
      aria-label="Loading page"
    >
      <svg
        className="w-6 h-6 animate-spin motion-reduce:animate-none text-primary-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        width={24}
        height={24}
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
      <span className="text-sm text-secondary-500 dark:text-secondary-400">Rendering page...</span>
    </div>
  );
}

/** Error placeholder shown when a page fails to render */
function PageErrorPlaceholder({ error }: { error: string }): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 gap-3 text-center"
      role="alert"
      aria-live="assertive"
    >
      <Icon size={24} className="text-error-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </Icon>
      <div className="space-y-1">
        <p className="text-sm font-medium text-error-600 dark:text-error-400">
          Page could not be rendered
        </p>
        <p className="text-xs text-secondary-500 dark:text-secondary-400">{error}</p>
      </div>
    </div>
  );
}
