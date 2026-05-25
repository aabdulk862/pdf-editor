import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getDevicePixelRatio } from '@/core/render-engine/hidpi';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import * as pdfjsLib from 'pdfjs-dist';

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
 * ReorderPage feature component.
 * Allows users to reorder PDF pages via drag-and-drop with visual thumbnails.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function ReorderPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Page order state - array of original page numbers in current display order
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Operation state
  const [processing, setProcessing] = useState(false);
  const [resultData, setResultData] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Handle file upload
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        // Validate it's a valid PDF by trying to load it
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        pdfDocRef.current = doc;

        setPdfData(arrayBuffer);
        setFileName(file.name);
        setResultData(null);

        // Initialize page order
        const pageCount = doc.numPages;
        const order = Array.from({ length: pageCount }, (_, i) => i + 1);
        setPageOrder(order);
        setCurrentPage(1);

        // Generate thumbnails
        await generateThumbnails(doc, pageCount);
      } catch {
        toast.error('The uploaded file is not a valid PDF.');
      }
    },
    [toast],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`File "${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  // Generate thumbnails for all pages
  const generateThumbnails = async (
    doc: pdfjsLib.PDFDocumentProxy,
    pageCount: number,
  ): Promise<void> => {
    const thumbs: PageThumbnail[] = Array.from({ length: pageCount }, (_, i) => ({
      pageNumber: i + 1,
      canvas: null,
      loading: true,
    }));
    setThumbnails(thumbs);

    const updatedThumbs: PageThumbnail[] = [...thumbs];

    for (let i = 0; i < pageCount; i++) {
      try {
        const page = await doc.getPage(i + 1);
        const viewport = page.getViewport({ scale: 0.3 });
        const dpr = getDevicePixelRatio();
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width * dpr);
        canvas.height = Math.round(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext('2d');
        if (context) {
          context.scale(dpr, dpr);
          await page.render({ canvasContext: context, viewport }).promise;
        }
        updatedThumbs[i] = { pageNumber: i + 1, canvas, loading: false };
      } catch {
        updatedThumbs[i] = { pageNumber: i + 1, canvas: null, loading: false };
      }
    }

    setThumbnails(updatedThumbs);
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Make the dragged element semi-transparent
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDragIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragIndex !== null && dragIndex !== index) {
        setDropTargetIndex(index);
      }
    },
    [dragIndex],
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault();
      setDropTargetIndex(null);

      if (dragIndex === null || dragIndex === targetIndex) return;

      // Reorder the pages - move the dragged item to the target position
      setPageOrder((prev) => {
        const newOrder = [...prev];
        const [movedItem] = newOrder.splice(dragIndex, 1);
        newOrder.splice(targetIndex, 0, movedItem);
        return newOrder;
      });

      setDragIndex(null);
    },
    [dragIndex],
  );

  // Confirm reorder and produce the reordered PDF
  const handleConfirmReorder = useCallback(async () => {
    if (!pdfData || pageOrder.length === 0) return;

    setProcessing(true);
    try {
      const client = getPdfWorkerClient({
        onError: (msg) => toast.warning(msg),
      });
      const result = await client.reorderPages(pdfData, pageOrder);

      if (result.success && result.data) {
        setResultData(result.data);
        toast.success('Pages reordered successfully. Ready to download.');
      } else {
        toast.error(result.error ?? 'Failed to reorder pages.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  }, [pdfData, pageOrder, toast]);

  // Download the reordered PDF
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.pdf$/i, '') + '_reordered.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultData, fileName]);

  // Reset to start over
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setPageOrder([]);
    setThumbnails([]);
    setResultData(null);
    setDragIndex(null);
    setDropTargetIndex(null);
    pdfDocRef.current = null;
  }, []);

  // Check if order has changed from original
  const hasOrderChanged = pageOrder.some((p, i) => p !== i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Reorder Pages
        </h1>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          Drag and drop page thumbnails to rearrange the page order of your PDF.
        </p>
      </div>

      {/* File upload */}
      {!pdfData && (
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/reorder"
          operationName="Reorder"
        />
      )}

      {/* Reorder interface */}
      {pdfData && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Upload Different File
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReorder}
              disabled={!hasOrderChanged || processing}
              loading={processing}
            >
              Apply Reorder
            </Button>
            {resultData && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                Download Reordered PDF
              </Button>
            )}
          </div>

          {/* Drag-and-drop page grid */}
          <div className="rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-4">
            <p className="mb-3 text-sm font-medium text-secondary-600 dark:text-secondary-300">
              Drag pages to reorder ({pageOrder.length} pages)
            </p>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              }}
              role="list"
              aria-label="Draggable page thumbnails"
            >
              {pageOrder.map((originalPageNum, displayIndex) => {
                const thumb = thumbnails[originalPageNum - 1];
                const isDragging = dragIndex === displayIndex;
                const isDropTarget = dropTargetIndex === displayIndex;

                return (
                  <DraggablePageThumbnail
                    key={`page-${originalPageNum}-${displayIndex}`}
                    displayIndex={displayIndex}
                    originalPageNum={originalPageNum}
                    thumbnail={thumb}
                    isDragging={isDragging}
                    isDropTarget={isDropTarget}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  />
                );
              })}
            </div>
          </div>

          {/* Preview panel */}
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

/** Individual draggable page thumbnail */
interface DraggablePageThumbnailProps {
  displayIndex: number;
  originalPageNum: number;
  thumbnail: PageThumbnail | undefined;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
}

function DraggablePageThumbnail({
  displayIndex,
  originalPageNum,
  thumbnail,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: DraggablePageThumbnailProps): JSX.Element {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Mount the thumbnail canvas
  useEffect(() => {
    if (canvasContainerRef.current && thumbnail?.canvas) {
      canvasContainerRef.current.innerHTML = '';
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = thumbnail.canvas.width;
      clonedCanvas.height = thumbnail.canvas.height;
      const ctx = clonedCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(thumbnail.canvas, 0, 0);
      }
      clonedCanvas.className = 'w-full h-auto rounded';
      clonedCanvas.setAttribute('aria-hidden', 'true');
      canvasContainerRef.current.appendChild(clonedCanvas);
    }
  }, [thumbnail]);

  return (
    <div
      role="listitem"
      draggable
      onDragStart={(e) => onDragStart(e, displayIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, displayIndex)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, displayIndex)}
      aria-label={`Page ${originalPageNum}, position ${displayIndex + 1}. Drag to reorder.`}
      className={[
        'relative flex flex-col items-center rounded-lg border-2 p-2 cursor-grab transition-[border-color,background-color,opacity,transform,box-shadow] duration-normal ease-in-out',
        'min-w-[100px] min-h-[44px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        isDragging
          ? 'opacity-50 border-primary-400 bg-primary-50 dark:bg-primary-900/20'
          : isDropTarget
            ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/30 scale-105 shadow-level-3'
            : 'border-secondary-200 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-700 hover:border-primary-300 dark:hover:border-primary-500',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Drop indicator line */}
      {isDropTarget && (
        <div className="absolute -left-1 top-0 bottom-0 w-1 rounded-full bg-primary-500" />
      )}

      {/* Thumbnail */}
      <div
        ref={canvasContainerRef}
        className="w-full aspect-[3/4] bg-white dark:bg-secondary-800 rounded overflow-hidden flex items-center justify-center"
      >
        {thumbnail?.loading && (
          <svg
            className="w-5 h-5 animate-spin motion-reduce:animate-none text-secondary-400"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {!thumbnail?.loading && !thumbnail?.canvas && (
          <span className="text-xs text-secondary-400">No preview</span>
        )}
      </div>

      {/* Page number badge */}
      <span className="mt-1 inline-flex items-center justify-center rounded-full bg-secondary-200 dark:bg-secondary-600 px-2 py-0.5 text-xs font-semibold text-secondary-700 dark:text-secondary-200">
        {originalPageNum}
      </span>
    </div>
  );
}

ReorderPage.displayName = 'ReorderPage';
