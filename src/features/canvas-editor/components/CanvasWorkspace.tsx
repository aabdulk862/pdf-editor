import { useCallback, useRef, useState } from 'react';

import { useCanvasStore } from '../store/canvas-store';
import type { SnapGuide } from '../types';
import { CanvasViewport } from './CanvasViewport';
import { SelectionOverlay } from './SelectionOverlay';
import { SnapGuideOverlay } from './SnapGuideOverlay';
import { TextEditOverlayConnected } from './TextEditOverlay';

/**
 * CanvasWorkspace is the main canvas container with the dark background.
 *
 * It provides the visual "desk" metaphor: a dark surface (secondary-900) on which
 * the white page surface is rendered by the canvas. The workspace fills all
 * available space and contains the CanvasViewport along with selection,
 * snap guide, and text editing overlays.
 *
 * Requirements: 2.2, 6.2, 6.4, 15.2, 16.3, 16.4
 */
export function CanvasWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useCanvasStore((state) => state.viewport);

  // Snap guides state — populated during drag operations via useCanvasInput
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  // Text editing state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  const handleEditText = useCallback((elementId: string) => {
    setEditingElementId(elementId);
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditingElementId(null);
  }, []);

  const handleSnapGuidesChange = useCallback((guides: SnapGuide[]) => {
    setSnapGuides(guides);
  }, []);

  // Get container dimensions for snap guide overlay
  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const containerHeight = containerRef.current?.clientHeight ?? 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col relative overflow-hidden bg-secondary-900"
      data-testid="canvas-workspace"
    >
      <CanvasViewport onEditText={handleEditText} onSnapGuidesChange={handleSnapGuidesChange} />

      {/* Selection overlay with resize/rotate handles */}
      <SelectionOverlay />

      {/* Snap guide alignment lines */}
      <SnapGuideOverlay
        guides={snapGuides}
        viewport={viewport}
        canvasWidth={containerWidth}
        canvasHeight={containerHeight}
      />

      {/* Inline text editing overlay */}
      <TextEditOverlayConnected
        editingElementId={editingElementId}
        onEditComplete={handleEditComplete}
      />
    </div>
  );
}
