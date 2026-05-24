export interface RenderableDocument {
  id: string;
  pageCount: number;
  getPage(num: number): Promise<RenderablePage>;
}

export interface RenderablePage {
  width: number;
  height: number;
  render(canvas: HTMLCanvasElement, scale: number): Promise<void>;
}

export interface ExtractedImage {
  data: ArrayBuffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

export interface IRenderEngine {
  loadDocument(data: ArrayBuffer): Promise<RenderableDocument>;
  renderPage(doc: RenderableDocument, pageNum: number, scale: number): Promise<HTMLCanvasElement>;
  renderThumbnail(
    doc: RenderableDocument,
    pageNum: number,
    width: number,
  ): Promise<HTMLCanvasElement>;
  extractText(doc: RenderableDocument, pageNum?: number): Promise<string>;
  extractImages(doc: RenderableDocument): Promise<ExtractedImage[]>;
  getPageCount(doc: RenderableDocument): number;
  comparePages(
    doc1: RenderableDocument,
    doc2: RenderableDocument,
    pageNum: number,
  ): Promise<boolean>;
}
