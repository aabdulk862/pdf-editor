import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NavToolLink } from './NavToolLink';

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="mock-icon" className={className} />
);

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('NavToolLink', () => {
  let onContextMenu: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onContextMenu = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders icon and label with correct spacing', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText('Merge')).toBeInTheDocument();
  });

  it('renders icon at 20x20px (w-5 h-5)', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const icon = screen.getByTestId('mock-icon');
    expect(icon.getAttribute('class')).toContain('w-5');
    expect(icon.getAttribute('class')).toContain('h-5');
  });

  it('applies gap-2 spacing between icon and label', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const link = screen.getByRole('link');
    expect(link.className).toContain('gap-2');
  });

  it('applies active styling when route matches', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
      { route: '/merge' },
    );

    const link = screen.getByRole('link');
    expect(link.className).toContain('border-l-[3px]');
    expect(link.className).toContain('border-primary-600');
    expect(link.className).toContain('bg-primary-50');
  });

  it('applies inactive styling when route does not match', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
      { route: '/split' },
    );

    const link = screen.getByRole('link');
    expect(link.className).toContain('border-transparent');
    expect(link.className).toContain('hover:bg-gray-100');
  });

  it('has minimum 44px height for touch target', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const link = screen.getByRole('link');
    expect(link.className).toContain('min-h-[44px]');
  });

  it('calls onContextMenu with position on right-click', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const link = screen.getByRole('link');
    fireEvent.contextMenu(link, { clientX: 150, clientY: 200 });

    expect(onContextMenu).toHaveBeenCalledWith({ x: 150, y: 200 });
  });

  it('calls onContextMenu after 500ms long-press on touch', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const link = screen.getByRole('link');

    fireEvent.touchStart(link, {
      touches: [{ clientX: 100, clientY: 250 }],
    });

    expect(onContextMenu).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onContextMenu).toHaveBeenCalledWith({ x: 100, y: 250 });
  });

  it('does not call onContextMenu if touch ends before 500ms', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const link = screen.getByRole('link');

    fireEvent.touchStart(link, {
      touches: [{ clientX: 100, clientY: 250 }],
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.touchEnd(link);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onContextMenu).not.toHaveBeenCalled();
  });

  it('does not call onContextMenu if touch moves before 500ms', () => {
    renderWithRouter(
      <NavToolLink path="/merge" label="Merge" icon={MockIcon} onContextMenu={onContextMenu} />,
    );

    const link = screen.getByRole('link');

    fireEvent.touchStart(link, {
      touches: [{ clientX: 100, clientY: 250 }],
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    fireEvent.touchMove(link);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onContextMenu).not.toHaveBeenCalled();
  });
});
