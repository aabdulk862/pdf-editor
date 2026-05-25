import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { useCanvasStore } from '../store/canvas-store';
import type { ExportOptions } from '../types';

export interface ExportDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Callback when the user initiates export */
  onExport: (options: ExportOptions) => void;
}

type ExportFormat = ExportOptions['format'];
type DpiOption = 72 | 150 | 300;

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
  { value: 'docx', label: 'DOCX' },
];

const DPI_OPTIONS: { value: DpiOption; label: string }[] = [
  { value: 72, label: '72 DPI (Screen)' },
  { value: 150, label: '150 DPI (Medium)' },
  { value: 300, label: '300 DPI (Print)' },
];

/**
 * ExportDialog — modal dialog for configuring and initiating document export.
 *
 * Features:
 * - Format selection: PDF, PNG, SVG, DOCX
 * - Page selection: all pages or specific pages
 * - DPI selection for PNG (72, 150, 300)
 * - Batch export toggle
 * - "Insert into PDF" option for PDF format
 * - Progress indicator showing current page / total pages
 * - Error display with format-specific suggestions
 * - Loading states with spinner within affected area
 */
export function ExportDialog({ isOpen, onClose, onExport }: ExportDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Form state
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [pageMode, setPageMode] = useState<'all' | 'specific'>('all');
  const [specificPages, setSpecificPages] = useState('');
  const [dpi, setDpi] = useState<DpiOption>(150);
  const [batch, setBatch] = useState(false);
  const [insertIntoPdf, setInsertIntoPdf] = useState(false);

  // Export progress from store
  const exportProgress = useCanvasStore((state) => state.exportProgress);

  const isExporting = exportProgress.status === 'exporting';
  const hasError = exportProgress.status === 'error';

  // Open/close the dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Handle native cancel event (Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // Handle click on backdrop
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  // Parse specific pages input into number array
  const parsePages = useCallback((): 'all' | number[] => {
    if (pageMode === 'all') return 'all';

    const parsed = specificPages
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => parseInt(s, 10) - 1) // Convert to 0-indexed
      .filter((n) => !isNaN(n) && n >= 0);

    return parsed.length > 0 ? parsed : 'all';
  }, [pageMode, specificPages]);

  // Handle export submission
  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      format,
      pages: parsePages(),
      batch,
    };

    if (format === 'png') {
      options.dpi = dpi;
    }

    onExport(options);
  }, [format, parsePages, batch, dpi, onExport]);

  // Compute progress percentage
  const progressPercent =
    exportProgress.totalPages > 0
      ? Math.round((exportProgress.currentPage / exportProgress.totalPages) * 100)
      : 0;

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="export-dialog-title"
      className={[
        'fixed inset-0 m-auto rounded-lg border-none p-0 shadow-level-4',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'bg-white dark:bg-secondary-800',
        'w-[calc(100%-2rem)] max-w-lg',
        'animate-in fade-in duration-normal motion-reduce:animate-none',
      ].join(' ')}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary-200 px-6 py-4 dark:border-secondary-700">
          <h2
            id="export-dialog-title"
            className="text-lg font-semibold text-text-light dark:text-text-dark"
          >
            Export Document
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-secondary-500 transition-colors duration-normal ease-in-out hover:bg-secondary-100 hover:text-secondary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-200"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-4">
          {/* Format Selection */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-light dark:text-text-dark">
              Format
            </legend>
            <div className="flex gap-1 rounded-lg bg-secondary-100 p-1 dark:bg-secondary-700">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  aria-pressed={format === opt.value}
                  className={[
                    'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-normal ease-in-out',
                    'min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    format === opt.value
                      ? 'bg-white text-primary-700 shadow-level-1 dark:bg-secondary-600 dark:text-primary-300'
                      : 'text-secondary-600 hover:text-secondary-800 dark:text-secondary-300 dark:hover:text-secondary-100',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Page Selection */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-light dark:text-text-dark">
              Pages
            </legend>
            <div className="space-y-2">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="page-selection"
                  value="all"
                  checked={pageMode === 'all'}
                  onChange={() => setPageMode('all')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-text-light dark:text-text-dark">All pages</span>
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="page-selection"
                  value="specific"
                  checked={pageMode === 'specific'}
                  onChange={() => setPageMode('specific')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-text-light dark:text-text-dark">Specific pages</span>
              </label>
              {pageMode === 'specific' && (
                <input
                  type="text"
                  value={specificPages}
                  onChange={(e) => setSpecificPages(e.target.value)}
                  placeholder="e.g. 1, 3, 5-7"
                  aria-label="Page numbers (comma-separated)"
                  className="mt-1 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-text-light placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700 dark:text-text-dark dark:placeholder:text-secondary-500"
                />
              )}
            </div>
          </fieldset>

          {/* DPI Selection (PNG only) */}
          {format === 'png' && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-light dark:text-text-dark">
                Resolution (DPI)
              </legend>
              <div className="space-y-2">
                {DPI_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3"
                  >
                    <input
                      type="radio"
                      name="dpi-selection"
                      value={opt.value}
                      checked={dpi === opt.value}
                      onChange={() => setDpi(opt.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-text-light dark:text-text-dark">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Batch Export Toggle */}
          <label className="flex min-h-[44px] cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-text-light dark:text-text-dark">
              Batch export (one file per page)
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={batch}
              onClick={() => setBatch(!batch)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-moderate ease-in-out motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                batch
                  ? 'bg-primary-600 dark:bg-primary-500'
                  : 'bg-secondary-300 dark:bg-secondary-600',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-level-1 ring-0 transition-transform duration-moderate ease-in-out motion-reduce:transition-none',
                  batch ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </label>

          {/* Insert into PDF (PDF format only) */}
          {format === 'pdf' && (
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-text-light dark:text-text-dark">
                Insert into existing PDF
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={insertIntoPdf}
                onClick={() => setInsertIntoPdf(!insertIntoPdf)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-moderate ease-in-out motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  insertIntoPdf
                    ? 'bg-primary-600 dark:bg-primary-500'
                    : 'bg-secondary-300 dark:bg-secondary-600',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-level-1 ring-0 transition-transform duration-moderate ease-in-out motion-reduce:transition-none',
                    insertIntoPdf ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </label>
          )}

          {/* Progress Section */}
          {isExporting && (
            <div
              className="rounded-md bg-primary-50 p-4 dark:bg-primary-900/20"
              role="status"
              aria-live="polite"
            >
              <p className="mb-2 text-sm font-medium text-primary-700 dark:text-primary-300">
                Exporting page {exportProgress.currentPage} of {exportProgress.totalPages}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-100 dark:bg-primary-800">
                <div
                  className="h-full rounded-full bg-primary-500 transition-[width] duration-moderate ease-out motion-reduce:transition-none dark:bg-primary-400"
                  style={{ width: `${progressPercent}%` }}
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Export progress"
                />
              </div>
            </div>
          )}

          {/* Error Section */}
          {hasError && (
            <div
              className="rounded-md bg-error-50 p-4 dark:bg-error-900/20"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-error-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="7" />
                  <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-error-700 dark:text-error-300">
                    {exportProgress.error || 'Export failed'}
                  </p>
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {getFormatSuggestion(format)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Dismiss error"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-error-500 transition-colors duration-normal ease-in-out hover:bg-error-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500 dark:hover:bg-error-800"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-secondary-200 px-6 py-4 dark:border-secondary-700">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-secondary-700 transition-colors duration-normal ease-in-out hover:bg-secondary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-200 dark:hover:bg-secondary-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            aria-disabled={isExporting}
            className={[
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors duration-normal ease-in-out',
              'bg-primary-600 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:bg-primary-500 dark:hover:bg-primary-600',
              isExporting ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            {isExporting && (
              <svg
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                xmlns="http://www.w3.org/2000/svg"
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
            )}
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Returns a format-specific suggestion when export fails */
function getFormatSuggestion(format: ExportFormat): string {
  switch (format) {
    case 'pdf':
      return 'Try reducing the number of pages or simplifying complex elements.';
    case 'png':
      return 'Try reducing the DPI setting or exporting fewer pages at once.';
    case 'svg':
      return 'Try reducing embedded image sizes or exporting individual pages.';
    case 'docx':
      return 'Try simplifying complex shapes or reducing the number of images.';
    default:
      return 'Try exporting with different settings.';
  }
}
