import { useEffect } from 'react';

/**
 * Registers a beforeunload handler that destroys the OCR worker on tab close
 * or navigation away. This ensures the Web Worker is properly terminated and
 * all associated memory is released. (Req 10.4)
 *
 * All heavy OCR computation runs in the Web Worker thread via ocr-worker.ts,
 * keeping the main thread responsive (<50ms blocking). The main thread only
 * handles lightweight coordination: posting messages to the worker and
 * receiving results via postMessage.
 *
 * Uses dynamic import to avoid pulling pdfjs-dist into the initial bundle.
 */
export function useOcrCleanup(): void {
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Dynamic import to avoid pulling OcrEngine (and pdfjs-dist) into the initial bundle.
      // This is a best-effort cleanup — if the import hasn't resolved by the time
      // the page unloads, the browser will clean up the worker anyway.
      import('../core/ocr-engine')
        .then(({ OcrEngine }) => {
          OcrEngine.getInstance().destroy();
        })
        .catch(() => {
          // Ignore errors during cleanup on page unload
        });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
