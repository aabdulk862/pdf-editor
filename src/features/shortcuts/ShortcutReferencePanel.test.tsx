import { render, fireEvent, act, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ShortcutProvider, useShortcutContext } from './ShortcutProvider';
import { ShortcutReferencePanel, filterShortcuts } from './ShortcutReferencePanel';
import { useShortcutStore } from '../../store/shortcuts';
import type { ShortcutBinding } from './types';

// Helper component that renders the panel within the provider context
function TestWrapper({ children }: { children?: React.ReactNode }) {
  return (
    <ShortcutProvider>
      <ShortcutReferencePanel />
      {children}
    </ShortcutProvider>
  );
}

// Helper to open the reference panel via context
function PanelOpener() {
  const { openReferencePanel } = useShortcutContext();
  return (
    <button data-testid="open-panel" onClick={openReferencePanel}>
      Open Panel
    </button>
  );
}

describe('ShortcutReferencePanel', () => {
  beforeEach(() => {
    // Reset store
    const store = useShortcutStore.getState();
    for (const binding of store.getAll()) {
      store.unregister(binding.id);
    }
  });

  afterEach(() => {
    const store = useShortcutStore.getState();
    for (const binding of store.getAll()) {
      store.unregister(binding.id);
    }
  });

  it('does not render when panel is closed', () => {
    render(<TestWrapper />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders as a dialog when panel is opened', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Keyboard Shortcuts Reference')).toBeInTheDocument();
  });

  it('displays shortcuts grouped by category', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    // The provider registers application-level shortcuts
    expect(screen.getByText('Application')).toBeInTheDocument();
  });

  it('displays shortcut labels and formatted key combinations', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    // The provider registers "Open Command Palette" shortcut
    expect(screen.getAllByText('Open Command Palette').length).toBeGreaterThan(0);
  });

  it('closes when Escape is pressed', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when clicking outside the panel', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click the backdrop (the presentation div wrapping the dialog)
    const backdrop = screen.getByRole('presentation');
    act(() => {
      fireEvent.click(backdrop);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters shortcuts by search query', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    const searchInput = screen.getByLabelText('Search shortcuts');

    // Search for "theme"
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'theme' } });
    });

    // Should show Toggle Theme but not other shortcuts
    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    // "Open Command Palette" should be filtered out
    expect(screen.queryByText('Open Command Palette')).not.toBeInTheDocument();
  });

  it('shows "No shortcuts found" when search has no results', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    const searchInput = screen.getByLabelText('Search shortcuts');

    act(() => {
      fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    });

    expect(screen.getByText('No shortcuts found')).toBeInTheDocument();
  });

  it('has accessible close button', () => {
    render(
      <TestWrapper>
        <PanelOpener />
      </TestWrapper>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('open-panel'));
    });

    const closeButton = screen.getByLabelText('Close shortcuts panel');
    expect(closeButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('filterShortcuts', () => {
  const mockBindings: ShortcutBinding[] = [
    {
      id: 'nav-merge',
      keys: { key: 'm', ctrl: true },
      action: () => {},
      label: 'Navigate to Merge',
      category: 'navigation',
      scope: 'global',
      bypassInputFocus: false,
    },
    {
      id: 'app-palette',
      keys: { key: 'k', meta: true },
      action: () => {},
      label: 'Open Command Palette',
      category: 'application',
      scope: 'global',
      bypassInputFocus: true,
    },
    {
      id: 'app-theme',
      keys: { key: 'd', meta: true, shift: true },
      action: () => {},
      label: 'Toggle Theme',
      category: 'application',
      scope: 'global',
      bypassInputFocus: true,
    },
  ];

  it('returns all bindings when query is empty', () => {
    expect(filterShortcuts(mockBindings, '', 'mac')).toEqual(mockBindings);
    expect(filterShortcuts(mockBindings, '   ', 'mac')).toEqual(mockBindings);
  });

  it('filters by label (case-insensitive)', () => {
    const result = filterShortcuts(mockBindings, 'merge', 'mac');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nav-merge');
  });

  it('filters by formatted key combination', () => {
    // On mac, meta key is ⌘
    const result = filterShortcuts(mockBindings, '⌘', 'mac');
    expect(result).toHaveLength(2); // palette and theme both have meta
  });

  it('supports multi-token matching', () => {
    const result = filterShortcuts(mockBindings, 'open palette', 'mac');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('app-palette');
  });

  it('returns empty array when no bindings match', () => {
    const result = filterShortcuts(mockBindings, 'nonexistent', 'mac');
    expect(result).toHaveLength(0);
  });

  it('matches against formatted key on windows', () => {
    const result = filterShortcuts(mockBindings, 'Ctrl', 'windows');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nav-merge');
  });
});
