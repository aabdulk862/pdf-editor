export interface PageRange {
  start: number;
  end: number;
}

export interface PageNumberConfig {
  position:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  startNumber: number;
  fontSize?: number;
  color?: string;
}

export interface HeaderFooterConfig {
  header: { left: string; center: string; right: string };
  footer: { left: string; center: string; right: string };
  fontSize: number;
  margin: number;
}

export interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  imageData?: ArrayBuffer;
  opacity: number;
  rotation: number;
}

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageSize {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export type StampType = 'APPROVED' | 'DRAFT' | 'CONFIDENTIAL';

export interface OperationResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
  metadata?: Record<string, unknown>;
}
