import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRovingTabindex } from './useRovingTabindex';

/** Test harness component that renders a list with roving tabindex */
function TestList({
  itemCount = 5,
  wrap = true,
  onActivate,
}: {
  itemCount?: number;
  wrap?: boolean;
  onActivate?: (index: number) => void;
}) {
  const { getTabIndex, getItemRef, handleKeyDown } = useRovingTabindex({
    itemCount,
    wrap,
    onActivate,
  });

  return (
    <ul role="listbox" onKeyDown={handleKeyDown} data-testid="list">
      {Array.from({ length: itemCount }, (_, i) => (
        <li key={i}>
          <button ref={getItemRef(i)} tabIndex={getTabIndex(i)} data-testid={`item-${i}`}>
            Item {i}
          </button>
        </li>
      ))}
    </ul>
  );
}

describe('useRovingTabindex', () => {
  it('sets tabIndex=0 on first item and tabIndex=-1 on others initially', () => {
    render(<TestList itemCount={3} />);

    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('item-1')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('item-2')).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus to next item on ArrowDown', () => {
    render(<TestList itemCount={3} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    // Focus the first item
    item0.focus();

    // Press ArrowDown
    fireEvent.keyDown(list, { key: 'ArrowDown' });

    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('item-1')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-1'));
  });

  it('moves focus to previous item on ArrowUp', () => {
    render(<TestList itemCount={3} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    // Focus first item, move down, then up
    item0.focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowUp' });

    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-0'));
  });

  it('wraps from last to first on ArrowDown when wrap=true', () => {
    render(<TestList itemCount={3} wrap={true} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 1
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 2
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 0 (wrap)

    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-0'));
  });

  it('wraps from first to last on ArrowUp when wrap=true', () => {
    render(<TestList itemCount={3} wrap={true} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: 'ArrowUp' }); // → 2 (wrap)

    expect(screen.getByTestId('item-2')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-2'));
  });

  it('does not wrap when wrap=false', () => {
    render(<TestList itemCount={3} wrap={false} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: 'ArrowUp' }); // stays at 0

    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-0'));
  });

  it('moves focus to first item on Home key', () => {
    render(<TestList itemCount={5} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 1
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 2
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 3
    fireEvent.keyDown(list, { key: 'Home' }); // → 0

    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-0'));
  });

  it('moves focus to last item on End key', () => {
    render(<TestList itemCount={5} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: 'End' }); // → 4

    expect(screen.getByTestId('item-4')).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(screen.getByTestId('item-4'));
  });

  it('calls onActivate with focused index on Enter', () => {
    const onActivate = vi.fn();
    render(<TestList itemCount={3} onActivate={onActivate} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' }); // → 1
    fireEvent.keyDown(list, { key: 'Enter' });

    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it('calls onActivate with focused index on Space', () => {
    const onActivate = vi.fn();
    render(<TestList itemCount={3} onActivate={onActivate} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');

    item0.focus();
    fireEvent.keyDown(list, { key: ' ' });

    expect(onActivate).toHaveBeenCalledWith(0);
  });

  it('prevents default on handled keys', () => {
    render(<TestList itemCount={3} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');
    item0.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    list.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does not interfere with unhandled keys', () => {
    const onActivate = vi.fn();
    render(<TestList itemCount={3} onActivate={onActivate} />);

    const list = screen.getByTestId('list');
    const item0 = screen.getByTestId('item-0');
    item0.focus();

    fireEvent.keyDown(list, { key: 'a' });
    fireEvent.keyDown(list, { key: 'Tab' });

    // Focus should not have moved
    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('handles empty list gracefully', () => {
    render(<TestList itemCount={0} />);

    const list = screen.getByTestId('list');

    // Should not throw
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Home' });
    fireEvent.keyDown(list, { key: 'End' });
  });
});
