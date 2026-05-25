import JSZip from 'jszip';
import type { CanvasDocument, CanvasPage, ExportOptions } from '../types';

/**
 * Interface that each format-specific export engine must implement.
 */
export interface ExportEngine {
  exportPage(page: CanvasPage, options: ExportOptions): Promise<Blob>;
}

/**
 * Result of a single page export attempt within a batch.
 */
export interface PageExportResult {
  pageIndex: number;
  success: boolean;
  error?: string;
}

/**
 * Summary returned after a batch export completes.
 */
export interface BatchExportSummary {
  totalPages: number;
  succeeded: number[];
  failed: { pageIndex: number; error: string }[];
}

/**
 * Full result of a batch export operation.
 */
export interface BatchExportResult {
  zip: Blob;
  filename: string;
  summary: BatchExportSummary;
}

/**
 * Progress callback signature for batch export.
 * Called after each page is processed.
 */
export type BatchProgressCallback = (currentPage: number, totalPages: number) => void;

/**
 * Options for the batch export coordinator.
 */
export interface BatchExportOptions {
  document: CanvasDocument;
  exportOptions: ExportOptions;
  engine: ExportEngine;
  onProgress?: BatchProgressCallback;
}

/**
 * Returns the file extension for a given export format.
 */
function getExtension(format: ExportOptions['format']): string {
  switch (format) {
    case 'pdf':
      return 'pdf';
    case 'png':
      return 'png';
    case 'svg':
      return 'svg';
    case 'docx':
      return 'docx';
  }
}

/**
 * Formats a page number as a zero-padded 3-digit string.
 */
function zeroPad(num: number): string {
  return String(num).padStart(3, '0');
}

/**
 * Sanitizes a document name for use in filenames.
 * Replaces characters that are invalid in filenames with hyphens.
 */
function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim() || 'document';
}

/**
 * Batch export coordinator.
 *
 * Iterates through pages (all or selected), calls the provided export engine
 * for each page, collects results into a ZIP archive, and reports progress.
 *
 * On per-page failure, continues processing remaining pages and collects errors.
 *
 * @returns A BatchExportResult containing the ZIP blob, filename, and summary.
 */
export async function batchExport(options: BatchExportOptions): Promise<BatchExportResult> {
  const { document, exportOptions, engine, onProgress } = options;
  const { format, pages } = exportOptions;

  // Determine which pages to export
  const pageIndices: number[] =
    pages === 'all'
      ? document.pages.map((_, i) => i)
      : pages.filter((i) => i >= 0 && i < document.pages.length);

  const totalPages = pageIndices.length;
  const ext = getExtension(format);
  const docName = sanitizeFilename(document.name);

  const zip = new JSZip();
  const succeeded: number[] = [];
  const failed: { pageIndex: number; error: string }[] = [];

  for (let i = 0; i < pageIndices.length; i++) {
    const pageIndex = pageIndices[i];
    const page = document.pages[pageIndex];

    try {
      const blob = await engine.exportPage(page, exportOptions);
      const filename = `${docName}-page-${zeroPad(pageIndex + 1)}.${ext}`;
      zip.file(filename, blob);
      succeeded.push(pageIndex);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown export error';
      failed.push({ pageIndex, error: errorMessage });
    }

    // Report progress after each page (1-indexed current page)
    onProgress?.(i + 1, totalPages);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = `${docName}-batch.zip`;

  return {
    zip: zipBlob,
    filename: zipFilename,
    summary: {
      totalPages,
      succeeded,
      failed,
    },
  };
}
