import type { OcrSearchMatch } from './ocr-search';
import type { OcrBoundingBox } from '../../core/ocr-engine/types';

/**
 * Props for the OcrSearchHighlight component.
 */
export interface OcrSearchHighlightProps {
  /** Array of OCR search matches to highlight on this page */
  matches: OcrSearchMatch[];
  /** Width of the page container in pixels (for scaling bounding boxes) */
  containerWidth: number;
  /** Height of the page container in pixels (for scaling bounding boxes) */
  containerHeight: number;
  /** Original image width in pixels (300 DPI rendered width) */
  imageWidth: number;
  /** Original image height in pixels (300 DPI rendered height) */
  imageHeight: number;
  /** Index of the currently active/focused match (for distinct styling) */
  activeMatchIndex?: number;
}

/**
 * Scale an OCR bounding box from the original 300 DPI image coordinates
 * to the current container display coordinates.
 */
function scaleBbox(
  bbox: OcrBoundingBox,
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): { left: number; top: number; width: number; height: number } {
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;

  return {
    left: bbox.x * scaleX,
    top: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  };
}

/**
 * OcrSearchHighlight renders highlight overlays on OCR-processed pages
 * at the positions of matching words found during search.
 *
 * Uses the word bounding boxes from OCR results to position semi-transparent
 * highlight rectangles over matching text, using the same visual style as
 * native text search results (yellow/orange highlight).
 *
 * Requirements: 8.3
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <canvas ref={pageCanvasRef} />
 *   <OcrSearchHighlight
 *     matches={pageMatches}
 *     containerWidth={canvasWidth}
 *     containerHeight={canvasHeight}
 *     imageWidth={2550} // 8.5" * 300 DPI
 *     imageHeight={3300} // 11" * 300 DPI
 *   />
 * </div>
 * ```
 */
export function OcrSearchHighlight({
  matches,
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  activeMatchIndex,
}: OcrSearchHighlightProps): JSX.Element | null {
  if (matches.length === 0 || containerWidth === 0 || containerHeight === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      data-testid="ocr-search-highlight-layer"
    >
      {matches.map((match, index) => {
        const scaled = scaleBbox(
          match.word.bbox,
          containerWidth,
          containerHeight,
          imageWidth,
          imageHeight,
        );

        const isActive = activeMatchIndex === index;

        return (
          <div
            key={`${match.pageNumber}-${match.wordIndex}`}
            className={`absolute rounded-sm ${
              isActive
                ? 'bg-orange-400/50 ring-2 ring-orange-500'
                : 'bg-yellow-300/40 dark:bg-yellow-400/30'
            }`}
            style={{
              left: `${scaled.left}px`,
              top: `${scaled.top}px`,
              width: `${scaled.width}px`,
              height: `${scaled.height}px`,
            }}
            data-testid={`ocr-highlight-${match.pageNumber}-${match.wordIndex}`}
          />
        );
      })}
    </div>
  );
}

OcrSearchHighlight.displayName = 'OcrSearchHighlight';
