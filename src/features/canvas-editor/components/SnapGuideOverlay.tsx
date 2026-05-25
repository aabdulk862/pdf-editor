import React from 'react';

import { MM_TO_PX } from '../constants';
import type { SnapGuide, Viewport } from '../types';

/**
 * SnapGuideOverlay renders thin colored lines at snap guide positions.
 * Horizontal guides are rendered as full-width horizontal lines.
 * Vertical guides are rendered as full-height vertical lines.
 *
 * The overlay is positioned absolutely over the canvas and uses
 * pointer-events-none so it doesn't interfere with interactions.
 */

export interface SnapGuideOverlayProps {
  /** Active snap guides to display */
  guides: SnapGuide[];
  /** Current viewport for coordinate conversion */
  viewport: Viewport;
  /** Canvas container dimensions in pixels */
  canvasWidth: number;
  canvasHeight: number;
}

export const SnapGuideOverlay: React.FC<SnapGuideOverlayProps> = ({
  guides,
  viewport,
  canvasWidth,
  canvasHeight,
}) => {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-testid="snap-guide-overlay"
    >
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          // Convert document x-position (mm) to screen x-position (px)
          const screenX = (guide.position * MM_TO_PX - viewport.panX) * viewport.zoom;

          return (
            <div
              key={`v-${guide.sourceId}-${index}`}
              className="absolute top-0 w-px"
              style={{
                left: screenX,
                height: canvasHeight,
                backgroundColor: '#ff00ff', // magenta
              }}
              data-testid={`snap-guide-vertical-${index}`}
            />
          );
        }

        // Horizontal guide
        // Convert document y-position (mm) to screen y-position (px)
        const screenY = (guide.position * MM_TO_PX - viewport.panY) * viewport.zoom;

        return (
          <div
            key={`h-${guide.sourceId}-${index}`}
            className="absolute left-0 h-px"
            style={{
              top: screenY,
              width: canvasWidth,
              backgroundColor: '#00e5ff', // cyan
            }}
            data-testid={`snap-guide-horizontal-${index}`}
          />
        );
      })}
    </div>
  );
};

export default SnapGuideOverlay;
