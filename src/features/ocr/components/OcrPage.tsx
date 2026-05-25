import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { FileUploadZone } from '../../../components/ui/FileUploadZone';
import { Skeleton } from '../../../components/ui/Skeleton';
import { generateSearchablePdf } from '../../../core/ocr-engine';
import type { OcrProcessingResult, OcrProgress } from '../../../core/ocr-engine/types';
import { useToastStore } from '../../../store/toast';
import { useOcrStore } from '../store/ocr-store';
import { LanguageSelector } from './LanguageSelector';
import { OcrProgressPanel } from './OcrProgressPanel';
import { OcrResultsPanel } from './OcrResultsPanel';
import { PageSelector } from './PageSelector';

/** OCR workflow states */
type OcrWorkflowState = 'empty' | 'detecting' | 'ready' | 'processing' | 'results';

/**
 * OcrPage — main page for the OCR feature.
 *
 * Two-column layout:
 * - Left panel (max-w-[320px]): language selector, page selector, action buttons
 * - Right panel: document preview with OCR status overlay
 *
 * Handles the full OCR workflow:
 * upload PDF → detect scanned pages → select pages → process → show results → generate searchable PDF
 *
 * Validates: Requirements 13.3, 13.9, 13.12
 */
export function OcrPage(): JSX.Element {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [sizeIncrease, setSizeIncrease] = useState<number | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  const engineStatus = useOcrStore((s) => s.engineStatus);
  const engineError = useOcrStore((s) => s.engineError);
  const scannedPages = useOcrStore((s) => s.scannedPages);
  const textPages = useOcrStore((s) => s.textPages);
  const detectionComplete = useOcrStore((s) => s.detectionComplete);
  const progress = useOcrStore((s) => s.progress);
  const results = useOcrStore((s) => s.results);
  const selectedLanguages = useOcrStore((s) => s.selectedLanguages);
  const initialize = useOcrStore((s) => s.initialize);
  const detectScannedPages = useOcrStore((s) => s.detectScannedPages);
  const processPages = useOcrStore((s) => s.processPages);
  const cancel = useOcrStore((s) => s.cancel);
  const reset = useOcrStore((s) => s.reset);

  const addToast = useToastStore((s) => s.addToast);

  // Determine current workflow state
  const workflowState: OcrWorkflowState = useMemo(() => {
    if (!pdfData) return 'empty';
    if (!detectionComplete) return 'detecting';
    if (engineStatus === 'processing' && progress) return 'processing';
    if (results) return 'results';
    return 'ready';
  }, [pdfData, detectionComplete, engineStatus, progress, results]);

  // Pre-select scanned pages when detection completes
  useEffect(() => {
    if (detectionComplete && scannedPages.length > 0) {
      setSelectedPages([...scannedPages].sort((a, b) => a - b));
    }
  }, [detectionComplete, scannedPages]);

  // Update total pages from detection results
  useEffect(() => {
    if (detectionComplete) {
      setTotalPages(scannedPages.length + textPages.length);
    }
  }, [detectionComplete, scannedPages, textPages]);

  /** Handle file upload */
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // Reset previous state
      reset();
      setPdfFile(file);
      setSelectedPages([]);
      setTotalPages(0);
      setSizeIncrease(undefined);

      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      setPdfData(buffer);

      // Start scanned page detection
      await detectScannedPages(buffer);
    },
    [reset, detectScannedPages],
  );

  /** Start OCR processing on selected pages */
  const handleStartProcessing = useCallback(async () => {
    if (!pdfData || selectedPages.length === 0) return;

    // Initialize engine if needed
    if (engineStatus !== 'ready') {
      await initialize(selectedLanguages);
    }

    // Process selected pages
    await processPages(pdfData, selectedPages);
  }, [pdfData, selectedPages, engineStatus, selectedLanguages, initialize, processPages]);

  /** Generate searchable PDF from OCR results */
  const handleGenerateSearchablePdf = useCallback(async () => {
    if (!pdfData || !results) return;

    setIsGenerating(true);
    try {
      const {
        data,
        sizeIncrease: increase,
        outputFilename,
      } = await generateSearchablePdf(pdfData, results, pdfFile?.name);

      setSizeIncrease(increase);

      // Trigger download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('Searchable PDF generated successfully.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate searchable PDF';
      addToast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [pdfData, results, pdfFile, addToast]);

  /** Cancel OCR processing */
  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  /** Reset and start over */
  const handleReset = useCallback(() => {
    reset();
    setPdfFile(null);
    setPdfData(null);
    setSelectedPages([]);
    setTotalPages(0);
    setSizeIncrease(undefined);
  }, [reset]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-light dark:text-text-dark">
          OCR — Text Recognition
        </h1>
        {pdfFile && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </header>

      {/* Two-column layout: controls left, preview right */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
        {/* Left panel — controls */}
        <aside className="w-full shrink-0 space-y-4 overflow-y-auto md:max-w-[320px]">
          {/* State: Empty — show upload */}
          <div
            className={`transition-opacity duration-moderate ease-out ${
              workflowState === 'empty' ? 'opacity-100' : 'hidden'
            }`}
          >
            <FileUploadZone
              accept={['application/pdf']}
              maxFiles={1}
              multiple={false}
              onFilesAccepted={handleFilesAccepted}
              operationRoute="/ocr"
              operationName="OCR"
            />
          </div>

          {/* State: Detecting — show skeleton loading */}
          <div
            className={`transition-opacity duration-moderate ease-out ${
              workflowState === 'detecting' ? 'opacity-100' : 'hidden'
            }`}
          >
            <div className="space-y-3 rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
              <Skeleton variant="text" lines={2} />
              <Skeleton height="32px" />
              <Skeleton variant="text" lines={1} />
            </div>
          </div>

          {/* State: Ready — show controls */}
          <div
            className={`space-y-4 transition-opacity duration-moderate ease-out ${
              workflowState === 'ready' ? 'opacity-100' : 'hidden'
            }`}
          >
            {/* Detection summary */}
            <DetectionSummary
              scannedPages={scannedPages}
              textPages={textPages}
              totalPages={totalPages}
            />

            {/* Language selector */}
            <LanguageSelector />

            {/* Page selector */}
            {totalPages > 0 && (
              <PageSelector
                totalPages={totalPages}
                scannedPages={scannedPages}
                selectedPages={selectedPages}
                onChange={setSelectedPages}
              />
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <Button
                variant="primary"
                fullWidth
                onClick={handleStartProcessing}
                disabled={selectedPages.length === 0}
                loading={engineStatus === 'initializing'}
              >
                <ScanIcon />
                {engineStatus === 'initializing' ? 'Loading OCR Engine...' : 'Start OCR Processing'}
              </Button>

              {scannedPages.length === 0 && detectionComplete && (
                <p className="text-center text-sm text-secondary-500 dark:text-secondary-400">
                  No scanned pages detected. You can still run OCR on selected pages.
                </p>
              )}
            </div>

            {/* Engine error */}
            {engineError && (
              <div
                className="rounded-md border border-error-200 bg-error-50 p-3 dark:border-error-700 dark:bg-error-900/20"
                role="alert"
              >
                <p className="text-sm text-error-700 dark:text-error-300">{engineError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => initialize(selectedLanguages)}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>

          {/* State: Processing — show progress */}
          <div
            className={`transition-opacity duration-moderate ease-out ${
              workflowState === 'processing' ? 'opacity-100' : 'hidden'
            }`}
          >
            {progress && <OcrProgressPanel progress={progress} onCancel={handleCancel} />}
          </div>

          {/* State: Results — show results panel */}
          <div
            className={`transition-opacity duration-moderate ease-out ${
              workflowState === 'results' ? 'opacity-100' : 'hidden'
            }`}
          >
            {results && (
              <OcrResultsPanel
                results={results}
                onGenerateSearchablePdf={handleGenerateSearchablePdf}
                sizeIncrease={sizeIncrease}
              />
            )}
            {isGenerating && (
              <div className="mt-3">
                <Skeleton height="40px" />
              </div>
            )}
          </div>
        </aside>

        {/* Right panel — document preview */}
        <main className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-secondary-200 bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-900">
          {workflowState === 'empty' ? (
            <EmptyPreviewState onUploadClick={() => {}} />
          ) : (
            <DocumentPreview
              fileName={pdfFile?.name ?? ''}
              workflowState={workflowState}
              scannedPages={scannedPages}
              totalPages={totalPages}
              progress={progress}
              results={results}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/** Detection summary showing scanned vs text pages */
function DetectionSummary({
  scannedPages,
  textPages,
  totalPages,
}: {
  scannedPages: number[];
  textPages: number[];
  totalPages: number;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
      <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Page Analysis</h2>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-text-light dark:text-text-dark">{totalPages}</p>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">Total</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-warning-600 dark:text-warning-400">
            {scannedPages.length}
          </p>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">Scanned</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
            {textPages.length}
          </p>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">With Text</p>
        </div>
      </div>
    </div>
  );
}

/** Empty state for the preview panel */
function EmptyPreviewState({ onUploadClick }: { onUploadClick: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      {/* OCR scan icon — 48x48px minimum (Req 13.9) */}
      <svg
        className="h-12 w-12 text-secondary-300 dark:text-secondary-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z"
        />
      </svg>
      <p className="max-w-[280px] text-sm text-secondary-500 dark:text-secondary-400">
        Upload a PDF to detect scanned pages and extract text using OCR
      </p>
      <Button variant="primary" size="sm" onClick={onUploadClick}>
        Upload PDF
      </Button>
    </div>
  );
}

/** Document preview with OCR status overlay */
function DocumentPreview({
  fileName,
  workflowState,
  scannedPages,
  totalPages,
  progress,
  results,
}: {
  fileName: string;
  workflowState: OcrWorkflowState;
  scannedPages: number[];
  totalPages: number;
  progress: OcrProgress | null;
  results: OcrProcessingResult | null;
}): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
      {/* Document icon */}
      <svg
        className="h-16 w-16 text-secondary-300 dark:text-secondary-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>

      {/* File name */}
      <p className="max-w-full truncate text-sm font-medium text-text-light dark:text-text-dark">
        {fileName}
      </p>

      {/* Status overlay based on workflow state */}
      <div className="transition-opacity duration-moderate ease-out">
        {workflowState === 'detecting' && (
          <div className="flex items-center gap-2 text-sm text-secondary-500 dark:text-secondary-400">
            <svg
              className="h-5 w-5 animate-spin motion-reduce:animate-none text-primary-500"
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
            <span>Analyzing pages...</span>
          </div>
        )}

        {workflowState === 'ready' && (
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            {scannedPages.length > 0
              ? `${scannedPages.length} of ${totalPages} pages need OCR`
              : `${totalPages} pages — all contain text`}
          </p>
        )}

        {workflowState === 'processing' && progress && (
          <div className="text-center">
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
              Processing page {progress.currentPage} of {progress.totalPages}
            </p>
            <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
              {progress.percentComplete}% complete
            </p>
          </div>
        )}

        {workflowState === 'results' && results && (
          <div className="text-center">
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
              ✓ {results.totalPagesProcessed} pages processed
            </p>
            {results.averageConfidence !== null && (
              <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                Average confidence: {Math.round(results.averageConfidence)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline scan icon for the start button */
function ScanIcon(): JSX.Element {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z"
      />
    </svg>
  );
}
