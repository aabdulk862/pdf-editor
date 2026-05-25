import { useCallback, useEffect, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { FileUploadZone } from '../../../components/ui/FileUploadZone';
import { useToastStore } from '../../../store/toast';
import { getPdfWorkerClient } from '../../../workers/pdf-worker-client';
import type { LetterheadPageTarget, LetterheadTemplate } from '../types';
import { useLetterheadStore } from '../store/letterhead-store';
import { LetterheadApplyModal } from './LetterheadApplyModal';
import { LetterheadEditor } from './LetterheadEditor';
import { LetterheadPreview } from './LetterheadPreview';
import { LetterheadTemplateList } from './LetterheadTemplateList';

/**
 * Default text field values for a new template.
 */
function createDefaultTextField() {
  return {
    content: '',
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#000000',
    alignment: 'left' as const,
  };
}

/**
 * LetterheadPage — Main page for the letterhead feature.
 *
 * Two-column layout:
 * - Left sidebar: template list with create/select actions
 * - Right area: editor + preview for the active template, or empty state
 *
 * Supports: browse templates → select/create → edit → preview → apply to PDF or export as standalone PDF.
 *
 * Requirements: 12.9, 12.10, 13.3, 13.9
 */
export function LetterheadPage(): JSX.Element {
  const {
    templates,
    activeTemplateId,
    lastUsedTemplateId,
    editorState,
    createTemplate,
    updateTemplate,
    selectTemplate,
    setEditorState,
    loadFromStorage,
  } = useLetterheadStore();

  const addToast = useToastStore.getState().addToast;

  // PDF file state for applying letterhead
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);

  // Apply modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Loading states
  const [isApplying, setIsApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;
  const lastUsedTemplate = templates.find((t) => t.id === lastUsedTemplateId) ?? null;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateTemplate = useCallback(() => {
    const id = createTemplate({
      name: 'Untitled Template',
      logo: null,
      companyName: { ...createDefaultTextField(), fontSize: 16 },
      addressLines: [createDefaultTextField()],
      phone: createDefaultTextField(),
      email: createDefaultTextField(),
      website: createDefaultTextField(),
      tagline: null,
    });
    if (id) {
      setEditorState('editing');
    }
  }, [createTemplate, setEditorState]);

  const handleSelectTemplate = useCallback(
    (id: string) => {
      selectTemplate(id);
      setEditorState('previewing');
    },
    [selectTemplate, setEditorState],
  );

  const handleEditTemplate = useCallback(
    (id: string) => {
      selectTemplate(id);
      setEditorState('editing');
    },
    [selectTemplate, setEditorState],
  );

  const handleTemplateChange = useCallback(
    (updates: Partial<LetterheadTemplate>) => {
      if (activeTemplateId) {
        updateTemplate(activeTemplateId, updates);
      }
    },
    [activeTemplateId, updateTemplate],
  );

  const handleFilesAccepted = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result as ArrayBuffer;
      setPdfData(data);
      setPdfFileName(file.name);

      // Get page count via the worker to keep the main thread unblocked
      try {
        const client = getPdfWorkerClient({ onError: () => {} });
        const count = await client.getPageCount(data);
        setPdfPageCount(count);
      } catch {
        setPdfPageCount(1);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleQuickApply = useCallback(async () => {
    if (!lastUsedTemplate) {
      addToast(
        'No recent template available. Please select or create a template first.',
        'warning',
      );
      return;
    }

    if (!pdfData) {
      addToast('Please upload a PDF file first.', 'warning');
      return;
    }

    setIsApplying(true);
    try {
      const client = getPdfWorkerClient({ onError: (msg) => addToast(msg, 'warning') });
      const result = await client.applyLetterhead(pdfData, lastUsedTemplate, { type: 'first' });
      downloadPdf(result, pdfFileName, '_letterhead');
      addToast('Letterhead applied to first page successfully.', 'success');
    } catch {
      addToast('Failed to apply letterhead. Please try again.', 'error');
    } finally {
      setIsApplying(false);
    }
  }, [lastUsedTemplate, pdfData, pdfFileName, addToast]);

  const handleApplyToDocument = useCallback(
    async (target: LetterheadPageTarget) => {
      if (!activeTemplate || !pdfData) return;

      setIsApplyModalOpen(false);
      setIsApplying(true);
      try {
        const client = getPdfWorkerClient({ onError: (msg) => addToast(msg, 'warning') });
        const result = await client.applyLetterhead(pdfData, activeTemplate, target);
        downloadPdf(result, pdfFileName, '_letterhead');
        addToast('Letterhead applied successfully.', 'success');
      } catch {
        addToast('Failed to apply letterhead. Please try again.', 'error');
      } finally {
        setIsApplying(false);
      }
    },
    [activeTemplate, pdfData, pdfFileName, addToast],
  );

  const handleExportAsPdf = useCallback(async () => {
    if (!activeTemplate) return;

    setIsExporting(true);
    try {
      const client = getPdfWorkerClient({ onError: (msg) => addToast(msg, 'warning') });
      const result = await client.exportLetterheadAsPdf(activeTemplate);
      downloadPdf(result, activeTemplate.name, '_letterhead');
      addToast('Letterhead exported as PDF.', 'success');
    } catch {
      addToast('Failed to export letterhead as PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [activeTemplate, addToast]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark sm:text-3xl">
            Letterhead
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Create and apply professional letterheads to your PDF documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleCreateTemplate}>
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 5v10M5 10h10" />
            </svg>
            New Letterhead
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickApply}
            loading={isApplying}
            disabled={!pdfData || isApplying}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M13 2l5 5-5 5M18 7H6M2 12v5a1 1 0 001 1h14" />
            </svg>
            Quick Apply
          </Button>
        </div>
      </div>

      {/* PDF Upload section */}
      {!pdfData && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <p className="mb-3 text-sm font-medium text-text-light dark:text-text-dark">
            Upload a PDF to apply letterhead
          </p>
          <FileUploadZone
            accept={['application/pdf']}
            maxFiles={1}
            multiple={false}
            onFilesAccepted={handleFilesAccepted}
            operationRoute="/letterhead"
            operationName="Letterhead"
          />
        </div>
      )}

      {pdfData && (
        <div className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-white px-4 py-3 dark:border-secondary-700 dark:bg-secondary-800">
          <svg
            className="h-5 w-5 flex-shrink-0 text-error-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-light dark:text-text-dark">
              {pdfFileName}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              {pdfPageCount} {pdfPageCount === 1 ? 'page' : 'pages'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPdfData(null);
              setPdfFileName('');
              setPdfPageCount(1);
            }}
            aria-label="Remove uploaded PDF"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      )}

      {/* Two-column layout: template list left, editor/preview right */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left sidebar — Template list */}
        <aside className="w-full shrink-0 md:max-w-[320px]">
          <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-text-light dark:text-text-dark">Templates</h2>
              <Button variant="primary" size="sm" onClick={handleCreateTemplate}>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New
              </Button>
            </div>
            <LetterheadTemplateList
              onSelect={handleSelectTemplate}
              onEdit={handleEditTemplate}
              onCreate={handleCreateTemplate}
            />
          </div>
        </aside>

        {/* Right area — Editor/Preview or empty state */}
        <main className="min-w-0 flex-1">
          {!activeTemplate ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-secondary-200 bg-white px-6 py-16 dark:border-secondary-700 dark:bg-secondary-800">
              <svg
                className="h-12 w-12 text-secondary-400 dark:text-secondary-500"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="8"
                  y="4"
                  width="32"
                  height="40"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line x1="14" y1="12" x2="34" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="14" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1.5" />
                <line x1="14" y1="23" x2="30" y2="23" stroke="currentColor" strokeWidth="1.5" />
                <rect
                  x="14"
                  y="30"
                  width="20"
                  height="8"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              </svg>
              <p className="max-w-[280px] text-center text-sm text-secondary-600 dark:text-secondary-400">
                Select a template to preview and edit, or create a new one to get started.
              </p>
              <Button variant="primary" size="sm" onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary-200 bg-white px-4 py-3 dark:border-secondary-700 dark:bg-secondary-800">
                <div className="mr-auto min-w-0">
                  <h2 className="truncate text-sm font-medium text-text-light dark:text-text-dark">
                    {activeTemplate.name}
                  </h2>
                </div>

                {editorState !== 'editing' && (
                  <Button variant="outline" size="sm" onClick={() => setEditorState('editing')}>
                    Edit
                  </Button>
                )}

                {editorState === 'editing' && (
                  <Button variant="outline" size="sm" onClick={() => setEditorState('previewing')}>
                    Preview
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAsPdf}
                  loading={isExporting}
                  disabled={isExporting}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M3 14v3a1 1 0 001 1h12a1 1 0 001-1v-3M10 3v11M10 14l-3-3M10 14l3-3" />
                  </svg>
                  Export PDF
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!pdfData) {
                      addToast('Please upload a PDF file first.', 'warning');
                      return;
                    }
                    setIsApplyModalOpen(true);
                  }}
                  disabled={isApplying}
                  loading={isApplying}
                >
                  Apply to Document
                </Button>
              </div>

              {/* Editor or Preview */}
              <div className="transition-opacity duration-moderate ease-out">
                {editorState === 'editing' ? (
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="w-full lg:max-w-[400px]">
                      <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
                        <LetterheadEditor
                          template={activeTemplate}
                          onChange={handleTemplateChange}
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="rounded-lg border border-secondary-200 bg-white dark:border-secondary-700 dark:bg-secondary-800">
                        <LetterheadPreview template={activeTemplate} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-secondary-200 bg-white dark:border-secondary-700 dark:bg-secondary-800">
                    <LetterheadPreview template={activeTemplate} />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Apply Modal */}
      <LetterheadApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onApply={handleApplyToDocument}
        totalPages={pdfPageCount}
      />
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Trigger a browser download for a PDF ArrayBuffer.
 */
function downloadPdf(data: ArrayBuffer, baseName: string, suffix: string): void {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Clean up the base name and add suffix
  const cleanName = baseName.replace(/\.pdf$/i, '');
  link.download = `${cleanName}${suffix}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

LetterheadPage.displayName = 'LetterheadPage';
