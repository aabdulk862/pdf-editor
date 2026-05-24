import type { Rect } from './common';

export interface PdfDocument {
  id: string;
  name: string;
  data: ArrayBuffer;
  pageCount: number;
  fileSize: number;
  metadata: PdfMetadata;
  isEncrypted: boolean;
  isLinearized: boolean;
}

export interface PdfMetadata {
  title: string | null;
  author: string | null;
  subject: string | null;
  keywords: string[];
  creationDate: Date | null;
  modificationDate: Date | null;
}

export interface PdfPage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface Bookmark {
  id: string;
  title: string;
  pageNumber: number;
  children: Bookmark[];
}

export interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio';
  value: string | boolean;
  options?: string[];
  page: number;
  rect: Rect;
}
