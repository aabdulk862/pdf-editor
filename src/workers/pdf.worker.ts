/**
 * PDF Web Worker - Offloads heavy PDF operations to a background thread.
 * Uses the PdfEngine class to perform operations and communicates via
 * a typed message protocol (postMessage/onmessage).
 */

import { PdfEngine } from '@/core/pdf-engine/operations';
import {
  applyLetterhead,
  exportLetterheadAsPdf,
} from '@/features/letterhead/utils/letterhead-renderer';
import type { LetterheadTemplate, LetterheadPageTarget } from '@/features/letterhead/types';
import type { PdfWorkerRequest, PdfWorkerResponse } from './pdf-worker.types';

const engine = new PdfEngine();

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const request = event.data;
  const { id, operation, payload } = request;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    switch (operation) {
      case 'merge':
        result = await engine.merge(payload.documents);
        break;

      case 'splitByRanges':
        result = await engine.splitByRanges(payload.data, payload.ranges);
        break;

      case 'rotatePages':
        result = await engine.rotatePages(payload.data, payload.pages, payload.angle);
        break;

      case 'deletePages':
        result = await engine.deletePages(payload.data, payload.pages);
        break;

      case 'reorderPages':
        result = await engine.reorderPages(payload.data, payload.newOrder);
        break;

      case 'duplicatePages':
        result = await engine.duplicatePages(payload.data, payload.pages, payload.copies);
        break;

      case 'addPageNumbers':
        result = await engine.addPageNumbers(payload.data, payload.config);
        break;

      case 'addHeadersFooters':
        result = await engine.addHeadersFooters(payload.data, payload.config);
        break;

      case 'addWatermark':
        result = await engine.addWatermark(payload.data, payload.config);
        break;

      case 'addTextOverlay':
        result = await engine.addTextOverlay(payload.data, payload.overlays);
        break;

      case 'embedAnnotation':
        result = await engine.embedAnnotation(payload.data, payload.annotation);
        break;

      case 'imagesToPdf':
        result = await engine.imagesToPdf(payload.images);
        break;

      case 'compress':
        result = await engine.compress(payload.data);
        break;

      case 'flatten':
        result = await engine.flatten(payload.data);
        break;

      case 'cropPages':
        result = await engine.cropPages(payload.data, payload.pages, payload.cropBox);
        break;

      case 'resizePages':
        result = await engine.resizePages(payload.data, payload.pages, payload.size);
        break;

      case 'linearize':
        result = await engine.linearize(payload.data);
        break;

      case 'getMetadata':
        result = await engine.getMetadata(payload.data);
        break;

      case 'setMetadata':
        result = await engine.setMetadata(payload.data, payload.metadata);
        break;

      case 'getBookmarks':
        result = await engine.getBookmarks(payload.data);
        break;

      case 'setBookmarks':
        result = await engine.setBookmarks(payload.data, payload.bookmarks);
        break;

      case 'getFormFields':
        result = await engine.getFormFields(payload.data);
        break;

      case 'fillFormFields':
        result = await engine.fillFormFields(payload.data, payload.values);
        break;

      case 'encrypt':
        result = await engine.encrypt(payload.data, payload.password);
        break;

      case 'decrypt':
        result = await engine.decrypt(payload.data, payload.password);
        break;

      case 'redact':
        result = await engine.redact(payload.data, payload.regions);
        break;

      case 'getPageCount':
        result = await engine.getPageCount(payload.data);
        break;

      case 'applyLetterhead':
        result = await applyLetterhead(
          payload.data,
          payload.template as LetterheadTemplate,
          payload.target as LetterheadPageTarget,
        );
        break;

      case 'exportLetterheadAsPdf':
        result = await exportLetterheadAsPdf(payload.template as LetterheadTemplate);
        break;

      default: {
        const exhaustiveCheck: never = operation;
        throw new Error(`Unsupported operation: ${exhaustiveCheck}`);
      }
    }

    const response: PdfWorkerResponse = { id, success: true, result };
    self.postMessage(response);
  } catch (error) {
    const response: PdfWorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred in the PDF worker',
    };
    self.postMessage(response);
  }
};
