import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { QuickActionsBar } from './QuickActionsBar';
import { useQuickActionsStore } from '../../store/quick-actions';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('QuickActionsBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    // Reset store to default state
    useQuickActionsStore.setState({
      isVisible: false,
      actions: [],
      resultFile: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when isVisible is false', () => {
    renderWithRouter(<QuickActionsBar />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('does not render when actions array is empty', () => {
    useQuickActionsStore.setState({ isVisible: true, actions: [], resultFile: null });
    renderWithRouter(<QuickActionsBar />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders when isVisible is true and actions are present', () => {
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress the result',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress the merged PDF',
        },
      ],
      resultFile: new ArrayBuffer(10),
    });

    renderWithRouter(<QuickActionsBar />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('displays action buttons with correct labels', () => {
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress the result',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress the merged PDF',
        },
        {
          id: 'add-page-numbers',
          label: 'Add page numbers',
          operationRoute: '/add-page-numbers',
          icon: 'page-numbers',
          ariaLabel: 'Add page numbers to the merged PDF',
        },
      ],
      resultFile: new ArrayBuffer(10),
    });

    renderWithRouter(<QuickActionsBar />);
    expect(screen.getByText('Compress the result')).toBeInTheDocument();
    expect(screen.getByText('Add page numbers')).toBeInTheDocument();
  });

  it('renders action buttons with correct aria-labels', () => {
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress the result',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress the merged PDF',
        },
      ],
      resultFile: new ArrayBuffer(10),
    });

    renderWithRouter(<QuickActionsBar />);
    expect(screen.getByLabelText('Compress the merged PDF')).toBeInTheDocument();
  });

  it('navigates to operation route with result file on action click', () => {
    const resultFile = new ArrayBuffer(100);
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress the result',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress the merged PDF',
        },
      ],
      resultFile,
    });

    renderWithRouter(<QuickActionsBar />);
    fireEvent.click(screen.getByLabelText('Compress the merged PDF'));

    expect(mockNavigate).toHaveBeenCalledWith('/compress', {
      state: { preloadedFile: resultFile },
    });
  });

  it('calls dismiss when dismiss button is clicked', () => {
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress the result',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress the merged PDF',
        },
      ],
      resultFile: new ArrayBuffer(10),
    });

    renderWithRouter(<QuickActionsBar />);
    fireEvent.click(screen.getByLabelText('Dismiss quick actions'));

    // After dismiss, isVisible should be false
    expect(useQuickActionsStore.getState().isVisible).toBe(false);
  });

  it('has accessible toolbar role and label', () => {
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress PDF',
        },
      ],
      resultFile: new ArrayBuffer(10),
    });

    renderWithRouter(<QuickActionsBar />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Quick follow-up actions');
  });

  it('animates in after a short delay', () => {
    useQuickActionsStore.setState({
      isVisible: true,
      actions: [
        {
          id: 'compress',
          label: 'Compress',
          operationRoute: '/compress',
          icon: 'compress',
          ariaLabel: 'Compress PDF',
        },
      ],
      resultFile: new ArrayBuffer(10),
    });

    renderWithRouter(<QuickActionsBar />);
    const toolbar = screen.getByRole('toolbar');

    // Initially not animated in (opacity-0)
    expect(toolbar.className).toContain('opacity-0');

    // After delay, animated in (opacity-100)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(toolbar.className).toContain('opacity-100');
  });
});
