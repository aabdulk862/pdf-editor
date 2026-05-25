import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MM_TO_PX } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import { SelectionOverlay } from './SelectionOverlay';

describe('SelectionOverlay', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      selection: { selectedIds: [], selectionBounds: null, activeHandle: null },
      viewport: { panX: 0, panY: 0, zoom: 1.0 },
    });
  });

  it('renders nothing when no elements are selected', () => {
    render(<SelectionOverlay />);
    expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
  });

  it('renders nothing when selectedIds exist but no bounds', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['el-1'], selectionBounds: null, activeHandle: null },
    });
    render(<SelectionOverlay />);
    expect(screen.queryByTestId('selection-overlay')).not.toBeInTheDocument();
  });

  it('renders the selection overlay when elements are selected with bounds', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 10, y: 20, width: 100, height: 80 },
        activeHandle: null,
      },
    });
    render(<SelectionOverlay />);
    expect(screen.getByTestId('selection-overlay')).toBeInTheDocument();
  });

  it('renders 8 resize handles plus 1 rotate handle (9 total)', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 0, y: 0, width: 200, height: 150 },
        activeHandle: null,
      },
    });
    render(<SelectionOverlay />);

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];
    handles.forEach((handle) => {
      expect(screen.getByTestId(`handle-${handle}`)).toBeInTheDocument();
    });
  });

  it('each handle has minimum 44×44px touch target', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 0, y: 0, width: 200, height: 150 },
        activeHandle: null,
      },
    });
    render(<SelectionOverlay />);

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];
    handles.forEach((handle) => {
      const el = screen.getByTestId(`handle-${handle}`);
      const style = el.style;
      expect(parseInt(style.width)).toBeGreaterThanOrEqual(44);
      expect(parseInt(style.height)).toBeGreaterThanOrEqual(44);
    });
  });

  it('calls onHandlePointerDown when a handle is clicked', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 0, y: 0, width: 200, height: 150 },
        activeHandle: null,
      },
    });

    const handlePointerDown = vi.fn();
    render(<SelectionOverlay onHandlePointerDown={handlePointerDown} />);

    fireEvent.pointerDown(screen.getByTestId('handle-nw'));
    expect(handlePointerDown).toHaveBeenCalledWith('nw', expect.any(Object));
  });

  it('calls onHandlePointerDown with rotate when rotate handle is clicked', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 0, y: 0, width: 200, height: 150 },
        activeHandle: null,
      },
    });

    const handlePointerDown = vi.fn();
    render(<SelectionOverlay onHandlePointerDown={handlePointerDown} />);

    fireEvent.pointerDown(screen.getByTestId('handle-rotate'));
    expect(handlePointerDown).toHaveBeenCalledWith('rotate', expect.any(Object));
  });

  it('positions the selection box based on viewport transform', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 50, y: 30, width: 100, height: 80 },
        activeHandle: null,
      },
      viewport: { panX: 10, panY: 5, zoom: 2.0 },
    });
    render(<SelectionOverlay />);

    const overlay = screen.getByTestId('selection-overlay');
    const box = overlay.querySelector('.border-primary-500') as HTMLElement;
    expect(box).toBeTruthy();

    // screenX = (50 * MM_TO_PX - 10) * 2
    // screenY = (30 * MM_TO_PX - 5) * 2
    // screenWidth = 100 * MM_TO_PX * 2
    // screenHeight = 80 * MM_TO_PX * 2
    expect(box.style.left).toBe(`${(50 * MM_TO_PX - 10) * 2}px`);
    expect(box.style.top).toBe(`${(30 * MM_TO_PX - 5) * 2}px`);
    expect(box.style.width).toBe(`${100 * MM_TO_PX * 2}px`);
    expect(box.style.height).toBe(`${80 * MM_TO_PX * 2}px`);
  });

  it('resize handles have appropriate aria-labels', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 0, y: 0, width: 100, height: 100 },
        activeHandle: null,
      },
    });
    render(<SelectionOverlay />);

    expect(screen.getByLabelText('Resize nw')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize se')).toBeInTheDocument();
    expect(screen.getByLabelText('Rotate element')).toBeInTheDocument();
  });

  it('rotate handle has a circular visual indicator', () => {
    useCanvasStore.setState({
      selection: {
        selectedIds: ['el-1'],
        selectionBounds: { x: 0, y: 0, width: 100, height: 100 },
        activeHandle: null,
      },
    });
    render(<SelectionOverlay />);

    const rotateHandle = screen.getByTestId('handle-rotate');
    const circle = rotateHandle.querySelector('.rounded-full');
    expect(circle).toBeTruthy();
  });
});
