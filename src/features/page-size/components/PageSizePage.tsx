import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { validateDimension } from '@/utils/validation';
import type { PageSize } from '@/types/operations';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/** Predefined page sizes in mm */
const PREDEFINED_SIZES = [
  { label: 'A4', width: 210, height: 297 },
  { label: 'Letter', width: 216, height: 279 },
  { label: 'Legal', width: 216, height: 356 },
] as const;

type Orientation = 'portrait' | 'landscape';
type ApplyMode = 'single' | 'selected' | 'all';
type SizeMode = 'predefined' | 'custom';

interface PageThumbnail {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  loading: boolean;
  error: string | null;
}

/**
 * PageSizePage component - Allows users to change page size and orientation of PDF pages.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Select predefined sizes (A4, Letter, Legal) or enter custom dimensions (25-3000mm)
 * - Toggle between portrait and landscape orientation
 * - Apply to single page, selected pages, or all pages
 * - Preview resized result before downloading
 * - Validate custom dimensions in range
 *
 * Requirements: 46.1, 46.2, 46.3, 46.4, 46.5, 46.6, 46.7
 */
export function PageSizePage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);

  // Size configuration
  const [sizeMode, setSizeMode] = useState<SizeMode>('predefined');
  const [selectedPreset, setSelectedPreset] = useState<number>(0); // index into PREDEFINED_SIZES
  const [customWidth, setCustomWidth] = useState<string>('210');
  const [customHeight, setCustomHeight] = useState<string>('297');
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  // Page selection
  const [applyMode, setApplyMode] = useState<ApplyMode>('all');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [currentSinglePage, setCurrentSinglePage] = useState<number>(1);

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizedData, setResizedData] = useState<ArrayBuffer | null>(null);

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
      setResizedData(null);
      return;
    }

    let cancelled = false;

    async function loadPdf() {
      try {
        const doc = await pdfjsLib.getDocument({ data: pdfData!.slice(0) }).promise;
        if (cancelled) return;

        pdfDocRef.current = doc;
        setPageCount(doc.numPages);

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
        setResizedData(null);
        setSelectedPages(new Set());
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

  // Get the effective dimensions based on current settings
  const getEffectiveDimensions = useCallback((): { width: number; height: number } | null => {
    let w: number;
    let h: number;

    if (sizeMode === 'predefined') {
      const preset = PREDEFINED_SIZES[selectedPreset];
      w = preset.width;
      h = preset.height;
    } else {
      w = parseFloat(customWidth);
      h = parseFloat(customHeight);

      if (isNaN(w) || isNaN(h)) return null;
    }

    // Apply orientation: portrait means width < height, landscape means width > height
    if (orientation === 'landscape') {
      return { width: Math.max(w, h), height: Math.min(w, h) };
    }
    return { width: Math.min(w, h), height: Math.max(w, h) };
  }, [sizeMode, selectedPreset, customWidth, customHeight, orientation]);

  // Get the pages to apply the resize to
  const getTargetPages = useCallback((): number[] => {
    if (applyMode === 'all') {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    if (applyMode === 'single') {
      return [currentSinglePage];
    }
    // selected
    return Array.from(selectedPages).sort((a, b) => a - b);
  }, [applyMode, pageCount, currentSinglePage, selectedPages]);

  // Resize operation
  const handleResize = useCallback(async () => {
    if (!pdfData) return;

    const dims = getEffectiveDimensions();
    if (!dims) {
      toast.error('Please enter valid dimensions.');
      return;
    }

    // Validate custom dimensions
    if (sizeMode === 'custom') {
      const widthValidation = validateDimension(dims.width);
      if (!widthValidation.valid) {
        toast.error(widthValidation.error ?? 'Invalid width. Must be between 25mm and 3000mm.');
        return;
      }
      const heightValidation = validateDimension(dims.height);
      if (!heightValidation.valid) {
        toast.error(heightValidation.error ?? 'Invalid height. Must be between 25mm and 3000mm.');
        return;
      }
    }

    const targetPages = getTargetPages();
    if (targetPages.length === 0) {
      toast.error('Please select at least one page.');
      return;
    }

    setIsProcessing(true);
    setResizedData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const size: PageSize = {
        width: dims.width,
        height: dims.height,
        orientation,
      };
      const result = await client.resizePages(pdfData, targetPages, size);

      if (result.success && result.data) {
        setResizedData(result.data);
        toast.success('Pages resized successfully.');
      } else {
        toast.error(result.error ?? 'Failed to resize pages.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfData, getEffectiveDimensions, getTargetPages, sizeMode, orientation, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!resizedData) return;

    const blob = new Blob([resizedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_resized.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [resizedData, fileName]);

  // Page selection toggle
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

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Page Size
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to change page size and orientation.
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
            Page Size
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
            setResizedData(null);
          }}
        >
          Upload different file
        </Button>
      </div>

      {/* Size selection */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800 space-y-4">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Page Size</h2>

        {/* Size mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSizeMode('predefined')}
            className={[
              'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-background-dark',
              sizeMode === 'predefined'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
            ].join(' ')}
            aria-pressed={sizeMode === 'predefined'}
          >
            Predefined
          </button>
          <button
            type="button"
            onClick={() => setSizeMode('custom')}
            className={[
              'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-background-dark',
              sizeMode === 'custom'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
            ].join(' ')}
            aria-pressed={sizeMode === 'custom'}
          >
            Custom
          </button>
        </div>

        {/* Predefined sizes */}
        {sizeMode === 'predefined' && (
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_SIZES.map((size, index) => (
              <button
                key={size.label}
                type="button"
                onClick={() => setSelectedPreset(index)}
                className={[
                  'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                  'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  'dark:focus-visible:ring-offset-background-dark',
                  selectedPreset === index
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
                ].join(' ')}
                aria-pressed={selectedPreset === index}
                aria-label={`${size.label} (${size.width}×${size.height}mm)`}
              >
                <span>{size.label}</span>
                <span className="ml-2 text-xs text-secondary-500 dark:text-secondary-400">
                  {size.width}×{size.height}mm
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Custom dimensions */}
        {sizeMode === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="custom-width"
                className="text-xs text-secondary-600 dark:text-secondary-400"
              >
                Width (mm)
              </label>
              <input
                id="custom-width"
                type="number"
                min={25}
                max={3000}
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className="w-24 min-h-[44px] px-3 py-2 rounded-md border border-secondary-300 bg-white text-sm text-text-light dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Custom width in millimeters"
              />
            </div>
            <span className="text-secondary-400 pb-2">×</span>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="custom-height"
                className="text-xs text-secondary-600 dark:text-secondary-400"
              >
                Height (mm)
              </label>
              <input
                id="custom-height"
                type="number"
                min={25}
                max={3000}
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                className="w-24 min-h-[44px] px-3 py-2 rounded-md border border-secondary-300 bg-white text-sm text-text-light dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Custom height in millimeters"
              />
            </div>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 w-full mt-1">
              Valid range: 25mm – 3000mm
            </p>
          </div>
        )}

        {/* Orientation toggle */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
            Orientation
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={[
                'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'dark:focus-visible:ring-offset-background-dark',
                orientation === 'portrait'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
              ].join(' ')}
              aria-pressed={orientation === 'portrait'}
              aria-label="Portrait orientation"
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 32"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="28" rx="2" strokeWidth="2" />
              </svg>
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={[
                'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
                'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'dark:focus-visible:ring-offset-background-dark',
                orientation === 'landscape'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
              ].join(' ')}
              aria-pressed={orientation === 'landscape'}
              aria-label="Landscape orientation"
            >
              <svg
                className="w-5 h-4 mr-2"
                viewBox="0 0 32 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="28" height="20" rx="2" strokeWidth="2" />
              </svg>
              Landscape
            </button>
          </div>
        </div>
      </div>

      {/* Apply mode */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800 space-y-4">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Apply To</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setApplyMode('all')}
            className={[
              'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-background-dark',
              applyMode === 'all'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
            ].join(' ')}
            aria-pressed={applyMode === 'all'}
          >
            All Pages
          </button>
          <button
            type="button"
            onClick={() => setApplyMode('single')}
            className={[
              'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-background-dark',
              applyMode === 'single'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
            ].join(' ')}
            aria-pressed={applyMode === 'single'}
          >
            Single Page
          </button>
          <button
            type="button"
            onClick={() => setApplyMode('selected')}
            className={[
              'inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-background-dark',
              applyMode === 'selected'
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                : 'border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700',
            ].join(' ')}
            aria-pressed={applyMode === 'selected'}
          >
            Selected Pages
          </button>
        </div>

        {/* Single page selector */}
        {applyMode === 'single' && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="single-page-input"
              className="text-xs text-secondary-600 dark:text-secondary-400"
            >
              Page number:
            </label>
            <input
              id="single-page-input"
              type="number"
              min={1}
              max={pageCount}
              value={currentSinglePage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= pageCount) {
                  setCurrentSinglePage(val);
                }
              }}
              className="w-20 min-h-[44px] px-3 py-2 rounded-md border border-secondary-300 bg-white text-sm text-text-light dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Page number to resize"
            />
            <span className="text-xs text-secondary-500 dark:text-secondary-400">
              of {pageCount}
            </span>
          </div>
        )}

        {/* Selected pages thumbnail grid */}
        {applyMode === 'selected' && (
          <div className="space-y-2">
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              Click pages to select ({selectedPages.size} selected)
            </p>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
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
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleResize}
          loading={isProcessing}
          disabled={isProcessing}
        >
          {isProcessing ? 'Resizing...' : 'Resize Pages'}
        </Button>
        {resizedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Resized PDF
          </Button>
        )}
      </div>

      {/* Preview */}
      {resizedData && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Preview</h2>
          <PreviewPanel
            originalDoc={pdfData}
            modifiedDoc={resizedData}
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
            className="w-5 h-5 animate-spin text-secondary-400"
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
        {thumbnail.pageNumber}
      </span>
    </button>
  );
}

PageSizePage.displayName = 'PageSizePage';
