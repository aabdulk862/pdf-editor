/**
 * PDF Worker Client - Promise-based wrapper for communicating with the PDF Web Worker.
 * Provides a clean API for the UI layer to call worker operations.
 * Handles worker errors with graceful fallback to main-thread execution.
 */

import type { PdfEngine } from '@/core/pdf-engine/operations';
import type { PdfWorkerRequest, PdfWorkerResponse, PdfWorkerOperation } from './pdf-worker.types';
import type {
  PageRange,
  PageNumberConfig,
  HeaderFooterConfig,
  WatermarkConfig,
  CropBox,
  PageSize,
  OperationResult,
} from '@/types/operations';
import type { PdfMetadata, Bookmark, FormField } from '@/types/pdf';
import type { AnnotationData } from '@/types/annotations';
import type { ImageFile, RedactRegion, TextOverlay } from '@/core/pdf-engine/index';
import type { LetterheadTemplate, LetterheadPageTarget } from '@/features/letterhead/types';

type PendingRequest = {
  resolve: (value: PdfWorkerResponse) => void;
  reject: (reason: Error) => void;
};

export class PdfWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private fallbackEngine: PdfEngine | null = null;
  private workerFailed = false;
  private onError?: (message: string) => void;

  constructor(options?: { onError?: (message: string) => void }) {
    this.onError = options?.onError;
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const response = event.data;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
      };

      this.worker.onerror = (event: ErrorEvent) => {
        event.preventDefault();
        this.handleWorkerCrash(`Worker error: ${event.message}`);
      };

      this.worker.onmessageerror = () => {
        this.handleWorkerCrash('Worker message deserialization failed');
      };
    } catch {
      this.workerFailed = true;
      this.worker = null;
    }
  }

  private handleWorkerCrash(errorMessage: string): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error(errorMessage));
      this.pendingRequests.delete(id);
    }

    // Mark worker as failed and notify
    this.workerFailed = true;
    this.worker?.terminate();
    this.worker = null;

    this.onError?.('PDF processing worker crashed. Operations will continue on the main thread.');

    // Attempt to restart the worker for future requests
    setTimeout(() => {
      this.workerFailed = false;
      this.initWorker();
    }, 1000);
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private async getFallbackEngine(): Promise<PdfEngine> {
    if (!this.fallbackEngine) {
      const { PdfEngine } = await import('@/core/pdf-engine/operations');
      this.fallbackEngine = new PdfEngine();
    }
    return this.fallbackEngine;
  }

  private sendRequest(request: PdfWorkerRequest): Promise<PdfWorkerResponse> {
    return new Promise((resolve, reject) => {
      if (!this.worker || this.workerFailed) {
        reject(new Error('Worker unavailable'));
        return;
      }

      this.pendingRequests.set(request.id, { resolve, reject });

      // Set a timeout to prevent hanging requests (60 seconds)
      const timeout = setTimeout(() => {
        const pending = this.pendingRequests.get(request.id);
        if (pending) {
          this.pendingRequests.delete(request.id);
          pending.reject(new Error('Worker operation timed out'));
        }
      }, 60000);

      // Wrap resolve to clear timeout
      const originalResolve = this.pendingRequests.get(request.id)!.resolve;
      this.pendingRequests.set(request.id, {
        resolve: (value) => {
          clearTimeout(timeout);
          originalResolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeout);
          reject(reason);
        },
      });

      this.worker.postMessage(request);
    });
  }

  /**
   * Execute an operation via the worker, falling back to main-thread if the worker is unavailable.
   */
  private async executeWithFallback<T>(
    operation: PdfWorkerOperation,
    payload: PdfWorkerRequest['payload'],
    fallbackFn: () => Promise<T>,
  ): Promise<T> {
    if (this.workerFailed || !this.worker) {
      return fallbackFn();
    }

    try {
      const id = this.generateId();
      const request = { id, operation, payload } as PdfWorkerRequest;
      const response = await this.sendRequest(request);

      if (!response.success) {
        throw new Error(response.error);
      }

      return response.result as T;
    } catch {
      // Fallback to main thread execution
      this.onError?.('PDF operation fell back to main thread due to worker issue.');
      return fallbackFn();
    }
  }

  // --- Public API ---

  async merge(documents: ArrayBuffer[]): Promise<OperationResult> {
    return this.executeWithFallback('merge', { documents }, async () =>
      (await this.getFallbackEngine()).merge(documents),
    );
  }

  async splitByRanges(data: ArrayBuffer, ranges: PageRange[]): Promise<OperationResult[]> {
    return this.executeWithFallback('splitByRanges', { data, ranges }, async () =>
      (await this.getFallbackEngine()).splitByRanges(data, ranges),
    );
  }

  async rotatePages(
    data: ArrayBuffer,
    pages: number[],
    angle: 90 | 180 | 270,
  ): Promise<OperationResult> {
    return this.executeWithFallback('rotatePages', { data, pages, angle }, async () =>
      (await this.getFallbackEngine()).rotatePages(data, pages, angle),
    );
  }

  async deletePages(data: ArrayBuffer, pages: number[]): Promise<OperationResult> {
    return this.executeWithFallback('deletePages', { data, pages }, async () =>
      (await this.getFallbackEngine()).deletePages(data, pages),
    );
  }

  async reorderPages(data: ArrayBuffer, newOrder: number[]): Promise<OperationResult> {
    return this.executeWithFallback('reorderPages', { data, newOrder }, async () =>
      (await this.getFallbackEngine()).reorderPages(data, newOrder),
    );
  }

  async duplicatePages(
    data: ArrayBuffer,
    pages: number[],
    copies: number,
  ): Promise<OperationResult> {
    return this.executeWithFallback('duplicatePages', { data, pages, copies }, async () =>
      (await this.getFallbackEngine()).duplicatePages(data, pages, copies),
    );
  }

  async addPageNumbers(data: ArrayBuffer, config: PageNumberConfig): Promise<OperationResult> {
    return this.executeWithFallback('addPageNumbers', { data, config }, async () =>
      (await this.getFallbackEngine()).addPageNumbers(data, config),
    );
  }

  async addHeadersFooters(data: ArrayBuffer, config: HeaderFooterConfig): Promise<OperationResult> {
    return this.executeWithFallback('addHeadersFooters', { data, config }, async () =>
      (await this.getFallbackEngine()).addHeadersFooters(data, config),
    );
  }

  async addWatermark(data: ArrayBuffer, config: WatermarkConfig): Promise<OperationResult> {
    return this.executeWithFallback('addWatermark', { data, config }, async () =>
      (await this.getFallbackEngine()).addWatermark(data, config),
    );
  }

  async addTextOverlay(data: ArrayBuffer, overlays: TextOverlay[]): Promise<OperationResult> {
    return this.executeWithFallback('addTextOverlay', { data, overlays }, async () =>
      (await this.getFallbackEngine()).addTextOverlay(data, overlays),
    );
  }

  async embedAnnotation(data: ArrayBuffer, annotation: AnnotationData): Promise<OperationResult> {
    return this.executeWithFallback('embedAnnotation', { data, annotation }, async () =>
      (await this.getFallbackEngine()).embedAnnotation(data, annotation),
    );
  }

  async imagesToPdf(images: ImageFile[]): Promise<OperationResult> {
    return this.executeWithFallback('imagesToPdf', { images }, async () =>
      (await this.getFallbackEngine()).imagesToPdf(images),
    );
  }

  async compress(data: ArrayBuffer): Promise<OperationResult> {
    return this.executeWithFallback('compress', { data }, async () =>
      (await this.getFallbackEngine()).compress(data),
    );
  }

  async flatten(data: ArrayBuffer): Promise<OperationResult> {
    return this.executeWithFallback('flatten', { data }, async () =>
      (await this.getFallbackEngine()).flatten(data),
    );
  }

  async cropPages(data: ArrayBuffer, pages: number[], cropBox: CropBox): Promise<OperationResult> {
    return this.executeWithFallback('cropPages', { data, pages, cropBox }, async () =>
      (await this.getFallbackEngine()).cropPages(data, pages, cropBox),
    );
  }

  async resizePages(data: ArrayBuffer, pages: number[], size: PageSize): Promise<OperationResult> {
    return this.executeWithFallback('resizePages', { data, pages, size }, async () =>
      (await this.getFallbackEngine()).resizePages(data, pages, size),
    );
  }

  async linearize(data: ArrayBuffer): Promise<OperationResult> {
    return this.executeWithFallback('linearize', { data }, async () =>
      (await this.getFallbackEngine()).linearize(data),
    );
  }

  async getMetadata(data: ArrayBuffer): Promise<PdfMetadata> {
    return this.executeWithFallback('getMetadata', { data }, async () =>
      (await this.getFallbackEngine()).getMetadata(data),
    );
  }

  async setMetadata(data: ArrayBuffer, metadata: Partial<PdfMetadata>): Promise<OperationResult> {
    return this.executeWithFallback('setMetadata', { data, metadata }, async () =>
      (await this.getFallbackEngine()).setMetadata(data, metadata),
    );
  }

  async getBookmarks(data: ArrayBuffer): Promise<Bookmark[]> {
    return this.executeWithFallback('getBookmarks', { data }, async () =>
      (await this.getFallbackEngine()).getBookmarks(data),
    );
  }

  async setBookmarks(data: ArrayBuffer, bookmarks: Bookmark[]): Promise<OperationResult> {
    return this.executeWithFallback('setBookmarks', { data, bookmarks }, async () =>
      (await this.getFallbackEngine()).setBookmarks(data, bookmarks),
    );
  }

  async getFormFields(data: ArrayBuffer): Promise<FormField[]> {
    return this.executeWithFallback('getFormFields', { data }, async () =>
      (await this.getFallbackEngine()).getFormFields(data),
    );
  }

  async fillFormFields(
    data: ArrayBuffer,
    values: Record<string, string | boolean>,
  ): Promise<OperationResult> {
    return this.executeWithFallback('fillFormFields', { data, values }, async () =>
      (await this.getFallbackEngine()).fillFormFields(data, values),
    );
  }

  async encrypt(data: ArrayBuffer, password: string): Promise<OperationResult> {
    return this.executeWithFallback('encrypt', { data, password }, async () =>
      (await this.getFallbackEngine()).encrypt(data, password),
    );
  }

  async decrypt(data: ArrayBuffer, password: string): Promise<OperationResult> {
    return this.executeWithFallback('decrypt', { data, password }, async () =>
      (await this.getFallbackEngine()).decrypt(data, password),
    );
  }

  async redact(data: ArrayBuffer, regions: RedactRegion[]): Promise<OperationResult> {
    return this.executeWithFallback('redact', { data, regions }, async () =>
      (await this.getFallbackEngine()).redact(data, regions),
    );
  }

  async getPageCount(data: ArrayBuffer): Promise<number> {
    return this.executeWithFallback('getPageCount', { data }, async () =>
      (await this.getFallbackEngine()).getPageCount(data),
    );
  }

  async applyLetterhead(
    data: ArrayBuffer,
    template: LetterheadTemplate,
    target: LetterheadPageTarget,
  ): Promise<ArrayBuffer> {
    return this.executeWithFallback('applyLetterhead', { data, template, target }, async () => {
      const { applyLetterhead } = await import('@/features/letterhead/utils/letterhead-renderer');
      return applyLetterhead(data, template, target);
    });
  }

  async exportLetterheadAsPdf(template: LetterheadTemplate): Promise<ArrayBuffer> {
    return this.executeWithFallback('exportLetterheadAsPdf', { template }, async () => {
      const { exportLetterheadAsPdf } =
        await import('@/features/letterhead/utils/letterhead-renderer');
      return exportLetterheadAsPdf(template);
    });
  }

  /**
   * Terminate the worker and clean up resources.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    // Reject any pending requests
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker terminated'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if the worker is currently available.
   */
  get isWorkerAvailable(): boolean {
    return this.worker !== null && !this.workerFailed;
  }
}

// Singleton instance for app-wide use
let clientInstance: PdfWorkerClient | null = null;

/**
 * Get or create the singleton PdfWorkerClient instance.
 * Pass an onError callback to receive toast-worthy error notifications.
 */
export function getPdfWorkerClient(options?: {
  onError?: (message: string) => void;
}): PdfWorkerClient {
  if (!clientInstance) {
    clientInstance = new PdfWorkerClient(options);
  }
  return clientInstance;
}
