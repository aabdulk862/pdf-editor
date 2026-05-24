/**
 * Batch Processor - Applies a selected PDF operation to multiple files sequentially.
 *
 * Features:
 * - Supports 2-50 files per batch
 * - Sequential processing with progress reporting (file X of Y)
 * - Skips failed files and continues processing remaining files
 * - Reports failures via a toast callback
 * - Supports cancellation after the current file completes
 * - Presents results as a downloadable list (file name, size, download action)
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

import type { OperationResult } from '@/types/operations';
import type { PdfWorkerClient } from '@/workers/pdf-worker-client';

// --- Interfaces ---

export interface BatchResult {
  fileName: string;
  success: boolean;
  data?: ArrayBuffer;
  fileSize?: number;
  error?: string;
}

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface BatchJob {
  id: string;
  files: File[];
  operation: string;
  config: Record<string, unknown>;
  status: BatchStatus;
  results: BatchResult[];
  currentIndex: number;
}

export interface BatchProgressInfo {
  currentFile: number;
  totalFiles: number;
  fileName: string;
  status: BatchStatus;
}

export type ProgressCallback = (progress: BatchProgressInfo) => void;
export type ErrorCallback = (fileName: string, error: string) => void;

export interface BatchProcessorOptions {
  client: PdfWorkerClient;
  onProgress?: ProgressCallback;
  onError?: ErrorCallback;
}

/**
 * Executes a PDF operation on a single file's data using the PdfWorkerClient.
 * Maps operation names to the appropriate client method.
 */
async function executeOperation(
  client: PdfWorkerClient,
  operation: string,
  data: ArrayBuffer,
  config: Record<string, unknown>,
): Promise<OperationResult> {
  switch (operation) {
    case 'compress':
      return client.compress(data);
    case 'flatten':
      return client.flatten(data);
    case 'linearize':
      return client.linearize(data);
    case 'rotatePages':
      return client.rotatePages(data, config.pages as number[], config.angle as 90 | 180 | 270);
    case 'deletePages':
      return client.deletePages(data, config.pages as number[]);
    case 'addPageNumbers':
      return client.addPageNumbers(
        data,
        config.config as Parameters<PdfWorkerClient['addPageNumbers']>[1],
      );
    case 'addHeadersFooters':
      return client.addHeadersFooters(
        data,
        config.config as Parameters<PdfWorkerClient['addHeadersFooters']>[1],
      );
    case 'addWatermark':
      return client.addWatermark(
        data,
        config.config as Parameters<PdfWorkerClient['addWatermark']>[1],
      );
    case 'encrypt':
      return client.encrypt(data, config.password as string);
    case 'decrypt':
      return client.decrypt(data, config.password as string);
    default:
      return { success: false, error: `Unsupported batch operation: ${operation}` };
  }
}

// --- Batch Processor ---

const MIN_FILES = 2;
const MAX_FILES = 50;

/**
 * Creates and runs a batch processing job.
 *
 * @param files - Array of files to process (2-50 files)
 * @param operation - The operation name to apply to each file
 * @param config - Operation-specific configuration
 * @param options - Processing options including the worker client and callbacks
 * @returns The completed BatchJob with results
 */
export async function processBatch(
  files: File[],
  operation: string,
  config: Record<string, unknown>,
  options: BatchProcessorOptions,
): Promise<BatchJob> {
  const { client, onProgress, onError } = options;

  // Validate file count
  if (files.length < MIN_FILES) {
    throw new Error(`Batch processing requires at least ${MIN_FILES} files. Got ${files.length}.`);
  }
  if (files.length > MAX_FILES) {
    throw new Error(`Batch processing supports at most ${MAX_FILES} files. Got ${files.length}.`);
  }

  const job: BatchJob = {
    id: generateBatchId(),
    files,
    operation,
    config,
    status: 'processing',
    results: [],
    currentIndex: 0,
  };

  // Track cancellation
  let cancelRequested = false;
  const cancelToken = {
    cancel: () => {
      cancelRequested = true;
    },
  };

  // Store the cancel token on the job for external access
  batchCancelTokens.set(job.id, cancelToken);

  try {
    for (let i = 0; i < files.length; i++) {
      // Check for cancellation before starting next file
      if (cancelRequested) {
        job.status = 'cancelled';
        break;
      }

      job.currentIndex = i;
      const file = files[i];

      // Report progress
      onProgress?.({
        currentFile: i + 1,
        totalFiles: files.length,
        fileName: file.name,
        status: 'processing',
      });

      try {
        // Read file data
        const data = await readFileAsArrayBuffer(file);

        // Execute the operation
        const result = await executeOperation(client, operation, data, config);

        if (result.success && result.data) {
          job.results.push({
            fileName: file.name,
            success: true,
            data: result.data,
            fileSize: result.data.byteLength,
          });
        } else {
          const errorMsg = result.error || 'Operation failed';
          job.results.push({
            fileName: file.name,
            success: false,
            error: errorMsg,
          });
          onError?.(file.name, errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        job.results.push({
          fileName: file.name,
          success: false,
          error: errorMsg,
        });
        onError?.(file.name, errorMsg);
      }
    }

    // Set final status if not cancelled
    if (job.status !== 'cancelled') {
      job.status = 'completed';
    }
  } finally {
    // Clean up cancel token
    batchCancelTokens.delete(job.id);

    // Final progress report
    onProgress?.({
      currentFile: job.results.length,
      totalFiles: files.length,
      fileName: '',
      status: job.status,
    });
  }

  return job;
}

// --- Cancel Token Management ---

interface CancelToken {
  cancel: () => void;
}

const batchCancelTokens = new Map<string, CancelToken>();

/**
 * Cancels a running batch job. Processing will stop after the current file completes.
 *
 * @param jobId - The ID of the batch job to cancel
 * @returns true if the cancellation was requested, false if the job was not found
 */
export function cancelBatch(jobId: string): boolean {
  const token = batchCancelTokens.get(jobId);
  if (token) {
    token.cancel();
    return true;
  }
  return false;
}

// --- Result Helpers ---

/**
 * Returns only the successful results from a batch job.
 */
export function getSuccessfulResults(job: BatchJob): BatchResult[] {
  return job.results.filter((r) => r.success);
}

/**
 * Returns only the failed results from a batch job.
 */
export function getFailedResults(job: BatchJob): BatchResult[] {
  return job.results.filter((r) => !r.success);
}

/**
 * Triggers a browser download for a single batch result.
 */
export function downloadBatchResult(result: BatchResult): void {
  if (!result.success || !result.data) return;

  const blob = new Blob([result.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Utilities ---

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error(`Failed to read file: ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

let batchCounter = 0;

function generateBatchId(): string {
  batchCounter += 1;
  return `batch-${Date.now()}-${batchCounter}`;
}
