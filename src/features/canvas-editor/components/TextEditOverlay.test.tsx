import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MM_TO_PX } from '../constants';
import type { TextElement, Viewport } from '../types';
import { useCanvasStore } from '../store/canvas-store';
import { TextEditOverlay, TextEditOverlayConnected } from './TextEditOverlay';

const defaultViewport: Viewport = { panX: 0, panY: 0, zoom: 1.0 };

const mockTextElement: TextElement = {
  id: 'text-1',
  type: 'text',
  x: 50,
  y: 30,
  width: 200,
  height: 100,
  rotation: 0,
  opacity: 100,
  zIndex: 1,
  locked: false,
  visible: true,
  content: 'Hello World',
  fontFamily: 'Inter',
  fontSize: 16,
  fontColor: '#000000',
  bold: false,
  italic: false,
  underline: false,
  alignment: 'left',
};

describe('TextEditOverlay', () => {
  it('renders the contenteditable div with element content', () => {
    const onCommit = vi.fn();
    render(
      <TextEditOverlay element={mockTextElement} viewport={defaultViewport} onCommit={onCommit} />,
    );

    const input = screen.getByTestId('text-edit-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveTextContent('Hello World');
    expect(input).toHaveAttribute('contenteditable', 'true');
  });

  it('positions the editable div based on viewport transform', () => {
    const onCommit = vi.fn();
    const viewport: Viewport = { panX: 10, panY: 5, zoom: 2.0 };

    render(<TextEditOverlay element={mockTextElement} viewport={viewport} onCommit={onCommit} />);

    const input = screen.getByTestId('text-edit-input');
    // screenX = (50 * MM_TO_PX - 10) * 2
    // screenY = (30 * MM_TO_PX - 5) * 2
    expect(input.style.left).toBe(`${(50 * MM_TO_PX - 10) * 2}px`);
    expect(input.style.top).toBe(`${(30 * MM_TO_PX - 5) * 2}px`);
  });

  it('applies font styling from the text element', () => {
    const styledElement: TextElement = {
      ...mockTextElement,
      fontFamily: 'Georgia',
      fontSize: 24,
      fontColor: '#ff0000',
      bold: true,
      italic: true,
      underline: true,
      alignment: 'center',
    };
    const onCommit = vi.fn();

    render(
      <TextEditOverlay element={styledElement} viewport={defaultViewport} onCommit={onCommit} />,
    );

    const input = screen.getByTestId('text-edit-input');
    expect(input.style.fontFamily).toBe('Georgia');
    expect(input.style.fontWeight).toBe('bold');
    expect(input.style.fontStyle).toBe('italic');
    expect(input.style.textDecoration).toBe('underline');
    expect(input.style.textAlign).toBe('center');
    expect(input.style.color).toBe('rgb(255, 0, 0)');
  });

  it('commits text content on blur', () => {
    const onCommit = vi.fn();
    render(
      <TextEditOverlay element={mockTextElement} viewport={defaultViewport} onCommit={onCommit} />,
    );

    const input = screen.getByTestId('text-edit-input');
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith('text-1', expect.any(String));
  });

  it('cancels editing on Escape key', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(
      <TextEditOverlay
        element={mockTextElement}
        viewport={defaultViewport}
        onCommit={onCommit}
        onCancel={onCancel}
      />,
    );

    const input = screen.getByTestId('text-edit-input');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    const onCommit = vi.fn();
    render(
      <TextEditOverlay element={mockTextElement} viewport={defaultViewport} onCommit={onCommit} />,
    );

    // The parent container is aria-hidden, so we use hidden option to find the textbox
    const input = screen.getByRole('textbox', { name: 'Edit text content', hidden: true });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-multiline', 'true');
  });

  it('overlay container is pointer-events-none', () => {
    const onCommit = vi.fn();
    render(
      <TextEditOverlay element={mockTextElement} viewport={defaultViewport} onCommit={onCommit} />,
    );

    const overlay = screen.getByTestId('text-edit-overlay');
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('editable area is pointer-events-auto for interaction', () => {
    const onCommit = vi.fn();
    render(
      <TextEditOverlay element={mockTextElement} viewport={defaultViewport} onCommit={onCommit} />,
    );

    const input = screen.getByTestId('text-edit-input');
    expect(input).toHaveClass('pointer-events-auto');
  });
});

describe('TextEditOverlayConnected', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      document: {
        id: 'doc-1',
        name: 'Test Doc',
        pages: [
          {
            id: 'page-1',
            width: 210,
            height: 297,
            backgroundColor: '#FFFFFF',
            elements: [mockTextElement],
          },
        ],
        activePageIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      viewport: { panX: 0, panY: 0, zoom: 1.0 },
    });
  });

  it('renders nothing when editingElementId is null', () => {
    render(<TextEditOverlayConnected editingElementId={null} />);
    expect(screen.queryByTestId('text-edit-overlay')).not.toBeInTheDocument();
  });

  it('renders nothing when editingElementId does not match a text element', () => {
    render(<TextEditOverlayConnected editingElementId="nonexistent" />);
    expect(screen.queryByTestId('text-edit-overlay')).not.toBeInTheDocument();
  });

  it('renders the text edit overlay when editingElementId matches a text element', () => {
    render(<TextEditOverlayConnected editingElementId="text-1" />);
    expect(screen.getByTestId('text-edit-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('text-edit-input')).toHaveTextContent('Hello World');
  });

  it('calls onEditComplete when editing is done', () => {
    const onEditComplete = vi.fn();
    render(<TextEditOverlayConnected editingElementId="text-1" onEditComplete={onEditComplete} />);

    const input = screen.getByTestId('text-edit-input');
    fireEvent.blur(input);

    expect(onEditComplete).toHaveBeenCalled();
  });
});
