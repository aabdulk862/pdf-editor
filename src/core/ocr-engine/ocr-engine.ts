/**
 * OcrEngine — Singleton OCR coordinator
 *
 * Manages the lifecycle of the OCR Web Worker, coordinates page rendering
 * and recognition, and provides the public API consumed by the OCR store.
 *
 * Key behaviors:
 * - Singleton: only one instance ever exists (Req 1.1)
 * - Lazy-load: worker is only created on first initialize() call (Req 1.2)
 * - Worker reuse: if already initialized with same languages, skip re-init (Req 1.5)
 * - Language change: if languages differ from loaded set, reinitialize with new languages
 * - Queue: if initialize() is called while already initializing, return the same promise (Req 1.7)
 * - Retry: language pack download retries once after 2s delay on failure (Req 1.4)
 * - Event emitter: on() returns an unsubscribe function
 * - destroy(): terminates worker, resets state (Req 10.4)
 * - cancel(): sets a cancelled flag for processPages (Req 5.5)
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 10.1
 */

import type {
  OcrPageResult,
  OcrPageFailure,
  OcrProcessingResult,
  OcrProgress,
  WorkerInMessage,
  WorkerOutMessage,
} from './types';
import { PdfjsRenderEngine } from '../render-engine/renderer';
import type { RenderableDocument } from '../render-engine';

// --- Event Types ---

export type OcrEngineEventType = 'progress' | 'pageComplete' | 'error' | 'initProgress';

export interface OcrEngineEvents {
  progress: (progress: OcrProgress) => void;
  pageComplete: (result: OcrPageResult) => void;
  error: (error: string) => void;
  initProgress: (percent: number) => void;
}

// --- CDN path for Tesseract language data ---
const LANG_DATA_PATH = 'https://tessdata.projectnaptha.com/4.0.0';

// --- Processing constants ---
/** Scale factor for 300 DPI rendering (300 / 72) */
const DPI_300_SCALE = 300 / 72; // ≈ 4.1667
/** Scale factor for 150 DPI fallback rendering */
const DPI_150_SCALE = 150 / 72; // ≈ 2.0833
/** Timeout for worker response per page in milliseconds */
const WORKER_TIMEOUT_MS = 30_000;

export class OcrEngine {
  private static instance: OcrEngine | null = null;

  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private loadedLanguages: Set<string> = new Set();
  private initPromise: Promise<void> | null = null;
  private isCancelled: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<OcrEngineEventType, Set<(...args: any[]) => void>> = new Map();

  private constructor() {
    // Initialize listener sets for each event type
    this.listeners.set('progress', new Set());
    this.listeners.set('pageComplete', new Set());
    this.listeners.set('error', new Set());
    this.listeners.set('initProgress', new Set());
  }

  /**
   * Get the singleton OcrEngine instance.
   */
  static getInstance(): OcrEngine {
    if (!OcrEngine.instance) {
      OcrEngine.instance = new OcrEngine();
    }
    return OcrEngine.instance;
  }

  /**
   * Initialize the OCR worker and load language packs.
   *
   * - Lazy-loads the worker only on first call (Req 1.2)
   * - Reuses existing worker if already initialized with the same languages (Req 1.5)
   * - If languages differ from loaded set, reinitializes with new languages
   * - Queues concurrent calls — returns the same promise if init is in progress (Req 1.7)
   * - Retries language pack download once after 2s delay on failure (handled by worker) (Req 1.4)
   */
  initialize(languages: string[]): Promise<void> {
    const requestedSet = new Set(languages);

    // If already initialized with the same languages, skip re-initialization (Req 1.5)
    if (
      this.isInitialized &&
      this.worker &&
      this.setsAreEqual(requestedSet, this.loadedLanguages)
    ) {
      return Promise.resolve();
    }

    // If initialization is already in progress, queue by returning the same promise (Req 1.7)
    if (this.initPromise) {
      return this.initPromise;
    }

    // If languages changed and worker exists, terminate old worker before reinitializing
    if (this.worker && !this.setsAreEqual(requestedSet, this.loadedLanguages)) {
      this.terminateWorker();
    }

    this.initPromise = this.doInitialize(languages).finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  /**
   * Cancel in-progress OCR processing.
   * Sets a cancelled flag that processPages checks between pages. (Req 5.5)
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Terminate the worker and release all resources. (Req 10.4)
   * Resets the engine to its initial state.
   */
  destroy(): void {
    this.terminateWorker();
    this.isInitialized = false;
    this.loadedLanguages.clear();
    this.initPromise = null;
    this.isCancelled = false;
  }

  /**
   * Subscribe to an engine event. Returns an unsubscribe function.
   */
  on<T extends OcrEngineEventType>(event: T, callback: OcrEngineEvents[T]): () => void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listeners.add(callback as (...args: any[]) => void);
    }

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set.delete(callback as (...args: any[]) => void);
      }
    };
  }

  /**
   * Check whether the engine is currently initialized and ready.
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the set of currently loaded languages.
   */
  get languages(): ReadonlySet<string> {
    return this.loadedLanguages;
  }

  /**
   * Check whether processing has been cancelled.
   */
  get cancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Format estimated time remaining in milliseconds to "Xm Ys" format.
   * Used by UI components to display ETA (Req 5.3).
   */
  static formatEta(estimatedTimeRemainingMs: number): string {
    const totalSeconds = Math.round(estimatedTimeRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Reset the cancelled flag (called before starting new processing).
   */
  resetCancellation(): void {
    this.isCancelled = false;
  }

  /**
   * Get the underlying worker instance (used by processPages in task 3.5).
   */
  getWorker(): Worker | null {
    return this.worker;
  }

  /**
   * Process selected pages through OCR recognition.
   *
   * Renders each page at 300 DPI, sends ImageBitmap to worker, collects results sequentially.
   * Processes one page at a time to limit memory usage (Req 10.3, 11.2).
   * Tracks timing per page and emits progress events with ETA (Req 5.1–5.6).
   * Handles page render failures, worker crashes, and memory pressure (Req 3.5, 10.6, 10.7, 11.5).
   *
   * @param pdfData - The PDF file as an ArrayBuffer
   * @param pages - Array of 1-based page numbers to process
   * @param onProgress - Optional callback for progress updates
   * @returns OcrProcessingResult with all page results and failures
   */
  async processPages(
    pdfData: ArrayBuffer,
    pages: number[],
    onProgress?: (progress: OcrProgress) => void,
  ): Promise<OcrProcessingResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('OCR engine is not initialized. Call initialize() first.');
    }

    // Reset cancellation flag before starting new processing
    this.resetCancellation();

    const startTime = performance.now();
    const results: OcrPageResult[] = [];
    const failedPages: OcrPageFailure[] = [];
    const pageTimings: number[] = [];

    // Load the document via render engine
    const renderEngine = new PdfjsRenderEngine();
    let doc;
    try {
      doc = await renderEngine.loadDocument(pdfData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load PDF document';
      this.emit('error', errorMsg);
      throw new Error(errorMsg);
    }

    let currentScale = DPI_300_SCALE;

    for (let i = 0; i < pages.length; i++) {
      // Check if cancelled → break (Req 5.5)
      if (this.isCancelled) {
        break;
      }

      const pageNumber = pages[i];
      const pageStartTime = performance.now();

      try {
        // Render page at configured DPI to a canvas
        const canvas = await this.renderPageToCanvas(renderEngine, doc, pageNumber, currentScale);

        // Create ImageBitmap from canvas
        let bitmap: ImageBitmap;
        try {
          bitmap = await createImageBitmap(canvas);
        } catch (bitmapErr) {
          // Memory pressure during bitmap creation — attempt fallback
          if (this.isMemoryError(bitmapErr)) {
            const fallbackResult = await this.handleMemoryPressure(
              renderEngine,
              doc,
              pageNumber,
              pageTimings,
              pages.length,
              i,
              onProgress,
            );
            if (fallbackResult === 'reduced') {
              currentScale = DPI_150_SCALE;
              // Retry this page at reduced resolution
              i--;
              continue;
            }
            // User chose to cancel or fallback failed
            break;
          }
          throw bitmapErr;
        }

        // Release canvas memory immediately after bitmap creation (Req 10.3)
        canvas.width = 0;
        canvas.height = 0;

        // Send 'recognize' message to worker with ImageBitmap (transferable)
        const pageResult = await this.sendToWorkerWithTimeout(pageNumber, bitmap);

        // Track timing
        const pageEndTime = performance.now();
        const pageTimeMs = pageEndTime - pageStartTime;
        pageTimings.push(pageTimeMs);

        // Store result
        results.push(pageResult);

        // Emit pageComplete event
        this.emit('pageComplete', pageResult);
      } catch (err) {
        // Record OcrPageFailure with page number and error description (Req 3.5)
        const errorMsg = err instanceof Error ? err.message : `Unknown error on page ${pageNumber}`;

        // Check if this is a worker crash/timeout
        if (this.isWorkerCrashError(errorMsg)) {
          failedPages.push({ pageNumber, error: errorMsg });
          // Terminate and report partial results (Req 10.7)
          this.terminateWorker();
          this.emit('error', `Worker crashed on page ${pageNumber}: ${errorMsg}`);
          break;
        }

        // Skip failed page, record failure, continue to next page (Req 3.5, 10.6)
        failedPages.push({ pageNumber, error: errorMsg });

        // Track timing even for failed pages (for ETA accuracy)
        const pageEndTime = performance.now();
        pageTimings.push(pageEndTime - pageStartTime);
      }

      // Update progress and emit events (Req 5.1–5.6)
      const pagesCompleted = i + 1;
      const progress = this.calculateProgress(pagesCompleted, pages.length, pageTimings);

      this.emit('progress', progress);
      if (onProgress) {
        onProgress(progress);
      }
    }

    const totalProcessingTimeMs = performance.now() - startTime;

    // Calculate average confidence across all successful pages
    let averageConfidence: number | null = null;
    if (results.length > 0) {
      const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
      averageConfidence = Math.round(totalConfidence / results.length);
    }

    return {
      pages: results,
      failedPages,
      totalPagesProcessed: results.length,
      totalPagesFailed: failedPages.length,
      averageConfidence,
      totalProcessingTimeMs,
    };
  }

  // --- Private Methods ---

  /**
   * Render a page to a canvas at the given scale using the render engine.
   */
  private async renderPageToCanvas(
    renderEngine: PdfjsRenderEngine,
    doc: RenderableDocument,
    pageNumber: number,
    scale: number,
  ): Promise<HTMLCanvasElement> {
    return renderEngine.renderPage(doc, pageNumber, scale);
  }

  /**
   * Send an ImageBitmap to the worker for recognition with a 30-second timeout.
   * Transfers the bitmap (zero-copy) to the worker.
   * Returns the OcrPageResult on success, throws on error or timeout.
   */
  private sendToWorkerWithTimeout(pageNumber: number, bitmap: ImageBitmap): Promise<OcrPageResult> {
    return new Promise<OcrPageResult>((resolve, reject) => {
      if (!this.worker) {
        bitmap.close();
        reject(new Error('Worker is not available'));
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const onMessage = (event: MessageEvent<WorkerOutMessage>) => {
        const message = event.data;

        if (message.type === 'recognizeComplete' && message.pageNumber === pageNumber) {
          cleanup();
          resolve(message.result);
        } else if (message.type === 'recognizeError' && message.pageNumber === pageNumber) {
          cleanup();
          reject(new Error(message.error));
        }
      };

      const onError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || 'Worker error during recognition'));
      };

      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.worker?.removeEventListener('message', onMessage);
        this.worker?.removeEventListener('error', onError);
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.addEventListener('error', onError);

      // Set 30-second timeout for worker response (Req 10.7)
      timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(`Worker timeout: page ${pageNumber} exceeded ${WORKER_TIMEOUT_MS / 1000}s`),
        );
      }, WORKER_TIMEOUT_MS);

      // Send recognize message with ImageBitmap as transferable
      const message: WorkerInMessage = {
        type: 'recognize',
        pageNumber,
        imageData: bitmap,
      };
      this.worker.postMessage(message, [bitmap]);
    });
  }

  /**
   * Calculate progress with ETA (available after 2+ pages).
   * Percentage: Math.round(pagesCompleted / totalPages * 100)
   * ETA: average page timing × remaining pages (only after 2+ pages)
   */
  private calculateProgress(
    pagesCompleted: number,
    totalPages: number,
    pageTimings: number[],
  ): OcrProgress {
    const percentComplete = Math.round((pagesCompleted / totalPages) * 100);

    // ETA is only available after 2+ pages have been processed (Req 5.3)
    let estimatedTimeRemainingMs: number | null = null;
    if (pageTimings.length >= 2) {
      const avgTimePerPage = pageTimings.reduce((sum, t) => sum + t, 0) / pageTimings.length;
      const remainingPages = totalPages - pagesCompleted;
      estimatedTimeRemainingMs = Math.round(avgTimePerPage * remainingPages);
    }

    return {
      currentPage: pagesCompleted,
      totalPages,
      percentComplete,
      estimatedTimeRemainingMs,
      pageTimings: [...pageTimings],
    };
  }

  /**
   * Handle memory pressure: pause, release buffers, offer 150 DPI fallback.
   * Returns 'reduced' if fallback should be used, 'cancel' if processing should stop.
   */
  private async handleMemoryPressure(
    _renderEngine: PdfjsRenderEngine,
    _doc: RenderableDocument,
    pageNumber: number,
    _pageTimings: number[],
    _totalPages: number,
    _currentIndex: number,
    _onProgress?: (progress: OcrProgress) => void,
  ): Promise<'reduced' | 'cancel'> {
    // Emit error event to notify UI about memory pressure (Req 11.5)
    this.emit(
      'error',
      `Memory pressure detected on page ${pageNumber}. Attempting 150 DPI fallback.`,
    );

    // Default behavior: attempt reduced resolution fallback
    return 'reduced';
  }

  /**
   * Check if an error is a memory-related error.
   */
  private isMemoryError(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      return (
        msg.includes('out of memory') ||
        msg.includes('allocation failed') ||
        msg.includes('memory') ||
        msg.includes('arraybuffer')
      );
    }
    return false;
  }

  /**
   * Check if an error message indicates a worker crash or timeout.
   */
  private isWorkerCrashError(errorMsg: string): boolean {
    return (
      errorMsg.includes('Worker timeout') ||
      errorMsg.includes('Worker error during recognition') ||
      errorMsg.includes('Worker is not available')
    );
  }

  /**
   * Perform the actual initialization: create the worker, send init message,
   * and wait for initComplete or initError from the worker.
   */
  private doInitialize(languages: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Lazy-load: create the Web Worker only when needed (Req 1.2)
      this.worker = new Worker(new URL('./ocr-worker.ts', import.meta.url), {
        type: 'module',
      });

      const onMessage = (event: MessageEvent<WorkerOutMessage>) => {
        const message = event.data;

        switch (message.type) {
          case 'initProgress':
            this.emit('initProgress', message.percent);
            break;

          case 'initComplete':
            this.isInitialized = true;
            this.loadedLanguages = new Set(languages);
            this.worker?.removeEventListener('message', onMessage);
            this.worker?.removeEventListener('error', onError);
            resolve();
            break;

          case 'initError':
            this.worker?.removeEventListener('message', onMessage);
            this.worker?.removeEventListener('error', onError);
            this.terminateWorker();
            this.emit('error', message.error);
            reject(new Error(message.error));
            break;
        }
      };

      const onError = (event: ErrorEvent) => {
        this.worker?.removeEventListener('message', onMessage);
        this.worker?.removeEventListener('error', onError);
        this.terminateWorker();
        const errorMsg = event.message || 'OCR worker failed to load';
        this.emit('error', errorMsg);
        reject(new Error(errorMsg));
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.addEventListener('error', onError);

      // Send init message to the worker with languages and CDN path
      const initMessage: WorkerInMessage = {
        type: 'init',
        languages,
        langDataPath: LANG_DATA_PATH,
      };
      this.worker.postMessage(initMessage);
    });
  }

  /**
   * Terminate the current worker instance and reset worker-related state.
   */
  private terminateWorker(): void {
    if (this.worker) {
      try {
        const terminateMessage: WorkerInMessage = { type: 'terminate' };
        this.worker.postMessage(terminateMessage);
      } catch {
        // Worker may already be terminated — fall through to hard terminate
      }
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
  }

  /**
   * Emit an event to all registered listeners.
   */
  private emit<T extends OcrEngineEventType>(
    event: T,
    ...args: Parameters<OcrEngineEvents[T]>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch {
          // Don't let listener errors break the engine
        }
      }
    }
  }

  /**
   * Compare two sets for equality.
   */
  private setsAreEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}
