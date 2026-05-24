import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock pdfjs-dist before importing the component
const mockGetPage = vi.fn();
const mockRender = vi.fn();
const mockGetViewport = vi.fn();

const mockPdfDoc = {
  numPages: 5,
  getPage: mockGetPage,
};

const mockLoadingTask = {
  promise: Promise.resolve(mockPdfDoc),
};

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => mockLoadingTask),
}));

import { PreviewPanel } from './PreviewPanel';

describe('PreviewPanel', () => {
  const defaultProps = {
    originalDoc: new ArrayBuffer(10),
    modifiedDoc: new ArrayBuffer(10),
    zoom: 1,
    onZoomChange: vi.fn(),
    currentPage: 1,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetViewport.mockReturnValue({ width: 600, height: 800 });
    mockRender.mockReturnValue({ promise: Promise.resolve() });
    mockGetPage.mockResolvedValue({
      getViewport: mockGetViewport,
      render: mockRender,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('empty state', () => {
    it('shows upload prompt when no documents are provided', () => {
      render(
        <PreviewPanel
          originalDoc={null}
          modifiedDoc={null}
          zoom={1}
          onZoomChange={vi.fn()}
          currentPage={1}
          onPageChange={vi.fn()}
        />,
      );

      expect(screen.getByText('Upload a PDF to see the preview')).toBeInTheDocument();
    });
  });

  describe('zoom controls', () => {
    it('renders zoom in and zoom out buttons', async () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    });

    it('displays current zoom percentage', () => {
      render(<PreviewPanel {...defaultProps} zoom={1.5} />);

      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('calls onZoomChange with increased zoom when zoom in is clicked', () => {
      const onZoomChange = vi.fn();
      render(<PreviewPanel {...defaultProps} zoom={1} onZoomChange={onZoomChange} />);

      fireEvent.click(screen.getByLabelText('Zoom in'));

      expect(onZoomChange).toHaveBeenCalledWith(1.25);
    });

    it('calls onZoomChange with decreased zoom when zoom out is clicked', () => {
      const onZoomChange = vi.fn();
      render(<PreviewPanel {...defaultProps} zoom={1} onZoomChange={onZoomChange} />);

      fireEvent.click(screen.getByLabelText('Zoom out'));

      expect(onZoomChange).toHaveBeenCalledWith(0.75);
    });

    it('disables zoom in button at maximum zoom (200%)', () => {
      render(<PreviewPanel {...defaultProps} zoom={2} />);

      expect(screen.getByLabelText('Zoom in')).toBeDisabled();
    });

    it('disables zoom out button at minimum zoom (50%)', () => {
      render(<PreviewPanel {...defaultProps} zoom={0.5} />);

      expect(screen.getByLabelText('Zoom out')).toBeDisabled();
    });
  });

  describe('page navigation', () => {
    it('renders previous and next page buttons', () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('displays current page and total pages', async () => {
      render(<PreviewPanel {...defaultProps} currentPage={3} />);

      await waitFor(() => {
        expect(screen.getByText('3 / 5')).toBeInTheDocument();
      });
    });

    it('calls onPageChange with next page when next is clicked', async () => {
      const onPageChange = vi.fn();
      render(<PreviewPanel {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

      await waitFor(() => {
        expect(screen.getByText('2 / 5')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Next page'));

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('calls onPageChange with previous page when previous is clicked', async () => {
      const onPageChange = vi.fn();
      render(<PreviewPanel {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

      await waitFor(() => {
        expect(screen.getByText('3 / 5')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Previous page'));

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('disables previous button on first page', () => {
      render(<PreviewPanel {...defaultProps} currentPage={1} />);

      expect(screen.getByLabelText('Previous page')).toBeDisabled();
    });

    it('disables next button on last page', async () => {
      render(<PreviewPanel {...defaultProps} currentPage={5} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Next page')).toBeDisabled();
      });
    });
  });

  describe('side-by-side layout', () => {
    it('shows Original and Modified labels when both docs are provided', () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('shows only Original label when only original doc is provided', () => {
      render(<PreviewPanel {...defaultProps} modifiedDoc={null} />);

      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('shows only Modified label when only modified doc is provided', () => {
      render(<PreviewPanel {...defaultProps} originalDoc={null} />);

      expect(screen.queryByText('Original')).not.toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error placeholder when page render fails', async () => {
      mockGetPage.mockRejectedValue(new Error('Render failed'));

      render(<PreviewPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Page could not be rendered').length).toBeGreaterThan(0);
      });
    });

    it('displays the error message in the placeholder', async () => {
      mockGetPage.mockRejectedValue(new Error('Invalid page number'));

      render(<PreviewPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('Invalid page number').length).toBeGreaterThan(0);
      });
    });
  });

  describe('touch gestures', () => {
    it('navigates to next page on left swipe', async () => {
      const onPageChange = vi.fn();
      render(<PreviewPanel {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

      await waitFor(() => {
        expect(screen.getByText('2 / 5')).toBeInTheDocument();
      });

      const container = screen.getByText('Original').closest('.grid')!;

      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('navigates to previous page on right swipe', async () => {
      const onPageChange = vi.fn();
      render(<PreviewPanel {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

      await waitFor(() => {
        expect(screen.getByText('3 / 5')).toBeInTheDocument();
      });

      const container = screen.getByText('Original').closest('.grid')!;

      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 200, clientY: 100 }],
      });

      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('accessibility', () => {
    it('has aria-live regions for page count and zoom', () => {
      render(<PreviewPanel {...defaultProps} />);

      // The zoom and page displays have aria-live
      expect(screen.getByText('100%').closest('[aria-live]')).toBeInTheDocument();
    });

    it('zoom buttons have accessible labels', () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    });

    it('page navigation buttons have accessible labels', () => {
      render(<PreviewPanel {...defaultProps} />);

      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });
  });
});
