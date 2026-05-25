import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

/**
 * Represents a single slot in the contextual toolbar.
 *
 * @property id - Unique identifier for the slot
 * @property position - Where the slot renders: left, center, or right
 * @property component - The React element to render in this slot
 * @property priority - Lower numbers render first; items with higher priority
 *   overflow into the "more" menu on narrow viewports (default: 0)
 */
export interface ToolbarSlot {
  id: string;
  position: 'left' | 'center' | 'right';
  component: ReactNode;
  priority?: number;
}

export interface ToolbarProps {
  /** Array of toolbar slots to render in their respective positions */
  slots: ToolbarSlot[];
}

/**
 * Toolbar — Slot-based contextual toolbar for the PDF Editor.
 *
 * Renders controls in three positional slots (left, center, right) with
 * an overflow menu for items that don't fit on narrow viewports.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │ [Left slot] │ [Center slot] │ [Right slot] │ [Overflow] │
 * └─────────────────────────────────────────────────────────┘
 *
 * - Left slot: Back/home navigation
 * - Center slot: Tool-specific controls (registered by each tool feature)
 * - Right slot: Common actions (download, share, undo/redo)
 * - Overflow: Controls that don't fit collapse into a "more" menu
 *
 * The toolbar is conditionally visible — it only renders when there are
 * slots to display.
 *
 * Requirements: 1.6, 7.4
 */
export function Toolbar({ slots }: ToolbarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowItems, setOverflowItems] = useState<ToolbarSlot[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  // Don't render if there are no slots
  if (slots.length === 0) {
    return null;
  }

  // Sort slots by priority (lower priority number = renders first, higher = overflows first)
  const sortedSlots = [...slots].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const leftSlots = sortedSlots.filter((s) => s.position === 'left');
  const centerSlots = sortedSlots.filter((s) => s.position === 'center');
  const rightSlots = sortedSlots.filter((s) => s.position === 'right');

  // Determine visible vs overflow items based on container width
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const checkOverflow = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const contentWidth = contentRef.current.scrollWidth;

    if (contentWidth > containerWidth) {
      // Move highest-priority-number items to overflow
      const allSlots = [...sortedSlots].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      // Move items with highest priority numbers to overflow
      const itemsToOverflow = allSlots.slice(
        0,
        Math.max(1, Math.ceil((contentWidth - containerWidth) / 80)),
      );
      setOverflowItems(itemsToOverflow);
    } else {
      setOverflowItems([]);
    }
  }, [sortedSlots]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    checkOverflow();

    const observer = new ResizeObserver(() => {
      checkOverflow();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [checkOverflow]);

  // Close overflow menu when clicking outside
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!overflowOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [overflowOpen]);

  // Close overflow menu on Escape
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!overflowOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverflowOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [overflowOpen]);

  const overflowIds = new Set(overflowItems.map((item) => item.id));

  const visibleLeft = leftSlots.filter((s) => !overflowIds.has(s.id));
  const visibleCenter = centerSlots.filter((s) => !overflowIds.has(s.id));
  const visibleRight = rightSlots.filter((s) => !overflowIds.has(s.id));

  return (
    <div
      ref={containerRef}
      className="flex items-center min-h-[44px] px-2 gap-2 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 overflow-hidden"
      role="toolbar"
      aria-label="Contextual toolbar"
      data-testid="toolbar"
    >
      <div ref={contentRef} className="flex items-center justify-between w-full min-w-0">
        {/* Left slot */}
        {visibleLeft.length > 0 && (
          <div className="flex items-center gap-1 shrink-0" data-testid="toolbar-left">
            {visibleLeft.map((slot) => (
              <div key={slot.id} data-slot-id={slot.id}>
                {slot.component}
              </div>
            ))}
          </div>
        )}

        {/* Center slot */}
        <div
          className="flex items-center gap-1 flex-1 justify-center min-w-0 overflow-x-auto scrollbar-none"
          data-testid="toolbar-center"
        >
          {visibleCenter.map((slot) => (
            <div key={slot.id} data-slot-id={slot.id} className="shrink-0">
              {slot.component}
            </div>
          ))}
        </div>

        {/* Right slot */}
        {visibleRight.length > 0 && (
          <div className="flex items-center gap-1 shrink-0" data-testid="toolbar-right">
            {visibleRight.map((slot) => (
              <div key={slot.id} data-slot-id={slot.id}>
                {slot.component}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overflow menu */}
      {overflowItems.length > 0 && (
        <div className="relative shrink-0" ref={overflowMenuRef}>
          <button
            type="button"
            onClick={() => setOverflowOpen(!overflowOpen)}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] md:w-9 md:h-9 md:min-w-0 md:min-h-0 rounded-md text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors duration-fast ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
            aria-label="More toolbar actions"
            aria-expanded={overflowOpen}
            aria-haspopup="true"
            data-testid="toolbar-overflow-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>

          {overflowOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-secondary-200 dark:border-secondary-700 bg-background-light dark:bg-background-dark shadow-level-3 p-1"
              role="menu"
              aria-label="Overflow toolbar actions"
              data-testid="toolbar-overflow-menu"
            >
              {overflowItems.map((slot) => (
                <div
                  key={slot.id}
                  role="menuitem"
                  className="px-2 py-1.5 rounded-sm"
                  data-slot-id={slot.id}
                >
                  {slot.component}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
