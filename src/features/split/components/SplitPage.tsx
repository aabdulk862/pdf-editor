import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { formatFileSize } from '@/utils/file-size';
import { useSplit } from '../hooks/useSplit';
import type { SplitResult } from '../hooks/useSplit';

/**
 * SplitPage - Route page for the Split PDF feature.
 *
 * Features:
 * - Upload a single PDF file
 * - Display total page count
 * - Enter comma-separated page ranges (e.g., "1-3, 5, 7-9")
 * - Max 20 ranges
 * - Supports overlapping ranges
 * - Validates ranges with toast errors
 * - Shows downloadable list with file name and page count per result
 * - Wires to PDF Engine splitByRanges via PdfWorkerClient
 *
 * Requirements: 45.1, 45.2, 45.3, 45.4, 45.5
 */
export function SplitPage(): JSX.Element {
  const toast = useToast();
  const {
    pdfData,
    pdfName,
    pageCount,
    rangeInput,
    setRangeInput,
    splitting,
    results,
    loadPdf,
    split,
    downloadResult,
    downloadAll,
    reset,
    canSplit,
  } = useSplit();

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      await loadPdf(file);
      setCurrentPage(1);
    },
    [loadPdf],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`"${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  const handleSplit = useCallback(async () => {
    await split();
  }, [split]);

  const handleDownload = useCallback(
    (result: SplitResult) => {
      downloadResult(result);
    },
    [downloadResult],
  );

  const handleReset = useCallback(() => {
    reset();
    setCurrentPage(1);
  }, [reset]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Split PDF
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Split a PDF into multiple files by specifying page ranges.
        </p>
      </div>

      {/* Upload zone - shown when no PDF is loaded */}
      {!pdfData && (
        <FileUploadZone
          accept={['application/pdf']}
          maxFileSize={100 * 1024 * 1024}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
        />
      )}

      {/* Main content - shown when PDF is loaded */}
      {pdfData && (
        <div className="space-y-6">
          {/* File info and reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-200 bg-white px-4 py-3 dark:border-secondary-700 dark:bg-secondary-800">
            <div className="flex items-center gap-3">
              <svg
                className="h-8 w-8 flex-shrink-0 text-error-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-secondary-800 dark:text-secondary-100 truncate max-w-[200px] sm:max-w-[400px]">
                  {pdfName}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">
                  {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleReset}>
              Change file
            </Button>
          </div>

          {/* Range input */}
          <div className="space-y-2">
            <label
              htmlFor="range-input"
              className="block text-sm font-medium text-text-light dark:text-text-dark"
            >
              Page ranges
            </label>
            <input
              id="range-input"
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g., 1-3, 4-6, 7-10"
              className="w-full rounded-lg border border-secondary-300 bg-white px-4 py-3 text-sm text-text-light placeholder-secondary-400 transition-colors duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark dark:placeholder-secondary-500 dark:focus:border-primary-400"
              aria-describedby="range-help"
              disabled={splitting}
            />
            <p id="range-help" className="text-xs text-secondary-500 dark:text-secondary-400">
              Enter comma-separated ranges using &quot;start-end&quot; format. Single pages are also
              accepted. Max 20 ranges. Overlapping ranges are allowed.
            </p>
          </div>

          {/* Split button */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={handleSplit}
              disabled={!canSplit}
              loading={splitting}
            >
              {splitting ? 'Splitting...' : 'Split PDF'}
            </Button>
          </div>

          {/* Results list */}
          {results.length > 0 && (
            <div className="space-y-3 border-t border-secondary-200 dark:border-secondary-700 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
                  Split Results ({results.length} {results.length === 1 ? 'file' : 'files'})
                </h2>
                {results.length > 1 && (
                  <Button variant="ghost" onClick={downloadAll}>
                    Download All
                  </Button>
                )}
              </div>
              <ul className="space-y-2" aria-label="Split results">
                {results.map((result, index) => (
                  <li
                    key={`${result.fileName}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-200 bg-white px-4 py-3 dark:border-secondary-700 dark:bg-secondary-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg
                        className="h-6 w-6 flex-shrink-0 text-error-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-secondary-800 dark:text-secondary-100">
                          {result.fileName}
                        </p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">
                          {result.pageCount} {result.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                          {formatFileSize(result.data.byteLength)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleDownload(result)}
                      aria-label={`Download ${result.fileName}`}
                    >
                      <svg
                        className="mr-1.5 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                        />
                      </svg>
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview panel */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Preview</h2>
            <PreviewPanel
              originalDoc={pdfData}
              modifiedDoc={null}
              zoom={zoom}
              onZoomChange={setZoom}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
