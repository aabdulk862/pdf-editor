import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { ErrorRecovery, type ToolErrorState } from '@/components/ui/ErrorRecovery';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { formatFileSize, calculatePercentChange } from '@/utils/file-size';
import { QuickActionsBar } from '@/features/quick-actions/QuickActionsBar';
import { useQuickActionsStore } from '@/store/quick-actions';

/**
 * CompressPage component - Allows users to compress a PDF to reduce file size.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Trigger compression via Web Worker
 * - Display before/after file size with percentage reduction
 * - Show toast if <5% reduction achieved
 * - Download the compressed PDF
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function CompressPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<number>(0);

  // Operation state
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedData, setCompressedData] = useState<ArrayBuffer | null>(null);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [errorState, setErrorState] = useState<ToolErrorState | null>(null);

  // Track previous compressedData to detect new successful operations
  const prevCompressedDataRef = useRef<ArrayBuffer | null>(null);

  // Trigger Quick Actions Bar when compression completes successfully
  useEffect(() => {
    if (compressedData && compressedData !== prevCompressedDataRef.current) {
      useQuickActionsStore.getState().show('compress', compressedData);
    }
    prevCompressedDataRef.current = compressedData;
  }, [compressedData]);

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
        setCompressedData(null);
        setCompressedSize(0);
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

  // Compress
  const handleCompress = useCallback(async () => {
    if (!pdfData) return;

    setIsCompressing(true);
    setCompressedData(null);
    setCompressedSize(0);
    setErrorState(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.compress(pdfData);

      if (result.success && result.data) {
        const newSize = result.data.byteLength;
        setCompressedData(result.data);
        setCompressedSize(newSize);

        // Calculate reduction percentage
        const reductionPercent = ((originalSize - newSize) / originalSize) * 100;

        if (reductionPercent < 5) {
          toast.warning(
            'The file could not be significantly reduced. Less than 5% compression was achieved.',
          );
        } else {
          toast.success('PDF compressed successfully.');
        }
      } else {
        const message = result.error ?? 'Failed to compress the PDF.';
        setErrorState({
          type: 'processing-failed',
          message,
          recoverable: true,
          retryAction: () => handleCompress(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorState({
        type: 'unknown',
        message,
        recoverable: true,
        retryAction: () => handleCompress(),
      });
    } finally {
      setIsCompressing(false);
    }
  }, [pdfData, originalSize, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!compressedData) return;

    const blob = new Blob([compressedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_compressed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [compressedData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setOriginalSize(0);
    setCompressedData(null);
    setCompressedSize(0);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Compress PDF
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to reduce its file size by removing redundant objects and optimizing streams.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/compress"
          operationName="Compress"
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
            Compress PDF
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Original file size */}
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
          {compressedData && (
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
                    strokeWidth={1.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>

              {/* After */}
              <div className="flex-1">
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                  Compressed
                </p>
                <p className="text-lg font-semibold text-text-light dark:text-text-dark">
                  {formatFileSize(compressedSize)}
                </p>
              </div>

              {/* Percentage change */}
              <div className="flex-1">
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">Reduction</p>
                <p
                  className={[
                    'text-lg font-semibold',
                    compressedSize < originalSize
                      ? 'text-success-600 dark:text-success-400'
                      : compressedSize > originalSize
                        ? 'text-error-600 dark:text-error-400'
                        : 'text-secondary-600 dark:text-secondary-400',
                  ].join(' ')}
                >
                  {calculatePercentChange(originalSize, compressedSize)}
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
          onClick={handleCompress}
          loading={isCompressing}
          disabled={isCompressing}
        >
          {isCompressing ? 'Compressing...' : 'Compress PDF'}
        </Button>
        {compressedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download Compressed PDF
          </Button>
        )}
      </div>

      {/* Error recovery state */}
      {errorState && <ErrorRecovery error={errorState} onReset={handleReset} />}

      {/* Quick Actions Bar */}
      {compressedData && <QuickActionsBar />}
    </div>
  );
}

CompressPage.displayName = 'CompressPage';
