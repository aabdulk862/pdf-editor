import { useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { useToastStore } from '../../../store/toast';
import type { OcrProcessingResult } from '../../../core/ocr-engine/types';

export interface OcrResultsPanelProps {
  /** OCR processing results to display */
  results: OcrProcessingResult;
  /** Callback to trigger searchable PDF generation */
  onGenerateSearchablePdf: () => void;
  /** Percentage size increase of the generated searchable PDF (optional) */
  sizeIncrease?: number;
}

/**
 * OcrResultsPanel displays a summary of OCR processing results including
 * total pages processed, failures, average confidence, per-page failure
 * details, and a "Generate Searchable PDF" action button.
 *
 * Shows a Toast notification when the searchable PDF size increase exceeds 20%.
 *
 * Validates: Requirements 3.6, 6.1, 6.6
 */
export function OcrResultsPanel({
  results,
  onGenerateSearchablePdf,
  sizeIncrease,
}: OcrResultsPanelProps): JSX.Element {
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (sizeIncrease !== undefined && sizeIncrease > 20) {
      addToast(
        `The searchable PDF is ${Math.round(sizeIncrease)}% larger than the original file.`,
        'warning',
      );
    }
  }, [sizeIncrease, addToast]);

  const { totalPagesProcessed, totalPagesFailed, averageConfidence, failedPages } = results;

  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-level-3 dark:bg-secondary-800">
      <h2 className="text-base font-semibold text-text-dark dark:text-secondary-100">
        OCR Results
      </h2>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-md bg-secondary-50 px-3 py-2 dark:bg-secondary-700">
          <dt className="text-xs text-text-muted dark:text-secondary-400">Pages Processed</dt>
          <dd className="mt-1 text-lg font-medium text-text-dark dark:text-secondary-100">
            {totalPagesProcessed}
          </dd>
        </div>

        <div className="rounded-md bg-secondary-50 px-3 py-2 dark:bg-secondary-700">
          <dt className="text-xs text-text-muted dark:text-secondary-400">Failed</dt>
          <dd
            className={`mt-1 text-lg font-medium ${
              totalPagesFailed > 0
                ? 'text-error-600 dark:text-error-400'
                : 'text-text-dark dark:text-secondary-100'
            }`}
          >
            {totalPagesFailed}
          </dd>
        </div>

        <div className="rounded-md bg-secondary-50 px-3 py-2 dark:bg-secondary-700">
          <dt className="text-xs text-text-muted dark:text-secondary-400">Avg Confidence</dt>
          <dd className="mt-1 text-lg font-medium text-text-dark dark:text-secondary-100">
            {averageConfidence !== null ? `${Math.round(averageConfidence)}%` : '—'}
          </dd>
        </div>
      </dl>

      {failedPages.length > 0 && (
        <div className="mt-3 rounded-md border border-error-200 bg-error-50 p-3 dark:border-error-700 dark:bg-error-900/20">
          <p className="text-sm font-medium text-error-700 dark:text-error-300">Page failures:</p>
          <ul className="mt-1 list-inside list-disc text-sm text-error-600 dark:text-error-400">
            {failedPages.map((failure) => (
              <li key={failure.pageNumber}>
                Page {failure.pageNumber}: {failure.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <Button
          variant="primary"
          size="md"
          onClick={onGenerateSearchablePdf}
          disabled={totalPagesProcessed === 0}
          aria-label="Generate Searchable PDF"
        >
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Generate Searchable PDF
        </Button>
      </div>
    </div>
  );
}
