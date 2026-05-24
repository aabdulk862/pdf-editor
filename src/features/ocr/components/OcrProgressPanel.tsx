import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Button } from '../../../components/ui/Button';
import { OcrEngine } from '../../../core/ocr-engine/ocr-engine';
import type { OcrProgress } from '../../../core/ocr-engine/types';

export interface OcrProgressPanelProps {
  /** Current OCR processing progress */
  progress: OcrProgress;
  /** Callback invoked when the user cancels OCR processing */
  onCancel: () => void;
}

/**
 * OcrProgressPanel displays OCR processing progress including a determinate
 * progress bar, current page/total text, estimated time remaining (after 2+
 * pages), and a cancel button.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function OcrProgressPanel({ progress, onCancel }: OcrProgressPanelProps): JSX.Element {
  const { currentPage, totalPages, percentComplete, estimatedTimeRemainingMs } = progress;

  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-lg dark:bg-secondary-800">
      <ProgressBar
        progress={percentComplete}
        label={`Processing page ${currentPage} of ${totalPages}`}
        ariaLabel={`OCR processing progress: ${percentComplete}% complete, page ${currentPage} of ${totalPages}`}
      />

      {estimatedTimeRemainingMs !== null && (
        <p className="mt-2 text-sm text-text-muted dark:text-secondary-300">
          Estimated time remaining: {OcrEngine.formatEta(estimatedTimeRemainingMs)}
        </p>
      )}

      <div className="mt-4">
        <Button
          variant="danger"
          size="sm"
          onClick={onCancel}
          aria-label="Cancel OCR processing"
          className="min-h-[44px] min-w-[44px]"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
