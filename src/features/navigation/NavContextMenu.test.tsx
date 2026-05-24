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

    expect(screen.getByRole('menuitem')).toHaveTextContent('Add to Favorites');
  });

  it('renders "Remove from Favorites" when tool is a favorite', () => {
    useNavStore.setState({ favorites: ['/merge'] });

    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    expect(screen.getByRole('menuitem')).toHaveTextContent('Remove from Favorites');
  });

  it('calls toggleFavorite and onClose when action is clicked', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    fireEvent.click(screen.getByRole('menuitem'));

    expect(useNavStore.getState().favorites).toContain('/merge');
    expect(onClose).toHaveBeenCalled();
  });

  it('removes from favorites and calls onClose when action is clicked on a favorite', () => {
    useNavStore.setState({ favorites: ['/merge'] });

    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    fireEvent.click(screen.getByRole('menuitem'));

    expect(useNavStore.getState().favorites).not.toContain('/merge');
    expect(onClose).toHaveBeenCalled();
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
    // 200 - 48 - 8 = 144
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

  it('menu item has min-h-[44px] for touch target accessibility', () => {
    render(<NavContextMenu toolPath="/merge" position={{ x: 100, y: 100 }} onClose={onClose} />);

    const menuItem = screen.getByRole('menuitem');
    expect(menuItem.className).toContain('min-h-[44px]');
  });
});
