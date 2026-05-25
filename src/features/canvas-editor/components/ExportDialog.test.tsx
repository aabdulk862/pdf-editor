import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useCanvasStore } from '../store/canvas-store';
import type { ExportProgress } from '../types';

import { ExportDialog } from './ExportDialog';

// Mock HTMLDialogElement methods not available in jsdom
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

function setExportProgress(progress: ExportProgress) {
  useCanvasStore.setState({ exportProgress: progress });
}

describe('ExportDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onExport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setExportProgress({ status: 'idle', currentPage: 0, totalPages: 0 });
  });

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<ExportDialog {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders the dialog when isOpen is true', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByText('Export Document')).toBeInTheDocument();
    });

    it('renders all format options', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('SVG')).toBeInTheDocument();
      expect(screen.getByText('DOCX')).toBeInTheDocument();
    });

    it('renders page selection options', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByText('All pages')).toBeInTheDocument();
      expect(screen.getByText('Specific pages')).toBeInTheDocument();
    });
  });

  describe('format selection', () => {
    it('defaults to PDF format', () => {
      render(<ExportDialog {...defaultProps} />);
      const pdfButton = screen.getByText('PDF');
      expect(pdfButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows DPI options when PNG is selected', () => {
      render(<ExportDialog {...defaultProps} />);
      fireEvent.click(screen.getByText('PNG'));

      expect(screen.getByText('72 DPI (Screen)')).toBeInTheDocument();
      expect(screen.getByText('150 DPI (Medium)')).toBeInTheDocument();
      expect(screen.getByText('300 DPI (Print)')).toBeInTheDocument();
    });

    it('hides DPI options when format is not PNG', () => {
      render(<ExportDialog {...defaultProps} />);
      // Default is PDF
      expect(screen.queryByText('72 DPI (Screen)')).not.toBeInTheDocument();
    });

    it('shows "Insert into PDF" toggle when PDF is selected', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByText('Insert into existing PDF')).toBeInTheDocument();
    });

    it('hides "Insert into PDF" toggle when format is not PDF', () => {
      render(<ExportDialog {...defaultProps} />);
      fireEvent.click(screen.getByText('PNG'));
      expect(screen.queryByText('Insert into existing PDF')).not.toBeInTheDocument();
    });
  });

  describe('page selection', () => {
    it('shows text input when specific pages is selected', () => {
      render(<ExportDialog {...defaultProps} />);
      fireEvent.click(screen.getByText('Specific pages'));

      expect(screen.getByPlaceholderText('e.g. 1, 3, 5-7')).toBeInTheDocument();
    });

    it('hides text input when all pages is selected', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.queryByPlaceholderText('e.g. 1, 3, 5-7')).not.toBeInTheDocument();
    });
  });

  describe('export action', () => {
    it('calls onExport with correct options for PDF format', () => {
      const onExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={onExport} />);

      fireEvent.click(screen.getByText('Export'));

      expect(onExport).toHaveBeenCalledWith({
        format: 'pdf',
        pages: 'all',
        batch: false,
      });
    });

    it('calls onExport with dpi when PNG format is selected', () => {
      const onExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={onExport} />);

      fireEvent.click(screen.getByText('PNG'));
      fireEvent.click(screen.getByText('300 DPI (Print)'));
      fireEvent.click(screen.getByText('Export'));

      expect(onExport).toHaveBeenCalledWith({
        format: 'png',
        pages: 'all',
        batch: false,
        dpi: 300,
      });
    });

    it('calls onExport with specific page numbers', () => {
      const onExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={onExport} />);

      fireEvent.click(screen.getByText('Specific pages'));
      fireEvent.change(screen.getByPlaceholderText('e.g. 1, 3, 5-7'), {
        target: { value: '1, 3, 5' },
      });
      fireEvent.click(screen.getByText('Export'));

      expect(onExport).toHaveBeenCalledWith({
        format: 'pdf',
        pages: [0, 2, 4], // 0-indexed
        batch: false,
      });
    });

    it('calls onExport with batch enabled', () => {
      const onExport = vi.fn();
      render(<ExportDialog {...defaultProps} onExport={onExport} />);

      // Click the batch toggle switch
      fireEvent.click(screen.getByRole('switch', { name: /batch export/i }));
      fireEvent.click(screen.getByText('Export'));

      expect(onExport).toHaveBeenCalledWith({
        format: 'pdf',
        pages: 'all',
        batch: true,
      });
    });
  });

  describe('progress state', () => {
    it('shows progress indicator when exporting', () => {
      setExportProgress({ status: 'exporting', currentPage: 3, totalPages: 10 });
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Exporting page 3 of 10')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('disables export button during export', () => {
      setExportProgress({ status: 'exporting', currentPage: 1, totalPages: 5 });
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Exporting...')).toBeInTheDocument();
      const exportButton = screen.getByText('Exporting...').closest('button');
      expect(exportButton).toBeDisabled();
    });

    it('shows spinner in export button during export', () => {
      setExportProgress({ status: 'exporting', currentPage: 1, totalPages: 5 });
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByText('Exporting...').closest('button');
      const spinner = exportButton?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when export fails', () => {
      setExportProgress({
        status: 'error',
        currentPage: 0,
        totalPages: 0,
        error: 'Insufficient memory',
      });
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Insufficient memory')).toBeInTheDocument();
    });

    it('shows format-specific suggestion for PDF errors', () => {
      setExportProgress({
        status: 'error',
        currentPage: 0,
        totalPages: 0,
        error: 'Export failed',
      });
      render(<ExportDialog {...defaultProps} />);

      expect(
        screen.getByText('Try reducing the number of pages or simplifying complex elements.'),
      ).toBeInTheDocument();
    });

    it('shows format-specific suggestion for PNG errors', () => {
      setExportProgress({
        status: 'error',
        currentPage: 0,
        totalPages: 0,
        error: 'Canvas too large',
      });
      render(<ExportDialog {...defaultProps} />);

      // Switch to PNG first, then check suggestion
      fireEvent.click(screen.getByText('PNG'));

      expect(
        screen.getByText('Try reducing the DPI setting or exporting fewer pages at once.'),
      ).toBeInTheDocument();
    });

    it('has a dismiss button for errors', () => {
      setExportProgress({
        status: 'error',
        currentPage: 0,
        totalPages: 0,
        error: 'Something went wrong',
      });
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has an accessible dialog title', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'export-dialog-title');
    });

    it('has a close button with aria-label', () => {
      render(<ExportDialog {...defaultProps} />);
      expect(screen.getByLabelText('Close export dialog')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ExportDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Close export dialog'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ExportDialog {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
    });

    it('has aria-live region for progress', () => {
      setExportProgress({ status: 'exporting', currentPage: 2, totalPages: 5 });
      render(<ExportDialog {...defaultProps} />);

      const progressRegion = screen.getByRole('status');
      expect(progressRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-live region for errors', () => {
      setExportProgress({
        status: 'error',
        currentPage: 0,
        totalPages: 0,
        error: 'Failed',
      });
      render(<ExportDialog {...defaultProps} />);

      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
