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

export interface ImageFile {
  name: string;
  data: ArrayBuffer;
  type: 'image/png' | 'image/jpeg';
}

export interface RedactRegion {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextOverlay {
  page: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface IPdfEngine {
  load(data: ArrayBuffer, password?: string): Promise<PdfDocument>;
  save(doc: PdfDocument): Promise<ArrayBuffer>;
  rotatePages(data: ArrayBuffer, pages: number[], angle: 90 | 180 | 270): Promise<OperationResult>;
  deletePages(data: ArrayBuffer, pages: number[]): Promise<OperationResult>;
  reorderPages(data: ArrayBuffer, newOrder: number[]): Promise<OperationResult>;
  duplicatePages(data: ArrayBuffer, pages: number[], copies: number): Promise<OperationResult>;
  splitByRanges(data: ArrayBuffer, ranges: PageRange[]): Promise<OperationResult[]>;
  merge(documents: ArrayBuffer[]): Promise<OperationResult>;
  addPageNumbers(data: ArrayBuffer, config: PageNumberConfig): Promise<OperationResult>;
  addHeadersFooters(data: ArrayBuffer, config: HeaderFooterConfig): Promise<OperationResult>;
  addWatermark(data: ArrayBuffer, config: WatermarkConfig): Promise<OperationResult>;
  addTextOverlay(data: ArrayBuffer, overlays: TextOverlay[]): Promise<OperationResult>;
  embedAnnotation(data: ArrayBuffer, annotation: AnnotationData): Promise<OperationResult>;
  imagesToPdf(images: ImageFile[]): Promise<OperationResult>;
  compress(data: ArrayBuffer): Promise<OperationResult>;
  flatten(data: ArrayBuffer): Promise<OperationResult>;
  cropPages(data: ArrayBuffer, pages: number[], cropBox: CropBox): Promise<OperationResult>;
  resizePages(data: ArrayBuffer, pages: number[], size: PageSize): Promise<OperationResult>;
  linearize(data: ArrayBuffer): Promise<OperationResult>;
  getMetadata(data: ArrayBuffer): Promise<PdfMetadata>;
  setMetadata(data: ArrayBuffer, metadata: Partial<PdfMetadata>): Promise<OperationResult>;
  getBookmarks(data: ArrayBuffer): Promise<Bookmark[]>;
  setBookmarks(data: ArrayBuffer, bookmarks: Bookmark[]): Promise<OperationResult>;
  getFormFields(data: ArrayBuffer): Promise<FormField[]>;
  fillFormFields(
    data: ArrayBuffer,
    values: Record<string, string | boolean>,
  ): Promise<OperationResult>;
  encrypt(data: ArrayBuffer, password: string): Promise<OperationResult>;
  decrypt(data: ArrayBuffer, password: string): Promise<OperationResult>;
  redact(data: ArrayBuffer, regions: RedactRegion[]): Promise<OperationResult>;
}
