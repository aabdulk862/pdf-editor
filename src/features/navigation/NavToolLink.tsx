import { forwardRef, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import type { FC } from 'react';

export interface NavToolLinkProps {
  path: string;
  label: string;
  icon: FC<{ className?: string }>;
  onContextMenu: (position: { x: number; y: number }) => void;
  /** Roving tabindex value. When provided, controls the tabIndex of the link. */
  tabIndex?: 0 | -1;
}

/**
 * Individual tool link for the categorized navigation sidebar.
 *
 * Features:
 * - NavLink from react-router-dom with active class detection
 * - 20x20px icon with 8px (gap-2) spacing to label
 * - Active state: 3px left border + primary background highlight
 * - Right-click (desktop) and long-press 500ms (mobile) for context menu
 * - Minimum 44px height for touch target accessibility
 * - Supports roving tabindex via forwarded ref and tabIndex prop
 */
export const NavToolLink = forwardRef<HTMLAnchorElement, NavToolLinkProps>(function NavToolLink(
  { path, label, icon: Icon, onContextMenu, tabIndex },
  ref,
) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      onContextMenu({ x: event.clientX, y: event.clientY });
    },
    [onContextMenu],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      const touch = event.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };

      longPressTimer.current = setTimeout(() => {
        if (touchStartPos.current) {
          onContextMenu(touchStartPos.current);
        }
        longPressTimer.current = null;
      }, 500);
    },
    [onContextMenu],
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }, []);

  return (
    <NavLink
      to={path}
      ref={ref}
      tabIndex={tabIndex}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 px-3 min-h-[44px] rounded-md text-sm transition-colors duration-moderate ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-secondary-900',
          isActive
            ? 'border-l-[3px] border-primary-600 bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-200'
            : 'border-l-[3px] border-transparent hover:bg-secondary-100 dark:hover:bg-secondary-800 text-secondary-700 dark:text-secondary-300',
        ].join(' ')
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
});
