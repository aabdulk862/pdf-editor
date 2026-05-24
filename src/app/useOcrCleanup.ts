import { useEffect } from 'react';
import { OcrEngine } from '../core/ocr-engine';

/**
 * Registers a beforeunload handler that destroys the OCR worker on tab close
 * or navigation away. This ensures the Web Worker is properly terminated and
 * all associated memory is released. (Req 10.4)
 *
 * All heavy OCR computation runs in the Web Worker thread via ocr-worker.ts,
 * keeping the main thread responsive (<50ms blocking). The main thread only
 * handles lightweight coordination: posting messages to the worker and
 * receiving results via postMessage.
 */
export function useOcrCleanup(): void {
  useEffect(() => {
    const handleBeforeUnload = () => {
      OcrEngine.getInstance().destroy();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
