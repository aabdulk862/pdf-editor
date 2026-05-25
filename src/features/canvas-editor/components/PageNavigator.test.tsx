import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { PageNavigator } from './PageNavigator';
import { useCanvasStore } from '../store/canvas-store';
import { MAX_PAGES } from '../constants';
import type { CanvasDocument, CanvasPage } from '../types';

function createTestPage(id: string, elementCount = 0): CanvasPage {
  const elements = Array.from({ length: elementCount }, (_, i) => ({
    id: `el-${id}-${i}`,
    type: 'shape' as const,
    x: 10 + i * 20,
    y: 10 + i * 20,
    width: 30,
    height: 30,
    rotation: 0,
    opacity: 100,
    zIndex: i,
    locked: false,
    visible: true,
    shapeType: 'rectangle' as const,
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 1,
    borderStyle: 'solid' as const,
  }));

  return {
    id,
    width: 210,
    height: 297,
    backgroundColor: '#FFFFFF',
    elements,
  };
}

function createTestDocument(pageCount: number): CanvasDocument {
  return {
    id: 'test-doc',
    name: 'Test Document',
    pages: Array.from({ length: pageCount }, (_, i) => createTestPage(`page-${i}`)),
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('PageNavigator', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      document: createTestDocument(3),
    });
  });

  it('renders nothing when no document is loaded', () => {
    useCanvasStore.setState({ document: null });
    const { container } = render(<PageNavigator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the page navigator sidebar with correct aria label', () => {
    render(<PageNavigator />);
    expect(screen.getByRole('complementary', { name: 'Page navigator' })).toBeInTheDocument();
  });

  it('displays page count header', () => {
    render(<PageNavigator />);
    expect(screen.getByText(`3 / ${MAX_PAGES}`)).toBeInTheDocument();
  });

  it('renders a thumbnail button for each page', () => {
    render(<PageNavigator />);
    expect(screen.getByLabelText('Page 1 (active)')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
  });

  it('highlights the active page with aria-current', () => {
    render(<PageNavigator />);
    const activePage = screen.getByLabelText('Page 1 (active)');
    expect(activePage).toHaveAttribute('aria-current', 'page');
    const otherPage = screen.getByLabelText('Page 2');
    expect(otherPage).not.toHaveAttribute('aria-current');
  });

  it('switches active page when a thumbnail is clicked', () => {
    render(<PageNavigator />);
    fireEvent.click(screen.getByLabelText('Page 2'));
    expect(useCanvasStore.getState().document?.activePageIndex).toBe(1);
  });

  it('adds a new page when Add Page button is clicked', () => {
    render(<PageNavigator />);
    fireEvent.click(screen.getByLabelText('Add new page'));
    expect(useCanvasStore.getState().document?.pages.length).toBe(4);
  });

  it('shows delete buttons for pages when more than 1 page exists', () => {
    render(<PageNavigator />);
    expect(screen.getByLabelText('Delete page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete page 3')).toBeInTheDocument();
  });

  it('does not show delete buttons when only 1 page exists', () => {
    useCanvasStore.setState({ document: createTestDocument(1) });
    render(<PageNavigator />);
    expect(screen.queryByLabelText('Delete page 1')).not.toBeInTheDocument();
  });

  it('removes a page when delete button is clicked', () => {
    render(<PageNavigator />);
    fireEvent.click(screen.getByLabelText('Delete page 2'));
    expect(useCanvasStore.getState().document?.pages.length).toBe(2);
  });

  it('disables Add Page button when max pages reached', () => {
    useCanvasStore.setState({ document: createTestDocument(MAX_PAGES) });
    render(<PageNavigator />);
    const addButton = screen.getByText('Max pages reached');
    expect(addButton).toBeDisabled();
  });

  it('shows page numbers for each thumbnail', () => {
    render(<PageNavigator />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows Empty text for pages with no elements', () => {
    render(<PageNavigator />);
    const emptyLabels = screen.getAllByText('Empty');
    expect(emptyLabels.length).toBe(3);
  });

  it('renders element indicators for pages with elements', () => {
    const doc = createTestDocument(1);
    doc.pages[0] = createTestPage('page-with-elements', 3);
    useCanvasStore.setState({ document: doc });
    const { container } = render(<PageNavigator />);
    // Should not show "Empty" for the page with elements
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
    // Should have element indicator divs
    const indicators = container.querySelectorAll('.bg-purple-400\\/40');
    expect(indicators.length).toBe(3);
  });
});
