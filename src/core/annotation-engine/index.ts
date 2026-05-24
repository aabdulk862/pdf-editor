import type { Point, Rect, Size } from '@/types/common';
import type {
  AnnotationTool,
  AnnotationId,
  AnnotationData,
  Stroke,
  TextStyle,
} from '@/types/annotations';
import type { StampType } from '@/types/operations';
import type { PdfPage } from '@/types/pdf';

export interface AnnotationCanvas {
  id: string;
  element: HTMLCanvasElement;
  page: PdfPage;
}

export interface IAnnotationEngine {
  initCanvas(container: HTMLElement, page: PdfPage): AnnotationCanvas;
  setTool(canvas: AnnotationCanvas, tool: AnnotationTool): void;
  addHighlight(canvas: AnnotationCanvas, rect: Rect, color: string, opacity: number): AnnotationId;
  addSignature(canvas: AnnotationCanvas, strokes: Stroke[], position: Point): AnnotationId;
  addStamp(canvas: AnnotationCanvas, stamp: StampType, position: Point, size: Size): AnnotationId;
  addTextOverlay(
    canvas: AnnotationCanvas,
    text: string,
    position: Point,
    style: TextStyle,
  ): AnnotationId;
  removeAnnotation(canvas: AnnotationCanvas, id: AnnotationId): void;
  getAnnotations(canvas: AnnotationCanvas): AnnotationData[];
  clear(canvas: AnnotationCanvas): void;
}
