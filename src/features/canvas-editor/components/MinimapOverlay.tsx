import { useCallback, useRef } from 'react';

import { MM_TO_PX } from '../constants';
import { useCanvasStore } from '../store/canvas-store';

/**
 * MinimapOverlay displays a small fixed overlay in the bottom-right corner
 * showing a scaled-down representation of the current page with a viewport
 * indicator rectangle. Clicking on the minimap navigates (updates pan position).
 *
 * - 120×160px container with border and white background
 * - Shows a scaled-down representation of the current page
 * - Semi-transparent rectangle indicates the current viewport area
 * - Click on the minimap to navigate (update pan position)
 *
 * Requirements: 16.8
 */

const MINIMAP_WIDTH = 120;
const MINIMAP_HEIGHT = 160;

export function MinimapOverlay() {
  const document = useCanvasStore((s) => s.document);
  const viewport = useCanvasStore((s) => s.viewport);
  const pan = useCanvasStore((s) => s.pan);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!document || !containerRef.current) return;

      const page = document.pages[document.activePageIndex];
      if (!page) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Calculate the scale factor used to fit the page (in px) into the minimap
      const pageWidthPx = page.width * MM_TO_PX;
      const pageHeightPx = page.height * MM_TO_PX;
      const scaleX = MINIMAP_WIDTH / pageWidthPx;
      const scaleY = MINIMAP_HEIGHT / pageHeightPx;
      const scale = Math.min(scaleX, scaleY);

      // Calculate the rendered page dimensions within the minimap
      const renderedWidth = pageWidthPx * scale;
      const renderedHeight = pageHeightPx * scale;

      // Calculate offset to center the page in the minimap
      const offsetX = (MINIMAP_WIDTH - renderedWidth) / 2;
      const offsetY = (MINIMAP_HEIGHT - renderedHeight) / 2;

      // Convert click position to pixel-space coordinates (same space as panX/panY)
      const pxX = (clickX - offsetX) / scale;
      const pxY = (clickY - offsetY) / scale;

      // We want to center the viewport on the clicked document position.
      // The viewport shows a region of size (viewportScreenWidth / zoom, viewportScreenHeight / zoom)
      // centered at (panX + viewportScreenWidth / zoom / 2, panY + viewportScreenHeight / zoom / 2).
      // We want the new center to be (docX, docY), so:
      // newPanX = docX - viewportScreenWidth / zoom / 2
      // newPanY = docY - viewportScreenHeight / zoom / 2
      // But we don't know the actual viewport screen size here, so we just set pan to center on the click.
      // A reasonable approximation: set panX/panY so the clicked point is at the viewport center.
      // Since we don't have the actual canvas element size, we use the page dimensions as a reference.
      // The viewport visible area in document coords is approximately page.width / zoom (for a full-width view).
      // For simplicity, we set pan directly to the clicked document coordinate.
      const newPanX = pxX;
      const newPanY = pxY;

      // Calculate delta from current pan position
      const deltaX = newPanX - viewport.panX;
      const deltaY = newPanY - viewport.panY;

      pan(deltaX, deltaY);
    },
    [document, viewport, pan],
  );

  if (!document) return null;

  const page = document.pages[document.activePageIndex];
  if (!page) return null;

  // Calculate the scale factor to fit the page (in px) into the minimap
  const pageWidthPx = page.width * MM_TO_PX;
  const pageHeightPx = page.height * MM_TO_PX;
  const scaleX = MINIMAP_WIDTH / pageWidthPx;
  const scaleY = MINIMAP_HEIGHT / pageHeightPx;
  const scale = Math.min(scaleX, scaleY);

  // Calculate the rendered page dimensions within the minimap
  const renderedWidth = pageWidthPx * scale;
  const renderedHeight = pageHeightPx * scale;

  // Offset to center the page representation in the minimap
  const pageOffsetX = (MINIMAP_WIDTH - renderedWidth) / 2;
  const pageOffsetY = (MINIMAP_HEIGHT - renderedHeight) / 2;

  // Calculate viewport indicator rectangle
  // The viewport shows a region starting at (panX, panY) in px with size depending on zoom.
  // Visible area in px: canvasSize / zoom (approximate with page dimensions)
  const visibleWidth = pageWidthPx / viewport.zoom;
  const visibleHeight = pageHeightPx / viewport.zoom;

  // Viewport indicator position and size in minimap coordinates
  // panX/panY are in pixel space, scale converts px to minimap px
  const indicatorX = pageOffsetX + viewport.panX * scale;
  const indicatorY = pageOffsetY + viewport.panY * scale;
  const indicatorWidth = Math.min(visibleWidth * scale, renderedWidth);
  const indicatorHeight = Math.min(visibleHeight * scale, renderedHeight);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 right-4 border border-secondary-300 bg-white dark:bg-secondary-800 rounded-md shadow-level-3 cursor-crosshair overflow-hidden z-50"
      style={{ width: `${MINIMAP_WIDTH}px`, height: `${MINIMAP_HEIGHT}px` }}
      onClick={handleMinimapClick}
      role="navigation"
      aria-label="Minimap - click to navigate"
    >
      {/* Page representation */}
      <div
        className="absolute"
        style={{
          left: `${pageOffsetX}px`,
          top: `${pageOffsetY}px`,
          width: `${renderedWidth}px`,
          height: `${renderedHeight}px`,
          backgroundColor: page.backgroundColor,
        }}
      >
        {/* Simplified element indicators */}
        {page.elements
          .filter((el) => el.visible)
          .slice(0, 20)
          .map((el) => {
            const elLeft = (el.x / page.width) * renderedWidth;
            const elTop = (el.y / page.height) * renderedHeight;
            const elWidth = Math.max(2, (el.width / page.width) * renderedWidth);
            const elHeight = Math.max(2, (el.height / page.height) * renderedHeight);

            return (
              <div
                key={el.id}
                className={`absolute ${
                  el.type === 'text'
                    ? 'bg-primary-400/50'
                    : el.type === 'image'
                      ? 'bg-success-400/50'
                      : el.type === 'shape'
                        ? 'bg-accent-400/50'
                        : 'bg-secondary-400/50'
                }`}
                style={{
                  left: `${elLeft}px`,
                  top: `${elTop}px`,
                  width: `${elWidth}px`,
                  height: `${elHeight}px`,
                }}
              />
            );
          })}
      </div>

      {/* Viewport indicator rectangle */}
      <div
        className="absolute border-2 border-primary-500 bg-primary-500/20 pointer-events-none"
        style={{
          left: `${Math.max(0, indicatorX)}px`,
          top: `${Math.max(0, indicatorY)}px`,
          width: `${Math.max(8, indicatorWidth)}px`,
          height: `${Math.max(8, indicatorHeight)}px`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
