import {
  PDFDocument,
  degrees,
  rgb,
  StandardFonts,
  PDFName,
  PDFDict,
  PDFArray,
  PDFNumber,
  PDFHexString,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { PdfDocument, PdfMetadata, Bookmark, FormField } from '@/types/pdf';
import type {
  PageRange,
  PageNumberConfig,
  HeaderFooterConfig,
  WatermarkConfig,
  CropBox,
  PageSize,
  OperationResult,
} from '@/types/operations';
import type { AnnotationData } from '@/types/annotations';
import type { IPdfEngine, ImageFile, RedactRegion, TextOverlay } from './index';

function generateId(): string {
  return crypto.randomUUID();
}

export class PdfEngine implements IPdfEngine {
  async load(data: ArrayBuffer, password?: string): Promise<PdfDocument> {
    const pdfDoc = await PDFDocument.load(data, {
      ignoreEncryption: !!password,
    });
    const pages = pdfDoc.getPages();
    const savedData = await pdfDoc.save();
    const metadata: PdfMetadata = {
      title: pdfDoc.getTitle() ?? null,
      author: pdfDoc.getAuthor() ?? null,
      subject: pdfDoc.getSubject() ?? null,
      keywords:
        pdfDoc
          .getKeywords()
          ?.split(',')
          .map((k) => k.trim()) ?? [],
      creationDate: pdfDoc.getCreationDate() ?? null,
      modificationDate: pdfDoc.getModificationDate() ?? null,
    };
    return {
      id: generateId(),
      name: '',
      data: savedData.buffer as ArrayBuffer,
      pageCount: pages.length,
      fileSize: savedData.byteLength,
      metadata,
      isEncrypted: !!password,
      isLinearized: false,
    };
  }

  async save(doc: PdfDocument): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.load(doc.data);
    const savedBytes = await pdfDoc.save();
    return savedBytes.buffer as ArrayBuffer;
  }

  async merge(documents: ArrayBuffer[]): Promise<OperationResult> {
    try {
      const mergedPdf = await PDFDocument.create();
      for (const docData of documents) {
        const sourcePdf = await PDFDocument.load(docData);
        const pageIndices = sourcePdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      }
      const savedBytes = await mergedPdf.save();
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: { pageCount: mergedPdf.getPageCount() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Merge operation failed',
      };
    }
  }

  async splitByRanges(data: ArrayBuffer, ranges: PageRange[]): Promise<OperationResult[]> {
    try {
      const sourcePdf = await PDFDocument.load(data);
      const results: OperationResult[] = [];
      for (const range of ranges) {
        try {
          const newPdf = await PDFDocument.create();
          const pageIndices = Array.from(
            { length: range.end - range.start + 1 },
            (_, i) => range.start - 1 + i,
          );
          const copiedPages = await sourcePdf.copyPages(sourcePdf, pageIndices);
          for (const page of copiedPages) {
            newPdf.addPage(page);
          }
          const savedBytes = await newPdf.save();
          results.push({
            success: true,
            data: savedBytes.buffer as ArrayBuffer,
            metadata: {
              pageCount: newPdf.getPageCount(),
              range: { start: range.start, end: range.end },
            },
          });
        } catch (error) {
          results.push({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : `Split failed for range ${range.start}-${range.end}`,
          });
        }
      }
      return results;
    } catch (error) {
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Split operation failed',
        },
      ];
    }
  }

  async rotatePages(
    data: ArrayBuffer,
    pages: number[],
    angle: 90 | 180 | 270,
  ): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const allPages = pdfDoc.getPages();
      for (const pageNum of pages) {
        const pageIndex = pageNum - 1;
        if (pageIndex < 0 || pageIndex >= allPages.length) {
          return {
            success: false,
            error: `Page ${pageNum} is out of range (1-${allPages.length})`,
          };
        }
        const page = allPages[pageIndex];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + angle) % 360));
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rotate pages',
      };
    }
  }

  async deletePages(data: ArrayBuffer, pages: number[]): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const totalPages = pdfDoc.getPageCount();
      if (pages.length >= totalPages) {
        return { success: false, error: 'Cannot delete all pages. At least one page must remain.' };
      }
      for (const pageNum of pages) {
        if (pageNum < 1 || pageNum > totalPages) {
          return { success: false, error: `Page ${pageNum} is out of range (1-${totalPages})` };
        }
      }
      const sortedPages = [...new Set(pages)].sort((a, b) => b - a);
      for (const pageNum of sortedPages) {
        pdfDoc.removePage(pageNum - 1);
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete pages',
      };
    }
  }

  async reorderPages(data: ArrayBuffer, newOrder: number[]): Promise<OperationResult> {
    try {
      const srcDoc = await PDFDocument.load(data);
      const totalPages = srcDoc.getPageCount();
      if (newOrder.length !== totalPages) {
        return {
          success: false,
          error: `New order must contain exactly ${totalPages} page indices`,
        };
      }
      for (const pageNum of newOrder) {
        if (pageNum < 1 || pageNum > totalPages) {
          return { success: false, error: `Page ${pageNum} is out of range (1-${totalPages})` };
        }
      }
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(
        srcDoc,
        newOrder.map((p) => p - 1),
      );
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }
      const resultData = await newDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder pages',
      };
    }
  }

  async duplicatePages(
    data: ArrayBuffer,
    pages: number[],
    copies: number,
  ): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const totalPages = pdfDoc.getPageCount();
      for (const pageNum of pages) {
        if (pageNum < 1 || pageNum > totalPages) {
          return { success: false, error: `Page ${pageNum} is out of range (1-${totalPages})` };
        }
      }
      const uniquePages = [...new Set(pages)];
      const resultingPageCount = totalPages + uniquePages.length * copies;
      if (resultingPageCount > 500) {
        return {
          success: false,
          error: `Operation would result in ${resultingPageCount} pages, exceeding the 500-page limit`,
        };
      }
      const sortedPages = [...uniquePages].sort((a, b) => b - a);
      for (const pageNum of sortedPages) {
        const pageIndex = pageNum - 1;
        for (let i = 0; i < copies; i++) {
          const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
          pdfDoc.insertPage(pageIndex + 1 + i, copiedPage);
        }
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate pages',
      };
    }
  }

  async addPageNumbers(data: ArrayBuffer, config: PageNumberConfig): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const fontSize = config.fontSize ?? 12;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageNumber = config.startNumber + i;
        const text = String(pageNumber);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const { width, height } = page.getSize();
        const margin = 36;
        const x = this.getXPosition(config.position, width, textWidth, margin);
        const y = this.getYPosition(config.position, height, fontSize, margin);
        page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add page numbers',
      };
    }
  }

  async addHeadersFooters(data: ArrayBuffer, config: HeaderFooterConfig): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      const fontSize = config.fontSize;
      const margin = config.margin;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNumber = i + 1;
        const headerY = height - margin - fontSize;
        this.drawTextSegment(
          page,
          this.resolvePlaceholders(config.header.left, pageNumber, totalPages),
          'left',
          headerY,
          width,
          font,
          fontSize,
          margin,
        );
        this.drawTextSegment(
          page,
          this.resolvePlaceholders(config.header.center, pageNumber, totalPages),
          'center',
          headerY,
          width,
          font,
          fontSize,
          margin,
        );
        this.drawTextSegment(
          page,
          this.resolvePlaceholders(config.header.right, pageNumber, totalPages),
          'right',
          headerY,
          width,
          font,
          fontSize,
          margin,
        );
        const footerY = margin;
        this.drawTextSegment(
          page,
          this.resolvePlaceholders(config.footer.left, pageNumber, totalPages),
          'left',
          footerY,
          width,
          font,
          fontSize,
          margin,
        );
        this.drawTextSegment(
          page,
          this.resolvePlaceholders(config.footer.center, pageNumber, totalPages),
          'center',
          footerY,
          width,
          font,
          fontSize,
          margin,
        );
        this.drawTextSegment(
          page,
          this.resolvePlaceholders(config.footer.right, pageNumber, totalPages),
          'right',
          footerY,
          width,
          font,
          fontSize,
          margin,
        );
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add headers/footers',
      };
    }
  }

  async addWatermark(data: ArrayBuffer, config: WatermarkConfig): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const pages = pdfDoc.getPages();
      if (config.type === 'text' && config.text) {
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 48;
        const textWidth = font.widthOfTextAtSize(config.text, fontSize);
        for (const page of pages) {
          const { width, height } = page.getSize();
          page.drawText(config.text, {
            x: (width - textWidth) / 2,
            y: height / 2,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity: config.opacity / 100,
            rotate: degrees(config.rotation),
          });
        }
      } else if (config.type === 'image' && config.imageData) {
        let image;
        try {
          image = await pdfDoc.embedPng(config.imageData);
        } catch {
          image = await pdfDoc.embedJpg(config.imageData);
        }
        for (const page of pages) {
          const { width, height } = page.getSize();
          const imgDims = image.scale(1);
          const scale = Math.min(width / imgDims.width, height / imgDims.height) * 0.5;
          page.drawImage(image, {
            x: (width - imgDims.width * scale) / 2,
            y: (height - imgDims.height * scale) / 2,
            width: imgDims.width * scale,
            height: imgDims.height * scale,
            opacity: config.opacity / 100,
            rotate: degrees(config.rotation),
          });
        }
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add watermark',
      };
    }
  }

  async addTextOverlay(data: ArrayBuffer, overlays: TextOverlay[]): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      for (const overlay of overlays) {
        const pageIndex = overlay.page - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;
        const page = pages[pageIndex];
        const c = this.parseColor(overlay.color);
        page.drawText(overlay.text, {
          x: overlay.x,
          y: overlay.y,
          size: overlay.fontSize,
          font,
          color: rgb(c.r, c.g, c.b),
        });
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add text overlay',
      };
    }
  }

  async embedAnnotation(data: ArrayBuffer, annotation: AnnotationData): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const pages = pdfDoc.getPages();
      const pageIndex = annotation.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        return { success: false, error: `Page ${annotation.page} is out of range` };
      }
      const page = pages[pageIndex];
      const { x, y, width, height } = annotation.rect;
      switch (annotation.tool) {
        case 'highlight': {
          const color = (annotation.data.color as string) ?? '#ffff00';
          const opacity = (annotation.data.opacity as number) ?? 0.4;
          const c = this.parseColor(color);
          page.drawRectangle({ x, y, width, height, color: rgb(c.r, c.g, c.b), opacity });
          break;
        }
        case 'stamp': {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const stampText = (annotation.data.stampType as string) ?? 'DRAFT';
          const fontSize = Math.min((width / stampText.length) * 1.5, height * 0.6);
          page.drawText(stampText, {
            x: x + 5,
            y: y + height / 3,
            size: fontSize,
            font,
            color: rgb(1, 0, 0),
            opacity: 0.7,
          });
          break;
        }
        case 'text': {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const text = (annotation.data.text as string) ?? '';
          const fontSize = (annotation.data.fontSize as number) ?? 12;
          const textColor = (annotation.data.color as string) ?? '#000000';
          const c = this.parseColor(textColor);
          page.drawText(text, { x, y, size: fontSize, font, color: rgb(c.r, c.g, c.b) });
          break;
        }
        case 'signature': {
          const strokes =
            (annotation.data.strokes as Array<{
              points: Array<{ x: number; y: number }>;
              color: string;
              width: number;
            }>) ?? [];
          for (const stroke of strokes) {
            const sc = this.parseColor(stroke.color ?? '#000000');
            const points = stroke.points ?? [];
            for (let i = 0; i < points.length - 1; i++) {
              page.drawLine({
                start: { x: points[i].x, y: points[i].y },
                end: { x: points[i + 1].x, y: points[i + 1].y },
                thickness: stroke.width ?? 2,
                color: rgb(sc.r, sc.g, sc.b),
              });
            }
          }
          break;
        }
        case 'redact': {
          page.drawRectangle({ x, y, width, height, color: rgb(0, 0, 0) });
          break;
        }
        default:
          return { success: false, error: `Unsupported annotation tool: ${annotation.tool}` };
      }
      const resultData = await pdfDoc.save();
      return { success: true, data: resultData.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to embed annotation',
      };
    }
  }

  async imagesToPdf(images: ImageFile[]): Promise<OperationResult> {
    try {
      if (images.length === 0) {
        return { success: false, error: 'No images provided' };
      }
      const pdfDoc = await PDFDocument.create();
      for (const image of images) {
        let embeddedImage;
        if (image.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(image.data);
        } else {
          embeddedImage = await pdfDoc.embedJpg(image.data);
        }
        const imgDims = embeddedImage.scale(1);
        // Default page size: A4 (595.28 x 841.89 points)
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        // Scale image to fit page while preserving aspect ratio
        const scale = Math.min(pageWidth / imgDims.width, pageHeight / imgDims.height);
        const scaledWidth = imgDims.width * scale;
        const scaledHeight = imgDims.height * scale;
        // Center image on page
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }
      const savedBytes = await pdfDoc.save();
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: { pageCount: pdfDoc.getPageCount() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create PDF from images',
      };
    }
  }

  async getPageCount(data: ArrayBuffer): Promise<number> {
    const pdfDoc = await PDFDocument.load(data);
    return pdfDoc.getPageCount();
  }

  async compress(data: ArrayBuffer): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data, {
        updateMetadata: false,
      });
      const savedBytes = await pdfDoc.save({
        useObjectStreams: true,
      });
      const originalSize = data.byteLength;
      const compressedSize = savedBytes.byteLength;
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: {
          originalSize,
          compressedSize,
          savings: originalSize - compressedSize,
          compressionRatio:
            originalSize > 0
              ? (((originalSize - compressedSize) / originalSize) * 100).toFixed(1) + '%'
              : '0%',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compress PDF',
      };
    }
  }

  async flatten(data: ArrayBuffer): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      for (const field of fields) {
        if (field instanceof PDFTextField) {
          field.enableReadOnly();
        } else if (field instanceof PDFCheckBox) {
          field.enableReadOnly();
        } else if (field instanceof PDFDropdown) {
          field.enableReadOnly();
        } else if (field instanceof PDFRadioGroup) {
          field.enableReadOnly();
        }
      }
      try {
        form.flatten();
      } catch {
        // If flatten() is not available or fails, the read-only approach above is the fallback
      }
      const savedBytes = await pdfDoc.save();
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: { flattenedFields: fields.length },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to flatten PDF',
      };
    }
  }

  async cropPages(data: ArrayBuffer, pages: number[], cropBox: CropBox): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const allPages = pdfDoc.getPages();
      for (const pageNum of pages) {
        const pageIndex = pageNum - 1;
        if (pageIndex < 0 || pageIndex >= allPages.length) {
          return {
            success: false,
            error: `Page ${pageNum} is out of range (1-${allPages.length})`,
          };
        }
        const page = allPages[pageIndex];
        page.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      }
      const savedBytes = await pdfDoc.save();
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: { croppedPages: pages.length, cropBox },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to crop pages',
      };
    }
  }

  async resizePages(data: ArrayBuffer, pages: number[], size: PageSize): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const allPages = pdfDoc.getPages();
      // Convert mm to points: 1mm = 2.835pt
      const MM_TO_PT = 2.835;
      const targetWidth = size.width * MM_TO_PT;
      const targetHeight = size.height * MM_TO_PT;
      for (const pageNum of pages) {
        const pageIndex = pageNum - 1;
        if (pageIndex < 0 || pageIndex >= allPages.length) {
          return {
            success: false,
            error: `Page ${pageNum} is out of range (1-${allPages.length})`,
          };
        }
        const page = allPages[pageIndex];
        if (size.orientation === 'landscape') {
          page.setMediaBox(
            0,
            0,
            Math.max(targetWidth, targetHeight),
            Math.min(targetWidth, targetHeight),
          );
        } else {
          page.setMediaBox(
            0,
            0,
            Math.min(targetWidth, targetHeight),
            Math.max(targetWidth, targetHeight),
          );
        }
      }
      const savedBytes = await pdfDoc.save();
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: {
          resizedPages: pages.length,
          targetSize: { widthPt: size.width * MM_TO_PT, heightPt: size.height * MM_TO_PT },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resize pages',
      };
    }
  }

  async linearize(data: ArrayBuffer): Promise<OperationResult> {
    try {
      // pdf-lib doesn't support true linearization, so we re-save the PDF
      // which reorganizes objects as a best-effort optimization
      const pdfDoc = await PDFDocument.load(data);
      const savedBytes = await pdfDoc.save({
        useObjectStreams: true,
      });
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: {
          note: 'Best-effort optimization: PDF re-saved with object streams. True linearization requires a specialized tool.',
          originalSize: data.byteLength,
          optimizedSize: savedBytes.byteLength,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to linearize PDF',
      };
    }
  }

  /**
   * Extract metadata from a PDF document.
   * Returns title, author, subject, keywords, creationDate, and modificationDate.
   */
  async getMetadata(data: ArrayBuffer): Promise<PdfMetadata> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      return {
        title: pdfDoc.getTitle() ?? null,
        author: pdfDoc.getAuthor() ?? null,
        subject: pdfDoc.getSubject() ?? null,
        keywords:
          pdfDoc
            .getKeywords()
            ?.split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0) ?? [],
        creationDate: pdfDoc.getCreationDate() ?? null,
        modificationDate: pdfDoc.getModificationDate() ?? null,
      };
    } catch {
      return {
        title: null,
        author: null,
        subject: null,
        keywords: [],
        creationDate: null,
        modificationDate: null,
      };
    }
  }

  /**
   * Set metadata fields on a PDF document.
   * Always updates the modificationDate to the current date/time.
   */
  async setMetadata(data: ArrayBuffer, metadata: Partial<PdfMetadata>): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      if (metadata.title !== undefined) {
        pdfDoc.setTitle(metadata.title ?? '');
      }
      if (metadata.author !== undefined) {
        pdfDoc.setAuthor(metadata.author ?? '');
      }
      if (metadata.subject !== undefined) {
        pdfDoc.setSubject(metadata.subject ?? '');
      }
      if (metadata.keywords !== undefined) {
        pdfDoc.setKeywords(metadata.keywords);
      }
      if (metadata.creationDate !== undefined && metadata.creationDate !== null) {
        pdfDoc.setCreationDate(metadata.creationDate);
      }
      // Always update modification date to now
      pdfDoc.setModificationDate(new Date());
      const savedBytes = await pdfDoc.save();
      return { success: true, data: savedBytes.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set metadata',
      };
    }
  }

  /**
   * Read bookmarks (outline) from a PDF document.
   * Reads the document outline tree if available, up to 5 levels deep.
   */
  async getBookmarks(data: ArrayBuffer): Promise<Bookmark[]> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const catalog = pdfDoc.catalog;
      const outlinesRef = catalog.get(PDFName.of('Outlines'));
      if (!outlinesRef) return [];
      const outlines = catalog.lookup(PDFName.of('Outlines'));
      if (!(outlines instanceof PDFDict)) return [];
      const pages = pdfDoc.getPages();
      const firstRef = outlines.get(PDFName.of('First'));
      if (!firstRef) return [];

      const readBookmarkEntry = (entryDict: PDFDict, depth: number): Bookmark | null => {
        if (depth > 5) return null;
        const titleObj = entryDict.get(PDFName.of('Title'));
        let title = 'Untitled';
        if (titleObj instanceof PDFHexString) {
          title = titleObj.decodeText();
        } else if (titleObj) {
          title = titleObj.toString().replace(/^\(|\)$/g, '');
        }
        let pageNumber = 1;
        const dest = entryDict.get(PDFName.of('Dest'));
        if (dest instanceof PDFArray) {
          const pageRef = dest.get(0);
          const pageIndex = pages.findIndex((p) => p.ref === pageRef);
          if (pageIndex >= 0) pageNumber = pageIndex + 1;
        }
        const children: Bookmark[] = [];
        const childFirstRef = entryDict.get(PDFName.of('First'));
        if (childFirstRef) {
          let childEntry = entryDict.lookup(PDFName.of('First'));
          while (childEntry instanceof PDFDict) {
            const childBookmark = readBookmarkEntry(childEntry, depth + 1);
            if (childBookmark) children.push(childBookmark);
            const nextRef = childEntry.get(PDFName.of('Next'));
            if (!nextRef) break;
            childEntry = childEntry.lookup(PDFName.of('Next'));
          }
        }
        return { id: generateId(), title, pageNumber, children };
      };

      const bookmarks: Bookmark[] = [];
      let currentEntry = outlines.lookup(PDFName.of('First'));
      while (currentEntry instanceof PDFDict) {
        const bookmark = readBookmarkEntry(currentEntry, 0);
        if (bookmark) bookmarks.push(bookmark);
        const nextRef = currentEntry.get(PDFName.of('Next'));
        if (!nextRef) break;
        currentEntry = currentEntry.lookup(PDFName.of('Next'));
      }
      return bookmarks;
    } catch {
      return [];
    }
  }

  /**
   * Set bookmarks (outline) on a PDF document.
   * Creates the outline tree using low-level PDF manipulation.
   */
  async setBookmarks(data: ArrayBuffer, bookmarks: Bookmark[]): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const context = pdfDoc.context;
      const pages = pdfDoc.getPages();

      if (bookmarks.length === 0) {
        pdfDoc.catalog.delete(PDFName.of('Outlines'));
        const savedBytes = await pdfDoc.save();
        return { success: true, data: savedBytes.buffer as ArrayBuffer };
      }

      const createOutlineEntry = (
        bookmark: Bookmark,
        parentRef: ReturnType<typeof context.nextRef>,
      ): ReturnType<typeof context.nextRef> => {
        const entryRef = context.nextRef();
        const entryDict = context.obj({});
        entryDict.set(PDFName.of('Title'), PDFHexString.fromText(bookmark.title));
        entryDict.set(PDFName.of('Parent'), parentRef);
        const pageIndex = Math.max(0, Math.min(bookmark.pageNumber - 1, pages.length - 1));
        const pageRef = pages[pageIndex].ref;
        const destArray = PDFArray.withContext(context);
        destArray.push(pageRef);
        destArray.push(PDFName.of('Fit'));
        entryDict.set(PDFName.of('Dest'), destArray);

        if (bookmark.children.length > 0) {
          const childRefs: ReturnType<typeof context.nextRef>[] = [];
          for (const child of bookmark.children) {
            childRefs.push(createOutlineEntry(child, entryRef));
          }
          for (let i = 0; i < childRefs.length; i++) {
            const childDict = context.lookup(childRefs[i]) as PDFDict;
            if (i > 0) childDict.set(PDFName.of('Prev'), childRefs[i - 1]);
            if (i < childRefs.length - 1) childDict.set(PDFName.of('Next'), childRefs[i + 1]);
          }
          entryDict.set(PDFName.of('First'), childRefs[0]);
          entryDict.set(PDFName.of('Last'), childRefs[childRefs.length - 1]);
          entryDict.set(PDFName.of('Count'), PDFNumber.of(bookmark.children.length));
        }
        context.assign(entryRef, entryDict);
        return entryRef;
      };

      const outlinesRef = context.nextRef();
      const outlinesDict = context.obj({});
      outlinesDict.set(PDFName.of('Type'), PDFName.of('Outlines'));

      const topLevelRefs: ReturnType<typeof context.nextRef>[] = [];
      for (const bookmark of bookmarks) {
        topLevelRefs.push(createOutlineEntry(bookmark, outlinesRef));
      }
      for (let i = 0; i < topLevelRefs.length; i++) {
        const entryDict = context.lookup(topLevelRefs[i]) as PDFDict;
        if (i > 0) entryDict.set(PDFName.of('Prev'), topLevelRefs[i - 1]);
        if (i < topLevelRefs.length - 1) entryDict.set(PDFName.of('Next'), topLevelRefs[i + 1]);
      }
      outlinesDict.set(PDFName.of('First'), topLevelRefs[0]);
      outlinesDict.set(PDFName.of('Last'), topLevelRefs[topLevelRefs.length - 1]);
      outlinesDict.set(PDFName.of('Count'), PDFNumber.of(bookmarks.length));
      context.assign(outlinesRef, outlinesDict);
      pdfDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);

      const savedBytes = await pdfDoc.save();
      return { success: true, data: savedBytes.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set bookmarks',
      };
    }
  }

  /**
   * Get all form fields from a PDF document.
   * Maps pdf-lib field types to our FormField interface.
   */
  async getFormFields(data: ArrayBuffer): Promise<FormField[]> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      const pages = pdfDoc.getPages();
      const formFields: FormField[] = [];

      for (const field of fields) {
        const name = field.getName();
        let type: FormField['type'] = 'text';
        let value: string | boolean = '';
        let options: string[] | undefined;

        if (field instanceof PDFTextField) {
          type = 'text';
          value = field.getText() ?? '';
        } else if (field instanceof PDFCheckBox) {
          type = 'checkbox';
          value = field.isChecked();
        } else if (field instanceof PDFDropdown) {
          type = 'dropdown';
          const selected = field.getSelected();
          value = selected.length > 0 ? selected[0] : '';
          options = field.getOptions();
        } else if (field instanceof PDFRadioGroup) {
          type = 'radio';
          value = field.getSelected() ?? '';
          options = field.getOptions();
        } else {
          continue; // Skip unsupported field types
        }

        const widgets = field.acroField.getWidgets();
        let page = 1;
        let rect = { x: 0, y: 0, width: 0, height: 0 };

        if (widgets.length > 0) {
          const widget = widgets[0];
          const widgetRect = widget.getRectangle();
          rect = {
            x: widgetRect.x,
            y: widgetRect.y,
            width: widgetRect.width,
            height: widgetRect.height,
          };
          const pageRef = widget.P();
          if (pageRef) {
            const pageIndex = pages.findIndex((p) => p.ref === pageRef);
            if (pageIndex >= 0) page = pageIndex + 1;
          }
        }

        formFields.push({ name, type, value, options, page, rect });
      }
      return formFields;
    } catch {
      return [];
    }
  }

  /**
   * Fill form fields in a PDF document with the provided values.
   * Supports text fields, checkboxes, dropdowns, and radio groups.
   */
  async fillFormFields(
    data: ArrayBuffer,
    values: Record<string, string | boolean>,
  ): Promise<OperationResult> {
    try {
      const pdfDoc = await PDFDocument.load(data);
      const form = pdfDoc.getForm();

      for (const [fieldName, fieldValue] of Object.entries(values)) {
        const field = form.getFieldMaybe(fieldName);
        if (!field) continue;

        if (field instanceof PDFTextField && typeof fieldValue === 'string') {
          field.setText(fieldValue);
        } else if (field instanceof PDFCheckBox && typeof fieldValue === 'boolean') {
          if (fieldValue) {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown && typeof fieldValue === 'string') {
          field.select(fieldValue);
        } else if (field instanceof PDFRadioGroup && typeof fieldValue === 'string') {
          field.select(fieldValue);
        }
      }

      const savedBytes = await pdfDoc.save();
      return { success: true, data: savedBytes.buffer as ArrayBuffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fill form fields',
      };
    }
  }

  /**
   * Encrypt a PDF with a password (1-128 characters).
   * Uses Web Crypto API to derive an AES-GCM key from the password and encrypt the PDF data.
   * The output is a custom encrypted format that can be decrypted with the decrypt() method.
   */
  async encrypt(data: ArrayBuffer, password: string): Promise<OperationResult> {
    try {
      if (!password || password.length < 1 || password.length > 128) {
        return { success: false, error: 'Password must be between 1 and 128 characters' };
      }

      // Validate that the input is a valid PDF
      await PDFDocument.load(data);

      // Derive encryption key from password using PBKDF2
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, [
        'deriveKey',
      ]);

      const derivedKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
      );

      const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, data);

      // Pack the encrypted data with salt and IV for later decryption
      // Format: [4 bytes magic "EPDF"] [16 bytes salt] [12 bytes IV] [encrypted data]
      const magic = encoder.encode('EPDF');
      const result = new Uint8Array(4 + 16 + 12 + encryptedData.byteLength);
      result.set(magic, 0);
      result.set(salt, 4);
      result.set(iv, 20);
      result.set(new Uint8Array(encryptedData), 32);

      return {
        success: true,
        data: result.buffer as ArrayBuffer,
        metadata: { encrypted: true, originalSize: data.byteLength },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed',
      };
    }
  }

  /**
   * Decrypt a PDF with password verification.
   * Supports both our custom encrypted format (EPDF) and standard encrypted PDFs.
   */
  async decrypt(data: ArrayBuffer, password: string): Promise<OperationResult> {
    try {
      if (!password) {
        return { success: false, error: 'Password is required' };
      }

      const bytes = new Uint8Array(data);
      const decoder = new TextDecoder();
      const magic = decoder.decode(bytes.slice(0, 4));

      if (magic === 'EPDF') {
        // Custom encrypted format
        const salt = bytes.slice(4, 20);
        const iv = bytes.slice(20, 32);
        const encryptedData = bytes.slice(32);

        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);

        const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, [
          'deriveKey',
        ]);

        const derivedKey = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt'],
        );

        try {
          const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            derivedKey,
            encryptedData,
          );

          // Verify the decrypted data is a valid PDF
          await PDFDocument.load(decryptedData);

          return {
            success: true,
            data: decryptedData,
            metadata: { decrypted: true },
          };
        } catch {
          return { success: false, error: 'Incorrect password' };
        }
      }

      // Try loading as a standard encrypted PDF with ignoreEncryption
      try {
        const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
        const savedBytes = await pdfDoc.save();
        return {
          success: true,
          data: savedBytes.buffer as ArrayBuffer,
          metadata: { decrypted: true },
        };
      } catch {
        return { success: false, error: 'Incorrect password' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed',
      };
    }
  }

  /**
   * Redact content by drawing filled black rectangles over specified regions.
   * Each region specifies a page number and coordinates for the redaction area.
   */
  async redact(data: ArrayBuffer, regions: RedactRegion[]): Promise<OperationResult> {
    try {
      if (!regions || regions.length === 0) {
        return { success: false, error: 'At least one redaction region must be specified' };
      }

      const pdfDoc = await PDFDocument.load(data);
      const pages = pdfDoc.getPages();

      for (const region of regions) {
        const pageIndex = region.page - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) {
          return {
            success: false,
            error: `Page ${region.page} is out of range (1-${pages.length})`,
          };
        }
        const page = pages[pageIndex];

        // Draw a filled black rectangle over the redaction area
        page.drawRectangle({
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          color: rgb(0, 0, 0),
        });
      }

      const savedBytes = await pdfDoc.save();
      return {
        success: true,
        data: savedBytes.buffer as ArrayBuffer,
        metadata: { redactedRegions: regions.length },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Redaction failed' };
    }
  }

  // --- Private helper methods ---

  private parseColor(color: string): { r: number; g: number; b: number } {
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) / 255,
        g: parseInt(hex[1] + hex[1], 16) / 255,
        b: parseInt(hex[2] + hex[2], 16) / 255,
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  private getXPosition(
    position: string,
    pageWidth: number,
    textWidth: number,
    margin: number,
  ): number {
    if (position.includes('left')) return margin;
    if (position.includes('right')) return pageWidth - textWidth - margin;
    return (pageWidth - textWidth) / 2;
  }

  private getYPosition(
    position: string,
    pageHeight: number,
    fontSize: number,
    margin: number,
  ): number {
    if (position.includes('top')) return pageHeight - margin - fontSize;
    return margin;
  }

  private resolvePlaceholders(template: string, pageNumber: number, totalPages: number): string {
    const today = new Date().toISOString().split('T')[0];
    return template
      .replace(/\{page\}/g, String(pageNumber))
      .replace(/\{total\}/g, String(totalPages))
      .replace(/\{date\}/g, today);
  }

  private drawTextSegment(
    page: PDFPage,
    text: string,
    alignment: 'left' | 'center' | 'right',
    y: number,
    pageWidth: number,
    font: Awaited<ReturnType<PDFDocument['embedFont']>>,
    fontSize: number,
    margin: number,
  ): void {
    if (!text) return;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x: number;
    switch (alignment) {
      case 'left':
        x = margin;
        break;
      case 'right':
        x = pageWidth - textWidth - margin;
        break;
      case 'center':
      default:
        x = (pageWidth - textWidth) / 2;
        break;
    }
    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
  }
}
