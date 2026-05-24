import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { annotationEngine } from '@/core/annotation-engine/tools';
import {
  createSignatureDrawHandler,
  attachInputListeners,
  destroyAnnotationCanvas,
} from '@/core/annotation-engine/tools';
import type { AnnotationCanvas } from '@/core/annotation-engine/index';
import type { PdfPage } from '@/types/pdf';
import type { Stroke } from '@/types/annotations';
import type { Point } from '@/types/common';

/**
 * Default stroke color for signature drawing.
 */
const DEFAULT_STROKE_COLOR = '#000000';

/**
 * Default stroke width in pixels.
 */
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Predefined stroke color options.
 */
const STROKE_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#1D4ED8', label: 'Blue' },
  { value: '#DC2626', label: 'Red' },
  { value: '#059669', label: 'Green' },
];

/**
 * Signature canvas dimensions (used for the drawing pad).
 */
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;

/**
 * SignaturePage component - Allows users to draw a freehand signature and place it on a PDF page.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Freehand drawing canvas with ≤16ms latency (requestAnimationFrame)
 * - Configurable stroke color and width (1-10px)
 * - Position controls for placing the signature on the page
 * - Clear and redraw support
 * - Validates non-empty strokes before confirming
 * - Preview of the result via PreviewPanel
 * - Download the signed PDF
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7
 */
export function SignaturePage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Signature drawing state
  const [strokeColor, setStrokeColor] = useState<string>(DEFAULT_STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Position controls
  const [positionX, setPositionX] = useState<number>(50);
  const [positionY, setPositionY] = useState<number>(50);

  // Operation state
  const [isApplying, setIsApplying] = useState(false);
  const [resultData, setResultData] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Canvas refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<AnnotationCanvas | null>(null);
  const drawHandlerRef = useRef<ReturnType<typeof createSignatureDrawHandler> | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  // Initialize the drawing canvas
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;

    // Create a PdfPage-like object for the signature pad
    const page: PdfPage = {
      pageNumber: 1,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      rotation: 0,
    };

    const annotationCanvas = annotationEngine.initCanvas(container, page);
    annotationEngine.setTool(annotationCanvas, 'signature');
    annotationCanvasRef.current = annotationCanvas;

    // Set up the draw handler
    const handler = createSignatureDrawHandler(annotationCanvas, strokeColor, strokeWidth);
    drawHandlerRef.current = handler;

    // Attach input listeners
    const cleanup = attachInputListeners(annotationCanvas, {
      start: handler.start,
      move: handler.move,
      end: () => {
        handler.end();
        // Update strokes state after each stroke ends
        const currentStrokes = handler.getStrokes();
        setStrokes([...currentStrokes]);
        setHasDrawn(currentStrokes.length > 0);
      },
    });
    cleanupListenersRef.current = cleanup;

    return () => {
      cleanup();
      destroyAnnotationCanvas(annotationCanvas);
      annotationCanvasRef.current = null;
      drawHandlerRef.current = null;
      cleanupListenersRef.current = null;
    };
    // We intentionally only run this on mount/unmount and when color/width changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokeColor, strokeWidth]);

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

  // Clear the signature canvas
  const handleClear = useCallback(() => {
    if (drawHandlerRef.current) {
      drawHandlerRef.current.clear();
    }
    setStrokes([]);
    setHasDrawn(false);
  }, []);

  // Apply signature to PDF
  const handleApplySignature = useCallback(async () => {
    if (!pdfData) return;

    // Validate non-empty strokes (Requirement 15.7)
    if (!hasDrawn || strokes.length === 0) {
      toast.error('A signature must be drawn before confirming.');
      return;
    }

    setIsApplying(true);
    setResultData(null);

    try {
      const position: Point = { x: positionX, y: positionY };

      // Use the annotation engine to create the annotation data
      // Then embed it via the PDF worker client
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });

      // Build the annotation data directly
      const annotationData = {
        id: `signature-${Date.now()}`,
        tool: 'signature' as const,
        page: currentPage,
        rect: {
          x: position.x,
          y: position.y,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        },
        data: {
          strokes,
          position,
        },
      };

      const result = await client.embedAnnotation(pdfData, annotationData);

      if (result.success && result.data) {
        setResultData(result.data);
        toast.success('Signature applied successfully.');
      } else {
        toast.error(result.error ?? 'Failed to apply signature to the PDF.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsApplying(false);
    }
  }, [pdfData, hasDrawn, strokes, positionX, positionY, currentPage, toast]);

  // Download the signed PDF
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_signed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [resultData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setResultData(null);
    handleClear();
  }, [handleClear]);

  // Handle stroke width change
  const handleStrokeWidthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1));
    setStrokeWidth(value);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Signature
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to draw and place a freehand signature on it.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/signature"
          operationName="Signature"
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
            Signature
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Signature Drawing Pad */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
          Draw Your Signature
        </h2>

        {/* Stroke Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500 dark:text-secondary-400">Color:</label>
            <div className="flex gap-1">
              {STROKE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setStrokeColor(color.value)}
                  className={[
                    'w-7 h-7 min-w-[44px] min-h-[44px] rounded-full border-2 flex items-center justify-center transition-all duration-150',
                    strokeColor === color.value
                      ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                      : 'border-secondary-300 dark:border-secondary-600 hover:border-secondary-400',
                  ].join(' ')}
                  aria-label={`${color.label} stroke color`}
                  aria-pressed={strokeColor === color.value}
                >
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }} />
                </button>
              ))}
            </div>
          </div>

          {/* Width slider */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="stroke-width"
              className="text-xs text-secondary-500 dark:text-secondary-400"
            >
              Width:
            </label>
            <input
              id="stroke-width"
              type="range"
              min={1}
              max={10}
              value={strokeWidth}
              onChange={handleStrokeWidthChange}
              className="w-24 h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer dark:bg-secondary-700 min-h-[44px]"
              aria-label={`Stroke width: ${strokeWidth}px`}
            />
            <span className="text-xs text-secondary-500 dark:text-secondary-400 min-w-[32px]">
              {strokeWidth}px
            </span>
          </div>
        </div>

        {/* Drawing Canvas */}
        <div
          ref={canvasContainerRef}
          className="relative w-full border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 overflow-hidden"
          style={{ maxWidth: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
          aria-label="Signature drawing area"
        />

        {/* Clear button */}
        <div className="flex gap-3 mt-3">
          <Button variant="outline" size="sm" onClick={handleClear} disabled={!hasDrawn}>
            Clear Signature
          </Button>
        </div>
      </div>

      {/* Position Controls */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
          Signature Position
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="position-x"
              className="block text-xs text-secondary-500 dark:text-secondary-400 mb-1"
            >
              X Position (px)
            </label>
            <input
              id="position-x"
              type="number"
              min={0}
              value={positionX}
              onChange={(e) => setPositionX(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-text-light dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
          <div>
            <label
              htmlFor="position-y"
              className="block text-xs text-secondary-500 dark:text-secondary-400 mb-1"
            >
              Y Position (px)
            </label>
            <input
              id="position-y"
              type="number"
              min={0}
              value={positionY}
              onChange={(e) => setPositionY(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-text-light dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleApplySignature}
          loading={isApplying}
          disabled={isApplying || !hasDrawn}
        >
          {isApplying ? 'Applying Signature...' : 'Apply Signature'}
        </Button>
        {resultData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Signed PDF
          </Button>
        )}
      </div>

      {/* Preview Panel */}
      <PreviewPanel
        originalDoc={pdfData}
        modifiedDoc={resultData}
        zoom={zoom}
        onZoomChange={setZoom}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

SignaturePage.displayName = 'SignaturePage';
