import type { Point, Rect } from './common';

export type AnnotationTool = 'highlight' | 'signature' | 'stamp' | 'text' | 'redact';
export type AnnotationId = string;

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface TextStyle {
  fontSize: number;
  color: string;
  fontFamily: string;
}

export interface AnnotationData {
  id: AnnotationId;
  tool: AnnotationTool;
  page: number;
  rect: Rect;
  data: Record<string, unknown>;
}
