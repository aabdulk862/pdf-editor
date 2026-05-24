/**
 * Typed message protocol for PDF Web Worker communication.
 * Defines all supported operations and their request/response shapes.
 */

import type {
  PageRange,
  PageNumberConfig,
  HeaderFooterConfig,
  WatermarkConfig,
  CropBox,
  PageSize,
  OperationResult,
} from '@/types/operations';
import type { PdfMetadata, Bookmark, FormField } from '@/types/pdf';
import type { AnnotationData } from '@/types/annotations';
import type { ImageFile, RedactRegion, TextOverlay } from '@/core/pdf-engine/index';

// --- Request types ---

export type PdfWorkerOperation =
  | 'merge'
  | 'splitByRanges'
  | 'rotatePages'
  | 'deletePages'
  | 'reorderPages'
  | 'duplicatePages'
  | 'addPageNumbers'
  | 'addHeadersFooters'
  | 'addWatermark'
  | 'addTextOverlay'
  | 'embedAnnotation'
  | 'imagesToPdf'
  | 'compress'
  | 'flatten'
  | 'cropPages'
  | 'resizePages'
  | 'linearize'
  | 'getMetadata'
  | 'setMetadata'
  | 'getBookmarks'
  | 'setBookmarks'
  | 'getFormFields'
  | 'fillFormFields'
  | 'encrypt'
  | 'decrypt'
  | 'redact';

export interface PdfWorkerRequestBase {
  id: string;
  operation: PdfWorkerOperation;
}

export interface MergeRequest extends PdfWorkerRequestBase {
  operation: 'merge';
  payload: { documents: ArrayBuffer[] };
}

export interface SplitByRangesRequest extends PdfWorkerRequestBase {
  operation: 'splitByRanges';
  payload: { data: ArrayBuffer; ranges: PageRange[] };
}

export interface RotatePagesRequest extends PdfWorkerRequestBase {
  operation: 'rotatePages';
  payload: { data: ArrayBuffer; pages: number[]; angle: 90 | 180 | 270 };
}

export interface DeletePagesRequest extends PdfWorkerRequestBase {
  operation: 'deletePages';
  payload: { data: ArrayBuffer; pages: number[] };
}

export interface ReorderPagesRequest extends PdfWorkerRequestBase {
  operation: 'reorderPages';
  payload: { data: ArrayBuffer; newOrder: number[] };
}

export interface DuplicatePagesRequest extends PdfWorkerRequestBase {
  operation: 'duplicatePages';
  payload: { data: ArrayBuffer; pages: number[]; copies: number };
}

export interface AddPageNumbersRequest extends PdfWorkerRequestBase {
  operation: 'addPageNumbers';
  payload: { data: ArrayBuffer; config: PageNumberConfig };
}

export interface AddHeadersFootersRequest extends PdfWorkerRequestBase {
  operation: 'addHeadersFooters';
  payload: { data: ArrayBuffer; config: HeaderFooterConfig };
}

export interface AddWatermarkRequest extends PdfWorkerRequestBase {
  operation: 'addWatermark';
  payload: { data: ArrayBuffer; config: WatermarkConfig };
}

export interface AddTextOverlayRequest extends PdfWorkerRequestBase {
  operation: 'addTextOverlay';
  payload: { data: ArrayBuffer; overlays: TextOverlay[] };
}

export interface EmbedAnnotationRequest extends PdfWorkerRequestBase {
  operation: 'embedAnnotation';
  payload: { data: ArrayBuffer; annotation: AnnotationData };
}

export interface ImagesToPdfRequest extends PdfWorkerRequestBase {
  operation: 'imagesToPdf';
  payload: { images: ImageFile[] };
}

export interface CompressRequest extends PdfWorkerRequestBase {
  operation: 'compress';
  payload: { data: ArrayBuffer };
}

export interface FlattenRequest extends PdfWorkerRequestBase {
  operation: 'flatten';
  payload: { data: ArrayBuffer };
}

export interface CropPagesRequest extends PdfWorkerRequestBase {
  operation: 'cropPages';
  payload: { data: ArrayBuffer; pages: number[]; cropBox: CropBox };
}

export interface ResizePagesRequest extends PdfWorkerRequestBase {
  operation: 'resizePages';
  payload: { data: ArrayBuffer; pages: number[]; size: PageSize };
}

export interface LinearizeRequest extends PdfWorkerRequestBase {
  operation: 'linearize';
  payload: { data: ArrayBuffer };
}

export interface GetMetadataRequest extends PdfWorkerRequestBase {
  operation: 'getMetadata';
  payload: { data: ArrayBuffer };
}

export interface SetMetadataRequest extends PdfWorkerRequestBase {
  operation: 'setMetadata';
  payload: { data: ArrayBuffer; metadata: Partial<PdfMetadata> };
}

export interface GetBookmarksRequest extends PdfWorkerRequestBase {
  operation: 'getBookmarks';
  payload: { data: ArrayBuffer };
}

export interface SetBookmarksRequest extends PdfWorkerRequestBase {
  operation: 'setBookmarks';
  payload: { data: ArrayBuffer; bookmarks: Bookmark[] };
}

export interface GetFormFieldsRequest extends PdfWorkerRequestBase {
  operation: 'getFormFields';
  payload: { data: ArrayBuffer };
}

export interface FillFormFieldsRequest extends PdfWorkerRequestBase {
  operation: 'fillFormFields';
  payload: { data: ArrayBuffer; values: Record<string, string | boolean> };
}

export interface EncryptRequest extends PdfWorkerRequestBase {
  operation: 'encrypt';
  payload: { data: ArrayBuffer; password: string };
}

export interface DecryptRequest extends PdfWorkerRequestBase {
  operation: 'decrypt';
  payload: { data: ArrayBuffer; password: string };
}

export interface RedactRequest extends PdfWorkerRequestBase {
  operation: 'redact';
  payload: { data: ArrayBuffer; regions: RedactRegion[] };
}

export type PdfWorkerRequest =
  | MergeRequest
  | SplitByRangesRequest
  | RotatePagesRequest
  | DeletePagesRequest
  | ReorderPagesRequest
  | DuplicatePagesRequest
  | AddPageNumbersRequest
  | AddHeadersFootersRequest
  | AddWatermarkRequest
  | AddTextOverlayRequest
  | EmbedAnnotationRequest
  | ImagesToPdfRequest
  | CompressRequest
  | FlattenRequest
  | CropPagesRequest
  | ResizePagesRequest
  | LinearizeRequest
  | GetMetadataRequest
  | SetMetadataRequest
  | GetBookmarksRequest
  | SetBookmarksRequest
  | GetFormFieldsRequest
  | FillFormFieldsRequest
  | EncryptRequest
  | DecryptRequest
  | RedactRequest;

// --- Response types ---

export interface PdfWorkerResponseSuccess {
  id: string;
  success: true;
  result: OperationResult | OperationResult[] | PdfMetadata | Bookmark[] | FormField[];
}

export interface PdfWorkerResponseError {
  id: string;
  success: false;
  error: string;
}

export type PdfWorkerResponse = PdfWorkerResponseSuccess | PdfWorkerResponseError;
