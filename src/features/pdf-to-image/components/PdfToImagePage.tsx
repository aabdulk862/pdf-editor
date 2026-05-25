import { useCallback, useState, useMemo } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PdfjsRenderEngine } from '@/core/render-engine/renderer';
import type { RenderableDocument } from '@/core/render-engine/index';
import JSZip from 'jszip';

type ImageFormat = 'png' | 'jpg';
type DpiOption = 72 | 150 | 300;

interface ConvertedImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  fileName: string;
}

/**
 * Parses a page selection string like "1, 3, 5-8" into an array of page numbers.
 * Returns null if the input is invalid.
 */
function parsePageSelection(input: string, totalPages: number): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const pages = new Set<number>();
  const parts = trimmed.split(',');

  for (const part of parts) {
    const rangePart = part.trim();
    if (!rangePart) continue;

    if (rangePart.includes('-')) {
      const [startStr, endStr] = rangePart.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > end) {
        return null;
      }
      if (start > totalPages || end > totalPages) {
        return null;
      }

      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const pageNum = parseInt(rangePart, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return null;
      }
      if (pageNum > totalPages) {
        return null;
      }
      pages.add(pageNum);
    }
  }

  if (pages.size === 0) return null;
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * PdfToImagePage component - Converts PDF pages to PNG or JPG images.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Select output format (PNG or JPG)
 * - Select specific pages by numbers/ranges or convert all pages
 * - Configure output resolution (72, 150, or 300 DPI)
 * - Download images individually or as a ZIP archive
 * - Validates page numbers against total page count
 *
 * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5, 39.6
 */
export function PdfToImagePage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [renderDoc, setRenderDoc] = useState<RenderableDocument | null>(null);

  // Configuration state
  const [format, setFormat] = useState<ImageFormat>('png');
  const [dpi, setDpi] = useState<DpiOption>(150);
  const [pageSelection, setPageSelection] = useState<string>('');
  const [convertAll, setConvertAll] = useState<boolean>(true);

  // Operation state
  const [isConverting, setIsConverting] = useState(false);
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);

  const dpiOptions: DpiOption[] = [72, 150, 300];

  // Compute the scale factor from DPI (PDF default is 72 DPI)
  const scaleFromDpi = useCallback((selectedDpi: DpiOption): number => {
    return selectedDpi / 72;
  }, []);

  // Handle file upload
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = reader.result as ArrayBuffer;
          const engine = new PdfjsRenderEngine();
          const doc = await engine.loadDocument(data);

          setPdfData(data);
          setFileName(file.name);
          setTotalPages(doc.pageCount);
          setRenderDoc(doc);
          setConvertedImages([]);
          setPageSelection('');
          setConvertAll(true);
        } catch {
          toast.error('Failed to load the PDF. The file may be corrupted or invalid.');
        }
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

  // Get pages to convert
  const pagesToConvert = useMemo((): number[] | null => {
    if (convertAll) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return parsePageSelection(pageSelection, totalPages);
  }, [convertAll, pageSelection, totalPages]);

  // Convert pages to images
  const handleConvert = useCallback(async () => {
    if (!renderDoc || !pdfData) return;

    if (!convertAll && !pageSelection.trim()) {
      toast.warning('Please enter page numbers or select "All pages".');
      return;
    }

    const pages = pagesToConvert;
    if (!pages) {
      toast.error(
        `Invalid page selection. Enter page numbers between 1 and ${totalPages} (e.g., "1, 3, 5-8").`,
      );
      return;
    }

    // Validate page numbers against total count
    const invalidPages = pages.filter((p) => p > totalPages || p < 1);
    if (invalidPages.length > 0) {
      toast.error(
        `Page number(s) ${invalidPages.join(', ')} exceed the total page count of ${totalPages}.`,
      );
      return;
    }

    setIsConverting(true);
    setConvertedImages([]);

    try {
      const scale = scaleFromDpi(dpi);
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const extension = format === 'png' ? 'png' : 'jpg';
      const baseName = fileName.replace(/\.pdf$/i, '');
      const images: ConvertedImage[] = [];

      for (const pageNum of pages) {
        const canvas = await new PdfjsRenderEngine().renderPage(renderDoc, pageNum, scale);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else
                reject(new Error(`Failed to convert page ${pageNum} to ${format.toUpperCase()}`));
            },
            mimeType,
            format === 'jpg' ? 0.92 : undefined,
          );
        });

        const dataUrl = canvas.toDataURL(mimeType, format === 'jpg' ? 0.92 : undefined);

        images.push({
          pageNumber: pageNum,
          dataUrl,
          blob,
          fileName: `${baseName}_page${pageNum}.${extension}`,
        });
      }

      setConvertedImages(images);
      toast.success(`Successfully converted ${images.length} page(s) to ${format.toUpperCase()}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsConverting(false);
    }
  }, [
    renderDoc,
    pdfData,
    convertAll,
    pageSelection,
    pagesToConvert,
    totalPages,
    scaleFromDpi,
    dpi,
    format,
    fileName,
    toast,
  ]);

  // Download individual image
  const handleDownloadSingle = useCallback((image: ConvertedImage) => {
    const url = URL.createObjectURL(image.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Download all as ZIP
  const handleDownloadZip = useCallback(async () => {
    if (convertedImages.length === 0) return;

    try {
      const zip = new JSZip();
      const baseName = fileName.replace(/\.pdf$/i, '');

      for (const image of convertedImages) {
        zip.file(image.fileName, image.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}_images.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to create ZIP archive.');
    }
  }, [convertedImages, fileName, toast]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setTotalPages(0);
    setRenderDoc(null);
    setConvertedImages([]);
    setPageSelection('');
    setConvertAll(true);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          PDF to Image
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Convert PDF pages to PNG or JPG images. Upload a PDF to get started.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/pdf-to-image"
          operationName="PDF to Image"
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
            PDF to Image
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            {fileName} — {totalPages} page{totalPages !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Configuration panel */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800 space-y-5">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark">
          Conversion Settings
        </h2>

        {/* Format selector */}
        <div>
          <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-2">
            Output Format
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormat('png')}
              className={[
                'min-h-[44px] min-w-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-normal ease-in-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                format === 'png'
                  ? 'bg-primary-600 text-white dark:bg-primary-500'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-200 dark:hover:bg-secondary-600',
              ].join(' ')}
              aria-pressed={format === 'png'}
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => setFormat('jpg')}
              className={[
                'min-h-[44px] min-w-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-normal ease-in-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                format === 'jpg'
                  ? 'bg-primary-600 text-white dark:bg-primary-500'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-200 dark:hover:bg-secondary-600',
              ].join(' ')}
              aria-pressed={format === 'jpg'}
            >
              JPG
            </button>
          </div>
        </div>

        {/* DPI selector */}
        <div>
          <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-2">
            Resolution (DPI)
          </label>
          <div className="flex gap-3">
            {dpiOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDpi(option)}
                className={[
                  'min-h-[44px] min-w-[44px] px-4 py-2 rounded-md text-sm font-medium transition-colors duration-normal ease-in-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  dpi === option
                    ? 'bg-primary-600 text-white dark:bg-primary-500'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-200 dark:hover:bg-secondary-600',
                ].join(' ')}
                aria-pressed={dpi === option}
              >
                {option} DPI
              </button>
            ))}
          </div>
        </div>

        {/* Page selection */}
        <div>
          <label className="block text-xs font-medium text-secondary-600 dark:text-secondary-300 mb-2">
            Pages to Convert
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="page-selection"
                checked={convertAll}
                onChange={() => setConvertAll(true)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-200">
                All pages (1-{totalPages})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="page-selection"
                checked={!convertAll}
                onChange={() => setConvertAll(false)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-200">
                Specific pages
              </span>
            </label>
            {!convertAll && (
              <input
                type="text"
                value={pageSelection}
                onChange={(e) => setPageSelection(e.target.value)}
                placeholder="e.g., 1, 3, 5-8"
                aria-label="Page numbers or ranges"
                className={[
                  'w-full rounded-md border px-3 py-2 text-sm min-h-[44px]',
                  'bg-white dark:bg-secondary-900',
                  'text-text-light dark:text-text-dark',
                  'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
                  'border-secondary-300 dark:border-secondary-600',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  'transition-colors duration-normal ease-in-out',
                ].join(' ')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleConvert}
          loading={isConverting}
          disabled={isConverting}
        >
          {isConverting ? 'Converting...' : `Convert to ${format.toUpperCase()}`}
        </Button>
        {convertedImages.length > 1 && (
          <Button variant="secondary" onClick={handleDownloadZip}>
            Download All as ZIP
          </Button>
        )}
      </div>

      {/* Converted images list */}
      {convertedImages.length > 0 && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
            Converted Images ({convertedImages.length})
          </h2>
          <ul className="space-y-3" aria-label="Converted images">
            {convertedImages.map((image) => (
              <li
                key={image.pageNumber}
                className="flex items-center gap-3 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 dark:border-secondary-700 dark:bg-secondary-900"
              >
                {/* Thumbnail preview */}
                <img
                  src={image.dataUrl}
                  alt={`Page ${image.pageNumber}`}
                  className="h-12 w-10 object-cover rounded border border-secondary-200 dark:border-secondary-600 flex-shrink-0"
                />
                {/* File info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-secondary-800 dark:text-secondary-100">
                    {image.fileName}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Page {image.pageNumber} — {(image.blob.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {/* Download button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSingle(image)}
                  aria-label={`Download ${image.fileName}`}
                >
                  Download
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

PdfToImagePage.displayName = 'PdfToImagePage';
