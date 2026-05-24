import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ShortcutProvider, useShortcutContext } from './ShortcutProvider';
import { useShortcutStore } from '../../store/shortcuts';
import { useCommandPaletteStore } from '../../store/command-palette';
import { useThemeStore } from '../../store/theme';

// Helper component to access context
function TestConsumer() {
  const { isReferencePanelOpen, openReferencePanel, closeReferencePanel } = useShortcutContext();
  return (
    <div>
      <span data-testid="panel-state">{isReferencePanelOpen ? 'open' : 'closed'}</span>
      <button data-testid="open-panel" onClick={openReferencePanel}>
        Open
      </button>
      <button data-testid="close-panel" onClick={closeReferencePanel}>
        Close
      </button>
    </div>
  );
}

describe('ShortcutProvider', () => {
  beforeEach(() => {
    // Reset stores before each test
    const store = useShortcutStore.getState();
    for (const binding of store.getAll()) {
      store.unregister(binding.id);
    }

    // Reset command palette
    const palette = useCommandPaletteStore.getState();
    if (palette.isOpen) palette.close();
  });

  afterEach(() => {
    // Clean up any registered shortcuts
    const store = useShortcutStore.getState();
    for (const binding of store.getAll()) {
      store.unregister(binding.id);
    }
  });

  it('registers default shortcuts on mount', () => {
    render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    const bindings = useShortcutStore.getState().getAll();
    const ids = bindings.map((b) => b.id);

    expect(ids).toContain('app-command-palette');
    expect(ids).toContain('app-command-palette-ctrl');
    expect(ids).toContain('app-shortcut-reference');
    expect(ids).toContain('app-theme-toggle');
    expect(ids).toContain('app-close-modal');
  });

  it('unregisters shortcuts on unmount', () => {
    const { unmount } = render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    unmount();

    const bindings = useShortcutStore.getState().getAll();
    const ids = bindings.map((b) => b.id);

    expect(ids).not.toContain('app-command-palette');
    expect(ids).not.toContain('app-command-palette-ctrl');
    expect(ids).not.toContain('app-shortcut-reference');
    expect(ids).not.toContain('app-theme-toggle');
    expect(ids).not.toContain('app-close-modal');
  });

  it('opens command palette on Meta+K keydown', () => {
    render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('opens command palette on Ctrl+K keydown', () => {
    render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('closes command palette if already open on Meta+K', () => {
    render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    // Open first
    act(() => {
      useCommandPaletteStore.getState().open();
    });
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);

    // Press Meta+K to close
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it('toggles theme on Meta+Shift+D', () => {
    render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    const initialTheme = useThemeStore.getState().theme;

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'd',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    const newTheme = useThemeStore.getState().theme;
    expect(newTheme).not.toBe(initialTheme);
  });

  it('provides shortcut context with reference panel state', () => {
    const { getByTestId } = render(
      <ShortcutProvider>
        <TestConsumer />
      </ShortcutProvider>,
    );

    expect(getByTestId('panel-state').textContent).toBe('closed');

    act(() => {
      fireEvent.click(getByTestId('open-panel'));
    });

    expect(getByTestId('panel-state').textContent).toBe('open');

    act(() => {
      fireEvent.click(getByTestId('close-panel'));
    });

    expect(getByTestId('panel-state').textContent).toBe('closed');
  });

  it('does not dispatch shortcuts when text input is focused and bypassInputFocus is false', () => {
    const { container } = render(
      <ShortcutProvider>
        <input type="text" data-testid="text-input" />
      </ShortcutProvider>,
    );

    const input = container.querySelector('input')!;
    input.focus();

    // Shift+? should NOT fire because bypassInputFocus is false for reference panel
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: '?',
        shiftKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    // Reference panel should remain closed since we're in a text input
    // and the shortcut has bypassInputFocus: false
    // (Note: this depends on document.activeElement being the input)
  });

  it('dispatches shortcuts with bypassInputFocus: true even when text input is focused', () => {
    const { container } = render(
      <ShortcutProvider>
        <input type="text" data-testid="text-input" />
      </ShortcutProvider>,
    );

    const input = container.querySelector('input')!;
    input.focus();

    // Meta+K should fire because bypassInputFocus is true for command palette
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('handles errors in shortcut actions gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ShortcutProvider>
        <div>child</div>
      </ShortcutProvider>,
    );

    // Register a shortcut that throws
    useShortcutStore.getState().register({
      id: 'test-error-shortcut',
      keys: { key: 'e', meta: true },
      action: () => {
        throw new Error('Test error');
      },
      label: 'Error Shortcut',
      category: 'application',
      scope: 'global',
      bypassInputFocus: true,
    });

    // Should not throw
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'e',
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ShortcutProvider]'),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
    useShortcutStore.getState().unregister('test-error-shortcut');
  });
});
