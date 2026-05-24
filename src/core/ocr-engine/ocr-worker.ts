/**
 * OCR Web Worker — Tesseract.js integration
 *
 * Runs in a dedicated Web Worker thread. Handles Tesseract.js initialization,
 * language loading, and page recognition. Communicates with the main thread
 * via structured messages defined in WorkerInMessage / WorkerOutMessage.
 *
 * Requirements: 1.1, 1.4, 10.1, 10.7
 */

import Tesseract from 'tesseract.js';
import type { WorkerInMessage, WorkerOutMessage } from './types';

let tesseractWorker: Tesseract.Worker | null = null;

const RETRY_DELAY_MS = 2000;
const RECOGNITION_TIMEOUT_MS = 30_000;

/**
 * Post a typed message back to the main thread.
 */
function postOutMessage(message: WorkerOutMessage): void {
  self.postMessage(message);
}

/**
 * Initialize the Tesseract.js worker, load language packs, and report progress.
 * On failure, retries once after a 2-second delay. If retry also fails, sends initError.
 */
async function handleInit(languages: string[], langDataPath: string): Promise<void> {
  const langString = languages.join('+');

  async function attemptInit(): Promise<void> {
    tesseractWorker = await Tesseract.createWorker(langString, undefined, {
      langPath: langDataPath,
      logger: (info) => {
        if (info.status === 'loading language traineddata') {
          const percent = Math.round(info.progress * 100);
          postOutMessage({ type: 'initProgress', percent });
        }
      },
    });
  }

  try {
    await attemptInit();
    postOutMessage({ type: 'initComplete' });
  } catch (_firstError: unknown) {
    // Retry once after 2-second delay (Req 1.4)
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      await attemptInit();
      postOutMessage({ type: 'initComplete' });
    } catch (retryError: unknown) {
      const errorMessage =
        retryError instanceof Error ? retryError.message : 'Unknown initialization error';
      postOutMessage({ type: 'initError', error: errorMessage });
    }
  }
}

/**
 * Handle the 'recognize' message: run Tesseract.js recognition on an ImageBitmap.
 * Wraps the recognize call with a 30-second timeout (Req 10.7).
 */
async function handleRecognize(pageNumber: number, imageData: ImageBitmap): Promise<void> {
  if (!tesseractWorker) {
    postOutMessage({
      type: 'recognizeError',
      pageNumber,
      error: 'OCR worker not initialized',
    });
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error('Recognition timed out after 30 seconds'));
      }, RECOGNITION_TIMEOUT_MS);
    });

    const result = await Promise.race([tesseractWorker.recognize(imageData), timeoutPromise]);

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    postOutMessage({
      type: 'recognizeComplete',
      pageNumber,
      result: {
        pageNumber,
        text: result.data.text,
        lines: [],
        words: [],
        confidence: result.data.confidence,
        processingTimeMs: 0,
      },
    });
  } catch (error: unknown) {
    if (timeoutId !== null && !timedOut) {
      clearTimeout(timeoutId);
    }

    const errorMessage = timedOut
      ? 'Recognition timed out after 30 seconds'
      : error instanceof Error
        ? error.message
        : 'Recognition failed';

    postOutMessage({ type: 'recognizeError', pageNumber, error: errorMessage });
  }
}

/**
 * Handle the 'terminate' message: cleanly shut down the Tesseract worker
 * and close the Web Worker (Req 10.7).
 */
async function handleTerminate(): Promise<void> {
  try {
    if (tesseractWorker) {
      await tesseractWorker.terminate();
      tesseractWorker = null;
    }
  } catch {
    // Best-effort cleanup — proceed with termination regardless
  }

  postOutMessage({ type: 'terminated' });
  self.close();
}

/**
 * Listen for messages from the main thread and dispatch to handlers.
 */
self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      handleInit(message.languages, message.langDataPath);
      break;

    case 'recognize':
      handleRecognize(message.pageNumber, message.imageData);
      break;

    case 'terminate':
      handleTerminate();
      break;
  }
});
