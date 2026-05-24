import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OcrEngine } from './ocr-engine';

// Mock the render engine module (hoisted)
const mockLoadDocument = vi.fn();
const mockRenderPage = vi.fn();

vi.mock('../render-engine/renderer', () => ({
  PdfjsRenderEngine: class {
    async loadDocument(data: ArrayBuffer) {
      return mockLoadDocument(data);
    }
    async renderPage(doc: unknown, pageNum: number, scale: number) {
      return mockRenderPage(doc, pageNum, scale);
    }
  },
}));

// Mock the Worker class
class MockWorker {
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private errorHandler: ((event: ErrorEvent) => void) | null = null;
  public postMessageCalls: unknown[][] = [];
  public terminated = false;

  addEventListener(type: string, handler: (...args: unknown[]) => void) {
    if (type === 'message') this.messageHandler = handler as (event: MessageEvent) => void;
    if (type === 'error') this.errorHandler = handler as (event: ErrorEvent) => void;
  }

  removeEventListener(type: string, handler: (...args: unknown[]) => void) {
    if (type === 'message' && this.messageHandler === handler) this.messageHandler = null;
    if (type === 'error' && this.errorHandler === handler) this.errorHandler = null;
  }

  postMessage(data: unknown, transfer?: unknown[]) {
    this.postMessageCalls.push([data, transfer]);
  }

  terminate() {
    this.terminated = true;
  }

  simulateMessage(data: unknown) {
    if (this.messageHandler) {
      this.messageHandler({ data } as MessageEvent);
    }
  }

  simulateError(message: string) {
    if (this.errorHandler) {
      this.errorHandler({ message } as ErrorEvent);
    }
  }
}

let mockWorkerInstance: MockWorker | null = null;

vi.stubGlobal(
  'Worker',
  class {
    constructor() {
      mockWorkerInstance = new MockWorker();
      return mockWorkerInstance as unknown as Worker;
    }
  },
);

describe('OcrEngine', () => {
  beforeEach(() => {
    (OcrEngine as unknown as { instance: null }).instance = null;
    mockWorkerInstance = null;
    mockLoadDocument.mockReset();
    mockRenderPage.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern (Task 3.1)', () => {
    it('should return the same instance on multiple getInstance() calls', () => {
      const instance1 = OcrEngine.getInstance();
      const instance2 = OcrEngine.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should start in uninitialized state', () => {
      const engine = OcrEngine.getInstance();
      expect(engine.initialized).toBe(false);
      expect(engine.cancelled).toBe(false);
    });
  });

  describe('Event Emitter (Task 3.1)', () => {
    it('should register and call event listeners', () => {
      const engine = OcrEngine.getInstance();
      const callback = vi.fn();

      engine.on('error', callback);
      const initPromise = engine.initialize(['eng']);
      mockWorkerInstance?.simulateError('Test error');

      return initPromise.catch(() => {
        expect(callback).toHaveBeenCalledWith('Test error');
      });
    });

    it('should return an unsubscribe function from on()', () => {
      const engine = OcrEngine.getInstance();
      const callback = vi.fn();

      const unsubscribe = engine.on('initProgress', callback);
      engine.initialize(['eng']);

      mockWorkerInstance?.simulateMessage({ type: 'initProgress', percent: 50 });
      expect(callback).toHaveBeenCalledWith(50);

      unsubscribe();
      callback.mockClear();

      mockWorkerInstance?.simulateMessage({ type: 'initProgress', percent: 75 });
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for the same event', () => {
      const engine = OcrEngine.getInstance();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      engine.on('initProgress', callback1);
      engine.on('initProgress', callback2);

      engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initProgress', percent: 30 });

      expect(callback1).toHaveBeenCalledWith(30);
      expect(callback2).toHaveBeenCalledWith(30);
    });
  });

  describe('Lazy-Loading Initialization (Task 3.2)', () => {
    it('should create a worker only on first initialize() call', () => {
      const engine = OcrEngine.getInstance();
      expect(mockWorkerInstance).toBeNull();
      engine.initialize(['eng']);
      expect(mockWorkerInstance).not.toBeNull();
    });

    it('should send init message with languages and langDataPath', () => {
      const engine = OcrEngine.getInstance();
      engine.initialize(['eng', 'fra']);

      expect(mockWorkerInstance?.postMessageCalls[0][0]).toEqual({
        type: 'init',
        languages: ['eng', 'fra'],
        langDataPath: 'https://tessdata.projectnaptha.com/4.0.0',
      });
    });

    it('should resolve when worker sends initComplete', async () => {
      const engine = OcrEngine.getInstance();
      const promise = engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await expect(promise).resolves.toBeUndefined();
      expect(engine.initialized).toBe(true);
    });

    it('should reject when worker sends initError', async () => {
      const engine = OcrEngine.getInstance();
      const promise = engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initError', error: 'Network failure' });
      await expect(promise).rejects.toThrow('Network failure');
      expect(engine.initialized).toBe(false);
    });

    it('should queue concurrent init requests (Req 1.7)', () => {
      const engine = OcrEngine.getInstance();
      const promise1 = engine.initialize(['eng']);
      const promise2 = engine.initialize(['eng']);
      expect(promise1).toBe(promise2);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
    });

    it('should emit initProgress events during initialization', () => {
      const engine = OcrEngine.getInstance();
      const progressCallback = vi.fn();
      engine.on('initProgress', progressCallback);
      engine.initialize(['eng']);

      mockWorkerInstance?.simulateMessage({ type: 'initProgress', percent: 25 });
      mockWorkerInstance?.simulateMessage({ type: 'initProgress', percent: 50 });
      mockWorkerInstance?.simulateMessage({ type: 'initProgress', percent: 100 });

      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledWith(25);
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });
  });

  describe('Worker Reuse Logic (Task 3.3)', () => {
    it('should skip re-initialization if already loaded with same languages', async () => {
      const engine = OcrEngine.getInstance();
      const promise1 = engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise1;
      const firstWorker = mockWorkerInstance;
      await engine.initialize(['eng']);
      expect(mockWorkerInstance).toBe(firstWorker);
    });

    it('should skip re-initialization regardless of language order', async () => {
      const engine = OcrEngine.getInstance();
      const promise1 = engine.initialize(['eng', 'fra']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise1;
      const firstWorker = mockWorkerInstance;
      await engine.initialize(['fra', 'eng']);
      expect(mockWorkerInstance).toBe(firstWorker);
    });

    it('should reinitialize when languages change', async () => {
      const engine = OcrEngine.getInstance();
      const promise1 = engine.initialize(['eng']);
      const firstWorker = mockWorkerInstance;
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise1;

      const promise2 = engine.initialize(['fra']);
      expect(firstWorker?.terminated).toBe(true);
      expect(mockWorkerInstance).not.toBe(firstWorker);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise2;
      expect(engine.initialized).toBe(true);
    });

    it('should track loaded languages correctly', async () => {
      const engine = OcrEngine.getInstance();
      const promise = engine.initialize(['eng', 'deu']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise;
      expect(engine.languages.has('eng')).toBe(true);
      expect(engine.languages.has('deu')).toBe(true);
      expect(engine.languages.has('fra')).toBe(false);
    });
  });

  describe('cancel()', () => {
    it('should set the cancelled flag', () => {
      const engine = OcrEngine.getInstance();
      expect(engine.cancelled).toBe(false);
      engine.cancel();
      expect(engine.cancelled).toBe(true);
    });

    it('should be resettable via resetCancellation()', () => {
      const engine = OcrEngine.getInstance();
      engine.cancel();
      expect(engine.cancelled).toBe(true);
      engine.resetCancellation();
      expect(engine.cancelled).toBe(false);
    });
  });

  describe('destroy()', () => {
    it('should terminate the worker and reset all state', async () => {
      const engine = OcrEngine.getInstance();
      const promise = engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise;
      const workerRef = mockWorkerInstance;
      engine.destroy();
      expect(workerRef?.terminated).toBe(true);
      expect(engine.initialized).toBe(false);
      expect(engine.languages.size).toBe(0);
    });

    it('should allow re-initialization after destroy', async () => {
      const engine = OcrEngine.getInstance();
      const promise1 = engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise1;
      engine.destroy();

      const promise2 = engine.initialize(['fra']);
      expect(mockWorkerInstance).not.toBeNull();
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise2;
      expect(engine.initialized).toBe(true);
      expect(engine.languages.has('fra')).toBe(true);
    });
  });

  describe('processPages() (Tasks 3.5, 3.6, 3.7)', () => {
    const mockDoc = { id: 'test-doc', pageCount: 5, getPage: vi.fn() };
    const mockCanvas = { width: 2550, height: 3300, getContext: () => ({}) };

    beforeEach(() => {
      mockLoadDocument.mockResolvedValue(mockDoc);
      mockRenderPage.mockResolvedValue(mockCanvas);
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn().mockResolvedValue({
          width: 2550,
          height: 3300,
          close: vi.fn(),
        }),
      );
    });

    async function initializeEngine() {
      const engine = OcrEngine.getInstance();
      const promise = engine.initialize(['eng']);
      mockWorkerInstance?.simulateMessage({ type: 'initComplete' });
      await promise;
      return engine;
    }

    it('should throw if engine is not initialized', async () => {
      const engine = OcrEngine.getInstance();
      await expect(engine.processPages(new ArrayBuffer(100), [1])).rejects.toThrow(
        'OCR engine is not initialized',
      );
    });

    it('should reset cancellation flag before processing', async () => {
      const engine = await initializeEngine();
      engine.cancel();
      expect(engine.cancelled).toBe(true);

      const promise = engine.processPages(new ArrayBuffer(100), [1]);
      expect(engine.cancelled).toBe(false);

      await new Promise((r) => setTimeout(r, 10));
      mockWorkerInstance?.simulateMessage({
        type: 'recognizeComplete',
        pageNumber: 1,
        result: {
          pageNumber: 1,
          text: 'Hello',
          lines: [],
          words: [],
          confidence: 95,
          processingTimeMs: 1000,
        },
      });
      await promise;
    });

    it('should process pages sequentially and return results', async () => {
      const engine = await initializeEngine();
      const promise = engine.processPages(new ArrayBuffer(100), [1, 2]);

      await new Promise((r) => setTimeout(r, 10));
      mockWorkerInstance?.simulateMessage({
        type: 'recognizeComplete',
        pageNumber: 1,
        result: {
          pageNumber: 1,
          text: 'Page 1 text',
          lines: [],
          words: [],
          confidence: 90,
          processingTimeMs: 500,
        },
      });

      await new Promise((r) => setTimeout(r, 10));
      mockWorkerInstance?.simulateMessage({
        type: 'recognizeComplete',
        pageNumber: 2,
        result: {
          pageNumber: 2,
          text: 'Page 2 text',
          lines: [],
          words: [],
          confidence: 85,
          processingTimeMs: 600,
        },
      });

      const result = await promise;
      expect(result.totalPagesProcessed).toBe(2);
      expect(result.totalPagesFailed).toBe(0);
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].text).toBe('Page 1 text');
      expect(result.pages[1].text).toBe('Page 2 text');
      expect(result.averageConfidence).toBe(88);
    });

    it('should emit pageComplete events for each successful page', async () => {
      const engine = await initializeEngine();
      const pageCompleteCallback = vi.fn();
      engine.on('pageComplete', pageCompleteCallback);

      const promise = engine.processPages(new ArrayBuffer(100), [1]);
      await new Promise((r) => setTimeout(r, 10));
      mockWorkerInstance?.simulateMessage({
        type: 'recognizeComplete',
        pageNumber: 1,
        result: {
          pageNumber: 1,
          text: 'Hello',
          lines: [],
          words: [],
          confidence: 95,
          processingTimeMs: 1000,
        },
      });
      await promise;

      expect(pageCompleteCallback).toHaveBeenCalledTimes(1);
      expect(pageCompleteCallback).toHaveBeenCalledWith(
        expect.objectContaining({ pageNumber: 1, text: 'Hello' }),
      );
    });

    it('should release canvas memory after bitmap creation', async () => {
      const engine = await initializeEngine();
      const canvasObj = { width: 2550, height: 3300, getContext: () => ({}) };
      mockRenderPage.mockResolvedValue(canvasObj);

      const promise = engine.processPages(new ArrayBuffer(100), [1]);
      await new Promise((r) => setTimeout(r, 10));
      mockWorkerInstance?.simulateMessage({
        type: 'recognizeComplete',
        pageNumber: 1,
        result: {
          pageNumber: 1,
          text: 'Hello',
          lines: [],
          words: [],
          confidence: 95,
          processingTimeMs: 1000,
        },
      });
      await promise;

      expect(canvasObj.width).toBe(0);
      expect(canvasObj.height).toBe(0);
    });

    it('should transfer ImageBitmap to worker via postMessage', async () => {
      const engine = await initializeEngine();
      const mockBitmap = { width: 2550, height: 3300, close: vi.fn() };
      vi.mocked(globalThis.createImageBitmap).mockResolvedValue(
        mockBitmap as unknown as ImageBitmap,
      );

      const promise = engine.processPages(new ArrayBuffer(100), [1]);
      await new Promise((r) => setTimeout(r, 10));

      const recognizeCall = mockWorkerInstance?.postMessageCalls.find(
        ([msg]) => (msg as { type: string }).type === 'recognize',
      );
      expect(recognizeCall).toBeDefined();
      expect((recognizeCall![0] as { type: string }).type).toBe('recognize');
      expect((recognizeCall![0] as { pageNumber: number }).pageNumber).toBe(1);
      expect((recognizeCall![0] as { imageData: unknown }).imageData).toBe(mockBitmap);
      expect(recognizeCall![1]).toEqual([mockBitmap]);

      mockWorkerInstance?.simulateMessage({
        type: 'recognizeComplete',
        pageNumber: 1,
        result: {
          pageNumber: 1,
          text: 'Hello',
          lines: [],
          words: [],
          confidence: 95,
          processingTimeMs: 1000,
        },
      });
      await promise;
    });

    describe('Progress Calculation (Task 3.6)', () => {
      it('should emit progress events with correct percentage', async () => {
        const engine = await initializeEngine();
        const progressCallback = vi.fn();
        engine.on('progress', progressCallback);

        const promise = engine.processPages(new ArrayBuffer(100), [1, 2, 3]);

        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 1,
          result: {
            pageNumber: 1,
            text: 'P1',
            lines: [],
            words: [],
            confidence: 90,
            processingTimeMs: 500,
          },
        });
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 2,
          result: {
            pageNumber: 2,
            text: 'P2',
            lines: [],
            words: [],
            confidence: 85,
            processingTimeMs: 600,
          },
        });
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 3,
          result: {
            pageNumber: 3,
            text: 'P3',
            lines: [],
            words: [],
            confidence: 80,
            processingTimeMs: 700,
          },
        });
        await promise;

        expect(progressCallback).toHaveBeenCalledTimes(3);
        expect(progressCallback.mock.calls[0][0].percentComplete).toBe(33);
        expect(progressCallback.mock.calls[1][0].percentComplete).toBe(67);
        expect(progressCallback.mock.calls[2][0].percentComplete).toBe(100);
      });

      it('should not provide ETA until 2+ pages are processed', async () => {
        const engine = await initializeEngine();
        const progressCallback = vi.fn();
        engine.on('progress', progressCallback);

        const promise = engine.processPages(new ArrayBuffer(100), [1, 2, 3]);

        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 1,
          result: {
            pageNumber: 1,
            text: 'P1',
            lines: [],
            words: [],
            confidence: 90,
            processingTimeMs: 500,
          },
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(progressCallback.mock.calls[0][0].estimatedTimeRemainingMs).toBeNull();

        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 2,
          result: {
            pageNumber: 2,
            text: 'P2',
            lines: [],
            words: [],
            confidence: 85,
            processingTimeMs: 600,
          },
        });
        await new Promise((r) => setTimeout(r, 10));
        expect(progressCallback.mock.calls[1][0].estimatedTimeRemainingMs).not.toBeNull();
        expect(progressCallback.mock.calls[1][0].estimatedTimeRemainingMs).toBeGreaterThan(0);

        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 3,
          result: {
            pageNumber: 3,
            text: 'P3',
            lines: [],
            words: [],
            confidence: 80,
            processingTimeMs: 700,
          },
        });
        await promise;
      });

      it('should call onProgress callback with progress data', async () => {
        const engine = await initializeEngine();
        const onProgress = vi.fn();

        const promise = engine.processPages(new ArrayBuffer(100), [1], onProgress);
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 1,
          result: {
            pageNumber: 1,
            text: 'P1',
            lines: [],
            words: [],
            confidence: 90,
            processingTimeMs: 500,
          },
        });
        await promise;

        expect(onProgress).toHaveBeenCalledTimes(1);
        expect(onProgress).toHaveBeenCalledWith(
          expect.objectContaining({ currentPage: 1, totalPages: 1, percentComplete: 100 }),
        );
      });

      it('should track page timings in progress', async () => {
        const engine = await initializeEngine();
        const progressCallback = vi.fn();
        engine.on('progress', progressCallback);

        const promise = engine.processPages(new ArrayBuffer(100), [1, 2]);
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 1,
          result: {
            pageNumber: 1,
            text: 'P1',
            lines: [],
            words: [],
            confidence: 90,
            processingTimeMs: 500,
          },
        });
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 2,
          result: {
            pageNumber: 2,
            text: 'P2',
            lines: [],
            words: [],
            confidence: 85,
            processingTimeMs: 600,
          },
        });
        await promise;

        expect(progressCallback.mock.calls[0][0].pageTimings).toHaveLength(1);
        expect(progressCallback.mock.calls[1][0].pageTimings).toHaveLength(2);
      });
    });

    describe('Error Handling (Task 3.7)', () => {
      it('should skip failed pages and record OcrPageFailure', async () => {
        const engine = await initializeEngine();
        const promise = engine.processPages(new ArrayBuffer(100), [1, 2]);

        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeError',
          pageNumber: 1,
          error: 'Recognition failed for page 1',
        });
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 2,
          result: {
            pageNumber: 2,
            text: 'P2',
            lines: [],
            words: [],
            confidence: 85,
            processingTimeMs: 600,
          },
        });

        const result = await promise;
        expect(result.totalPagesProcessed).toBe(1);
        expect(result.totalPagesFailed).toBe(1);
        expect(result.failedPages[0].pageNumber).toBe(1);
        expect(result.failedPages[0].error).toBe('Recognition failed for page 1');
        expect(result.pages[0].pageNumber).toBe(2);
      });

      it('should terminate worker and stop on worker timeout', async () => {
        const engine = await initializeEngine();
        vi.useFakeTimers();

        const promise = engine.processPages(new ArrayBuffer(100), [1, 2]);
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(31_000);

        vi.useRealTimers();
        const result = await promise;

        expect(mockWorkerInstance?.terminated).toBe(true);
        expect(result.totalPagesFailed).toBe(1);
        expect(result.failedPages[0].error).toContain('Worker timeout');
      });

      it('should handle render engine failure for a page', async () => {
        const engine = await initializeEngine();
        mockRenderPage
          .mockRejectedValueOnce(new Error('Render failed'))
          .mockResolvedValue(mockCanvas);

        const promise = engine.processPages(new ArrayBuffer(100), [1, 2]);
        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 2,
          result: {
            pageNumber: 2,
            text: 'P2',
            lines: [],
            words: [],
            confidence: 85,
            processingTimeMs: 600,
          },
        });

        const result = await promise;
        expect(result.totalPagesFailed).toBe(1);
        expect(result.failedPages[0].pageNumber).toBe(1);
        expect(result.failedPages[0].error).toBe('Render failed');
        expect(result.totalPagesProcessed).toBe(1);
      });

      it('should handle document load failure', async () => {
        const engine = await initializeEngine();
        mockLoadDocument.mockRejectedValueOnce(new Error('Invalid PDF'));
        await expect(engine.processPages(new ArrayBuffer(100), [1])).rejects.toThrow('Invalid PDF');
      });

      it('should handle memory error with 150 DPI fallback', async () => {
        const engine = await initializeEngine();
        const mockBitmap = { width: 1275, height: 1650, close: vi.fn() };
        vi.mocked(globalThis.createImageBitmap)
          .mockRejectedValueOnce(new Error('Out of memory'))
          .mockResolvedValue(mockBitmap as unknown as ImageBitmap);

        const errorCallback = vi.fn();
        engine.on('error', errorCallback);

        const promise = engine.processPages(new ArrayBuffer(100), [1]);
        await new Promise((r) => setTimeout(r, 20));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeComplete',
          pageNumber: 1,
          result: {
            pageNumber: 1,
            text: 'P1',
            lines: [],
            words: [],
            confidence: 80,
            processingTimeMs: 800,
          },
        });

        const result = await promise;
        expect(errorCallback).toHaveBeenCalledWith(expect.stringContaining('Memory pressure'));
        expect(result.totalPagesProcessed).toBe(1);
      });

      it('should return null averageConfidence when all pages fail', async () => {
        const engine = await initializeEngine();
        const promise = engine.processPages(new ArrayBuffer(100), [1]);

        await new Promise((r) => setTimeout(r, 10));
        mockWorkerInstance?.simulateMessage({
          type: 'recognizeError',
          pageNumber: 1,
          error: 'Failed',
        });

        const result = await promise;
        expect(result.averageConfidence).toBeNull();
        expect(result.totalPagesProcessed).toBe(0);
        expect(result.totalPagesFailed).toBe(1);
      });
    });
  });

  describe('formatEta()', () => {
    it('should format milliseconds to "Xm Ys" format', () => {
      expect(OcrEngine.formatEta(90000)).toBe('1m 30s');
      expect(OcrEngine.formatEta(60000)).toBe('1m 0s');
      expect(OcrEngine.formatEta(45000)).toBe('0m 45s');
      expect(OcrEngine.formatEta(125000)).toBe('2m 5s');
      expect(OcrEngine.formatEta(0)).toBe('0m 0s');
    });
  });
});
