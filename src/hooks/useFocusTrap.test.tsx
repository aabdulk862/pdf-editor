import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRef, useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

/** Test harness: a simple dialog-like container with focusable elements */
function TestDialog({
  enabled,
  autoFocus = true,
  restoreFocus = true,
  children,
}: {
  enabled: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, { enabled, autoFocus, restoreFocus });

  return (
    <div ref={containerRef} data-testid="trap-container">
      {children ?? (
        <>
          <button data-testid="btn-first">First</button>
          <input data-testid="input-middle" />
          <button data-testid="btn-last">Last</button>
        </>
      )}
    </div>
  );
}

/** Test harness that toggles the trap on/off */
function ToggleableDialog() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button data-testid="trigger" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <TestDialog enabled={open}>
          <button data-testid="btn-first">First</button>
          <button data-testid="btn-close" onClick={() => setOpen(false)}>
            Close
          </button>
        </TestDialog>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses the first focusable element when enabled', async () => {
    render(<TestDialog enabled={true} />);

    // requestAnimationFrame is used for auto-focus
    await vi.advanceTimersByTimeAsync(16);

    expect(document.activeElement).toBe(screen.getByTestId('btn-first'));
  });

  it('does not auto-focus when autoFocus is false', async () => {
    render(<TestDialog enabled={true} autoFocus={false} />);

    await vi.advanceTimersByTimeAsync(16);

    expect(document.activeElement).not.toBe(screen.getByTestId('btn-first'));
  });

  it('traps Tab at the last element by wrapping to the first', async () => {
    render(<TestDialog enabled={true} />);

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');
    const lastBtn = screen.getByTestId('btn-last');

    // Focus the last element
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    // Press Tab on the last element
    fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

    expect(document.activeElement).toBe(screen.getByTestId('btn-first'));
  });

  it('traps Shift+Tab at the first element by wrapping to the last', async () => {
    render(<TestDialog enabled={true} />);

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');
    const firstBtn = screen.getByTestId('btn-first');

    // Focus should already be on first element
    expect(document.activeElement).toBe(firstBtn);

    // Press Shift+Tab on the first element
    fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(screen.getByTestId('btn-last'));
  });

  it('allows normal Tab navigation between middle elements', async () => {
    render(<TestDialog enabled={true} />);

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');
    const firstBtn = screen.getByTestId('btn-first');

    // Focus is on first element
    expect(document.activeElement).toBe(firstBtn);

    // Tab from first element should NOT be prevented (browser handles it)
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    // Should not prevent default since we're not at the last element
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('prevents Tab from leaving when container has no focusable elements', async () => {
    render(
      <TestDialog enabled={true}>
        <p>No focusable elements here</p>
      </TestDialog>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('focuses the container itself when there are no focusable elements', async () => {
    render(
      <TestDialog enabled={true}>
        <p>No focusable elements here</p>
      </TestDialog>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');
    expect(document.activeElement).toBe(container);
    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('restores focus to the trigger element when disabled', async () => {
    render(<ToggleableDialog />);

    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open the dialog
    fireEvent.click(trigger);
    await vi.advanceTimersByTimeAsync(16);

    expect(document.activeElement).toBe(screen.getByTestId('btn-first'));

    // Close the dialog
    fireEvent.click(screen.getByTestId('btn-close'));
    await vi.advanceTimersByTimeAsync(16);

    // Focus should be restored to the trigger
    expect(document.activeElement).toBe(trigger);
  });

  it('does not restore focus when restoreFocus is false', async () => {
    function NoRestoreDialog() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button data-testid="trigger" onClick={() => setOpen(true)}>
            Open
          </button>
          {open && (
            <TestDialog enabled={open} restoreFocus={false}>
              <button data-testid="btn-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </TestDialog>
          )}
        </div>
      );
    }

    render(<NoRestoreDialog />);

    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    fireEvent.click(trigger);
    await vi.advanceTimersByTimeAsync(16);

    fireEvent.click(screen.getByTestId('btn-close'));
    await vi.advanceTimersByTimeAsync(16);

    // Focus should NOT be restored to trigger
    expect(document.activeElement).not.toBe(trigger);
  });

  it('skips disabled buttons when determining focusable elements', async () => {
    render(
      <TestDialog enabled={true}>
        <button disabled data-testid="btn-disabled">
          Disabled
        </button>
        <button data-testid="btn-enabled">Enabled</button>
      </TestDialog>,
    );

    await vi.advanceTimersByTimeAsync(16);

    // Should focus the enabled button, not the disabled one
    expect(document.activeElement).toBe(screen.getByTestId('btn-enabled'));
  });

  it('includes elements with tabindex >= 0 as focusable', async () => {
    render(
      <TestDialog enabled={true}>
        <div tabIndex={0} data-testid="div-focusable">
          Focusable div
        </div>
        <button data-testid="btn-after">After</button>
      </TestDialog>,
    );

    await vi.advanceTimersByTimeAsync(16);

    expect(document.activeElement).toBe(screen.getByTestId('div-focusable'));
  });

  it('excludes elements with tabindex="-1" from the trap cycle', async () => {
    render(
      <TestDialog enabled={true}>
        <div tabIndex={-1} data-testid="div-not-tabbable">
          Not tabbable
        </div>
        <button data-testid="btn-only">Only button</button>
      </TestDialog>,
    );

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');
    const onlyBtn = screen.getByTestId('btn-only');

    expect(document.activeElement).toBe(onlyBtn);

    // Tab from the only button should wrap back to itself
    fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(onlyBtn);

    // Shift+Tab should also wrap back to itself
    fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(onlyBtn);
  });

  it('does not trap focus when enabled is false', () => {
    render(<TestDialog enabled={false} />);

    const container = screen.getByTestId('trap-container');
    const lastBtn = screen.getByTestId('btn-last');

    lastBtn.focus();

    // Tab should not be intercepted
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('does not interfere with non-Tab keys', async () => {
    render(<TestDialog enabled={true} />);

    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('handles dynamically added focusable elements', async () => {
    function DynamicDialog() {
      const [showExtra, setShowExtra] = useState(false);
      const containerRef = useRef<HTMLDivElement>(null);
      useFocusTrap(containerRef, { enabled: true });

      return (
        <div ref={containerRef} data-testid="trap-container">
          <button data-testid="btn-first">First</button>
          {showExtra && <button data-testid="btn-dynamic">Dynamic</button>}
          <button data-testid="btn-add" onClick={() => setShowExtra(true)}>
            Add
          </button>
        </div>
      );
    }

    render(<DynamicDialog />);
    await vi.advanceTimersByTimeAsync(16);

    const container = screen.getByTestId('trap-container');

    // Add a dynamic element
    fireEvent.click(screen.getByTestId('btn-add'));

    // Focus the new last element (btn-add)
    const addBtn = screen.getByTestId('btn-add');
    addBtn.focus();

    // Tab from the last element should wrap to first
    fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(screen.getByTestId('btn-first'));
  });
});
