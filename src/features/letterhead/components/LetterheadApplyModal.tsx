import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import type { LetterheadPageTarget } from '../types';

export interface LetterheadApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (target: LetterheadPageTarget) => void;
  totalPages: number;
}

type TargetType = 'first' | 'all' | 'custom';

/**
 * Parses a page range string like "1,3,5-8" into an array of page numbers.
 * Returns null if the format is invalid or any page is out of range.
 */
export function parsePageRange(input: string, totalPages: number): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const pages = new Set<number>();
  const parts = trimmed.split(',');

  for (const part of parts) {
    const segment = part.trim();
    if (!segment) return null;

    if (segment.includes('-')) {
      const rangeParts = segment.split('-');
      if (rangeParts.length !== 2) return null;

      const start = Number(rangeParts[0].trim());
      const end = Number(rangeParts[1].trim());

      if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) return null;
      if (start > end) return null;

      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const page = Number(segment);
      if (!Number.isInteger(page)) return null;
      if (page < 1 || page > totalPages) return null;
      pages.add(page);
    }
  }

  if (pages.size === 0) return null;

  return Array.from(pages).sort((a, b) => a - b);
}

export function LetterheadApplyModal({
  isOpen,
  onClose,
  onApply,
  totalPages,
}: LetterheadApplyModalProps): ReactNode {
  const [targetType, setTargetType] = useState<TargetType>('first');
  const [customRange, setCustomRange] = useState('');

  const parsedPages = useMemo(() => {
    if (targetType !== 'custom') return null;
    return parsePageRange(customRange, totalPages);
  }, [targetType, customRange, totalPages]);

  const validationError = useMemo(() => {
    if (targetType !== 'custom') return null;
    if (!customRange.trim()) return null;
    if (parsedPages === null) {
      return `Invalid range. Use format like "1,3,5-8". Pages must be between 1 and ${totalPages}.`;
    }
    return null;
  }, [targetType, customRange, parsedPages, totalPages]);

  const isApplyDisabled =
    targetType === 'custom' && (customRange.trim() === '' || parsedPages === null);

  const handleApply = useCallback(() => {
    let target: LetterheadPageTarget;

    switch (targetType) {
      case 'first':
        target = { type: 'first' };
        break;
      case 'all':
        target = { type: 'all' };
        break;
      case 'custom':
        if (!parsedPages) return;
        target = { type: 'custom', pages: parsedPages };
        break;
    }

    onApply(target);
  }, [targetType, parsedPages, onApply]);

  const handleClose = useCallback(() => {
    setTargetType('first');
    setCustomRange('');
    onClose();
  }, [onClose]);

  const footer = (
    <>
      <Button variant="secondary" onClick={handleClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleApply} disabled={isApplyDisabled}>
        Apply
      </Button>
    </>
  );

  return (
    <Modal open={isOpen} onClose={handleClose} title="Apply Letterhead" footer={footer} size="sm">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-text-light dark:text-text-dark">
          Apply to pages
        </legend>

        <div className="flex flex-col gap-3">
          {/* First page only */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="page-target"
              value="first"
              checked={targetType === 'first'}
              onChange={() => setTargetType('first')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-text-light dark:text-text-dark">First page only</span>
          </label>

          {/* All pages */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="page-target"
              value="all"
              checked={targetType === 'all'}
              onChange={() => setTargetType('all')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-text-light dark:text-text-dark">All pages</span>
          </label>

          {/* Custom range */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="radio"
              name="page-target"
              value="custom"
              checked={targetType === 'custom'}
              onChange={() => setTargetType('custom')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-text-light dark:text-text-dark">Custom range</span>
          </label>

          {/* Custom range input */}
          {targetType === 'custom' && (
            <div className="ml-7">
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="e.g., 1,3,5-8"
                aria-label="Custom page range"
                aria-invalid={validationError !== null}
                className={[
                  'w-full rounded-md border px-3 py-2 text-sm',
                  'bg-white dark:bg-secondary-800',
                  'text-text-light dark:text-text-dark',
                  'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  validationError
                    ? 'border-error-500 dark:border-error-400'
                    : 'border-secondary-300 dark:border-secondary-600',
                ].join(' ')}
              />
              {validationError && (
                <p className="mt-1 text-xs text-error-600 dark:text-error-400" role="alert">
                  {validationError}
                </p>
              )}
            </div>
          )}
        </div>
      </fieldset>
    </Modal>
  );
}
