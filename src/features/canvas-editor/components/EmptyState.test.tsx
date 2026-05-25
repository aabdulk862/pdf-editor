import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EmptyState } from './EmptyState';
import { useCanvasStore } from '../store/canvas-store';

describe('EmptyState', () => {
  beforeEach(() => {
    useCanvasStore.setState({ activeTool: 'select' });
    // Create a document so the empty state buttons can add elements
    useCanvasStore.getState().createDocument('Test Design');
  });

  it('renders the "Start designing" heading', () => {
    render(<EmptyState />);
    expect(screen.getByText('Start designing')).toBeInTheDocument();
  });

  it('renders a subtitle message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Add elements to your canvas to get started')).toBeInTheDocument();
  });

  it('renders all four quick-action buttons', () => {
    render(<EmptyState />);
    expect(screen.getByRole('button', { name: 'Add Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Shape' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use Template' })).toBeInTheDocument();
  });

  it('adds a text element when Add Text is clicked', () => {
    render(<EmptyState />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    const page = useCanvasStore.getState().document!.pages[0];
    expect(page.elements.length).toBe(1);
    expect(page.elements[0].type).toBe('text');
    expect(useCanvasStore.getState().activeTool).toBe('select');
  });

  it('sets active tool to "image" when Add Image is clicked', () => {
    render(<EmptyState />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Image' }));
    expect(useCanvasStore.getState().activeTool).toBe('image');
  });

  it('adds a shape element when Add Shape is clicked', () => {
    render(<EmptyState />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Shape' }));
    const page = useCanvasStore.getState().document!.pages[0];
    expect(page.elements.length).toBe(1);
    expect(page.elements[0].type).toBe('shape');
    expect(useCanvasStore.getState().activeTool).toBe('select');
  });

  it('calls onOpenTemplatePicker when Use Template is clicked', () => {
    const onOpenTemplatePicker = vi.fn();
    render(<EmptyState onOpenTemplatePicker={onOpenTemplatePicker} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use Template' }));
    expect(onOpenTemplatePicker).toHaveBeenCalledTimes(1);
  });

  it('does not crash when Use Template is clicked without onOpenTemplatePicker', () => {
    render(<EmptyState />);
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Template' }));
    }).not.toThrow();
  });

  it('renders a large icon', () => {
    const { container } = render(<EmptyState />);
    const iconContainer = container.querySelector('svg[width="40"]');
    expect(iconContainer).toBeInTheDocument();
  });
});
