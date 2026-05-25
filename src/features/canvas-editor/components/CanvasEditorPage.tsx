import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToastStore } from '../../../store/toast';
import { pdfExportEngine } from '../export/pdf-export';
import { createPngExportEngine } from '../export/png-export';
import { SvgExportEngine } from '../export/svg-export';
import { useAutoSave } from '../hooks/useAutoSave';
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts';
import { useRecentFilesIntegration } from '../hooks/useRecentFilesIntegration';
import { useCanvasStore } from '../store/canvas-store';
import { useOnboardingStore } from '../store/onboarding-store';
import type { ExportOptions } from '../types';
import { CanvasWorkspace } from './CanvasWorkspace';
import { EmptyState } from './EmptyState';
import { ExportDialog } from './ExportDialog';
import { FloatingToolbar } from './FloatingToolbar';
import { MinimapOverlay } from './MinimapOverlay';
import { OnboardingTour } from './OnboardingTour';
import { PageNavigator } from './PageNavigator';
import { PropertiesPanel } from './PropertiesPanel';
import { RecentFilesPanel } from './RecentFilesPanel';
import { RecoveryPrompt } from './RecoveryPrompt';
import { ShortcutPanel } from './ShortcutPanel';
import { TemplatePicker } from './TemplatePicker';

/**
 * CanvasEditorPage is the route-level page component for the canvas editor.
 *
 * It renders within the existing Layout component but uses negative margins
 * and full viewport width to break out of the standard content padding and
 * max-width constraints, providing a full-width canvas editing experience.
 *
 * Composes: CanvasWorkspace, FloatingToolbar, PropertiesPanel, PageNavigator,
 * MinimapOverlay, ExportDialog, TemplatePicker, ShortcutPanel, EmptyState.
 *
 * Wires: useCanvasShortcuts (document-level key events), useAutoSave (store persistence).
 *
 * All state transitions use CSS transitions (150-300ms) for fluid interactions.
 * Typography uses Inter/system font stack with consistent scale:
 * 24/20/16px headings, 14px body, 12px captions.
 *
 * Requirements: 15.2, 16.2, 16.4, 16.7, 16.15
 */
export function CanvasEditorPage() {
  // --- Modal/panel visibility state ---
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);

  // --- Recovery state ---
  const [recoveryState, setRecoveryState] = useState<{
    show: boolean;
    documentName: string;
    savedAt: number;
    documentId: string;
  }>({ show: false, documentName: '', savedAt: 0, documentId: '' });

  // --- Store state ---
  const document = useCanvasStore((state) => state.document);
  const selection = useCanvasStore((state) => state.selection);
  const loadDocument = useCanvasStore((state) => state.loadDocument);

  // --- Toast ---
  const addToast = useToastStore((state) => state.addToast);

  // --- Onboarding: check status on mount and auto-start tour if not onboarded ---
  const checkOnboardingStatus = useOnboardingStore((state) => state.checkOnboardingStatus);
  const startTour = useOnboardingStore((state) => state.startTour);
  const isOnboarded = useOnboardingStore((state) => state.isOnboarded);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  useEffect(() => {
    if (isOnboarded === false && document) {
      startTour();
    }
  }, [isOnboarded, document, startTour]);

  // --- Determine if current page is empty (no elements) ---
  const isPageEmpty = useMemo(() => {
    if (!document) return true;
    const activePage = document.pages[document.activePageIndex];
    if (!activePage) return true;
    return activePage.elements.length === 0;
  }, [document]);

  // --- Determine if an element is selected (to auto-open properties panel) ---
  const hasSelection = selection.selectedIds.length > 0;

  // --- Wire useCanvasShortcuts hook to document-level key events ---
  const handleToggleShortcutPanel = useCallback(() => {
    setIsShortcutPanelOpen((prev) => !prev);
  }, []);

  useCanvasShortcuts({
    onToggleShortcutPanel: handleToggleShortcutPanel,
    enabled: true,
  });

  // --- Wire useAutoSave hook to store ---
  const documentId = document?.id ?? null;
  const { checkForRecovery, recoverDocument, clearRecoveryData } = useAutoSave(documentId);

  // --- Check for recovery data on mount ---
  useEffect(() => {
    // Scan localStorage for any auto-save keys
    const AUTO_SAVE_PREFIX = 'canvas-editor-autosave-';
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(AUTO_SAVE_PREFIX)) {
          const docId = key.slice(AUTO_SAVE_PREFIX.length);
          const recovery = checkForRecovery(docId);
          if (recovery && recovery.exists) {
            setRecoveryState({
              show: true,
              documentName: recovery.documentName,
              savedAt: recovery.savedAt,
              documentId: docId,
            });
            break; // Show recovery for the first found auto-save
          }
        }
      }
    } catch {
      // localStorage access may fail in some environments — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Recovery handlers ---
  const handleRestore = useCallback(() => {
    const doc = recoverDocument(recoveryState.documentId);
    if (doc) {
      loadDocument(doc);
      clearRecoveryData(recoveryState.documentId);
    } else {
      // Recovery data was corrupted between check and restore
      clearRecoveryData(recoveryState.documentId);
      addToast('Recovery data was corrupted', 'warning');
    }
    setRecoveryState((prev) => ({ ...prev, show: false }));
  }, [recoveryState.documentId, recoverDocument, loadDocument, clearRecoveryData, addToast]);

  const handleDiscard = useCallback(() => {
    clearRecoveryData(recoveryState.documentId);
    setRecoveryState((prev) => ({ ...prev, show: false }));
  }, [recoveryState.documentId, clearRecoveryData]);

  // --- Wire recent files integration (tracks create/load/save) ---
  useRecentFilesIntegration();

  // --- Export handler ---
  const handleExport = useCallback(
    async (options: ExportOptions) => {
      const doc = useCanvasStore.getState().document;
      if (!doc) return;

      // Set exporting state
      useCanvasStore.setState((state) => {
        state.exportProgress = {
          status: 'exporting',
          currentPage: 0,
          totalPages: doc.pages.length,
        };
      });

      try {
        let blob: Blob | Blob[];

        const pageIndices = options.pages === 'all' ? doc.pages.map((_, i) => i) : options.pages;

        switch (options.format) {
          case 'pdf': {
            blob = await pdfExportEngine.exportDocument(doc, options);
            break;
          }
          case 'png': {
            const pngEngine = createPngExportEngine();
            const blobs: Blob[] = [];
            for (let i = 0; i < pageIndices.length; i++) {
              useCanvasStore.setState((state) => {
                state.exportProgress.currentPage = i + 1;
              });
              const page = doc.pages[pageIndices[i]];
              if (page) {
                const b = await pngEngine.exportPage(page, { dpi: options.dpi ?? 150 });
                blobs.push(b);
              }
            }
            blob = blobs.length === 1 ? blobs[0] : blobs;
            break;
          }
          case 'svg': {
            const svgEngine = new SvgExportEngine();
            const blobs: Blob[] = [];
            for (let i = 0; i < pageIndices.length; i++) {
              useCanvasStore.setState((state) => {
                state.exportProgress.currentPage = i + 1;
              });
              const page = doc.pages[pageIndices[i]];
              if (page) {
                const b = await svgEngine.exportPage(page);
                blobs.push(b);
              }
            }
            blob = blobs.length === 1 ? blobs[0] : blobs;
            break;
          }
          default:
            throw new Error(`Export format "${options.format}" is not yet supported.`);
        }

        // Trigger download
        const blobs = Array.isArray(blob) ? blob : [blob];
        for (let i = 0; i < blobs.length; i++) {
          const url = URL.createObjectURL(blobs[i]);
          const a = window.document.createElement('a');
          a.href = url;
          const ext = options.format;
          const suffix = blobs.length > 1 ? `-page${i + 1}` : '';
          a.download = `${doc.name}${suffix}.${ext}`;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        useCanvasStore.setState((state) => {
          state.exportProgress = {
            status: 'complete',
            currentPage: pageIndices.length,
            totalPages: pageIndices.length,
          };
        });
        addToast(`Exported as ${options.format.toUpperCase()}`, 'success');
        setIsExportDialogOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed';
        useCanvasStore.setState((state) => {
          state.exportProgress = {
            status: 'error',
            currentPage: 0,
            totalPages: 0,
            error: message,
          };
        });
      }
    },
    [addToast],
  );

  // --- Template picker callbacks ---
  const handleOpenTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(true);
  }, []);

  const handleCloseTemplatePicker = useCallback(() => {
    setIsTemplatePickerOpen(false);
  }, []);

  // --- Export dialog callbacks ---
  const handleOpenExportDialog = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleCloseExportDialog = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  // --- Properties panel callbacks ---
  const handleClosePropertiesPanel = useCallback(() => {
    setIsPropertiesPanelOpen(false);
  }, []);

  // Auto-open properties panel when an element is selected
  // (the panel shows page settings when nothing is selected)
  const effectivePropertiesPanelOpen = isPropertiesPanelOpen || hasSelection;

  return (
    <div
      className="canvas-editor-page -mx-4 sm:-mx-6 lg:-mx-8 -my-6 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] flex h-[calc(100dvh-3.5rem)] md:h-dvh overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Landing view when no document is open */}
      {!document && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-secondary-50 dark:bg-secondary-900 overflow-auto">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-secondary-800 dark:text-secondary-100">
                Canvas Editor
              </h1>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Create a new design or open a recent document
              </p>
            </div>

            {/* Quick start actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-5 py-3 min-h-[44px] bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 active:bg-primary-800 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                onClick={() => {
                  useCanvasStore.getState().createDocument();
                }}
                aria-label="Create new design"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
                New Design
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-5 py-3 min-h-[44px] border border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-800 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-500 active:bg-secondary-100 dark:active:bg-secondary-600 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                onClick={handleOpenTemplatePicker}
                aria-label="Browse templates"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="2" width="5" height="5" rx="1" />
                  <rect x="9" y="2" width="5" height="5" rx="1" />
                  <rect x="2" y="9" width="5" height="5" rx="1" />
                  <rect x="9" y="9" width="5" height="5" rx="1" />
                </svg>
                Use Template
              </button>
            </div>

            {/* Recent files section */}
            <RecentFilesPanel />
          </div>
        </div>
      )}

      {/* Editor view when a document is open */}
      {document && (
        <>
          {/* Page Navigator (left sidebar) */}
          <PageNavigator />

          {/* Main canvas area */}
          <div className="flex-1 flex flex-col relative min-w-0">
            {/* Canvas workspace with dark background and white page surface */}
            <CanvasWorkspace />

            {/* Floating toolbar overlays the canvas at the top center */}
            <FloatingToolbar />

            {/* Document actions menu (top-left) */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  useCanvasStore.getState().createDocument();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white rounded-lg shadow-level-2 text-sm font-medium hover:bg-primary-700 active:bg-primary-800 active:scale-[0.98] transition-[transform,background-color] duration-normal ease-in-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                aria-label="New design"
                title="New Design (creates a blank canvas)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
                New Design
              </button>
              <button
                type="button"
                onClick={handleOpenTemplatePicker}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-secondary-800 rounded-lg shadow-level-2 border border-secondary-200 dark:border-secondary-600 text-sm font-medium text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 active:scale-[0.98] transition-[transform,background-color] duration-normal ease-in-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                aria-label="Browse templates"
                title="Templates"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="2" width="5" height="5" rx="1" />
                  <rect x="9" y="2" width="5" height="5" rx="1" />
                  <rect x="2" y="9" width="5" height="5" rx="1" />
                  <rect x="9" y="9" width="5" height="5" rx="1" />
                </svg>
                Templates
              </button>
            </div>

            {/* Empty state shown when no elements on current page */}
            {isPageEmpty && <EmptyState onOpenTemplatePicker={handleOpenTemplatePicker} />}

            {/* Minimap overlay in bottom-right corner */}
            <MinimapOverlay />

            {/* Export button (floating, bottom-left area) */}
            <button
              type="button"
              onClick={handleOpenExportDialog}
              className="absolute bottom-4 left-4 z-30 flex items-center gap-2 px-4 py-3 bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-lg shadow-level-2 border border-secondary-200/60 dark:border-secondary-700/60 text-sm font-medium text-secondary-700 dark:text-secondary-200 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-level-3 active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-moderate ease-in-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Export document"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v8M5 7l3 3 3-3M3 12h10" />
              </svg>
              Export
            </button>
          </div>

          {/* Properties panel (right side on desktop, bottom sheet on mobile) */}
          <PropertiesPanel
            isOpen={effectivePropertiesPanelOpen}
            onClose={handleClosePropertiesPanel}
          />
        </>
      )}

      {/* Modal overlays */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={handleCloseExportDialog}
        onExport={handleExport}
      />

      <TemplatePicker isOpen={isTemplatePickerOpen} onClose={handleCloseTemplatePicker} />

      <ShortcutPanel isOpen={isShortcutPanelOpen} onClose={handleToggleShortcutPanel} />

      {/* Onboarding tour overlay — renders on top of everything when active */}
      <OnboardingTour />

      {/* Recovery prompt — shown when auto-saved data from a previous session is detected */}
      <RecoveryPrompt
        open={recoveryState.show}
        documentName={recoveryState.documentName}
        savedAt={recoveryState.savedAt}
        onRestore={handleRestore}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
