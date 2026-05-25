import { useCallback, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { ImageFile } from '@/core/pdf-engine/index';

/** Maximum number of images allowed */
const MAX_IMAGES = 50;
/** Accepted image MIME types */
const ACCEPTED_TYPES: string[] = ['image/png', 'image/jpeg'];

interface UploadedImage {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  data: ArrayBuffer;
  type: 'image/png' | 'image/jpeg';
}

/**
 * ImageToPdfPage - Feature page for converting PNG/JPG images to a PDF document.
 *
 * Features:
 * - Upload 1-50 PNG or JPG images
 * - Drag-and-drop reorder of uploaded images
 * - Convert images to PDF preserving aspect ratio and order
 * - Preview the resulting PDF
 * - Download the generated PDF
 * - Reject non-PNG/JPG files with toast notification
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export function ImageToPdfPage(): JSX.Element {
  const toast = useToast();

  // Image state
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultData, setResultData] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const workerClientRef = useRef(getPdfWorkerClient({ onError: (msg) => toast.error(msg) }));

  // Handle file upload
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const currentCount = images.length;
      const remainingSlots = MAX_IMAGES - currentCount;

      if (remainingSlots <= 0) {
        toast.warning(`Maximum of ${MAX_IMAGES} images allowed.`);
        return;
      }

      const filesToProcess = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        toast.warning(
          `Only ${remainingSlots} more image(s) can be added. ${files.length - remainingSlots} file(s) were skipped.`,
        );
      }

      const newImages: UploadedImage[] = [];

      for (const file of filesToProcess) {
        // Validate type (double-check since FileUploadZone may pass through)
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`File "${file.name}" rejected: Only PNG and JPG images are accepted.`);
          continue;
        }

        try {
          const data = await readFileAsArrayBuffer(file);
          const previewUrl = URL.createObjectURL(file);
          newImages.push({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            previewUrl,
            data,
            type: file.type as 'image/png' | 'image/jpeg',
          });
        } catch {
          toast.error(`Failed to read file "${file.name}".`);
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
        // Clear previous result when new images are added
        setResultData(null);
      }
    },
    [images.length, toast],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      // Check if it's a type rejection
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(
          `File "${file.name}" rejected: Only PNG and JPG images are accepted. Received type: ${file.type || 'unknown'}.`,
        );
      } else {
        toast.error(`File "${file.name}" rejected: ${reason}`);
      }
    },
    [toast],
  );

  // Remove an image from the list
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
    setResultData(null);
  }, []);

  // Drag-and-drop reorder handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [dragIndex],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }

      setImages((prev) => {
        const newImages = [...prev];
        const [draggedItem] = newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, draggedItem);
        return newImages;
      });

      setDragIndex(null);
      setDragOverIndex(null);
      setResultData(null);
    },
    [dragIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // Convert images to PDF
  const handleConvert = useCallback(async () => {
    if (images.length === 0) {
      toast.warning('Please upload at least one image.');
      return;
    }

    setIsProcessing(true);
    try {
      const imageFiles: ImageFile[] = images.map((img) => ({
        name: img.name,
        data: img.data,
        type: img.type,
      }));

      const result = await workerClientRef.current.imagesToPdf(imageFiles);

      if (result.success && result.data) {
        setResultData(result.data);
        setCurrentPage(1);
        toast.success(
          `PDF created successfully with ${images.length} page${images.length > 1 ? 's' : ''}.`,
        );
      } else {
        toast.error(result.error ?? 'Failed to create PDF from images.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  }, [images, toast]);

  // Download the result
  const handleDownload = useCallback(() => {
    if (!resultData) return;

    const blob = new Blob([resultData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'images-to-pdf.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultData]);

  // Clear all images and reset
  const handleReset = useCallback(() => {
    for (const img of images) {
      URL.revokeObjectURL(img.previewUrl);
    }
    setImages([]);
    setResultData(null);
    setIsProcessing(false);
    setCurrentPage(1);
  }, [images]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Image to PDF
        </h1>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          Convert PNG or JPG images into a single PDF document. Drag to reorder.
        </p>
      </div>

      {/* File Upload */}
      {images.length < MAX_IMAGES && (
        <FileUploadZone
          accept={ACCEPTED_TYPES}
          maxFiles={MAX_IMAGES}
          maxFileSize={100 * 1024 * 1024}
          multiple={true}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/image-to-pdf"
          operationName="Image to PDF"
        />
      )}

      {/* Image count info */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4 dark:border-secondary-700 dark:bg-secondary-900">
          <span className="text-sm font-medium text-text-light dark:text-text-dark">
            {images.length} image{images.length !== 1 ? 's' : ''} uploaded
          </span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">
            (max {MAX_IMAGES})
          </span>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Image list with drag-and-drop reorder */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Image Order</h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Drag and drop to reorder. Images will appear in this order in the PDF.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((img, index) => (
              <ImageCard
                key={img.id}
                image={img}
                index={index}
                isDragging={dragIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onRemove={removeImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={handleConvert}
            loading={isProcessing}
            disabled={images.length === 0}
          >
            Convert to PDF
          </Button>
          {resultData && (
            <Button variant="secondary" onClick={handleDownload}>
              Download PDF
            </Button>
          )}
        </div>
      )}

      {/* Preview panel */}
      {resultData && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Preview</h2>
          <PreviewPanel
            originalDoc={null}
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

/** Individual image card with drag-and-drop support */
function ImageCard({
  image,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRemove,
}: {
  image: UploadedImage;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRemove: (id: string) => void;
}): JSX.Element {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={[
        'group relative flex flex-col items-center rounded-lg border-2 p-2 transition-[border-color,background-color,box-shadow,opacity] duration-normal ease-in-out',
        'cursor-grab active:cursor-grabbing',
        isDragging
          ? 'opacity-50 border-primary-300 dark:border-primary-600'
          : isDragOver
            ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
            : 'border-secondary-200 bg-white hover:border-secondary-300 dark:border-secondary-700 dark:bg-secondary-800 dark:hover:border-secondary-600',
      ].join(' ')}
      aria-label={`Image ${index + 1}: ${image.name}. Drag to reorder.`}
      role="listitem"
    >
      {/* Order number badge */}
      <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-700 text-xs font-bold text-white dark:bg-secondary-500">
        {index + 1}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
        className="absolute right-1 top-1 flex min-h-[44px] min-w-[44px] md:h-6 md:w-6 md:min-h-0 md:min-w-0 items-center justify-center rounded-full bg-error-500 text-white opacity-0 transition-opacity duration-normal ease-out group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-error-500"
        aria-label={`Remove ${image.name}`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image preview */}
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded">
        <img
          src={image.previewUrl}
          alt={image.name}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>

      {/* File name */}
      <span className="mt-1 w-full truncate text-center text-xs text-secondary-600 dark:text-secondary-300">
        {image.name}
      </span>

      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-primary-500 bg-primary-100/50 dark:border-primary-400 dark:bg-primary-900/30" />
      )}
    </div>
  );
}

/** Read a File as ArrayBuffer */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

ImageToPdfPage.displayName = 'ImageToPdfPage';
