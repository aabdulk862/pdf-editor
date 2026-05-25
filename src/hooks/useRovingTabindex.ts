import { useCallback, useRef, useState } from 'react';

export interface UseRovingTabindexOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Whether the list wraps around (last → first, first → last). Default: true */
  wrap?: boolean;
  /** Callback when an item is activated (Enter/Space). Receives the focused index. */
  onActivate?: (index: number) => void;
}

export interface UseRovingTabindexReturn {
  /** The currently focused item index */
  focusedIndex: number;
  /** Set the focused index programmatically */
  setFocusedIndex: (index: number) => void;
  /** Returns the tabIndex value for a given item index */
  getTabIndex: (index: number) => 0 | -1;
  /** Ref callback to register an item element at a given index */
  getItemRef: (index: number) => (el: HTMLElement | null) => void;
  /** onKeyDown handler to attach to the list container */
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Implements the roving tabindex keyboard navigation pattern.
 *
 * Only one item in the list has tabindex="0" (the focused one),
 * all others have tabindex="-1". Arrow Up/Down moves focus between items.
 * Home moves to first, End moves to last. Enter/Space activates.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu/
 *
 * Validates: Requirements 10.2
 */
export function useRovingTabindex({
  itemCount,
  wrap = true,
  onActivate,
}: UseRovingTabindexOptions): UseRovingTabindexReturn {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const focusItem = useCallback((index: number) => {
    setFocusedIndex(index);
    const el = itemRefs.current.get(index);
    if (el) {
      el.focus();
    }
  }, []);

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => {
      return index === focusedIndex ? 0 : -1;
    },
    [focusedIndex],
  );

  const getItemRef = useCallback((index: number) => {
    return (el: HTMLElement | null) => {
      if (el) {
        itemRefs.current.set(index, el);
      } else {
        itemRefs.current.delete(index);
      }
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (itemCount === 0) return;

      let nextIndex: number | null = null;

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          if (focusedIndex < itemCount - 1) {
            nextIndex = focusedIndex + 1;
          } else if (wrap) {
            nextIndex = 0;
          }
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          if (focusedIndex > 0) {
            nextIndex = focusedIndex - 1;
          } else if (wrap) {
            nextIndex = itemCount - 1;
          }
          break;
        }
        case 'Home': {
          event.preventDefault();
          nextIndex = 0;
          break;
        }
        case 'End': {
          event.preventDefault();
          nextIndex = itemCount - 1;
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          onActivate?.(focusedIndex);
          return;
        }
        default:
          return;
      }

      if (nextIndex !== null) {
        focusItem(nextIndex);
      }
    },
    [focusedIndex, itemCount, wrap, onActivate, focusItem],
  );

  return {
    focusedIndex,
    setFocusedIndex,
    getTabIndex,
    getItemRef,
    handleKeyDown,
  };
}
