import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { ProcessingState } from '@/components/ui/ProcessingState';
import { ErrorRecovery, type ToolErrorState } from '@/components/ui/ErrorRecovery';
import { SegmentedControl } from '@/design-system/primitives/SegmentedControl';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { PageNumberConfig } from '@/types/operations';
import { QuickActionsBar } from '@/features/quick-actions/QuickActionsBar';
import { useQuickActionsStore } from '@/store/quick-actions';

type Position = PageNumberConfig['position'];

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const MIN_START_NUMBER = 1;
const MAX_START_NUMBER = 9999;

export function PageNumbersPage(): JSX.Element {
  const toast = useToast();

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [position, setPosition] = useState<Position>('bottom-center');
  const [startNumber, setStartNumber] = useState<string>('1');
  const [modifiedData, setModifiedData] = useState<ArrayBuffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errorState, setErrorState] = useState<ToolErrorState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Track previous modifiedData to detect new successful operations
  const prevModifiedDataRef = useRef<ArrayBuffer | null>(null);

  // Trigger Quick Actions Bar when page numbers are added successfully
  useEffect(() => {
    if (modifiedData && modifiedData !== prevModifiedDataRef.current) {
      useQuickActionsStore.getState().show('add-page-numbers', modifiedData);
    }
    prevModifiedDataRef.current = modifiedData;
  }, [modifiedData]);

  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        setPdfName(file.name);
        setModifiedData(null);
        setCurrentPage(1);
      };
      reader.onerror = () => {
        toast.error('Failed to read the file. Please try again.');
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

  const validateStartNumber = useCallback(
    (value: string): number | null => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < MIN_START_NUMBER || num > MAX_START_NUMBER) {
        toast.error(
          `Starting page number must be an integer between ${MIN_START_NUMBER} and ${MAX_START_NUMBER}.`,
        );
        return null;
      }
      return num;
    },
    [toast],
  );

  const handleApply = useCallback(async () => {
    if (!pdfData) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    const validatedStart = validateStartNumber(startNumber);
    if (validatedStart === null) return;

    setProcessing(true);
    setErrorState(null);
    try {
      const client = getPdfWorkerClient({
        onError: (msg) => toast.warning(msg),
      });

      const config: PageNumberConfig = {
        position,
        startNumber: validatedStart,
      };

      const result = await client.addPageNumbers(pdfData, config);

      if (result.success && result.data) {
        setModifiedData(result.data);
        toast.success('Page numbers added successfully.');
      } else {
        const message = result.error ?? 'Failed to add page numbers.';
        setErrorState({
          type: 'processing-failed',
          message,
          recoverable: true,
          retryAction: () => handleApply(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorState({
        type: 'unknown',
        message,
        recoverable: true,
        retryAction: () => handleApply(),
      });
    } finally {
      setProcessing(false);
    }
  }, [pdfData, position, startNumber, validateStartNumber, toast]);

  const handleDownload = useCallback(() => {
    if (!modifiedData) return;

    const blob = new Blob([modifiedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = pdfName.replace(/\.pdf$/i, '');
    link.download = `${baseName}-numbered.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [modifiedData, pdfName]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Add Page Numbers
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Add sequential page numbers to your PDF at a chosen position.
        </p>
      </div>

      {/* File Upload */}
      <FileUploadZone
        accept={['application/pdf']}
        maxFiles={1}
        multiple={false}
        onFilesAccepted={handleFilesAccepted}
        onFileRejected={handleFileRejected}
        operationRoute="/page-numbers"
        operationName="Page Numbers"
      />

      {/* Configuration */}
      {pdfData && (
        <div className="space-y-4 rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
            Configuration
          </h2>

          {/* Position Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Position
            </label>
            <SegmentedControl
              options={POSITION_OPTIONS}
              value={position}
              onChange={(val) => setPosition(val as Position)}
              size="sm"
            />
          </div>

          {/* Starting Number Input */}
          <div className="space-y-2">
            <label
              htmlFor="start-number"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
            >
              Starting Number
            </label>
            <input
              id="start-number"
              type="number"
              min={MIN_START_NUMBER}
              max={MAX_START_NUMBER}
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              className={[
                'min-h-[44px] w-full max-w-[200px] rounded-md border px-3 py-2 text-sm',
                'border-secondary-300 bg-white text-text-light',
                'dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark',
                'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                'dark:focus:border-primary-400 dark:focus:ring-primary-400',
              ].join(' ')}
              aria-describedby="start-number-hint"
            />
            <p
              id="start-number-hint"
              className="text-xs text-secondary-500 dark:text-secondary-400"
            >
              Integer between {MIN_START_NUMBER} and {MAX_START_NUMBER}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="primary"
              onClick={handleApply}
              loading={processing}
              disabled={!pdfData || processing}
            >
              Add Page Numbers
            </Button>
            {modifiedData && (
              <div className="motion-safe:animate-page-enter">
                <Button variant="secondary" onClick={handleDownload}>
                  Download
                </Button>
              </div>
            )}
          </div>

          {/* Error recovery state */}
          {errorState && (
            <ErrorRecovery
              error={errorState}
              onReset={() => {
                setPdfData(null);
                setPdfName('');
                setModifiedData(null);
                setErrorState(null);
              }}
            />
          )}

          {/* Quick Actions Bar */}
          {modifiedData && <QuickActionsBar />}
        </div>
      )}

      {/* Processing state skeleton */}
      {pdfData && (
        <ProcessingState
          isProcessing={processing}
          label="Adding page numbers..."
          variant="preview"
        />
      )}

      {/* Preview — fades in when result is ready */}
      <div
        className={[
          'motion-safe:transition-[opacity,transform] motion-safe:duration-moderate motion-safe:ease-out',
          'motion-reduce:transition-none',
          pdfData || modifiedData
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden',
        ].join(' ')}
      >
        {(pdfData || modifiedData) && (
          <PreviewPanel
            originalDoc={pdfData}
            modifiedDoc={modifiedData}
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

PageNumbersPage.displayName = 'PageNumbersPage';
