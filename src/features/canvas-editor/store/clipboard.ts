import type { CanvasElement } from '../types';

/**
 * Generate a unique ID for pasted elements.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Deep clone elements for clipboard storage.
 * Uses JSON parse/stringify to produce plain objects detached from any
 * reactive proxy (e.g., Immer drafts).
 */
export function cloneElementsForClipboard(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((element) => JSON.parse(JSON.stringify(element)));
}

/**
 * Prepare clipboard elements for pasting onto the canvas.
 * Each element receives a new unique ID, a 10px offset in both x and y,
 * and a z-index starting from one above the highest existing element.
 */
export function prepareElementsForPaste(
  clipboardElements: CanvasElement[],
  existingElements: CanvasElement[],
): CanvasElement[] {
  const maxZIndex =
    existingElements.length > 0 ? Math.max(...existingElements.map((e) => e.zIndex)) : 0;

  return clipboardElements.map((element, index) => {
    const clone: CanvasElement = JSON.parse(JSON.stringify(element));
    clone.id = generateId();
    clone.x += 10;
    clone.y += 10;
    clone.zIndex = maxZIndex + 1 + index;
    return clone;
  });
}
