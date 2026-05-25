import { useCallback, useEffect, useRef } from 'react';
import { Icon } from '../../design-system/primitives/Icon';
import { useNavStore } from './store/nav-store';

export interface NavContextMenuProps {
  toolPath: string;
  position: { x: number; y: number };
  onClose: () => void;
}

/**
 * Context menu for sidebar tool items.
 *
 * - Positioned at cursor/touch coordinates, constrained to viewport bounds
 * - Actions: "Add to Favorites" / "Remove from Favorites" and "Open in New Tab"
 * - Dismissed on click outside, Escape key, or action selection
 * - Keyboard accessible: Arrow Up/Down to navigate items, Enter/Space to activate
 */
export function NavContextMenu({ toolPath, position, onClose }: NavContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { favorites, toggleFavorite } = useNavStore();
  const isFavorite = favorites.includes(toolPath);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(toolPath);
    onClose();
  }, [toggleFavorite, toolPath, onClose]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(toolPath, '_blank');
    onClose();
  }, [toolPath, onClose]);

  // Dismiss on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Arrow key navigation between menu items
  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!items || items.length === 0) return;

    const currentIndex = Array.from(items).indexOf(document.activeElement as Element);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      (items[nextIndex] as HTMLElement).focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      (items[prevIndex] as HTMLElement).focus();
    }
  }, []);

  // Auto-focus first menu item on mount
  useEffect(() => {
    const firstItem = menuRef.current?.querySelector('[role="menuitem"]') as HTMLElement | null;
    firstItem?.focus();
  }, []);

  // Constrain position to viewport
  const constrainedPosition = getConstrainedPosition(position);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 min-w-[200px]"
      style={{
        left: constrainedPosition.x,
        top: constrainedPosition.y,
      }}
      onKeyDown={handleMenuKeyDown}
    >
      <button
        role="menuitem"
        onClick={handleToggleFavorite}
        className="w-full text-left px-3 py-2 text-sm min-h-[44px] flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900"
      >
        <Icon name="star" size={16} aria-hidden={true} />
        <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
      </button>
      <button
        role="menuitem"
        onClick={handleOpenInNewTab}
        className="w-full text-left px-3 py-2 text-sm min-h-[44px] flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900"
      >
        <Icon name="external-link" size={16} aria-hidden={true} />
        <span>Open in New Tab</span>
      </button>
    </div>
  );
}

/**
 * Constrain menu position so it doesn't overflow the viewport.
 * Assumes a menu width of ~200px and height of ~96px (2 items × 44px + padding).
 */
function getConstrainedPosition(position: { x: number; y: number }): { x: number; y: number } {
  const MENU_WIDTH = 200;
  const MENU_HEIGHT = 96;
  const VIEWPORT_PADDING = 8;

  let { x, y } = position;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Constrain right edge
  if (x + MENU_WIDTH + VIEWPORT_PADDING > viewportWidth) {
    x = viewportWidth - MENU_WIDTH - VIEWPORT_PADDING;
  }

  // Constrain bottom edge
  if (y + MENU_HEIGHT + VIEWPORT_PADDING > viewportHeight) {
    y = viewportHeight - MENU_HEIGHT - VIEWPORT_PADDING;
  }

  // Constrain left edge
  if (x < VIEWPORT_PADDING) {
    x = VIEWPORT_PADDING;
  }

  // Constrain top edge
  if (y < VIEWPORT_PADDING) {
    y = VIEWPORT_PADDING;
  }

  return { x, y };
}
