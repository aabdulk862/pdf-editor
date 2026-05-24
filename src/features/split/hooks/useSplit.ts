import { useCallback, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { useDownloadStore } from '@/store/downloads';
import { validatePageRange } from '@/utils/validation';
import type { PageRange } from '@/types/operations';

/** Maximum number of ranges allowed */
const MAX_RANGES = 20;

export interface SplitResult {
  fileName: string;
  pageCount: number;
  data: ArrayBuffer;
  range: PageRange;
}

export interface UseSplitReturn {
  pdfData: ArrayBuffer | null;
  pdfName: string;
  pageCount: number;
  rangeInput: string;
  setRangeInput: (value: string) => void;
  splitting: boolean;
  results: SplitResult[];
  loadPdf: (file: File) => Promise<void>;
  split: () => Promise<void>;
  downloadResult: (result: SplitResult) => void;
  downloadAll: () => void;
  reset: () => void;
  canSplit: boolean;
}

/**
 * Parses a comma-separated range input string into PageRange objects.
 * Supports formats: "1-3", "5", "7-9"
 */
export function parseRangeInput(input: string): { ranges: PageRange[]; errors: string[] } {
  const ranges: PageRange[] = [];
  const errors: string[] = [];

  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length === 0) {
    errors.push('Please enter at least one page range.');
    return { ranges, errors };
  }

  if (parts.length > MAX_RANGES) {
    errors.push(`Maximum of ${MAX_RANGES} ranges allowed.`);
    return { ranges, errors };
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const dashIndex = part.indexOf('-');

    if (dashIndex === -1) {
      // Single page: "5"
      const pageNum = Number(part);
      if (!Number.isFinite(pageNum) || !Number.isInteger(pageNum)) {
        errors.push(`Range entry ${i + 1} ("${part}") is not a valid number.`);
        continue;
      }
      ranges.push({ start: pageNum, end: pageNum });
    } else {
      // Range: "1-3"
      const startStr = part.substring(0, dashIndex).trim();
      const endStr = part.substring(dashIndex + 1).trim();
      const start = Number(startStr);
      const end = Number(endStr);

      if (!Number.isFinite(start) || !Number.isInteger(start)) {
        errors.push(`Range entry ${i + 1} ("${part}"): start page is not a valid number.`);
        continue;
      }
      if (!Number.isFinite(end) || !Number.isInteger(end)) {
        errors.push(`Range entry ${i + 1} ("${part}"): end page is not a valid number.`);
        continue;
      }
      ranges.push({ start, end });
    }
  }

  return { ranges, errors };
}

/**
 * Hook for the Split PDF feature.
 * Handles PDF loading, range parsing/validation, splitting via PdfWorkerClient,
 * and download management.
 */
export function useSplit(): UseSplitReturn {
  const toast = useToast();
  const addDownload = useDownloadStore((state) => state.addDownload);
  const workerClientRef = useRef(getPdfWorkerClient({ onError: (msg) => toast.error(msg) }));

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [rangeInput, setRangeInput] = useState<string>('');
  const [splitting, setSplitting] = useState(false);
  const [results, setResults] = useState<SplitResult[]>([]);

  const canSplit = pdfData !== null && rangeInput.trim().length > 0 && !splitting;

  const loadPdf = useCallback(
    async (file: File) => {
      try {
        const arrayBuffer = await file.arrayBuffer();

        // Load the PDF to get page count
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const count = pdfDoc.getPageCount();

        setPdfData(arrayBuffer);
        setPdfName(file.name);
        setPageCount(count);
        setResults([]);
        setRangeInput('');
      } catch {
        toast.error('Failed to load PDF. The file may be corrupted or invalid.');
      }
    },
    [toast],
  );

  const split = useCallback(async () => {
    if (!pdfData) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    // Parse ranges
    const { ranges, errors } = parseRangeInput(rangeInput);

    if (errors.length > 0) {
      for (const err of errors) {
        toast.error(err);
      }
      return;
    }

    if (ranges.length === 0) {
      toast.error('Please enter at least one page range.');
      return;
    }

    // Validate each range against total page count
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const validation = validatePageRange(range.start, range.end, pageCount);
      if (!validation.valid) {
        toast.error(`Range ${i + 1} (${range.start}-${range.end}): ${validation.error}`);
        return;
      }
    }

    setSplitting(true);
    setResults([]);

    try {
      const operationResults = await workerClientRef.current.splitByRanges(pdfData, ranges);

      const splitResults: SplitResult[] = [];
      const baseName = pdfName.replace(/\.pdf$/i, '');

      for (let i = 0; i < operationResults.length; i++) {
        const result = operationResults[i];
        if (result.success && result.data) {
          const range = ranges[i];
          const fileName = `${baseName}_pages_${range.start}-${range.end}.pdf`;
          const resultPageCount =
            (result.metadata?.pageCount as number) ?? range.end - range.start + 1;
          splitResults.push({
            fileName,
            pageCount: resultPageCount,
            data: result.data,
            range,
          });
        } else {
          toast.warning(
            `Range ${ranges[i].start}-${ranges[i].end}: ${result.error ?? 'Failed to split.'}`,
          );
        }
      }

      setResults(splitResults);

      if (splitResults.length > 0) {
        toast.success(`Split complete! ${splitResults.length} file(s) ready for download.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Split failed: ${message}`);
    } finally {
      setSplitting(false);
    }
  }, [pdfData, rangeInput, pageCount, pdfName, toast]);

  const downloadResult = useCallback(
    (result: SplitResult) => {
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Add to download history
      addDownload({
        id: crypto.randomUUID(),
        fileName: result.fileName,
        operation: 'Split',
        timestamp: Date.now(),
        fileData: result.data,
        fileSize: result.data.byteLength,
      });
    },
    [addDownload],
  );

  const downloadAll = useCallback(() => {
    for (const result of results) {
      downloadResult(result);
    }
  }, [results, downloadResult]);

  const reset = useCallback(() => {
    setPdfData(null);
    setPdfName('');
    setPageCount(0);
    setRangeInput('');
    setResults([]);
  }, []);

  return {
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
  };
}
