import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { HeaderFooterConfig } from '@/types/operations';

const MAX_TEXT_LENGTH = 100;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 36;
const MIN_MARGIN = 0;
const MAX_MARGIN = 72;

const PLACEHOLDERS = [
  { value: '{page}', label: 'Page Number' },
  { value: '{total}', label: 'Total Pages' },
  { value: '{date}', label: 'Date (YYYY-MM-DD)' },
];

type HeaderFooterField =
  | 'headerLeft'
  | 'headerCenter'
  | 'headerRight'
  | 'footerLeft'
  | 'footerCenter'
  | 'footerRight';

const FIELD_LABELS: Record<HeaderFooterField, string> = {
  headerLeft: 'Header Left',
  headerCenter: 'Header Center',
  headerRight: 'Header Right',
  footerLeft: 'Footer Left',
  footerCenter: 'Footer Center',
  footerRight: 'Footer Right',
};

function resolvePreviewPlaceholders(text: string, page: number, total: number): string {
  const today = new Date().toISOString().split('T')[0];
  return text
    .replace(/\{page\}/g, String(page))
    .replace(/\{total\}/g, String(total))
    .replace(/\{date\}/g, today);
}

export function HeadersFootersPage(): JSX.Element {
  const toast = useToast();

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [modifiedData, setModifiedData] = useState<ArrayBuffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Header/Footer text fields
  const [headerLeft, setHeaderLeft] = useState('');
  const [headerCenter, setHeaderCenter] = useState('');
  const [headerRight, setHeaderRight] = useState('');
  const [footerLeft, setFooterLeft] = useState('');
  const [footerCenter, setFooterCenter] = useState('');
  const [footerRight, setFooterRight] = useState('');

  // Font size and margin
  const [fontSize, setFontSize] = useState<string>('12');
  const [margin, setMargin] = useState<string>('36');

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

  const handleTextChange = useCallback((field: HeaderFooterField, value: string) => {
    if (value.length > MAX_TEXT_LENGTH) return;
    switch (field) {
      case 'headerLeft':
        setHeaderLeft(value);
        break;
      case 'headerCenter':
        setHeaderCenter(value);
        break;
      case 'headerRight':
        setHeaderRight(value);
        break;
      case 'footerLeft':
        setFooterLeft(value);
        break;
      case 'footerCenter':
        setFooterCenter(value);
        break;
      case 'footerRight':
        setFooterRight(value);
        break;
    }
  }, []);

  const insertPlaceholder = useCallback(
    (field: HeaderFooterField, placeholder: string) => {
      const getFieldValue = (): string => {
        switch (field) {
          case 'headerLeft':
            return headerLeft;
          case 'headerCenter':
            return headerCenter;
          case 'headerRight':
            return headerRight;
          case 'footerLeft':
            return footerLeft;
          case 'footerCenter':
            return footerCenter;
          case 'footerRight':
            return footerRight;
        }
      };
      const current = getFieldValue();
      const newValue = current + placeholder;
      if (newValue.length <= MAX_TEXT_LENGTH) {
        handleTextChange(field, newValue);
      }
    },
    [
      headerLeft,
      headerCenter,
      headerRight,
      footerLeft,
      footerCenter,
      footerRight,
      handleTextChange,
    ],
  );

  const validateConfig = useCallback((): boolean => {
    const fs = parseInt(fontSize, 10);
    if (isNaN(fs) || fs < MIN_FONT_SIZE || fs > MAX_FONT_SIZE) {
      toast.error(`Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE} pt.`);
      return false;
    }

    const mg = parseInt(margin, 10);
    if (isNaN(mg) || mg < MIN_MARGIN || mg > MAX_MARGIN) {
      toast.error(`Margin must be between ${MIN_MARGIN} and ${MAX_MARGIN} pt.`);
      return false;
    }

    const hasContent = [
      headerLeft,
      headerCenter,
      headerRight,
      footerLeft,
      footerCenter,
      footerRight,
    ].some((text) => text.trim().length > 0);
    if (!hasContent) {
      toast.error('Please enter text in at least one header or footer field.');
      return false;
    }

    return true;
  }, [
    fontSize,
    margin,
    headerLeft,
    headerCenter,
    headerRight,
    footerLeft,
    footerCenter,
    footerRight,
    toast,
  ]);

  const handleApply = useCallback(async () => {
    if (!pdfData) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    if (!validateConfig()) return;

    setProcessing(true);
    try {
      const client = getPdfWorkerClient({
        onError: (msg) => toast.warning(msg),
      });

      const config: HeaderFooterConfig = {
        header: { left: headerLeft, center: headerCenter, right: headerRight },
        footer: { left: footerLeft, center: footerCenter, right: footerRight },
        fontSize: parseInt(fontSize, 10),
        margin: parseInt(margin, 10),
      };

      const result = await client.addHeadersFooters(pdfData, config);

      if (result.success && result.data) {
        setModifiedData(result.data);
        toast.success('Headers and footers added successfully.');
      } else {
        toast.error(result.error ?? 'Failed to add headers and footers.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  }, [
    pdfData,
    headerLeft,
    headerCenter,
    headerRight,
    footerLeft,
    footerCenter,
    footerRight,
    fontSize,
    margin,
    validateConfig,
    toast,
  ]);

  const handleDownload = useCallback(() => {
    if (!modifiedData) return;

    const blob = new Blob([modifiedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = pdfName.replace(/\.pdf$/i, '');
    link.download = `${baseName}-headers-footers.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [modifiedData, pdfName]);

  // Preview text with resolved placeholders
  const getPreviewText = useCallback((text: string): string => {
    if (!text.trim()) return '';
    return resolvePreviewPlaceholders(text, 1, 10);
  }, []);

  const inputClasses = [
    'min-h-[44px] w-full rounded-md border px-3 py-2 text-sm',
    'border-secondary-300 bg-white text-text-light',
    'dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark',
    'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
    'dark:focus:border-primary-400 dark:focus:ring-primary-400',
    'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
  ].join(' ');

  const renderTextField = (field: HeaderFooterField) => {
    const getFieldValue = (): string => {
      switch (field) {
        case 'headerLeft':
          return headerLeft;
        case 'headerCenter':
          return headerCenter;
        case 'headerRight':
          return headerRight;
        case 'footerLeft':
          return footerLeft;
        case 'footerCenter':
          return footerCenter;
        case 'footerRight':
          return footerRight;
      }
    };
    const value = getFieldValue();
    const preview = getPreviewText(value);

    return (
      <div key={field} className="space-y-1">
        <label
          htmlFor={field}
          className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
        >
          {FIELD_LABELS[field]}
        </label>
        <input
          id={field}
          type="text"
          value={value}
          onChange={(e) => handleTextChange(field, e.target.value)}
          maxLength={MAX_TEXT_LENGTH}
          placeholder={`Enter text or use placeholders (max ${MAX_TEXT_LENGTH} chars)`}
          className={inputClasses}
          aria-describedby={`${field}-preview`}
        />
        {/* Placeholder insertion buttons */}
        <div className="flex flex-wrap gap-1">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => insertPlaceholder(field, p.value)}
              className="rounded border border-secondary-300 bg-secondary-50 px-2 py-0.5 text-xs text-secondary-600 hover:bg-secondary-100 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-400 dark:hover:bg-secondary-700"
              title={`Insert ${p.label}`}
            >
              {p.value}
            </button>
          ))}
        </div>
        {/* Preview of resolved text */}
        {preview && (
          <p id={`${field}-preview`} className="text-xs text-secondary-500 dark:text-secondary-400">
            Preview: {preview}
          </p>
        )}
        <p className="text-xs text-secondary-400 dark:text-secondary-500">
          {value.length}/{MAX_TEXT_LENGTH}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Headers &amp; Footers
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Add custom headers and footers to every page of your PDF. Use placeholders for dynamic
          content.
        </p>
      </div>

      {/* File Upload */}
      <FileUploadZone
        accept={['application/pdf']}
        maxFiles={1}
        multiple={false}
        onFilesAccepted={handleFilesAccepted}
        onFileRejected={handleFileRejected}
      />

      {/* Configuration */}
      {pdfData && (
        <div className="space-y-6 rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
            Configuration
          </h2>

          {/* Header Fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-600 dark:text-secondary-400">
              Header
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {renderTextField('headerLeft')}
              {renderTextField('headerCenter')}
              {renderTextField('headerRight')}
            </div>
          </div>

          {/* Footer Fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary-600 dark:text-secondary-400">
              Footer
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {renderTextField('footerLeft')}
              {renderTextField('footerCenter')}
              {renderTextField('footerRight')}
            </div>
          </div>

          {/* Font Size and Margin */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="font-size"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
              >
                Font Size (pt)
              </label>
              <input
                id="font-size"
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className={[inputClasses, 'max-w-[150px]'].join(' ')}
                aria-describedby="font-size-hint"
              />
              <p id="font-size-hint" className="text-xs text-secondary-500 dark:text-secondary-400">
                Between {MIN_FONT_SIZE} and {MAX_FONT_SIZE} pt
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="margin"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
              >
                Margin (pt)
              </label>
              <input
                id="margin"
                type="number"
                min={MIN_MARGIN}
                max={MAX_MARGIN}
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                className={[inputClasses, 'max-w-[150px]'].join(' ')}
                aria-describedby="margin-hint"
              />
              <p id="margin-hint" className="text-xs text-secondary-500 dark:text-secondary-400">
                Between {MIN_MARGIN} and {MAX_MARGIN} pt
              </p>
            </div>
          </div>

          {/* Placeholder Legend */}
          <div className="rounded-md bg-secondary-50 p-3 dark:bg-secondary-900">
            <p className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
              Available Placeholders:
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-secondary-500 dark:text-secondary-400">
              <li>
                <code className="rounded bg-secondary-200 px-1 dark:bg-secondary-700">
                  {'{page}'}
                </code>{' '}
                — Current page number
              </li>
              <li>
                <code className="rounded bg-secondary-200 px-1 dark:bg-secondary-700">
                  {'{total}'}
                </code>{' '}
                — Total number of pages
              </li>
              <li>
                <code className="rounded bg-secondary-200 px-1 dark:bg-secondary-700">
                  {'{date}'}
                </code>{' '}
                — Current date (YYYY-MM-DD)
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="primary"
              onClick={handleApply}
              loading={processing}
              disabled={!pdfData || processing}
            >
              Apply Headers &amp; Footers
            </Button>
            {modifiedData && (
              <Button variant="secondary" onClick={handleDownload}>
                Download
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
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
  );
}

HeadersFootersPage.displayName = 'HeadersFootersPage';
