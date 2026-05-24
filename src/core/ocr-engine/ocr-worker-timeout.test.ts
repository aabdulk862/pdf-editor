/**
 * Tests for OCR worker timeout and terminate handling (Req 10.7).
 *
 * Validates:
 * 1. 30-second per-page timeout sends recognizeError on timeout
 * 2. Timeout is cleared when recognition completes before 30 seconds
 * 3. 'terminate' message cleanly shuts down the Tesseract worker and closes the Web Worker
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tesseract.js
const mockRecognize = vi.fn();
const mockWorkerTerminate = vi.fn();

vi.mock('tesseract.js', () => ({
  default: {
    createWorker: vi.fn().mockImplementation(async () => ({
      recognize: mockRecognize,
      terminate: mockWorkerTerminate,
    })),
  },
}));

// Track the message handler registered via addEventListener
let messageHandler: ((event: MessageEvent) => void) | null = null;
const mockPostMessage = vi.fn();
const mockClose = vi.fn();

function setupWorkerGlobals() {
  messageHandler = null;

  Object.defineProperty(globalThis, 'self', {
    value: {
      postMessage: mockPostMessage,
      close: mockClose,
      addEventListener: (_event: string, handler: (event: MessageEvent) => void) => {
        messageHandler = handler;
      },
    },
    writable: true,
    configurable: true,
  });
}

function sendWorkerMessage(data: unknown): void {
  if (!messageHandler) {
    throw new Error('Worker message handler not registered');
  }
  messageHandler(new MessageEvent('message', { data }));
}

describe('OCR Worker - 30-Second Timeout Handling (Req 10.7)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();

    // Re-declare mock after resetModules
    vi.mock('tesseract.js', () => ({
      default: {
        createWorker: vi.fn().mockImplementation(async () => ({
          recognize: mockRecognize,
          terminate: mockWorkerTerminate,
        })),
      },
    }));

    setupWorkerGlobals();
    await import('./ocr-worker');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends recognizeError when recognition exceeds 30 seconds', async () => {
    // Simulate a recognize call that never resolves (hangs indefinitely)
    mockRecognize.mockImplementation(() => new Promise(() => {}));

    // Initialize the worker first
    sendWorkerMessage({ type: 'init', languages: ['eng'], langDataPath: '/lang-data' });
    await vi.advanceTimersByTimeAsync(100);

    expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'initComplete' }));
    mockPostMessage.mockClear();

    // Send recognize message
    sendWorkerMessage({
      type: 'recognize',
      pageNumber: 3,
      imageData: {} as ImageBitmap,
    });

    // Advance time past the 30-second timeout
    await vi.advanceTimersByTimeAsync(30_000);

    // Should have sent a recognizeError with the specific timeout message
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'recognizeError',
      pageNumber: 3,
      error: 'Recognition timed out after 30 seconds',
    });
  });

  it('clears timeout when recognition completes before 30 seconds', async () => {
    // Simulate a fast recognize call that resolves immediately
    mockRecognize.mockResolvedValue({
      data: {
        text: 'Hello world',
        confidence: 95,
      },
    });

    // Initialize
    sendWorkerMessage({ type: 'init', languages: ['eng'], langDataPath: '/lang-data' });
    await vi.advanceTimersByTimeAsync(100);
    mockPostMessage.mockClear();

    // Send recognize message - should complete quickly
    sendWorkerMessage({
      type: 'recognize',
      pageNumber: 1,
      imageData: {} as ImageBitmap,
    });
    await vi.advanceTimersByTimeAsync(100);

    // Should have sent recognizeComplete (not error)
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recognizeComplete',
        pageNumber: 1,
      }),
    );

    // Should NOT have sent recognizeError
    expect(mockPostMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recognizeError' }),
    );

    // Advance well past the 30s timeout to verify it doesn't fire after completion
    await vi.advanceTimersByTimeAsync(60_000);

    // Still no error message — timeout was properly cleared
    const errorCalls = mockPostMessage.mock.calls.filter(
      (call) => call[0]?.type === 'recognizeError',
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('sends recognizeError if worker is not initialized', async () => {
    // Worker was imported but not initialized — send recognize directly
    sendWorkerMessage({
      type: 'recognize',
      pageNumber: 5,
      imageData: {} as ImageBitmap,
    });
    await vi.advanceTimersByTimeAsync(100);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'recognizeError',
      pageNumber: 5,
      error: 'OCR worker not initialized',
    });
  });
});

describe('OCR Worker - Terminate Message Handling (Req 10.7)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();

    vi.mock('tesseract.js', () => ({
      default: {
        createWorker: vi.fn().mockImplementation(async () => ({
          recognize: mockRecognize,
          terminate: mockWorkerTerminate,
        })),
      },
    }));

    setupWorkerGlobals();
    await import('./ocr-worker');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cleanly shuts down Tesseract worker and closes Web Worker on terminate', async () => {
    mockWorkerTerminate.mockResolvedValue(undefined);

    // Initialize first so there's a worker to terminate
    sendWorkerMessage({ type: 'init', languages: ['eng'], langDataPath: '/lang-data' });
    await vi.advanceTimersByTimeAsync(100);
    mockPostMessage.mockClear();

    // Send terminate message
    sendWorkerMessage({ type: 'terminate' });
    await vi.advanceTimersByTimeAsync(100);

    // Should have called tesseract worker.terminate()
    expect(mockWorkerTerminate).toHaveBeenCalled();

    // Should have sent 'terminated' message back to main thread
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'terminated' });

    // Should have closed the Web Worker with self.close()
    expect(mockClose).toHaveBeenCalled();
  });

  it('handles terminate gracefully even if Tesseract worker termination throws', async () => {
    mockWorkerTerminate.mockRejectedValue(new Error('Termination failed'));

    // Initialize first
    sendWorkerMessage({ type: 'init', languages: ['eng'], langDataPath: '/lang-data' });
    await vi.advanceTimersByTimeAsync(100);
    mockPostMessage.mockClear();

    // Send terminate - should not throw even if internal terminate fails
    sendWorkerMessage({ type: 'terminate' });
    await vi.advanceTimersByTimeAsync(100);

    // Should still send 'terminated' message and close despite the error
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'terminated' });
    expect(mockClose).toHaveBeenCalled();
  });

  it('handles terminate when worker was never initialized', async () => {
    // Worker was imported but never initialized — send terminate directly
    sendWorkerMessage({ type: 'terminate' });
    await vi.advanceTimersByTimeAsync(100);

    // Should NOT have called tesseract terminate (no worker exists)
    expect(mockWorkerTerminate).not.toHaveBeenCalled();

    // Should still send 'terminated' and close the Web Worker
    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'terminated' });
    expect(mockClose).toHaveBeenCalled();
  });
});
