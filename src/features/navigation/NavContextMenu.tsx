import { useCallback, useEffect, useRef } from 'react';
import { useNavStore } from './store/nav-store';

export interface NavContextMenuProps {
  toolPath: string;
  position: { x: number; y: number };
  onClose: () => void;
}

/**
 * Context menu for pinning/unpinning tools to favorites.
 *
 * - Positioned at cursor/touch coordinates, constrained to viewport bounds
 * - Single action: "Add to Favorites" or "Remove from Favorites"
 * - Dismissed on click outside, Escape key, or action selection
 */
export function NavContextMenu({ toolPath, position, onClose }: NavContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { favorites, toggleFavorite } = useNavStore();
  const isFavorite = favorites.includes(toolPath);

  const handleAction = useCallback(() => {
    toggleFavorite(toolPath);
    onClose();
  }, [toggleFavorite, toolPath, onClose]);

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

  // Constrain position to viewport
  const constrainedPosition = getConstrainedPosition(position);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1"
      style={{
        left: constrainedPosition.x,
        top: constrainedPosition.y,
      }}
    >
      <button
        role="menuitem"
        onClick={handleAction}
        className="w-full text-left px-4 py-2 text-sm min-h-[44px] flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors duration-200"
      >
        {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      </button>
    </div>
  );
}

/**
 * Constrain menu position so it doesn't overflow the viewport.
 * Assumes a menu width of ~200px and height of ~44px.
 */
function getConstrainedPosition(position: { x: number; y: number }): { x: number; y: number } {
  const MENU_WIDTH = 200;
  const MENU_HEIGHT = 48;
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
