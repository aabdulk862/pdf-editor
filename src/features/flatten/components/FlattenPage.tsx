import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { formatFileSize, calculatePercentChange } from '@/utils/file-size';

/**
 * FlattenPage component - Allows users to flatten a PDF by merging annotations,
 * form fields, and layers into the page content.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Trigger flatten operation via Web Worker
 * - Display before/after file size with percentage change
 * - Show preview of flattened result
 * - Toast if nothing to flatten (no annotations, form fields, or layers)
 * - Download the flattened PDF
 *
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6
 */
export function FlattenPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<number>(0);

  // Operation state
  const [isFlattening, setIsFlattening] = useState(false);
  const [flattenedData, setFlattenedData] = useState<ArrayBuffer | null>(null);
  const [flattenedSize, setFlattenedSize] = useState<number>(0);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

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
        setOriginalSize(file.size);
        setFlattenedData(null);
        setFlattenedSize(0);
        setCurrentPage(1);
        setZoom(1);
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

  // Flatten
  const handleFlatten = useCallback(async () => {
    if (!pdfData) return;

    setIsFlattening(true);
    setFlattenedData(null);
    setFlattenedSize(0);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.flatten(pdfData);

      if (result.success && result.data) {
        const newSize = result.data.byteLength;

        // Check if nothing was flattened (same size indicates no interactive content)
        if (newSize === originalSize) {
          toast.warning(
            'The document has no interactive content to flatten (no annotations, form fields, or layers).',
          );
        } else {
          toast.success('PDF flattened successfully.');
        }

        setFlattenedData(result.data);
        setFlattenedSize(newSize);
        setCurrentPage(1);
      } else {
        toast.error(result.error ?? 'Failed to flatten the PDF.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsFlattening(false);
    }
  }, [pdfData, originalSize, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!flattenedData) return;

    const blob = new Blob([flattenedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_flattened.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [flattenedData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setOriginalSize(0);
    setFlattenedData(null);
    setFlattenedSize(0);
    setCurrentPage(1);
    setZoom(1);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Flatten PDF
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to flatten it by merging annotations, form fields, and layers into the page
          content. The result will appear the same across all viewers and cannot be edited.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/flatten"
          operationName="Flatten"
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
            Flatten PDF
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* File size display */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">File Size</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Before */}
          <div className="flex-1">
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">Original</p>
            <p className="text-lg font-semibold text-text-light dark:text-text-dark">
              {formatFileSize(originalSize)}
            </p>
          </div>

          {/* Arrow / separator */}
          {flattenedData && (
            <>
              <div className="hidden sm:flex items-center">
                <svg
                  className="w-6 h-6 text-secondary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>

              {/* After */}
              <div className="flex-1">
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">Flattened</p>
                <p className="text-lg font-semibold text-text-light dark:text-text-dark">
                  {formatFileSize(flattenedSize)}
                </p>
              </div>

              {/* Percentage change */}
              <div className="flex-1">
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">Change</p>
                <p
                  className={[
                    'text-lg font-semibold',
                    flattenedSize < originalSize
                      ? 'text-success-600 dark:text-success-400'
                      : flattenedSize > originalSize
                        ? 'text-error-600 dark:text-error-400'
                        : 'text-secondary-600 dark:text-secondary-400',
                  ].join(' ')}
                >
                  {calculatePercentChange(originalSize, flattenedSize)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleFlatten}
          loading={isFlattening}
          disabled={isFlattening}
        >
          {isFlattening ? 'Flattening...' : 'Flatten PDF'}
        </Button>
        {flattenedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Flattened PDF
          </Button>
        )}
      </div>

      {/* Preview panel */}
      {flattenedData && (
        <PreviewPanel
          originalDoc={pdfData}
          modifiedDoc={flattenedData}
          zoom={zoom}
          onZoomChange={setZoom}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

FlattenPage.displayName = 'FlattenPage';
