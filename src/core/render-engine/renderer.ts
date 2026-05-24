import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { IRenderEngine, RenderableDocument, RenderablePage, ExtractedImage } from './index';

// Configure the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/**
 * Internal wrapper around a pdfjs-dist PDFPageProxy that implements RenderablePage.
 */
class PdfjsRenderablePage implements RenderablePage {
  private page: PDFPageProxy;
  width: number;
  height: number;

  constructor(page: PDFPageProxy) {
    this.page = page;
    const viewport = page.getViewport({ scale: 1 });
    this.width = viewport.width;
    this.height = viewport.height;
  }

  async render(canvas: HTMLCanvasElement, scale: number): Promise<void> {
    const viewport = this.page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D canvas context');
    }

    await this.page.render({
      canvasContext: context,
      viewport,
    }).promise;
  }
}

/**
 * Internal wrapper around a pdfjs-dist PDFDocumentProxy that implements RenderableDocument.
 */
class PdfjsRenderableDocument implements RenderableDocument {
  id: string;
  pageCount: number;
  private pdfDoc: PDFDocumentProxy;

  constructor(pdfDoc: PDFDocumentProxy, id: string) {
    this.pdfDoc = pdfDoc;
    this.id = id;
    this.pageCount = pdfDoc.numPages;
  }

  async getPage(num: number): Promise<RenderablePage> {
    if (num < 1 || num > this.pageCount) {
      throw new Error(`Page number ${num} is out of range (1-${this.pageCount})`);
    }
    const page = await this.pdfDoc.getPage(num);
    return new PdfjsRenderablePage(page);
  }

  /** Expose the underlying PDFDocumentProxy for internal use (text/image extraction). */
  getPdfDoc(): PDFDocumentProxy {
    return this.pdfDoc;
  }
}

/**
 * Generates a unique ID for documents.
 */
function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Render engine implementation using pdfjs-dist.
 * Provides PDF rendering, text extraction, image extraction, and page comparison.
 */
export class PdfjsRenderEngine implements IRenderEngine {
  async loadDocument(data: ArrayBuffer): Promise<RenderableDocument> {
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
    return new PdfjsRenderableDocument(pdfDoc, generateId());
  }

  async renderPage(
    doc: RenderableDocument,
    pageNum: number,
    scale: number,
  ): Promise<HTMLCanvasElement> {
    const page = await doc.getPage(pageNum);
    const canvas = document.createElement('canvas');
    await page.render(canvas, scale);
    return canvas;
  }

  async renderThumbnail(
    doc: RenderableDocument,
    pageNum: number,
    width: number,
  ): Promise<HTMLCanvasElement> {
    // Ensure minimum 150px width for thumbnails
    const thumbnailWidth = Math.max(width, 150);

    const page = await doc.getPage(pageNum);
    const scale = thumbnailWidth / page.width;
    const canvas = document.createElement('canvas');
    await page.render(canvas, scale);
    return canvas;
  }

  async extractText(doc: RenderableDocument, pageNum?: number): Promise<string> {
    const pdfjsDoc = doc as PdfjsRenderableDocument;
    const pdfDoc = pdfjsDoc.getPdfDoc();

    if (pageNum !== undefined) {
      return this.extractPageText(pdfDoc, pageNum);
    }

    // Extract text from all pages with page delimiters
    const texts: string[] = [];
    for (let i = 1; i <= doc.pageCount; i++) {
      const pageText = await this.extractPageText(pdfDoc, i);
      texts.push(pageText);
    }

    return texts.join('\n\n--- Page Break ---\n\n');
  }

  /**
   * Extract text from a single page, preserving reading order and paragraph separation.
   */
  private async extractPageText(pdfDoc: PDFDocumentProxy, pageNum: number): Promise<string> {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    if (textContent.items.length === 0) {
      return '';
    }

    // Group text items into lines based on Y position (reading order)
    const lines: { y: number; items: { x: number; str: string }[] }[] = [];
    const LINE_THRESHOLD = 3; // pixels tolerance for same-line grouping

    for (const item of textContent.items) {
      if (!('str' in item) || item.str === '') continue;

      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];

      // Find existing line with similar Y position
      let existingLine = lines.find((line) => Math.abs(line.y - y) < LINE_THRESHOLD);

      if (!existingLine) {
        existingLine = { y, items: [] };
        lines.push(existingLine);
      }

      existingLine.items.push({ x, str: item.str });
    }

    // Sort lines by Y position (top to bottom, PDF coordinates are bottom-up)
    lines.sort((a, b) => b.y - a.y);

    // Sort items within each line by X position (left to right)
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
    }

    // Build text with paragraph separation based on vertical gaps
    const result: string[] = [];
    const PARAGRAPH_GAP_THRESHOLD = 15; // pixels gap to consider a new paragraph

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].items.map((item) => item.str).join('');

      if (i > 0) {
        const gap = lines[i - 1].y - lines[i].y;
        if (gap > PARAGRAPH_GAP_THRESHOLD) {
          result.push(''); // Empty line for paragraph separation
        }
      }

      result.push(lineText);
    }

    return result.join('\n');
  }

  async extractImages(doc: RenderableDocument): Promise<ExtractedImage[]> {
    const pdfjsDoc = doc as PdfjsRenderableDocument;
    const pdfDoc = pdfjsDoc.getPdfDoc();
    const images: ExtractedImage[] = [];

    for (let i = 1; i <= doc.pageCount; i++) {
      const page = await pdfDoc.getPage(i);
      const operatorList = await page.getOperatorList();

      for (let j = 0; j < operatorList.fnArray.length; j++) {
        const fn = operatorList.fnArray[j];

        // Check for image painting operations
        if (
          fn === pdfjsLib.OPS.paintImageXObject ||
          fn === pdfjsLib.OPS.paintInlineImageXObject ||
          fn === pdfjsLib.OPS.paintXObject
        ) {
          const imgName = operatorList.argsArray[j][0] as string;

          try {
            const imgData = await this.getPageImage(page, imgName);
            if (imgData) {
              images.push(imgData);
            }
          } catch {
            // Skip images that can't be extracted
          }
        }
      }
    }

    return images;
  }

  /**
   * Extract a single image from a page by its object name.
   */
  private async getPageImage(page: PDFPageProxy, imgName: string): Promise<ExtractedImage | null> {
    try {
      const objs = page.objs;
      const imgData = objs.get(imgName) as {
        width: number;
        height: number;
        data: Uint8ClampedArray;
        kind?: number;
      } | null;

      if (!imgData || !imgData.data) {
        return null;
      }

      const width = imgData.width;
      const height = imgData.height;

      // Render image data to a canvas to get PNG bytes
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const imageData = ctx.createImageData(width, height);

      // pdfjs image data may be RGB (3 channels) or RGBA (4 channels)
      if (imgData.data.length === width * height * 4) {
        imageData.data.set(imgData.data);
      } else if (imgData.data.length === width * height * 3) {
        // Convert RGB to RGBA
        for (let i = 0, j = 0; i < imgData.data.length; i += 3, j += 4) {
          imageData.data[j] = imgData.data[i];
          imageData.data[j + 1] = imgData.data[i + 1];
          imageData.data[j + 2] = imgData.data[i + 2];
          imageData.data[j + 3] = 255;
        }
      } else {
        return null;
      }

      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to PNG blob
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

      if (!blob) return null;

      const arrayBuffer = await blob.arrayBuffer();

      return {
        data: arrayBuffer,
        format: 'png',
        width,
        height,
        size: arrayBuffer.byteLength,
      };
    } catch {
      return null;
    }
  }

  getPageCount(doc: RenderableDocument): number {
    return doc.pageCount;
  }

  async comparePages(
    doc1: RenderableDocument,
    doc2: RenderableDocument,
    pageNum: number,
  ): Promise<boolean> {
    // Render both pages at scale 1 and compare pixel data
    const canvas1 = await this.renderPage(doc1, pageNum, 1);
    const canvas2 = await this.renderPage(doc2, pageNum, 1);

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');

    if (!ctx1 || !ctx2) {
      throw new Error('Failed to get canvas context for comparison');
    }

    // If dimensions differ, pages are different
    if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
      return false;
    }

    const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
    const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);

    const data1 = imageData1.data;
    const data2 = imageData2.data;

    // Compare pixel data with a small tolerance for rendering differences
    const TOLERANCE = 5;
    const totalPixels = data1.length / 4;
    let differentPixels = 0;
    const DIFF_THRESHOLD = 0.01; // 1% of pixels can differ due to rendering artifacts

    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);

      if (rDiff > TOLERANCE || gDiff > TOLERANCE || bDiff > TOLERANCE) {
        differentPixels++;
      }
    }

    // Pages are considered the same if less than 1% of pixels differ
    return differentPixels / totalPixels < DIFF_THRESHOLD;
  }
}
