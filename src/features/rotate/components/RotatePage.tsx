import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

type RotationAngle = 90 | 180 | 270;

interface PageThumbnail {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  loading: boolean;
  error: string | null;
}

/**
 * RotatePage component - Allows users to rotate selected pages in a PDF by 90°, 180°, or 270°.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - View page thumbnails and select pages to rotate
 * - Choose rotation angle (90°, 180°, 270° clockwise)
 * - Preview rotated result before downloading
 * - Download the rotated PDF
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export function RotatePage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Page thumbnails
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [pageCount, setPageCount] = useState(0);

  // Selection state
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [selectedAngle, setSelectedAngle] = useState<RotationAngle | null>(null);

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [rotatedData, setRotatedData] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF and generate thumbnails
  useEffect(() => {
    if (!pdfData) {
      pdfDocRef.current = null;
      setThumbnails([]);
      setPageCount(0);
      setSelectedPages(new Set());
      setRotatedData(null);
      return;
    }

    let cancelled = false;

    async function loadPdf() {
      try {
        const doc = await pdfjsLib.getDocument({ data: pdfData!.slice(0) }).promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        setPageCount(doc.numPages);

        // Initialize thumbnails
        const initialThumbnails: PageThumbnail[] = Array.from({ length: doc.numPages }, (_, i) => ({
          pageNumber: i + 1,
          canvas: null,
          loading: true,
          error: null,
        }));
        setThumbnails(initialThumbnails);

        // Render thumbnails
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
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
            if (!ctx) throw new Error('Failed to get canvas context');

            await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

            if (!cancelled) {
              setThumbnails((prev) =>
                prev.map((t) => (t.pageNumber === i ? { ...t, canvas, loading: false } : t)),
              );
            }
          } catch (err) {
            if (!cancelled) {
              const errorMsg = err instanceof Error ? err.message : 'Failed to render';
              setThumbnails((prev) =>
                prev.map((t) =>
                  t.pageNumber === i ? { ...t, loading: false, error: errorMsg } : t,
                ),
              );
            }
          }
        }
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
        setRotatedData(null);
        setSelectedPages(new Set());
        setSelectedAngle(null);
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

  // Page selection
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

  const selectAllPages = useCallback(() => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
  }, [pageCount]);

  const deselectAllPages = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  // Rotation
  const handleRotate = useCallback(async () => {
    if (!pdfData) return;

    if (selectedPages.size === 0) {
      toast.error('Please select at least one page to rotate.');
      return;
    }

    if (!selectedAngle) {
      toast.error('Please select a rotation angle.');
      return;
    }

    setIsProcessing(true);
    setRotatedData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.rotatePages(
        pdfData,
        Array.from(selectedPages).sort((a, b) => a - b),
        selectedAngle,
      );

      if (result.success && result.data) {
        setRotatedData(result.data);
        toast.success('Pages rotated successfully.');
      } else {
        toast.error(result.error ?? 'Failed to rotate pages.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, selectedPages, selectedAngle, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!rotatedData) return;

    const blob = new Blob([rotatedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_rotated.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rotatedData, fileName]);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Rotate Pages
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to rotate its pages by 90°, 180°, or 270° clockwise.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Rotate Pages
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
            setRotatedData(null);
          }}
        >
          Upload different file
        </Button>
      </div>

      {/* Angle picker */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Rotation Angle</h2>
        <div className="flex flex-wrap gap-2">
          {([90, 180, 270] as RotationAngle[]).map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() => setSelectedAngle(angle)}
              className={[
                'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'dark:focus-visible:ring-offset-background-dark',
                selectedAngle === angle
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
              ].join(' ')}
              aria-pressed={selectedAngle === angle}
              aria-label={`Rotate ${angle} degrees clockwise`}
            >
              <RotationIcon angle={angle} />
              <span className="ml-2">{angle}°</span>
            </button>
          ))}
        </div>
      </div>

      {/* Page selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
            Select Pages ({selectedPages.size} of {pageCount} selected)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllPages}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={deselectAllPages}
              className="text-xs text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              Deselect all
            </button>
          </div>
        </div>

        {/* Thumbnail grid */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          }}
        >
          {thumbnails.map((thumb) => (
            <PageThumbnailCard
              key={thumb.pageNumber}
              thumbnail={thumb}
              isSelected={selectedPages.has(thumb.pageNumber)}
              onToggle={() => togglePageSelection(thumb.pageNumber)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleRotate}
          loading={isProcessing}
          disabled={isProcessing}
        >
          Rotate Selected Pages
        </Button>
        {rotatedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Rotated PDF
          </Button>
        )}
      </div>

      {/* Preview */}
      {rotatedData && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Preview</h2>
          <PreviewPanel
            originalDoc={pdfData}
            modifiedDoc={rotatedData}
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

/** Thumbnail card for a single page */
function PageThumbnailCard({
  thumbnail,
  isSelected,
  onToggle,
}: {
  thumbnail: PageThumbnail;
  isSelected: boolean;
  onToggle: () => void;
}): JSX.Element {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thumbnail.canvas && canvasContainerRef.current) {
      canvasContainerRef.current.innerHTML = '';
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = thumbnail.canvas.width;
      clonedCanvas.height = thumbnail.canvas.height;
      const ctx = clonedCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(thumbnail.canvas, 0, 0);
      }
      clonedCanvas.className = 'w-full h-auto';
      clonedCanvas.setAttribute('aria-hidden', 'true');
      canvasContainerRef.current.appendChild(clonedCanvas);
    }
  }, [thumbnail.canvas]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-label={`Page ${thumbnail.pageNumber}${isSelected ? ' (selected)' : ''}`}
      className={[
        'relative flex flex-col items-center rounded-lg border-2 p-2 transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-background-dark',
        'min-w-[44px] min-h-[44px]',
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
          : 'border-secondary-200 bg-white hover:border-secondary-400 dark:border-secondary-700 dark:bg-secondary-800 dark:hover:border-secondary-500',
      ].join(' ')}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Thumbnail content */}
      <div className="w-full aspect-[3/4] flex items-center justify-center overflow-hidden rounded bg-secondary-100 dark:bg-secondary-700">
        {thumbnail.loading && (
          <svg
            className="w-6 h-6 animate-spin text-secondary-400"
            xmlns="http://www.w3.org/2000/svg"
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
        )}
        {thumbnail.error && <span className="text-xs text-error-500 text-center px-1">Error</span>}
        {!thumbnail.loading && !thumbnail.error && (
          <div
            ref={canvasContainerRef}
            className="w-full h-full flex items-center justify-center"
          />
        )}
      </div>

      {/* Page number */}
      <span className="mt-1 text-xs font-medium text-secondary-600 dark:text-secondary-300">
        Page {thumbnail.pageNumber}
      </span>
    </button>
  );
}

/** Rotation icon showing the direction of rotation */
function RotationIcon({ angle }: { angle: RotationAngle }): JSX.Element {
  // Simple rotation arrow icon
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transform: angle === 270 ? 'scaleX(-1)' : undefined }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={
          angle === 180
            ? 'M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0116 0M20 15a9 9 0 01-16 0'
            : 'M4 4v5h5M20 20v-5h-5M4.929 9.071A8 8 0 0112 4c4.418 0 8 3.582 8 8'
        }
      />
    </svg>
  );
}

RotatePage.displayName = 'RotatePage';
