import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export interface PageSelectorProps {
  /** Total number of pages in the document */
  totalPages: number;
  /** Pages detected as scanned (image-only) */
  scannedPages: number[];
  /** Currently selected pages for OCR processing */
  selectedPages: number[];
  /** Callback when page selection changes */
  onChange: (pages: number[]) => void;
}

/**
 * Parse a page range string (e.g., "1-5, 8, 12") into a sorted, deduplicated array of page numbers.
 * Returns only valid page numbers between 1 and totalPages.
 */
export function parsePageRange(input: string, totalPages: number): number[] {
  if (!input.trim()) return [];

  const pages = new Set<number>();
  const parts = input.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) {
            pages.add(i);
          }
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        pages.add(num);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Convert an array of page numbers into a compact range string.
 * E.g., [1, 2, 3, 5, 8, 9] → "1-3, 5, 8-9"
 */
export function formatPageRange(pages: number[]): string {
  if (pages.length === 0) return '';

  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }

  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
  return ranges.join(', ');
}

/**
 * PageSelector component for selecting individual pages or page ranges for OCR processing.
 * Pre-selects detected scanned pages by default.
 *
 * Validates: Requirements 11.4
 */
export function PageSelector({
  totalPages,
  scannedPages,
  selectedPages,
  onChange,
}: PageSelectorProps) {
  const [inputValue, setInputValue] = useState(() => formatPageRange(selectedPages));
  const [error, setError] = useState<string | null>(null);

  // Sync input value when selectedPages changes externally
  useEffect(() => {
    setInputValue(formatPageRange(selectedPages));
  }, [selectedPages]);

  const validationMessage = useMemo(() => {
    if (error) return error;
    return null;
  }, [error]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Parse and validate
      const parsed = parsePageRange(value, totalPages);

      if (value.trim() && parsed.length === 0) {
        setError(`Enter valid page numbers between 1 and ${totalPages}`);
      } else {
        setError(null);
        onChange(parsed);
      }
    },
    [totalPages, onChange],
  );

  const handleSelectAllScanned = useCallback(() => {
    if (scannedPages.length > 0) {
      setError(null);
      onChange([...scannedPages].sort((a, b) => a - b));
    }
  }, [scannedPages, onChange]);

  const handleSelectAll = useCallback(() => {
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    setError(null);
    onChange(allPages);
  }, [totalPages, onChange]);

  const selectedCount = selectedPages.length;
  const hasScannedPages = scannedPages.length > 0;

  return (
    <div className="space-y-3">
      <Input
        label="Pages to process"
        placeholder="e.g., 1-5, 8, 12"
        value={inputValue}
        onChange={handleInputChange}
        error={validationMessage ?? undefined}
        helperText={
          !validationMessage
            ? `${selectedCount} of ${totalPages} page${totalPages !== 1 ? 's' : ''} selected`
            : undefined
        }
        fullWidth
        aria-label="Page range for OCR processing"
      />

      <div className="flex flex-wrap items-center gap-2">
        {hasScannedPages && (
          <Button variant="outline" size="sm" onClick={handleSelectAllScanned}>
            Select All Scanned ({scannedPages.length})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleSelectAll}>
          Select All ({totalPages})
        </Button>
      </div>
    </div>
  );
}
