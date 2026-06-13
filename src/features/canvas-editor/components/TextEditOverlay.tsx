import React, { useCallback, useEffect, useRef } from 'react';

import { MAX_TEXT_CHARS, MM_TO_PX } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import type { TextElement, Viewport } from '../types';

/**
 * TextEditOverlay renders a contenteditable div positioned over a text element
 * when in inline edit mode. It matches the text element's position, size, font,
 * and alignment. On blur or Escape, it commits the text content back to the store.
 *
 * The overlay is absolutely positioned within the canvas workspace container.
 * Uses pointer-events-none on the container, pointer-events-auto on the editable area.
 *
 * Requirements: 2.2, 6.4
 */

export interface TextEditOverlayProps {
  /** The text element being edited */
  element: TextElement;
  /** Current viewport for coordinate conversion */
  viewport: Viewport;
  /** Callback when editing is complete (blur or Escape) */
  onCommit: (elementId: string, newContent: string) => void;
  /** Callback when editing is cancelled (Escape without changes) */
  onCancel?: () => void;
}

export const TextEditOverlay: React.FC<TextEditOverlayProps> = ({
  element,
  viewport,
  onCommit,
  onCancel,
}) => {
  const editableRef = useRef<HTMLDivElement>(null);
  const initialContentRef = useRef(element.content);

  // Convert document coordinates (mm) to screen coordinates (px)
  const screenX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
  const screenY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
  const screenWidth = element.width * MM_TO_PX * viewport.zoom;
  const screenHeight = element.height * MM_TO_PX * viewport.zoom;

  // Calculate scaled font size
  const scaledFontSize = element.fontSize * viewport.zoom;

  // Focus the editable div on mount with a microtask delay
  // to ensure the canvas has released pointer capture and the DOM is ready
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;

    // Use requestAnimationFrame to ensure the overlay is painted before focusing
    const raf = requestAnimationFrame(() => {
      el.focus();

      // Select all text for easy replacement
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  const handleCommit = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;

    const newContent = el.textContent?.slice(0, MAX_TEXT_CHARS) ?? '';
    onCommit(element.id, newContent);
  }, [element.id, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Text formatting shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline');
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        // Restore original content and cancel
        const el = editableRef.current;
        if (el) {
          el.textContent = initialContentRef.current;
        }
        onCancel?.();
        return;
      }

      // Prevent shortcuts from propagating while editing
      e.stopPropagation();
    },
    [onCancel],
  );

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  // Prevent input from exceeding max characters
  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;

    const content = el.textContent ?? '';
    if (content.length > MAX_TEXT_CHARS) {
      el.textContent = content.slice(0, MAX_TEXT_CHARS);
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-30" data-testid="text-edit-overlay">
      {/* Formatting toolbar */}
      <div
        className="pointer-events-auto absolute flex items-center gap-0.5 px-1.5 py-1 bg-white dark:bg-secondary-800 rounded-lg shadow-level-2 border border-secondary-200 dark:border-secondary-700"
        style={{
          left: screenX,
          top: screenY - 36,
        }}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('bold');
          }}
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          aria-label="Bold"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('italic');
          }}
          className="w-7 h-7 flex items-center justify-center rounded text-xs italic text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          aria-label="Italic"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('underline');
          }}
          className="w-7 h-7 flex items-center justify-center rounded text-xs underline text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          aria-label="Underline"
          title="Underline (Ctrl+U)"
        >
          U
        </button>
      </div>

      <div
        ref={editableRef}
        className="pointer-events-auto absolute outline-none ring-2 ring-primary-500 rounded-sm z-30"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Edit text content"
        aria-multiline="true"
        data-testid="text-edit-input"
        style={{
          left: screenX,
          top: screenY,
          minWidth: screenWidth,
          minHeight: screenHeight,
          fontSize: scaledFontSize,
          fontFamily: element.fontFamily,
          fontWeight: element.bold ? 'bold' : 'normal',
          fontStyle: element.italic ? 'italic' : 'normal',
          textDecoration: element.underline ? 'underline' : 'none',
          textAlign: element.alignment,
          color: element.fontColor,
          lineHeight: 1.4,
          padding: '2px 4px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
          transformOrigin: 'top left',
          opacity: element.opacity / 100,
          cursor: 'text',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onInput={handleInput}
      >
        {element.content}
      </div>
    </div>
  );
};

/**
 * TextEditOverlayConnected is a convenience wrapper that reads the editing state
 * from the canvas store. It renders the TextEditOverlay only when a text element
 * is being edited (determined by the parent component passing editingElementId).
 */
export interface TextEditOverlayConnectedProps {
  /** ID of the text element currently being edited, or null if not editing */
  editingElementId: string | null;
  /** Callback when editing is complete */
  onEditComplete?: () => void;
}

export const TextEditOverlayConnected: React.FC<TextEditOverlayConnectedProps> = ({
  editingElementId,
  onEditComplete,
}) => {
  const viewport = useCanvasStore((state) => state.viewport);
  const document = useCanvasStore((state) => state.document);
  const updateElement = useCanvasStore((state) => state.updateElement);

  if (!editingElementId || !document) return null;

  const activePage = document.pages[document.activePageIndex];
  if (!activePage) return null;

  const element = activePage.elements.find((e) => e.id === editingElementId);
  if (!element || element.type !== 'text') return null;

  const handleCommit = (elementId: string, newContent: string) => {
    updateElement(elementId, { content: newContent });
    onEditComplete?.();
  };

  const handleCancel = () => {
    onEditComplete?.();
  };

  return (
    <TextEditOverlay
      element={element}
      viewport={viewport}
      onCommit={handleCommit}
      onCancel={handleCancel}
    />
  );
};

export default TextEditOverlay;
