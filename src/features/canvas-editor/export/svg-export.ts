import type {
  CanvasDocument,
  CanvasElement,
  CanvasPage,
  GroupElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from '../types';

/**
 * ExportEngine interface for format-specific export engines.
 */
export interface ExportEngine<TOptions = unknown> {
  exportPage(page: CanvasPage, options: TOptions): Promise<Blob>;
  exportDocument(document: CanvasDocument, options: TOptions): Promise<Blob>;
}

export interface SvgExportOptions {
  /** Reserved for future use (e.g., embed fonts, minify) */
}

/**
 * SVG Export Engine
 *
 * Generates SVG 1.1 compliant files from canvas pages.
 * - Text elements → <text> with font attributes
 * - Shape elements → <rect>, <circle>, <line>, <polygon>, <path>
 * - Image elements → <image> with base64 data URI
 * - Rotation via transform="rotate(...)" attribute
 * - Multi-page: one SVG file per page (exportDocument returns first page)
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
export class SvgExportEngine implements ExportEngine<SvgExportOptions> {
  private readonly SVG_NS = 'http://www.w3.org/2000/svg';
  private readonly XLINK_NS = 'http://www.w3.org/1999/xlink';

  async exportPage(page: CanvasPage, _options?: SvgExportOptions): Promise<Blob> {
    try {
      const svgString = this.buildSvgString(page);
      return new Blob([svgString], { type: 'image/svg+xml' });
    } catch (error) {
      if (this.isMemoryError(error)) {
        throw new Error(
          'SVG export failed due to memory constraints from large embedded images. Try reducing image sizes.',
        );
      }
      throw error;
    }
  }

  /**
   * Build the full SVG string for a page (useful for testing and direct string access).
   */
  buildSvgString(page: CanvasPage): string {
    const svgElement = this.buildSvgForPage(page);
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
  }

  async exportDocument(document: CanvasDocument, options?: SvgExportOptions): Promise<Blob> {
    // Multi-page: export first page as the document blob
    // For multi-page export, use exportPages() which returns one SVG per page
    if (document.pages.length === 0) {
      throw new Error('Document has no pages to export.');
    }
    return this.exportPage(document.pages[0], options);
  }

  /**
   * Export all pages as individual SVG blobs.
   * Multi-page: one SVG file per page (Requirement 12.5)
   */
  async exportPages(document: CanvasDocument, options?: SvgExportOptions): Promise<Blob[]> {
    const blobs: Blob[] = [];
    for (const page of document.pages) {
      const blob = await this.exportPage(page, options);
      blobs.push(blob);
    }
    return blobs;
  }

  /**
   * Build the SVG DOM tree for a single page.
   */
  private buildSvgForPage(page: CanvasPage): SVGSVGElement {
    const doc = typeof document !== 'undefined' ? document : this.createDocument();
    const svg = doc.createElementNS(this.SVG_NS, 'svg');

    // SVG 1.1 attributes
    svg.setAttribute('xmlns', this.SVG_NS);
    svg.setAttribute('xmlns:xlink', this.XLINK_NS);
    svg.setAttribute('version', '1.1');
    svg.setAttribute('width', `${page.width}mm`);
    svg.setAttribute('height', `${page.height}mm`);
    svg.setAttribute('viewBox', `0 0 ${page.width} ${page.height}`);

    // Background rectangle
    if (page.backgroundColor && page.backgroundColor !== 'transparent') {
      const bg = doc.createElementNS(this.SVG_NS, 'rect');
      bg.setAttribute('width', String(page.width));
      bg.setAttribute('height', String(page.height));
      bg.setAttribute('fill', page.backgroundColor);
      svg.appendChild(bg);
    }

    // Sort elements by z-index (ascending) for correct rendering order
    const sortedElements = [...page.elements]
      .filter((el) => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const element of sortedElements) {
      try {
        const svgEl = this.renderElement(element, doc);
        if (svgEl) {
          svg.appendChild(svgEl);
        }
      } catch (error) {
        if (this.isMemoryError(error)) {
          throw error;
        }
        // Skip individual element errors silently
        // eslint-disable-next-line no-console
        console.warn(`SVG export: skipping element ${element.id}`, error);
      }
    }

    return svg;
  }

  /**
   * Render a single canvas element to an SVG DOM node.
   */
  private renderElement(element: CanvasElement, doc: Document): SVGElement | null {
    let svgEl: SVGElement | null = null;

    switch (element.type) {
      case 'text':
        svgEl = this.renderTextElement(element, doc);
        break;
      case 'shape':
        svgEl = this.renderShapeElement(element, doc);
        break;
      case 'image':
        svgEl = this.renderImageElement(element, doc);
        break;
      case 'group':
        svgEl = this.renderGroupElement(element, doc);
        break;
    }

    if (svgEl) {
      this.applyCommonAttributes(svgEl, element);
    }

    return svgEl;
  }

  /**
   * Render a text element as an SVG <text> node.
   * Requirement 12.2: font-family, font-size, font-weight, font-style, fill, text-anchor
   */
  private renderTextElement(element: TextElement, doc: Document): SVGElement {
    const text = doc.createElementNS(this.SVG_NS, 'text');

    text.setAttribute('x', String(element.x));
    text.setAttribute('y', String(element.y));
    text.setAttribute('font-family', element.fontFamily);
    text.setAttribute('font-size', `${element.fontSize}pt`);
    text.setAttribute('font-weight', element.bold ? 'bold' : 'normal');
    text.setAttribute('font-style', element.italic ? 'italic' : 'normal');
    text.setAttribute('fill', element.fontColor);
    text.setAttribute('text-anchor', this.getTextAnchor(element.alignment));

    if (element.underline) {
      text.setAttribute('text-decoration', 'underline');
    }

    // Adjust x position based on alignment
    const anchorX = this.getAlignedX(element);
    text.setAttribute('x', String(anchorX));

    // Handle multi-line text with <tspan> elements
    const lines = element.content.split('\n');
    const lineHeight = element.fontSize * 0.3528; // pt to mm approximation

    if (lines.length === 1) {
      // Single line: set baseline offset (approximate ascent)
      text.setAttribute('y', String(element.y + lineHeight));
      text.textContent = element.content;
    } else {
      // Multi-line: use tspan elements
      lines.forEach((line, index) => {
        const tspan = doc.createElementNS(this.SVG_NS, 'tspan');
        tspan.setAttribute('x', String(anchorX));
        tspan.setAttribute('dy', index === 0 ? String(lineHeight) : String(lineHeight * 1.2));
        tspan.textContent = line;
        text.appendChild(tspan);
      });
    }

    return text;
  }

  /**
   * Render a shape element as the appropriate SVG primitive.
   * Requirement 12.3: rect, circle, line, polygon, path with fill, stroke, stroke-width, opacity
   */
  private renderShapeElement(element: ShapeElement, doc: Document): SVGElement {
    let shape: SVGElement;

    switch (element.shapeType) {
      case 'rectangle':
        shape = this.createRectangle(element, doc);
        break;
      case 'circle':
        shape = this.createCircle(element, doc);
        break;
      case 'line':
        shape = this.createLine(element, doc);
        break;
      case 'arrow':
        shape = this.createArrow(element, doc);
        break;
      case 'star':
        shape = this.createStar(element, doc);
        break;
      case 'polygon':
        shape = this.createPolygon(element, doc);
        break;
      default:
        shape = this.createRectangle(element, doc);
    }

    // Apply shape styling
    shape.setAttribute('fill', element.fill === 'transparent' ? 'none' : element.fill);
    shape.setAttribute('stroke', element.stroke);
    shape.setAttribute('stroke-width', String(element.strokeWidth));

    // Apply border style as stroke-dasharray
    if (element.borderStyle === 'dashed') {
      shape.setAttribute(
        'stroke-dasharray',
        `${element.strokeWidth * 3} ${element.strokeWidth * 2}`,
      );
    } else if (element.borderStyle === 'dotted') {
      shape.setAttribute('stroke-dasharray', `${element.strokeWidth} ${element.strokeWidth}`);
    }

    return shape;
  }

  /**
   * Render an image element as an SVG <image> node.
   * Requirement 12.4: base64-encoded data URI href
   */
  private renderImageElement(element: ImageElement, doc: Document): SVGElement {
    const image = doc.createElementNS(this.SVG_NS, 'image');

    image.setAttribute('x', String(element.x));
    image.setAttribute('y', String(element.y));
    image.setAttribute('width', String(element.width));
    image.setAttribute('height', String(element.height));
    image.setAttributeNS(this.XLINK_NS, 'xlink:href', element.src);
    image.setAttribute('href', element.src);
    image.setAttribute('preserveAspectRatio', 'none');

    // Apply crop via clipPath if cropRect is defined
    if (element.cropRect) {
      const clipId = `clip-${element.id}`;
      const defs = this.getOrCreateDefs(image.ownerDocument || doc);
      const clipPath = doc.createElementNS(this.SVG_NS, 'clipPath');
      clipPath.setAttribute('id', clipId);

      const clipRect = doc.createElementNS(this.SVG_NS, 'rect');
      clipRect.setAttribute('x', String(element.x + element.width * element.cropRect.x));
      clipRect.setAttribute('y', String(element.y + element.height * element.cropRect.y));
      clipRect.setAttribute('width', String(element.width * element.cropRect.width));
      clipRect.setAttribute('height', String(element.height * element.cropRect.height));
      clipPath.appendChild(clipRect);
      defs.appendChild(clipPath);

      image.setAttribute('clip-path', `url(#${clipId})`);
    }

    return image;
  }

  /**
   * Render a group element as an SVG <g> node with children.
   */
  private renderGroupElement(element: GroupElement, doc: Document): SVGElement {
    const group = doc.createElementNS(this.SVG_NS, 'g');

    // Sort children by z-index and render
    const sortedChildren = [...element.children]
      .filter((child) => child.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const child of sortedChildren) {
      const childEl = this.renderElement(child, doc);
      if (childEl) {
        group.appendChild(childEl);
      }
    }

    return group;
  }

  // --- Shape creation helpers ---

  private createRectangle(element: ShapeElement, doc: Document): SVGElement {
    const rect = doc.createElementNS(this.SVG_NS, 'rect');
    rect.setAttribute('x', String(element.x));
    rect.setAttribute('y', String(element.y));
    rect.setAttribute('width', String(element.width));
    rect.setAttribute('height', String(element.height));
    return rect;
  }

  private createCircle(element: ShapeElement, doc: Document): SVGElement {
    const ellipse = doc.createElementNS(this.SVG_NS, 'ellipse');
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    ellipse.setAttribute('cx', String(cx));
    ellipse.setAttribute('cy', String(cy));
    ellipse.setAttribute('rx', String(element.width / 2));
    ellipse.setAttribute('ry', String(element.height / 2));
    return ellipse;
  }

  private createLine(element: ShapeElement, doc: Document): SVGElement {
    const line = doc.createElementNS(this.SVG_NS, 'line');
    line.setAttribute('x1', String(element.x));
    line.setAttribute('y1', String(element.y + element.height / 2));
    line.setAttribute('x2', String(element.x + element.width));
    line.setAttribute('y2', String(element.y + element.height / 2));
    return line;
  }

  private createArrow(element: ShapeElement, doc: Document): SVGElement {
    // Arrow is a line with an arrowhead marker
    const g = doc.createElementNS(this.SVG_NS, 'g');

    const line = doc.createElementNS(this.SVG_NS, 'line');
    line.setAttribute('x1', String(element.x));
    line.setAttribute('y1', String(element.y + element.height / 2));
    line.setAttribute('x2', String(element.x + element.width));
    line.setAttribute('y2', String(element.y + element.height / 2));
    line.setAttribute('stroke', element.stroke);
    line.setAttribute('stroke-width', String(element.strokeWidth));

    // Arrowhead as a polygon
    const arrowSize = Math.max(element.strokeWidth * 3, 3);
    const tipX = element.x + element.width;
    const tipY = element.y + element.height / 2;
    const arrowhead = doc.createElementNS(this.SVG_NS, 'polygon');
    arrowhead.setAttribute(
      'points',
      `${tipX},${tipY} ${tipX - arrowSize},${tipY - arrowSize / 2} ${tipX - arrowSize},${tipY + arrowSize / 2}`,
    );
    arrowhead.setAttribute('fill', element.stroke);

    g.appendChild(line);
    g.appendChild(arrowhead);

    return g;
  }

  private createStar(element: ShapeElement, doc: Document): SVGElement {
    const polygon = doc.createElementNS(this.SVG_NS, 'polygon');
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const outerRadius = Math.min(element.width, element.height) / 2;
    const innerRadius = outerRadius * 0.4;
    const points = 5; // 5-pointed star

    const starPoints: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      starPoints.push(`${px},${py}`);
    }

    polygon.setAttribute('points', starPoints.join(' '));
    return polygon;
  }

  private createPolygon(element: ShapeElement, doc: Document): SVGElement {
    const polygon = doc.createElementNS(this.SVG_NS, 'polygon');
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const radius = Math.min(element.width, element.height) / 2;
    const sides = element.polygonSides ?? 6;

    const points: string[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      points.push(`${px},${py}`);
    }

    polygon.setAttribute('points', points.join(' '));
    return polygon;
  }

  // --- Utility methods ---

  /**
   * Apply common attributes: opacity and rotation transform.
   */
  private applyCommonAttributes(svgEl: SVGElement, element: CanvasElement): void {
    // Opacity (0-100 → 0-1)
    if (element.opacity < 100) {
      svgEl.setAttribute('opacity', String(element.opacity / 100));
    }

    // Rotation transform around element center
    if (element.rotation !== 0) {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      svgEl.setAttribute('transform', `rotate(${element.rotation} ${cx} ${cy})`);
    }
  }

  /**
   * Map TextAlignment to SVG text-anchor value.
   */
  private getTextAnchor(alignment: TextElement['alignment']): string {
    switch (alignment) {
      case 'left':
        return 'start';
      case 'center':
        return 'middle';
      case 'right':
        return 'end';
      case 'justify':
        return 'start'; // SVG doesn't natively support justify; fallback to start
      default:
        return 'start';
    }
  }

  /**
   * Get the x position adjusted for text alignment.
   */
  private getAlignedX(element: TextElement): number {
    switch (element.alignment) {
      case 'left':
        return element.x;
      case 'center':
        return element.x + element.width / 2;
      case 'right':
        return element.x + element.width;
      case 'justify':
        return element.x;
      default:
        return element.x;
    }
  }

  /**
   * Get or create a <defs> element in the SVG.
   */
  private getOrCreateDefs(doc: Document): SVGDefsElement {
    const svg = doc.querySelector('svg');
    let defs = svg?.querySelector('defs') as SVGDefsElement | null;
    if (!defs) {
      defs = doc.createElementNS(this.SVG_NS, 'defs') as SVGDefsElement;
      if (svg) {
        svg.insertBefore(defs, svg.firstChild);
      }
    }
    return defs;
  }

  /**
   * Check if an error is a memory-related error.
   * Requirement 12.6: catch memory constraints from large images
   */
  private isMemoryError(error: unknown): boolean {
    if (error instanceof RangeError) return true;
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return (
        msg.includes('memory') ||
        msg.includes('allocation') ||
        msg.includes('out of memory') ||
        msg.includes('maximum call stack') ||
        msg.includes('invalid string length')
      );
    }
    return false;
  }

  /**
   * Create a minimal document for environments without a global document (e.g., Node/testing).
   */
  private createDocument(): Document {
    // In browser environments, `document` is always available.
    // This fallback is for edge cases in testing.
    if (typeof document !== 'undefined') {
      return document;
    }
    // If DOMParser is available (e.g., jsdom in tests)
    const parser = new DOMParser();
    return parser.parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      'image/svg+xml',
    );
  }
}
