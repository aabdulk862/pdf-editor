import { useCallback, useRef, useState } from 'react';

import type { OcrWord, OcrPageResult } from '@/core/ocr-engine/types';

/**
 * Scale factor to convert 300 DPI OCR bounding boxes to the rendered canvas coordinates.
 * The PDF is rendered at scale 1.5 (108 DPI), so:
 *   canvasPixel = ocrPixel * (108 / 300) = ocrPixel * 0.36
 *
 * However, the canvas is displayed at 100% width via CSS, so we need to account for
 * the ratio between the canvas's natural size and its displayed size.
 * We pass the actual scale factor as a prop since it depends on the viewport.
 */

interface OcrWordOverlayProps {
  /** OCR results for the current page */
  ocrPageResult: OcrPageResult;
  /** Scale factor from 300 DPI OCR coordinates to displayed pixel coordinates */
  scaleFactor: number;
  /** Set of word indices that are currently selected */
  selectedWordIndices: Set<number>;
  /** Callback when a word is clicked (toggle selection) */
  onWordClick: (word: OcrWord, wordIndex: number) => void;
  /** Callback when a word range is drag-selected */
  onWordRangeSelect: (startIndex: number, endIndex: number) => void;
}

/**
 * OcrWordOverlay renders invisible hit targets over word bounding boxes
 * and semi-transparent highlight overlays on selected words.
 *
 * Features:
 * - Invisible hit targets for click-to-select single words (Req 9.1)
 * - Drag to select a range of words (Req 9.1)
 * - Semi-transparent red highlight on selected words for pending redaction preview (Req 9.2)
 * - Click selected words to deselect them (Req 9.2)
 *
 * Requirements: 9.1, 9.2
 */
export function OcrWordOverlay({
  ocrPageResult,
  scaleFactor,
  selectedWordIndices,
  onWordClick,
  onWordRangeSelect,
}: OcrWordOverlayProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartIndexRef = useRef<number | null>(null);
  const dragCurrentIndexRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((wordIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartIndexRef.current = wordIndex;
    dragCurrentIndexRef.current = wordIndex;
  }, []);

  const handleMouseEnter = useCallback(
    (wordIndex: number) => {
      if (isDragging && dragStartIndexRef.current !== null) {
        dragCurrentIndexRef.current = wordIndex;
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(
    (wordIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (dragStartIndexRef.current !== null) {
        const startIdx = dragStartIndexRef.current;
        const endIdx = wordIndex;

        if (startIdx === endIdx) {
          // Single click — toggle selection
          onWordClick(ocrPageResult.words[wordIndex], wordIndex);
        } else {
          // Drag — select range
          onWordRangeSelect(startIdx, endIdx);
        }
      }

      setIsDragging(false);
      dragStartIndexRef.current = null;
      dragCurrentIndexRef.current = null;
    },
    [onWordClick, onWordRangeSelect, ocrPageResult.words],
  );

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging && dragStartIndexRef.current !== null && dragCurrentIndexRef.current !== null) {
      const startIdx = dragStartIndexRef.current;
      const endIdx = dragCurrentIndexRef.current;

      if (startIdx !== endIdx) {
        onWordRangeSelect(startIdx, endIdx);
      }
    }

    setIsDragging(false);
    dragStartIndexRef.current = null;
    dragCurrentIndexRef.current = null;
  }, [isDragging, onWordRangeSelect]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
      onMouseUp={handleGlobalMouseUp}
      onMouseLeave={handleGlobalMouseUp}
    >
      {ocrPageResult.words.map((word, index) => {
        const isSelected = selectedWordIndices.has(index);
        const { bbox } = word;

        // Convert 300 DPI coordinates to displayed coordinates
        const left = bbox.x * scaleFactor;
        const top = bbox.y * scaleFactor;
        const width = bbox.width * scaleFactor;
        const height = bbox.height * scaleFactor;

        return (
          <div
            key={`word-${index}`}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              // Semi-transparent red highlight for selected words (Req 9.2)
              backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.35)' : 'transparent',
              border: isSelected ? '1px solid rgba(239, 68, 68, 0.6)' : 'none',
              borderRadius: '1px',
              transition: 'background-color 150ms ease',
            }}
            onMouseDown={(e) => handleMouseDown(index, e)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseUp={(e) => handleMouseUp(index, e)}
            title={word.text}
            role="button"
            aria-label={`${isSelected ? 'Deselect' : 'Select'} word: ${word.text}`}
            aria-pressed={isSelected}
            tabIndex={-1}
          />
        );
      })}
    </div>
  );
}

OcrWordOverlay.displayName = 'OcrWordOverlay';
