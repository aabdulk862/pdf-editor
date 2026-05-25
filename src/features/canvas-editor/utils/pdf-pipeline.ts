import * as pdfjsLib from 'pdfjs-dist';

import type { CanvasPage, ImageElement } from '../types';
import { pdfExportEngine } from '../export/pdf-export';

// Configure the worker source for pdfjs-dist (same as core render engine)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * PDF Pipeline Integration
 *
 * Provides two flows:
 * 1. "Insert into PDF" — exports the current canvas page as a PDF blob and
 *    navigates to the merge tool with the rendered PDF pre-loaded.
 * 2. "Open PDF page in canvas" — renders a PDF page to a canvas element,
 *    converts it to a PNG data URL, and creates a locked ImageElement as a
 *    background layer (z-index 0).
 */

// ─── Shared Transfer Store ──────────────────────────────────────────────────
// A simple in-memory store for passing the rendered PDF blob to the merge page.
// This avoids URL size limits and keeps the transfer client-side.

let pendingMergePdf: File | null = null;

/**
 * Store a PDF file to be picked up by the merge page after navigation.
 */
export function setPendingMergePdf(file: File): void {
  pendingMergePdf = file;
}

/**
 * Retrieve and clear the pending PDF file for the merge page.
 * Returns null if no file is pending.
 */
export function consumePendingMergePdf(): File | null {
  const file = pendingMergePdf;
  pendingMergePdf = null;
  return file;
}

// ─── Insert into PDF Flow ───────────────────────────────────────────────────

export interface InsertIntoPdfOptions {
  /** The canvas page to export as PDF */
  page: CanvasPage;
  /** Navigation function (e.g., from react-router's useNavigate) */
  navigate: (path: string) => void;
}

/**
 * Export the current canvas page as a PDF blob and navigate to the merge tool
 * with the rendered PDF pre-loaded.
 *
 * @throws Error if PDF export fails
 */
export async function insertIntoPdf({ page, navigate }: InsertIntoPdfOptions): Promise<void> {
  // Render the current page as a PDF blob using the existing export engine
  const pdfBlob = await pdfExportEngine.exportPage(page);

  // Create a File object from the blob for the merge tool
  const fileName = `canvas-page-${Date.now()}.pdf`;
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  // Store the file for the merge page to pick up
  setPendingMergePdf(pdfFile);

  // Navigate to the merge tool
  navigate('/merge');
}

// ─── Open PDF Page in Canvas Flow ───────────────────────────────────────────

export interface OpenPdfInCanvasResult {
  /** The locked ImageElement representing the PDF page background */
  backgroundElement: ImageElement;
  /** The page width in mm (derived from PDF page dimensions) */
  pageWidth: number;
  /** The page height in mm (derived from PDF page dimensions) */
  pageHeight: number;
}

// Conversion: 1 PDF point = 1/72 inch = 25.4/72 mm
const PT_TO_MM = 25.4 / 72;

/**
 * Render a PDF page to a PNG data URL and create a locked ImageElement
 * suitable for use as a background layer in the canvas editor.
 *
 * @param pdfData - The PDF file data as ArrayBuffer
 * @param pageNumber - 1-based page number to render (default: 1)
 * @param scale - Render scale for quality (default: 2 for retina)
 * @returns The background ImageElement and page dimensions
 * @throws Error if the PDF is corrupted or unsupported
 */
export async function openPdfPageInCanvas(
  pdfData: ArrayBuffer,
  pageNumber: number = 1,
  scale: number = 2,
): Promise<OpenPdfInCanvasResult> {
  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

  try {
    // Load the PDF document
    pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfData) }).promise;

    // Validate page number
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
      throw new Error(`Page ${pageNumber} does not exist. The PDF has ${pdfDoc.numPages} page(s).`);
    }

    // Get the requested page
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create an off-screen canvas and render the PDF page
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create canvas 2D context for PDF rendering.');
    }

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Convert the rendered canvas to a PNG data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Calculate page dimensions in mm from the PDF's native point dimensions
    const nativeViewport = page.getViewport({ scale: 1 });
    const pageWidth = nativeViewport.width * PT_TO_MM;
    const pageHeight = nativeViewport.height * PT_TO_MM;

    // Create a locked ImageElement as the background layer
    const backgroundElement: ImageElement = {
      id: `pdf-bg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'image',
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      rotation: 0,
      opacity: 100,
      zIndex: 0,
      locked: true,
      visible: true,
      src: dataUrl,
      originalWidth: viewport.width,
      originalHeight: viewport.height,
      aspectRatioLocked: true,
    };

    return {
      backgroundElement,
      pageWidth,
      pageHeight,
    };
  } catch (error) {
    // Re-throw with a user-friendly message for corrupted/unsupported PDFs
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (
      message.includes('Invalid PDF') ||
      message.includes('Missing PDF') ||
      message.includes('password') ||
      message.includes('XRef') ||
      message.includes('stream')
    ) {
      throw new Error(
        `The PDF page could not be loaded. The file may be corrupted or use unsupported features. (${message})`,
      );
    }

    throw new Error(`Failed to render PDF page: ${message}`);
  } finally {
    // Clean up the PDF document
    if (pdfDoc) {
      pdfDoc.destroy();
    }
  }
}
