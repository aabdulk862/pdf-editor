import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { formatFileSize, calculatePercentChange } from '@/utils/file-size';

/**
 * Checks if a PDF is linearized by looking for the /Linearized key
 * in the first 1024 bytes of the file (linearization dict is at the start).
 */
function checkIsLinearized(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 1024));
  const text = new TextDecoder('latin1').decode(bytes);
  return text.includes('/Linearized');
}

/**
 * LinearizePage component - Allows users to linearize (web-optimize) a PDF.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Display whether the uploaded PDF is already linearized
 * - Trigger linearization via Web Worker
 * - Show before/after file size with percentage change
 * - Toast if already linearized
 * - Download the linearized PDF
 *
 * Requirements: 47.1, 47.2, 47.3, 47.4, 47.5
 */
export function LinearizePage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [isAlreadyLinearized, setIsAlreadyLinearized] = useState(false);

  // Operation state
  const [isLinearizing, setIsLinearizing] = useState(false);
  const [linearizedData, setLinearizedData] = useState<ArrayBuffer | null>(null);
  const [linearizedSize, setLinearizedSize] = useState<number>(0);

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
        setLinearizedData(null);
        setLinearizedSize(0);

        // Check linearization status
        const linearized = checkIsLinearized(data);
        setIsAlreadyLinearized(linearized);

        if (linearized) {
          toast.warning('This file is already optimized for web viewing.');
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

  // Linearize
  const handleLinearize = useCallback(async () => {
    if (!pdfData) return;

    if (isAlreadyLinearized) {
      toast.warning('This file is already optimized for web viewing.');
      return;
    }

    setIsLinearizing(true);
    setLinearizedData(null);
    setLinearizedSize(0);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.linearize(pdfData);

      if (result.success && result.data) {
        const newSize = result.data.byteLength;
        setLinearizedData(result.data);
        setLinearizedSize(newSize);
        toast.success('PDF linearized successfully.');
      } else {
        toast.error(result.error ?? 'Failed to linearize the PDF.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsLinearizing(false);
    }
  }, [pdfData, isAlreadyLinearized, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!linearizedData) return;

    const blob = new Blob([linearizedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_linearized.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [linearizedData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setOriginalSize(0);
    setIsAlreadyLinearized(false);
    setLinearizedData(null);
    setLinearizedSize(0);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Linearize PDF
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Optimize a PDF for fast web viewing. Linearized PDFs load progressively in browsers
          without downloading the entire file first.
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
            Linearize PDF
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Linearization status */}
      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
        <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-3">
          Linearization Status
        </h2>
        <div className="flex items-center gap-2">
          {isAlreadyLinearized ? (
            <>
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full bg-success-500"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-success-600 dark:text-success-400">
                Linearized
              </span>
            </>
          ) : (
            <>
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full bg-warning-500"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                Not Linearized
              </span>
            </>
          )}
        </div>
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
          {linearizedData && (
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
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                  Linearized
                </p>
                <p className="text-lg font-semibold text-text-light dark:text-text-dark">
                  {formatFileSize(linearizedSize)}
                </p>
              </div>

              {/* Percentage change */}
              <div className="flex-1">
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                  Size Change
                </p>
                <p
                  className={[
                    'text-lg font-semibold',
                    linearizedSize < originalSize
                      ? 'text-success-600 dark:text-success-400'
                      : linearizedSize > originalSize
                        ? 'text-error-600 dark:text-error-400'
                        : 'text-secondary-600 dark:text-secondary-400',
                  ].join(' ')}
                >
                  {calculatePercentChange(originalSize, linearizedSize)}
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
          onClick={handleLinearize}
          loading={isLinearizing}
          disabled={isLinearizing || isAlreadyLinearized}
        >
          {isLinearizing ? 'Linearizing...' : 'Linearize PDF'}
        </Button>
        {linearizedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Linearized PDF
          </Button>
        )}
      </div>
    </div>
  );
}

LinearizePage.displayName = 'LinearizePage';
