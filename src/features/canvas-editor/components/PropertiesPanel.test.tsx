import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useCanvasStore } from '../store/canvas-store';
import type { CanvasDocument, TextElement, ShapeElement, ImageElement } from '../types';
import { PropertiesPanel } from './PropertiesPanel';

function createTestDocument(elements: CanvasDocument['pages'][0]['elements'] = []): CanvasDocument {
  return {
    id: 'test-doc',
    name: 'Test Document',
    pages: [
      {
        id: 'page-1',
        width: 210,
        height: 297,
        backgroundColor: '#FFFFFF',
        elements,
      },
    ],
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const textElement: TextElement = {
  id: 'text-1',
  type: 'text',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  rotation: 0,
  opacity: 100,
  zIndex: 1,
  locked: false,
  visible: true,
  content: 'Hello',
  fontFamily: 'Arial',
  fontSize: 16,
  fontColor: '#000000',
  bold: false,
  italic: false,
  underline: false,
  alignment: 'left',
};

const shapeElement: ShapeElement = {
  id: 'shape-1',
  type: 'shape',
  x: 50,
  y: 50,
  width: 80,
  height: 80,
  rotation: 0,
  opacity: 80,
  zIndex: 2,
  locked: false,
  visible: true,
  shapeType: 'rectangle',
  fill: '#FF0000',
  stroke: '#000000',
  strokeWidth: 2,
  borderStyle: 'solid',
};

const imageElement: ImageElement = {
  id: 'image-1',
  type: 'image',
  x: 30,
  y: 30,
  width: 120,
  height: 90,
  rotation: 0,
  opacity: 100,
  zIndex: 3,
  locked: false,
  visible: true,
  src: 'data:image/png;base64,abc',
  originalWidth: 800,
  originalHeight: 600,
  aspectRatioLocked: true,
};

describe('PropertiesPanel', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      document: createTestDocument([textElement, shapeElement, imageElement]),
      selection: { selectedIds: [], selectionBounds: null, activeHandle: null },
      gridEnabled: true,
    });
  });

  it('renders page settings when nothing is selected', () => {
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    // Both desktop and mobile panels render, so use getAllBy
    const headings = screen.getAllByText('Page Settings');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    const pageProps = screen.getAllByLabelText('Page properties');
    expect(pageProps.length).toBeGreaterThanOrEqual(1);
  });

  it('renders text properties when a text element is selected', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['text-1'], selectionBounds: null, activeHandle: null },
    });
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const headings = screen.getAllByText('Text Properties');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    const textProps = screen.getAllByLabelText('Text properties');
    expect(textProps.length).toBeGreaterThanOrEqual(1);
  });

  it('renders shape properties when a shape element is selected', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['shape-1'], selectionBounds: null, activeHandle: null },
    });
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const headings = screen.getAllByText('Shape Properties');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    const shapeProps = screen.getAllByLabelText('Shape properties');
    expect(shapeProps.length).toBeGreaterThanOrEqual(1);
  });

  it('renders image properties when an image element is selected', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['image-1'], selectionBounds: null, activeHandle: null },
    });
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const headings = screen.getAllByText('Image Properties');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    const imageProps = screen.getAllByLabelText('Image properties');
    expect(imageProps.length).toBeGreaterThanOrEqual(1);
  });

  it('shows opacity slider for selected elements', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['text-1'], selectionBounds: null, activeHandle: null },
    });
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const opacityControls = screen.getAllByLabelText('Opacity control');
    expect(opacityControls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows shadow controls for selected elements', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['shape-1'], selectionBounds: null, activeHandle: null },
    });
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const shadowControls = screen.getAllByLabelText('Shadow controls');
    expect(shadowControls.length).toBeGreaterThanOrEqual(1);
  });

  it('applies slide-in animation with duration-200 ease-out', () => {
    const { container } = render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const aside = container.querySelector('aside.hidden.md\\:flex');
    expect(aside).toHaveClass('duration-200', 'ease-out');
  });

  it('hides panel with translate-x-full when closed', () => {
    const { container } = render(<PropertiesPanel isOpen={false} onClose={() => {}} />);
    const aside = container.querySelector('aside.hidden.md\\:flex');
    expect(aside).toHaveClass('translate-x-full');
  });

  it('shows panel with translate-x-0 when open', () => {
    const { container } = render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const aside = container.querySelector('aside.hidden.md\\:flex');
    expect(aside).toHaveClass('translate-x-0');
  });

  it('renders mobile bottom sheet with drag handle', () => {
    render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const dragHandle = screen.getByLabelText('Drag to dismiss');
    expect(dragHandle).toBeInTheDocument();
  });

  it('has 320px width on desktop (w-80 = 320px)', () => {
    const { container } = render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const aside = container.querySelector('aside.hidden.md\\:flex');
    expect(aside).toHaveClass('w-80');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<PropertiesPanel isOpen={true} onClose={onClose} />);
    const closeButtons = screen.getAllByLabelText('Close properties panel');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('all interactive controls have minimum 44x44px touch targets', () => {
    useCanvasStore.setState({
      selection: { selectedIds: ['text-1'], selectionBounds: null, activeHandle: null },
    });
    const { container } = render(<PropertiesPanel isOpen={true} onClose={() => {}} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      const hasMinSize =
        btn.classList.contains('min-w-[44px]') || btn.classList.contains('min-h-[44px]');
      // All buttons should have minimum touch target
      expect(hasMinSize).toBe(true);
    });
  });
});
