import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { formatFileSize } from '@/utils/file-size';
import { MergeFileList } from './MergeFileList';
import { useMerge } from '../hooks/useMerge';

/**
 * MergePage - Route page for the Merge PDFs feature.
 *
 * Features:
 * - Upload zone accepting up to 20 PDF files, max 50MB each
 * - Drag-and-drop reorder of uploaded files
 * - Merge trigger button (disabled until 2+ files uploaded)
 * - Preview of merged result
 * - File size display for merged output
 * - Download merged PDF
 *
 * Requirements: 44.1, 44.2, 44.3, 44.4, 44.5, 44.6
 */
export function MergePage(): JSX.Element {
  const {
    files,
    mergedResult,
    mergedFileSize,
    isMerging,
    addFiles,
    removeFile,
    reorderFiles,
    merge,
    reset,
    canMerge,
  } = useMerge();

  const toast = useToast();
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilesAccepted = useCallback(
    (newFiles: File[]) => {
      addFiles(newFiles);
    },
    [addFiles],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`"${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  const handleMerge = useCallback(async () => {
    if (files.length < 2) {
      toast.error('At least 2 PDF files are required to merge.');
      return;
    }
    await merge();
    setCurrentPage(1);
  }, [files.length, merge, toast]);

  const handleDownload = useCallback(() => {
    if (!mergedResult) return;

    const blob = new Blob([mergedResult], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'merged.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [mergedResult]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Merge PDFs
        </h1>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          Combine multiple PDF files into a single document. Upload up to 20 files (50MB each).
        </p>
      </div>

      {/* Upload zone */}
      <FileUploadZone
        accept={['application/pdf']}
        maxFileSize={50 * 1024 * 1024}
        maxFiles={20}
        onFilesAccepted={handleFilesAccepted}
        onFileRejected={handleFileRejected}
        multiple
      />

      {/* File list with drag-and-drop reorder */}
      {files.length > 0 && (
        <MergeFileList files={files} onReorder={reorderFiles} onRemove={removeFile} />
      )}

      {/* Action buttons */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={handleMerge} disabled={!canMerge} loading={isMerging}>
            {isMerging ? 'Merging...' : 'Merge PDFs'}
          </Button>

          {files.length < 2 && (
            <p className="text-sm text-warning-600 dark:text-warning-400">
              Add at least 2 PDF files to merge.
            </p>
          )}

          <Button variant="ghost" onClick={reset}>
            Clear All
          </Button>
        </div>
      )}

      {/* Merged result section */}
      {mergedResult && (
        <div className="space-y-4 border-t border-secondary-200 dark:border-secondary-700 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
                Merged Result
              </h2>
              {mergedFileSize !== null && (
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  File size: {formatFileSize(mergedFileSize)}
                </p>
              )}
            </div>
            <Button variant="primary" onClick={handleDownload}>
              Download Merged PDF
            </Button>
          </div>

          {/* Preview of merged result */}
          <PreviewPanel
            originalDoc={null}
            modifiedDoc={mergedResult}
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
