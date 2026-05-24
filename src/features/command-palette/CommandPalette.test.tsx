import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { useCommandPaletteStore } from '../../store/command-palette';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

function renderCommandPalette() {
  return render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to default closed state
    useCommandPaletteStore.setState({
      isOpen: false,
      query: '',
      activeIndex: 0,
      filteredItems: useCommandPaletteStore.getState().items,
      previousFocusElement: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Open/close lifecycle', () => {
    it('does not render when isOpen is false', () => {
      renderCommandPalette();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders with accessible label', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('renders aria-modal attribute', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Keyboard event handling', () => {
    it('closes the palette when Escape is pressed', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });

    it('navigates to the active item route when Enter is pressed', () => {
      useCommandPaletteStore.setState({ isOpen: true, activeIndex: 0 });

      renderCommandPalette();

      const activeItem = useCommandPaletteStore.getState().filteredItems[0];
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith(activeItem.route);
    });

    it('closes the palette after Enter navigation', () => {
      useCommandPaletteStore.setState({ isOpen: true, activeIndex: 0 });

      renderCommandPalette();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });

      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });

    it('moves selection down when ArrowDown is pressed', () => {
      useCommandPaletteStore.setState({ isOpen: true, activeIndex: 0 });

      renderCommandPalette();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowDown' });

      expect(useCommandPaletteStore.getState().activeIndex).toBe(1);
    });

    it('moves selection up when ArrowUp is pressed', () => {
      useCommandPaletteStore.setState({ isOpen: true, activeIndex: 1 });

      renderCommandPalette();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowUp' });

      expect(useCommandPaletteStore.getState().activeIndex).toBe(0);
    });

    it('wraps selection to first item when ArrowDown is pressed at last item', () => {
      const items = useCommandPaletteStore.getState().filteredItems;
      useCommandPaletteStore.setState({ isOpen: true, activeIndex: items.length - 1 });

      renderCommandPalette();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowDown' });

      expect(useCommandPaletteStore.getState().activeIndex).toBe(0);
    });

    it('wraps selection to last item when ArrowUp is pressed at first item', () => {
      const items = useCommandPaletteStore.getState().filteredItems;
      useCommandPaletteStore.setState({ isOpen: true, activeIndex: 0 });

      renderCommandPalette();

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowUp' });

      expect(useCommandPaletteStore.getState().activeIndex).toBe(items.length - 1);
    });
  });

  describe('Focus management', () => {
    it('auto-focuses the search input when opened', async () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      // The component uses requestAnimationFrame for focus
      await waitFor(() => {
        const input = screen.getByLabelText('Search commands');
        expect(input).toBeInTheDocument();
      });
    });

    it('renders a search input with placeholder text', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      expect(screen.getByPlaceholderText('Search operations...')).toBeInTheDocument();
    });
  });

  describe('Click-outside behavior', () => {
    it('closes the palette when clicking the backdrop', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      // Click on the dialog element itself (the backdrop area)
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(useCommandPaletteStore.getState().isOpen).toBe(false);
    });

    it('does not close when clicking inside the modal content', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      // Click on the search input (inside the modal content)
      const input = screen.getByLabelText('Search commands');
      fireEvent.click(input);

      expect(useCommandPaletteStore.getState().isOpen).toBe(true);
    });
  });

  describe('Results display', () => {
    it('displays "No results found" when filter returns empty', () => {
      useCommandPaletteStore.setState({ isOpen: true, filteredItems: [], query: 'zzzzz' });

      renderCommandPalette();

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('displays filtered items as a listbox', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      expect(screen.getByRole('listbox', { name: 'Available commands' })).toBeInTheDocument();
    });

    it('navigates when clicking a list item', () => {
      useCommandPaletteStore.setState({ isOpen: true });

      renderCommandPalette();

      const items = useCommandPaletteStore.getState().filteredItems;
      const firstOption = screen.getAllByRole('option')[0];
      fireEvent.click(firstOption);

      expect(mockNavigate).toHaveBeenCalledWith(items[0].route);
    });
  });
});
