import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { formatFileSize } from '@/utils/file-size';
import type { ToolErrorState } from '@/components/ui/ErrorRecovery';

export interface MergeFile {
  id: string;
  file: File;
  data: ArrayBuffer;
  name: string;
  size: number;
}

export interface UseMergeReturn {
  files: MergeFile[];
  mergedResult: ArrayBuffer | null;
  mergedFileSize: number | null;
  isMerging: boolean;
  errorState: ToolErrorState | null;
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  reorderFiles: (fromIndex: number, toIndex: number) => void;
  merge: () => Promise<void>;
  reset: () => void;
  canMerge: boolean;
}

const MAX_FILES = 20;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file

let fileIdCounter = 0;
function generateFileId(): string {
  fileIdCounter += 1;
  return `merge-file-${Date.now()}-${fileIdCounter}`;
}

export function useMerge(): UseMergeReturn {
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [mergedResult, setMergedResult] = useState<ArrayBuffer | null>(null);
  const [mergedFileSize, setMergedFileSize] = useState<number | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [errorState, setErrorState] = useState<ToolErrorState | null>(null);
  const toast = useToast();
  const workerClientRef = useRef(getPdfWorkerClient({ onError: (msg) => toast.error(msg) }));

  const canMerge = files.length >= 2 && !isMerging;

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const processFile = async (file: File): Promise<MergeFile | null> => {
        // Validate file size (50MB per file for merge)
        if (file.size > MAX_FILE_SIZE) {
          toast.error(
            `"${file.name}" exceeds the maximum size of ${formatFileSize(MAX_FILE_SIZE)}.`,
          );
          return null;
        }

        // Validate PDF type
        if (file.type !== 'application/pdf') {
          toast.error(
            `"${file.name}" is not a valid PDF file. Only PDF files are accepted for merging.`,
          );
          return null;
        }

        // Read file data and validate it's a valid PDF
        try {
          const data = await file.arrayBuffer();
          // Basic PDF header check
          const header = new Uint8Array(data.slice(0, 5));
          const pdfHeader = String.fromCharCode(...header);
          if (!pdfHeader.startsWith('%PDF-')) {
            toast.error(
              `"${file.name}" is not a valid PDF file. The file appears to be corrupted.`,
            );
            return null;
          }
          return {
            id: generateFileId(),
            file,
            data,
            name: file.name,
            size: file.size,
          };
        } catch {
          toast.error(`Failed to read "${file.name}".`);
          return null;
        }
      };

      // Process files asynchronously
      Promise.all(newFiles.map(processFile)).then((results) => {
        const validFiles = results.filter((f): f is MergeFile => f !== null);

        setFiles((prev) => {
          const remaining = MAX_FILES - prev.length;
          if (remaining <= 0) {
            toast.warning(`Maximum of ${MAX_FILES} files allowed.`);
            return prev;
          }
          const toAdd = validFiles.slice(0, remaining);
          if (validFiles.length > remaining) {
            toast.warning(`Only ${remaining} more file(s) can be added. Maximum is ${MAX_FILES}.`);
          }
          return [...prev, ...toAdd];
        });
      });
    },
    [toast],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMergedResult(null);
    setMergedFileSize(null);
  }, []);

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    // Clear previous merge result since order changed
    setMergedResult(null);
    setMergedFileSize(null);
  }, []);

  const merge = useCallback(async () => {
    if (files.length < 2) {
      toast.error('At least 2 PDF files are required to merge.');
      return;
    }

    setIsMerging(true);
    setMergedResult(null);
    setMergedFileSize(null);
    setErrorState(null);

    try {
      const documents = files.map((f) => f.data);
      const result = await workerClientRef.current.merge(documents);

      if (result.success && result.data) {
        setMergedResult(result.data);
        setMergedFileSize(result.data.byteLength);
        toast.success('PDFs merged successfully!');
      } else {
        const message = result.error ?? 'Merge operation failed.';
        setErrorState({
          type: 'processing-failed',
          message,
          recoverable: true,
          retryAction: () => merge(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorState({
        type: 'unknown',
        message: `Merge failed: ${message}`,
        recoverable: true,
        retryAction: () => merge(),
      });
    } finally {
      setIsMerging(false);
    }
  }, [files, toast]);

  const reset = useCallback(() => {
    setFiles([]);
    setMergedResult(null);
    setMergedFileSize(null);
    setErrorState(null);
  }, []);

  return {
    files,
    mergedResult,
    mergedFileSize,
    isMerging,
    errorState,
    addFiles,
    removeFile,
    reorderFiles,
    merge,
    reset,
    canMerge,
  };
}
