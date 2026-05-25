import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { MinimapOverlay } from './MinimapOverlay';
import { useCanvasStore } from '../store/canvas-store';
import type { CanvasDocument } from '../types';

function createTestDocument(): CanvasDocument {
  return {
    id: 'test-doc',
    name: 'Test Document',
    pages: [
      {
        id: 'page-1',
        width: 210,
        height: 297,
        backgroundColor: '#FFFFFF',
        elements: [
          {
            id: 'el-1',
            type: 'shape',
            x: 50,
            y: 50,
            width: 60,
            height: 40,
            rotation: 0,
            opacity: 100,
            zIndex: 0,
            locked: false,
            visible: true,
            shapeType: 'rectangle',
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 1,
            borderStyle: 'solid',
          },
          {
            id: 'el-2',
            type: 'text',
            x: 20,
            y: 100,
            width: 80,
            height: 20,
            rotation: 0,
            opacity: 100,
            zIndex: 1,
            locked: false,
            visible: true,
            content: 'Hello',
            fontFamily: 'Arial',
            fontSize: 14,
            fontColor: '#000000',
            bold: false,
            italic: false,
            underline: false,
            alignment: 'left',
          },
          {
            id: 'el-hidden',
            type: 'shape',
            x: 100,
            y: 100,
            width: 30,
            height: 30,
            rotation: 0,
            opacity: 100,
            zIndex: 2,
            locked: false,
            visible: false,
            shapeType: 'circle',
            fill: '#00ff00',
            stroke: '#000000',
            strokeWidth: 1,
            borderStyle: 'solid',
          },
        ],
      },
    ],
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('MinimapOverlay', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      document: createTestDocument(),
      viewport: { panX: 0, panY: 0, zoom: 1.0 },
    });
  });

  it('renders nothing when no document is loaded', () => {
    useCanvasStore.setState({ document: null });
    const { container } = render(<MinimapOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the minimap with correct role and aria label', () => {
    render(<MinimapOverlay />);
    expect(
      screen.getByRole('navigation', { name: 'Minimap - click to navigate' }),
    ).toBeInTheDocument();
  });

  it('renders with 120x160px dimensions', () => {
    render(<MinimapOverlay />);
    const minimap = screen.getByRole('navigation', { name: 'Minimap - click to navigate' });
    expect(minimap).toHaveStyle({ width: '120px', height: '160px' });
  });

  it('renders visible elements as indicators', () => {
    const { container } = render(<MinimapOverlay />);
    // el-1 is a shape (accent), el-2 is text (primary), el-hidden is not visible
    const accentIndicators = container.querySelectorAll('.bg-accent-400\\/50');
    const primaryIndicators = container.querySelectorAll('.bg-primary-400\\/50');
    expect(accentIndicators.length).toBe(1);
    expect(primaryIndicators.length).toBe(1);
  });

  it('does not render hidden elements', () => {
    const { container } = render(<MinimapOverlay />);
    // el-hidden has visible: false, so only 2 elements should be rendered
    const allIndicators = container.querySelectorAll(
      '.bg-accent-400\\/50, .bg-primary-400\\/50, .bg-success-400\\/50, .bg-secondary-400\\/50',
    );
    expect(allIndicators.length).toBe(2);
  });

  it('renders viewport indicator rectangle', () => {
    const { container } = render(<MinimapOverlay />);
    const indicator = container.querySelector('.border-primary-500');
    expect(indicator).toBeInTheDocument();
  });

  it('updates pan position when minimap is clicked', () => {
    render(<MinimapOverlay />);
    const minimap = screen.getByRole('navigation', { name: 'Minimap - click to navigate' });

    // Mock getBoundingClientRect
    Object.defineProperty(minimap, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 120,
        height: 160,
        right: 120,
        bottom: 160,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    const initialPanX = useCanvasStore.getState().viewport.panX;
    const initialPanY = useCanvasStore.getState().viewport.panY;

    // Click in the center of the minimap
    fireEvent.click(minimap, { clientX: 60, clientY: 80 });

    const newState = useCanvasStore.getState().viewport;
    // Pan should have changed (exact values depend on the calculation)
    expect(newState.panX !== initialPanX || newState.panY !== initialPanY).toBe(true);
  });

  it('uses absolute positioning for placement within parent container', () => {
    render(<MinimapOverlay />);
    const minimap = screen.getByRole('navigation', { name: 'Minimap - click to navigate' });
    expect(minimap.className).toContain('absolute');
    expect(minimap.className).toContain('bottom-4');
    expect(minimap.className).toContain('right-4');
  });

  it('has crosshair cursor for click-to-navigate affordance', () => {
    render(<MinimapOverlay />);
    const minimap = screen.getByRole('navigation', { name: 'Minimap - click to navigate' });
    expect(minimap.className).toContain('cursor-crosshair');
  });
});
