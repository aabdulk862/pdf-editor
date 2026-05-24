import { useCallback, useState } from 'react';
import JSZip from 'jszip';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PdfjsRenderEngine } from '@/core/render-engine/renderer';
import { formatFileSize } from '@/utils/file-size';
import type { ExtractedImage } from '@/core/render-engine/index';

/**
 * ExtractImagesPage component - Allows users to extract all embedded images from a PDF.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Trigger image extraction using the PdfjsRenderEngine
 * - Display extracted images as a downloadable list with format, dimensions, and size
 * - Support individual download or ZIP archive download
 * - Show toast if no images found
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export function ExtractImagesPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Operation state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

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
        setExtractedImages([]);
        setHasExtracted(false);
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

  // Extract images
  const handleExtract = useCallback(async () => {
    if (!pdfData) return;

    setIsExtracting(true);
    setExtractedImages([]);
    setHasExtracted(false);

    try {
      const renderEngine = new PdfjsRenderEngine();
      const doc = await renderEngine.loadDocument(pdfData);
      const images = await renderEngine.extractImages(doc);

      setExtractedImages(images);
      setHasExtracted(true);

      if (images.length === 0) {
        toast.warning('No embedded images found in this PDF.');
      } else {
        toast.success(
          `Extracted ${images.length} image${images.length > 1 ? 's' : ''} from the PDF.`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed to extract images: ${message}`);
    } finally {
      setIsExtracting(false);
    }
  }, [pdfData, toast]);

  // Download individual image
  const handleDownloadImage = useCallback(
    (image: ExtractedImage, index: number) => {
      const blob = new Blob([image.data], { type: `image/${image.format}` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = fileName.replace(/\.pdf$/i, '');
      link.download = `${baseName}_image_${index + 1}.${image.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [fileName],
  );

  // Download all images as ZIP
  const handleDownloadZip = useCallback(async () => {
    if (extractedImages.length === 0) return;

    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      const baseName = fileName.replace(/\.pdf$/i, '');

      extractedImages.forEach((image, index) => {
        const imageFileName = `${baseName}_image_${index + 1}.${image.format}`;
        zip.file(imageFileName, image.data);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('ZIP archive downloaded.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed to create ZIP archive: ${message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  }, [extractedImages, fileName, toast]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setExtractedImages([]);
    setHasExtracted(false);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Extract Images
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to extract all embedded images, preserving their original format and
          resolution.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/extract-images"
          operationName="Extract Images"
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
            Extract Images
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleExtract}
          loading={isExtracting}
          disabled={isExtracting}
        >
          {isExtracting ? 'Extracting...' : 'Extract Images'}
        </Button>
        {extractedImages.length > 1 && (
          <Button
            variant="secondary"
            onClick={handleDownloadZip}
            loading={isDownloadingZip}
            disabled={isDownloadingZip}
          >
            {isDownloadingZip ? 'Creating ZIP...' : 'Download All as ZIP'}
          </Button>
        )}
      </div>

      {/* Extracted images list */}
      {hasExtracted && extractedImages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
            Extracted Images ({extractedImages.length})
          </h2>
          <div className="divide-y divide-secondary-200 rounded-lg border border-secondary-200 bg-white dark:divide-secondary-700 dark:border-secondary-700 dark:bg-secondary-800">
            {extractedImages.map((image, index) => (
              <div key={index} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Image thumbnail */}
                  <ImageThumbnail image={image} index={index} />
                  {/* Image details */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-secondary-800 dark:text-secondary-100">
                      Image {index + 1}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      {image.format.toUpperCase()} · {image.width}×{image.height}px ·{' '}
                      {formatFileSize(image.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadImage(image, index)}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No images found message */}
      {hasExtracted && extractedImages.length === 0 && (
        <div className="rounded-lg border border-secondary-200 bg-white p-6 text-center dark:border-secondary-700 dark:bg-secondary-800">
          <p className="text-secondary-500 dark:text-secondary-400">
            No embedded images were found in this PDF.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Renders a small thumbnail preview of an extracted image.
 */
function ImageThumbnail({ image, index }: { image: ExtractedImage; index: number }): JSX.Element {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  // Create object URL for the image on first render
  if (!src && !error) {
    try {
      const blob = new Blob([image.data], { type: `image/${image.format}` });
      const url = URL.createObjectURL(blob);
      setSrc(url);
    } catch {
      setError(true);
    }
  }

  if (error || !src) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-secondary-100 dark:bg-secondary-700"
        aria-hidden="true"
      >
        <svg
          className="h-6 w-6 text-secondary-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H2.25a.75.75 0 00-.75.75v12c0 .414.336.75.75.75z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Extracted image ${index + 1}`}
      className="h-12 w-12 shrink-0 rounded object-cover border border-secondary-200 dark:border-secondary-600"
    />
  );
}

ExtractImagesPage.displayName = 'ExtractImagesPage';
