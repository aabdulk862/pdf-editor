import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavContextMenu } from './NavContextMenu';
import { useNavStore } from './store/nav-store';

describe('NavContextMenu', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    // Reset store state
    useNavStore.setState({ favorites: [] });
  });

  it('renders "Add to Favorites" when tool is not a favorite', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent('Add to Favorites');
  });

  it('renders "Remove from Favorites" when tool is a favorite', () => {
    useNavStore.setState({ favorites: ['/merge'] });

    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent('Remove from Favorites');
  });

  it('renders "Open in New Tab" option', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    expect(items[1]).toHaveTextContent('Open in New Tab');
  });

  it('renders both menu items', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(2);
  });

  it('calls toggleFavorite and onClose when favorites action is clicked', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    fireEvent.click(items[0]);

    expect(useNavStore.getState().favorites).toContain('/merge');
    expect(onClose).toHaveBeenCalled();
  });

  it('removes from favorites and calls onClose when action is clicked on a favorite', () => {
    useNavStore.setState({ favorites: ['/merge'] });

    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    fireEvent.click(items[0]);

    expect(useNavStore.getState().favorites).not.toContain('/merge');
    expect(onClose).toHaveBeenCalled();
  });

  it('opens tool in new tab when "Open in New Tab" is clicked', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    fireEvent.click(items[1]);

    expect(windowOpenSpy).toHaveBeenCalledWith('/merge', '_blank');
    expect(onClose).toHaveBeenCalled();

    windowOpenSpy.mockRestore();
  });

  it('dismisses on Escape key', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('dismisses on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not dismiss on click inside the menu', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    fireEvent.mouseDown(screen.getByRole('menu'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('positions at the given coordinates', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 150, y: 200 }} onClose={onClose} />);

    const menu = screen.getByRole('menu');
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('200px');
  });

  it('constrains position when it would overflow the right edge', () => {
    // Simulate a narrow viewport
    Object.defineProperty(window, 'innerWidth', { value: 300, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });

    render(<NavContextMenu toolPath="/merge" position={{ x: 250, y: 100 }} onClose={onClose} />);

    const menu = screen.getByRole('menu');
    // 300 - 200 - 8 = 92
    expect(parseInt(menu.style.left)).toBeLessThan(250);
  });

  it('constrains position when it would overflow the bottom edge', () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 200, writable: true });

    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 180 }} onClose={onClose} />);

    const menu = screen.getByRole('menu');
    // 200 - 96 - 8 = 96
    expect(parseInt(menu.style.top)).toBeLessThan(180);
  });

  it('has correct styling classes', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('bg-white');
    expect(menu.className).toContain('dark:bg-gray-800');
    expect(menu.className).toContain('shadow-lg');
    expect(menu.className).toContain('rounded-md');
  });

  it('menu items have min-h-[44px] for touch target accessibility', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    items.forEach((item) => {
      expect(item.className).toContain('min-h-[44px]');
    });
  });

  it('supports arrow key navigation between menu items', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    // First item should be focused on mount
    expect(document.activeElement).toBe(items[0]);

    // Arrow down moves to second item
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);

    // Arrow down wraps to first item
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);

    // Arrow up wraps to last item
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('menu items have focus-visible styles for keyboard accessibility', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const items = screen.getAllByRole('menuitem');
    items.forEach((item) => {
      expect(item.className).toContain('focus-visible:outline-none');
      expect(item.className).toContain('focus-visible:bg-gray-100');
    });
  });
});
