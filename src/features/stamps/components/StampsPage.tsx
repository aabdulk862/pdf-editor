import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { annotationEngine } from '@/core/annotation-engine/tools';
import type { AnnotationCanvas } from '@/core/annotation-engine/index';
import type { StampType } from '@/types/operations';
import type { Point, Size } from '@/types/common';
import type { PdfPage } from '@/types/pdf';

/** Stamp size constraints (pixels). */
const MIN_STAMP_SIZE = 50;
const MAX_STAMP_SIZE = 500;
const DEFAULT_STAMP_SIZE = 150;

/** Available stamp types with display metadata. */
const STAMP_OPTIONS: { type: StampType; label: string; color: string }[] = [
  { type: 'APPROVED', label: 'APPROVED', color: '#22C55E' },
  { type: 'DRAFT', label: 'DRAFT', color: '#F59E0B' },
  { type: 'CONFIDENTIAL', label: 'CONFIDENTIAL', color: '#EF4444' },
];

/**
 * StampsPage component - Allows users to add predefined stamps to PDF pages.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Select from predefined stamps (APPROVED, DRAFT, CONFIDENTIAL)
 * - Resize stamp between 50-500px
 * - Reposition stamp on the page via click
 * - Real-time preview of stamp placement
 * - Cancel to discard stamp before confirming
 * - Embed stamp into PDF via annotation engine
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7
 */
export function StampsPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Stamp configuration state
  const [selectedStamp, setSelectedStamp] = useState<StampType | null>(null);
  const [stampSize, setStampSize] = useState<number>(DEFAULT_STAMP_SIZE);
  const [stampPosition, setStampPosition] = useState<Point>({ x: 100, y: 100 });

  // Annotation state
  const [annotationCanvas, setAnnotationCanvas] = useState<AnnotationCanvas | null>(null);
  const [currentAnnotationId, setCurrentAnnotationId] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Preview state
  const [modifiedData, setModifiedData] = useState<ArrayBuffer | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Operation state
  const [isEmbedding, setIsEmbedding] = useState(false);

  // Refs for canvas interaction
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef<Point>({ x: 0, y: 0 });

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
        setModifiedData(null);
        setSelectedStamp(null);
        setIsPlacing(false);
        setCurrentAnnotationId(null);
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

  // Initialize annotation canvas when PDF is loaded
  useEffect(() => {
    if (!pdfData || !canvasContainerRef.current) return;

    // Create a mock page for the annotation canvas
    const page: PdfPage = {
      pageNumber: currentPage,
      width: 612, // Standard US Letter width in points
      height: 792, // Standard US Letter height in points
      rotation: 0,
    };

    const canvas = annotationEngine.initCanvas(canvasContainerRef.current, page);
    annotationEngine.setTool(canvas, 'stamp');
    setAnnotationCanvas(canvas);

    return () => {
      if (canvas) {
        annotationEngine.clear(canvas);
      }
    };
  }, [pdfData, currentPage]);

  // Update stamp preview on the canvas when stamp config changes
  useEffect(() => {
    if (!annotationCanvas || !selectedStamp || !isPlacing) return;

    // Remove previous annotation if exists
    if (currentAnnotationId) {
      annotationEngine.removeAnnotation(annotationCanvas, currentAnnotationId);
    }

    // Add new stamp at current position with current size
    const size: Size = { width: stampSize, height: stampSize };
    const id = annotationEngine.addStamp(annotationCanvas, selectedStamp, stampPosition, size);
    setCurrentAnnotationId(id);
  }, [annotationCanvas, selectedStamp, stampSize, stampPosition, isPlacing, currentAnnotationId]);

  // Handle stamp selection
  const handleStampSelect = useCallback((stamp: StampType) => {
    setSelectedStamp(stamp);
    setIsPlacing(true);
    setStampPosition({ x: 100, y: 100 });
    setStampSize(DEFAULT_STAMP_SIZE);
    setModifiedData(null);
  }, []);

  // Handle stamp size change
  const handleSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setStampSize(Math.min(MAX_STAMP_SIZE, Math.max(MIN_STAMP_SIZE, value)));
    }
  }, []);

  // Handle canvas click for repositioning
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacing || !selectedStamp) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 612;
      const y = ((e.clientY - rect.top) / rect.height) * 792;

      // Check if clicking on the stamp (for dragging)
      if (
        x >= stampPosition.x &&
        x <= stampPosition.x + stampSize &&
        y >= stampPosition.y &&
        y <= stampPosition.y + stampSize
      ) {
        isDragging.current = true;
        dragOffset.current = {
          x: x - stampPosition.x,
          y: y - stampPosition.y,
        };
      } else {
        // Place stamp at click position (centered)
        const newX = Math.max(0, Math.min(612 - stampSize, x - stampSize / 2));
        const newY = Math.max(0, Math.min(792 - stampSize, y - stampSize / 2));
        setStampPosition({ x: newX, y: newY });
      }
    },
    [isPlacing, selectedStamp, stampPosition, stampSize],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging.current || !isPlacing) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 612;
      const y = ((e.clientY - rect.top) / rect.height) * 792;

      const newX = Math.max(0, Math.min(612 - stampSize, x - dragOffset.current.x));
      const newY = Math.max(0, Math.min(792 - stampSize, y - dragOffset.current.y));
      setStampPosition({ x: newX, y: newY });
    },
    [isPlacing, stampSize],
  );

  const handleCanvasMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Cancel stamp placement
  const handleCancel = useCallback(() => {
    if (annotationCanvas && currentAnnotationId) {
      annotationEngine.removeAnnotation(annotationCanvas, currentAnnotationId);
    }
    setSelectedStamp(null);
    setIsPlacing(false);
    setCurrentAnnotationId(null);
    setStampPosition({ x: 100, y: 100 });
    setStampSize(DEFAULT_STAMP_SIZE);
    setModifiedData(null);
  }, [annotationCanvas, currentAnnotationId]);

  // Confirm and embed stamp into PDF
  const handleConfirm = useCallback(async () => {
    if (!pdfData || !selectedStamp || !annotationCanvas) return;

    setIsEmbedding(true);

    try {
      const annotations = annotationEngine.getAnnotations(annotationCanvas);
      const stampAnnotation = annotations.find((a) => a.id === currentAnnotationId);

      if (!stampAnnotation) {
        toast.error('No stamp annotation found to embed.');
        return;
      }

      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.embedAnnotation(pdfData, stampAnnotation);

      if (result.success && result.data) {
        setModifiedData(result.data);
        toast.success('Stamp embedded successfully.');
        // Reset placement state
        setIsPlacing(false);
        setCurrentAnnotationId(null);
        setSelectedStamp(null);
      } else {
        toast.error(result.error ?? 'Failed to embed stamp into the PDF.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsEmbedding(false);
    }
  }, [pdfData, selectedStamp, annotationCanvas, currentAnnotationId, toast]);

  // Download the modified PDF
  const handleDownload = useCallback(() => {
    if (!modifiedData) return;

    const blob = new Blob([modifiedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_stamped.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [modifiedData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setModifiedData(null);
    setSelectedStamp(null);
    setIsPlacing(false);
    setCurrentAnnotationId(null);
    setStampPosition({ x: 100, y: 100 });
    setStampSize(DEFAULT_STAMP_SIZE);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Stamps
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to add predefined stamps like APPROVED, DRAFT, or CONFIDENTIAL.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/stamps"
          operationName="Stamps"
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
            Stamps
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Stamp picker */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
          Select Stamp
        </h2>
        <div className="flex flex-wrap gap-3">
          {STAMP_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => handleStampSelect(option.type)}
              className={[
                'min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all duration-150',
                selectedStamp === option.type
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-300'
                  : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-300 dark:hover:border-primary-600',
              ].join(' ')}
              style={{ color: option.color }}
              aria-pressed={selectedStamp === option.type}
              aria-label={`Select ${option.label} stamp`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stamp controls (visible when placing) */}
      {isPlacing && selectedStamp && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
            Stamp Settings
          </h2>

          {/* Size control */}
          <div className="space-y-2">
            <label
              htmlFor="stamp-size"
              className="block text-sm text-secondary-600 dark:text-secondary-400"
            >
              Size: {stampSize}px
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-secondary-500 dark:text-secondary-400">
                {MIN_STAMP_SIZE}px
              </span>
              <input
                id="stamp-size"
                type="range"
                min={MIN_STAMP_SIZE}
                max={MAX_STAMP_SIZE}
                value={stampSize}
                onChange={handleSizeChange}
                className="flex-1 h-2 bg-secondary-200 dark:bg-secondary-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                aria-label={`Stamp size: ${stampSize} pixels`}
              />
              <span className="text-xs text-secondary-500 dark:text-secondary-400">
                {MAX_STAMP_SIZE}px
              </span>
            </div>
          </div>

          {/* Position display */}
          <div className="mt-3 text-xs text-secondary-500 dark:text-secondary-400">
            Position: ({Math.round(stampPosition.x)}, {Math.round(stampPosition.y)}) — Click on the
            preview to reposition, or drag the stamp.
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={isEmbedding}
              disabled={isEmbedding}
            >
              {isEmbedding ? 'Embedding...' : 'Confirm Stamp'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isEmbedding}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Interactive canvas area for stamp placement */}
      {isPlacing && selectedStamp && (
        <div className="rounded-lg border border-secondary-200 bg-white dark:border-secondary-700 dark:bg-secondary-800 overflow-hidden">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark px-4 pt-3 pb-2">
            Place Stamp on Page
          </h2>
          <div
            ref={canvasContainerRef}
            className="relative w-full bg-secondary-100 dark:bg-secondary-900 cursor-crosshair"
            style={{ aspectRatio: '612 / 792', maxHeight: '600px' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            role="application"
            aria-label="Stamp placement area. Click to position the stamp."
          >
            {/* Visual stamp preview overlay */}
            <div
              className="absolute border-2 border-dashed flex items-center justify-center font-bold select-none pointer-events-none"
              style={{
                left: `${(stampPosition.x / 612) * 100}%`,
                top: `${(stampPosition.y / 792) * 100}%`,
                width: `${(stampSize / 612) * 100}%`,
                height: `${(stampSize / 792) * 100}%`,
                borderColor: STAMP_OPTIONS.find((o) => o.type === selectedStamp)?.color,
                color: STAMP_OPTIONS.find((o) => o.type === selectedStamp)?.color,
                fontSize: `${Math.max(10, stampSize * 0.12)}px`,
              }}
              aria-hidden="true"
            >
              {selectedStamp}
            </div>
          </div>
        </div>
      )}

      {/* Preview panel */}
      <PreviewPanel
        originalDoc={pdfData}
        modifiedDoc={modifiedData}
        zoom={zoom}
        onZoomChange={setZoom}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Download button */}
      {modifiedData && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleDownload}>
            Download Stamped PDF
          </Button>
        </div>
      )}
    </div>
  );
}

StampsPage.displayName = 'StampsPage';
