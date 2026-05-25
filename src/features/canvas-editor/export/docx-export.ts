import {
  Document,
  Packer,
  Paragraph,
  TextRun as DocxTextRun,
  ImageRun,
  AlignmentType,
  convertMillimetersToTwip,
  UnderlineType,
} from 'docx';
import type { ISectionOptions } from 'docx';
import type {
  CanvasDocument,
  CanvasPage,
  CanvasElement,
  TextElement,
  ImageElement,
  ShapeElement,
  GroupElement,
  ExportOptions,
} from '../types';
import { renderElement } from '../engine/renderer';
import type { Viewport } from '../types';

// === Constants ===

/** DPI used for rasterizing shapes that can't be natively represented in DOCX */
const SHAPE_RASTERIZE_DPI = 150;

/** Millimeters per inch */
const MM_PER_INCH = 25.4;

// === Types ===

export interface DocxExportOptions {
  /** Reserved for future options */
}

export interface DocxExportEngine {
  exportPage(page: CanvasPage, options?: Partial<ExportOptions>): Promise<Blob>;
  exportDocument(document: CanvasDocument, options?: Partial<ExportOptions>): Promise<Blob>;
}

// === Utility Functions ===

/**
 * Convert a hex color string to a 6-character hex string (without #).
 * Handles 3-char (#RGB), 6-char (#RRGGBB), and 8-char (#RRGGBBAA) formats.
 */
function hexToDocxColor(hex: string): string {
  let cleanHex = hex.replace('#', '');

  // Strip alpha channel if present
  if (cleanHex.length === 8) {
    cleanHex = cleanHex.slice(0, 6);
  }

  // Expand 3-char shorthand
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  return cleanHex.toUpperCase();
}

/**
 * Map TextAlignment to docx AlignmentType.
 */
function mapAlignment(
  alignment: TextElement['alignment'],
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (alignment) {
    case 'left':
      return AlignmentType.LEFT;
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

/**
 * Convert font size in points to half-points (docx uses half-points).
 */
function ptToHalfPoints(pt: number): number {
  return Math.round(pt * 2);
}

/**
 * Fetch image data from a src string (data URI or object URL).
 * Returns a Uint8Array of the image bytes.
 */
async function fetchImageBytes(src: string): Promise<Uint8Array | null> {
  try {
    if (src.startsWith('data:')) {
      // Data URI - extract base64 content
      const base64 = src.split(',')[1];
      if (!base64) return null;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      // Object URL or regular URL - fetch it
      const response = await fetch(src);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  } catch {
    return null;
  }
}

/**
 * Rasterize a shape element at 150 DPI using an off-screen canvas.
 * Returns the PNG image bytes.
 */
async function rasterizeShape(element: ShapeElement): Promise<Uint8Array | null> {
  try {
    // Calculate pixel dimensions at 150 DPI
    const pixelWidth = Math.max(1, Math.round((element.width / MM_PER_INCH) * SHAPE_RASTERIZE_DPI));
    const pixelHeight = Math.max(
      1,
      Math.round((element.height / MM_PER_INCH) * SHAPE_RASTERIZE_DPI),
    );

    const offscreen = new OffscreenCanvas(pixelWidth, pixelHeight);
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    // Create a viewport that maps the element's dimensions to the pixel dimensions
    // The element is rendered at position (0, 0) in a local coordinate system
    const scale = pixelWidth / element.width;

    // Create a temporary element positioned at origin for rendering
    const localElement: ShapeElement = {
      ...element,
      x: 0,
      y: 0,
      rotation: 0, // Rotation is handled by the element's position in the document
    };

    const exportViewport: Viewport = {
      panX: 0,
      panY: 0,
      zoom: scale,
    };

    // Clear with transparent background
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    // Render the shape using the existing renderer
    renderElement(ctx as unknown as CanvasRenderingContext2D, localElement, exportViewport);

    // Convert to PNG blob then to Uint8Array
    const blob = await offscreen.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to rasterize shape element ${element.id}:`, error);
    return null;
  }
}

/**
 * Rasterize a group element at 150 DPI using an off-screen canvas.
 * Returns the PNG image bytes.
 */
async function rasterizeGroup(element: GroupElement): Promise<Uint8Array | null> {
  try {
    const pixelWidth = Math.max(1, Math.round((element.width / MM_PER_INCH) * SHAPE_RASTERIZE_DPI));
    const pixelHeight = Math.max(
      1,
      Math.round((element.height / MM_PER_INCH) * SHAPE_RASTERIZE_DPI),
    );

    const offscreen = new OffscreenCanvas(pixelWidth, pixelHeight);
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    const scale = pixelWidth / element.width;

    // Offset children relative to group origin
    const localElement: GroupElement = {
      ...element,
      x: 0,
      y: 0,
      rotation: 0,
      children: element.children.map((child) => ({
        ...child,
        x: child.x - element.x,
        y: child.y - element.y,
      })),
    };

    const exportViewport: Viewport = {
      panX: 0,
      panY: 0,
      zoom: scale,
    };

    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    renderElement(ctx as unknown as CanvasRenderingContext2D, localElement, exportViewport);

    const blob = await offscreen.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to rasterize group element ${element.id}:`, error);
    return null;
  }
}

// === Element Conversion ===

/**
 * Convert a text element to a docx Paragraph with TextRun preserving formatting.
 * Requirement 13.2: font family, font size, bold, italic, underline, font color, alignment
 */
function convertTextElement(element: TextElement): Paragraph[] {
  if (!element.content || element.content.trim().length === 0) {
    return [];
  }

  const paragraphs: Paragraph[] = [];
  const lines = element.content.split('\n');

  for (const line of lines) {
    const textRun = new DocxTextRun({
      text: line,
      font: element.fontFamily,
      size: ptToHalfPoints(element.fontSize),
      bold: element.bold,
      italics: element.italic,
      underline: element.underline ? { type: UnderlineType.SINGLE } : undefined,
      color: hexToDocxColor(element.fontColor),
    });

    const paragraph = new Paragraph({
      children: [textRun],
      alignment: mapAlignment(element.alignment),
    });

    paragraphs.push(paragraph);
  }

  return paragraphs;
}

/**
 * Convert an image element to a docx Paragraph containing an ImageRun.
 * Requirement 13.3: embed at original resolution
 */
async function convertImageElement(element: ImageElement): Promise<Paragraph | null> {
  const imageBytes = await fetchImageBytes(element.src);
  if (!imageBytes) return null;

  // Calculate display dimensions in EMU (English Metric Units)
  // 1mm = 36000 EMU, but docx ImageRun uses pixels for transformation
  // We use the element's display dimensions in the document (mm → pixels at 96 DPI for display)
  const widthPx = Math.round((element.width / MM_PER_INCH) * 96);
  const heightPx = Math.round((element.height / MM_PER_INCH) * 96);

  // Determine image type from data
  const imageType = detectImageType(imageBytes);

  let docxImageType: 'png' | 'jpg' | 'gif' | 'bmp' | 'svg' = 'png';
  if (imageType === 'jpeg') {
    docxImageType = 'jpg';
  } else if (imageType === 'gif') {
    docxImageType = 'gif';
  } else if (imageType === 'bmp') {
    docxImageType = 'bmp';
  }

  const imageRun = new ImageRun({
    type: docxImageType,
    data: imageBytes,
    transformation: {
      width: widthPx,
      height: heightPx,
    },
  });

  return new Paragraph({
    children: [imageRun],
  });
}

/**
 * Convert a shape element to a docx Paragraph by rasterizing at 150 DPI.
 * Requirement 13.4: shapes that can't be natively represented → rasterize and embed
 */
async function convertShapeElement(element: ShapeElement): Promise<Paragraph | null> {
  const imageBytes = await rasterizeShape(element);
  if (!imageBytes) return null;

  const widthPx = Math.round((element.width / MM_PER_INCH) * 96);
  const heightPx = Math.round((element.height / MM_PER_INCH) * 96);

  const imageRun = new ImageRun({
    type: 'png',
    data: imageBytes,
    transformation: {
      width: widthPx,
      height: heightPx,
    },
  });

  return new Paragraph({
    children: [imageRun],
  });
}

/**
 * Convert a group element to a docx Paragraph by rasterizing at 150 DPI.
 * Groups can't be natively represented in DOCX, so we rasterize them.
 */
async function convertGroupElement(element: GroupElement): Promise<Paragraph | null> {
  const imageBytes = await rasterizeGroup(element);
  if (!imageBytes) return null;

  const widthPx = Math.round((element.width / MM_PER_INCH) * 96);
  const heightPx = Math.round((element.height / MM_PER_INCH) * 96);

  const imageRun = new ImageRun({
    type: 'png',
    data: imageBytes,
    transformation: {
      width: widthPx,
      height: heightPx,
    },
  });

  return new Paragraph({
    children: [imageRun],
  });
}

/**
 * Detect image type from magic bytes.
 */
function detectImageType(data: Uint8Array): 'png' | 'jpeg' | 'gif' | 'bmp' | 'unknown' {
  if (data.length < 4) return 'unknown';

  // PNG: 89 50 4E 47
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'jpeg';
  }

  // GIF: 47 49 46
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return 'gif';
  }

  // BMP: 42 4D
  if (data[0] === 0x42 && data[1] === 0x4d) {
    return 'bmp';
  }

  return 'unknown';
}

// === Page Conversion ===

/**
 * Convert a canvas page to docx section options with all elements.
 */
async function convertPage(page: CanvasPage): Promise<ISectionOptions> {
  const children: Paragraph[] = [];

  // Sort elements by z-index (ascending) for document order
  const sortedElements = [...page.elements]
    .filter((el) => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sortedElements) {
    try {
      const paragraphs = await convertElement(element);
      if (paragraphs) {
        children.push(...paragraphs);
      }
    } catch (error) {
      // Skip elements that fail to convert
      // eslint-disable-next-line no-console
      console.warn(`DOCX export: skipping element ${element.id}`, error);
    }
  }

  // If no content was generated, add an empty paragraph to avoid invalid DOCX
  if (children.length === 0) {
    children.push(new Paragraph({ children: [] }));
  }

  return {
    properties: {
      page: {
        size: {
          width: convertMillimetersToTwip(page.width),
          height: convertMillimetersToTwip(page.height),
        },
        margin: {
          top: convertMillimetersToTwip(0),
          right: convertMillimetersToTwip(0),
          bottom: convertMillimetersToTwip(0),
          left: convertMillimetersToTwip(0),
        },
      },
    },
    children,
  };
}

/**
 * Convert a single canvas element to docx Paragraph(s).
 */
async function convertElement(element: CanvasElement): Promise<Paragraph[] | null> {
  switch (element.type) {
    case 'text':
      return convertTextElement(element);
    case 'image': {
      const para = await convertImageElement(element);
      return para ? [para] : null;
    }
    case 'shape': {
      const para = await convertShapeElement(element);
      return para ? [para] : null;
    }
    case 'group': {
      const para = await convertGroupElement(element);
      return para ? [para] : null;
    }
    default:
      return null;
  }
}

// === Export Engine ===

/**
 * DOCX Export Engine implementation.
 *
 * Generates valid DOCX files from canvas documents using the `docx` npm package.
 * - Text elements → Paragraph with TextRun preserving formatting
 * - Image elements → ImageRun with original resolution bytes
 * - Shape elements → rasterized at 150 DPI, embedded as images
 * - Group elements → rasterized at 150 DPI, embedded as images
 * - Page dimensions set via SectionProperties
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export const docxExportEngine: DocxExportEngine = {
  /**
   * Export a single canvas page as a DOCX blob.
   */
  async exportPage(page: CanvasPage, _options?: Partial<ExportOptions>): Promise<Blob> {
    try {
      const section = await convertPage(page);

      const doc = new Document({
        sections: [section],
      });

      const blob = await Packer.toBlob(doc);
      return blob;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `DOCX export failed: ${message}. Please try reducing the number of elements or image sizes.`,
      );
    }
  },

  /**
   * Export a full canvas document (all or selected pages) as a DOCX blob.
   * Each page becomes a separate section with its own page dimensions.
   */
  async exportDocument(document: CanvasDocument, options?: Partial<ExportOptions>): Promise<Blob> {
    try {
      // Determine which pages to export
      const pageIndices =
        options?.pages === 'all' || !options?.pages
          ? document.pages.map((_, i) => i)
          : options.pages;

      const sections: ISectionOptions[] = [];

      for (const pageIndex of pageIndices) {
        const page = document.pages[pageIndex];
        if (page) {
          const section = await convertPage(page);
          sections.push(section);
        }
      }

      // Ensure at least one section exists
      if (sections.length === 0) {
        sections.push({
          properties: {},
          children: [new Paragraph({ children: [] })],
        });
      }

      const doc = new Document({
        sections,
      });

      const blob = await Packer.toBlob(doc);
      return blob;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `DOCX export failed: ${message}. Please try reducing the number of elements or image sizes.`,
      );
    }
  },
};
