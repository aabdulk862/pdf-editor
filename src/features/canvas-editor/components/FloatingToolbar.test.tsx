import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FloatingToolbar } from './FloatingToolbar';
import { useCanvasStore } from '../store/canvas-store';

describe('FloatingToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCanvasStore.setState({ activeTool: 'select' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the toolbar with correct role and label', () => {
    render(<FloatingToolbar />);
    const toolbar = screen.getByRole('toolbar', { name: 'Canvas tools' });
    expect(toolbar).toBeInTheDocument();
  });

  it('renders all tool buttons', () => {
    render(<FloatingToolbar />);
    expect(screen.getByLabelText('Select')).toBeInTheDocument();
    expect(screen.getByLabelText('Pan')).toBeInTheDocument();
    expect(screen.getByLabelText('Rectangle')).toBeInTheDocument();
    expect(screen.getByLabelText('Circle')).toBeInTheDocument();
    expect(screen.getByLabelText('Line')).toBeInTheDocument();
    expect(screen.getByLabelText('Arrow')).toBeInTheDocument();
    expect(screen.getByLabelText('Star')).toBeInTheDocument();
    expect(screen.getByLabelText('Polygon')).toBeInTheDocument();
    expect(screen.getByLabelText('Text')).toBeInTheDocument();
    expect(screen.getByLabelText('Image')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom In')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom Out')).toBeInTheDocument();
    expect(screen.getByLabelText('Fit to Page')).toBeInTheDocument();
  });

  it('highlights the active tool with aria-pressed', () => {
    useCanvasStore.setState({ activeTool: 'rectangle' });
    render(<FloatingToolbar />);
    const rectButton = screen.getByLabelText('Rectangle');
    expect(rectButton).toHaveAttribute('aria-pressed', 'true');
    const selectButton = screen.getByLabelText('Select');
    expect(selectButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('changes active tool when a tool button is clicked', () => {
    render(<FloatingToolbar />);
    const textButton = screen.getByLabelText('Text');
    fireEvent.click(textButton);
    expect(useCanvasStore.getState().activeTool).toBe('text');
  });

  it('calls zoomBy when zoom in is clicked', () => {
    render(<FloatingToolbar />);
    const initialZoom = useCanvasStore.getState().viewport.zoom;
    fireEvent.click(screen.getByLabelText('Zoom In'));
    expect(useCanvasStore.getState().viewport.zoom).toBeGreaterThan(initialZoom);
  });

  it('calls zoomBy when zoom out is clicked', () => {
    useCanvasStore.setState({ viewport: { panX: 0, panY: 0, zoom: 1.0 } });
    render(<FloatingToolbar />);
    fireEvent.click(screen.getByLabelText('Zoom Out'));
    expect(useCanvasStore.getState().viewport.zoom).toBeLessThan(1.0);
  });

  it('resets zoom to 1.0 when fit to page is clicked', () => {
    useCanvasStore.setState({ viewport: { panX: 0, panY: 0, zoom: 2.0 } });
    render(<FloatingToolbar />);
    fireEvent.click(screen.getByLabelText('Fit to Page'));
    expect(useCanvasStore.getState().viewport.zoom).toBe(1.0);
  });

  it('shows tooltip with shortcut after 500ms hover delay', () => {
    render(<FloatingToolbar />);
    const selectButton = screen.getByLabelText('Select');
    fireEvent.mouseEnter(selectButton);

    // Tooltip should not be visible immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Advance timer by 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Select');
    expect(tooltip).toHaveTextContent('(V)');
  });

  it('hides tooltip on mouse leave', () => {
    render(<FloatingToolbar />);
    const selectButton = screen.getByLabelText('Select');
    fireEvent.mouseEnter(selectButton);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(selectButton);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders group dividers between tool groups', () => {
    const { container } = render(<FloatingToolbar />);
    // There are 4 groups, so 3 dividers
    const dividers = container.querySelectorAll('[aria-hidden="true"]');
    expect(dividers).toHaveLength(3);
  });

  it('includes title attribute with shortcut for keyboard accessibility', () => {
    render(<FloatingToolbar />);
    const selectButton = screen.getByLabelText('Select');
    expect(selectButton).toHaveAttribute('title', 'Select (V)');
    const rectButton = screen.getByLabelText('Rectangle');
    expect(rectButton).toHaveAttribute('title', 'Rectangle (R)');
  });
});
