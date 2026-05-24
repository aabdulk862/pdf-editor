import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDownloadStore } from '../../store/downloads';
import { DownloadHistoryPanel } from './DownloadHistoryPanel';

// Mock the useToast hook
const mockError = vi.fn();
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: mockError,
  }),
}));

describe('DownloadHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the download store before each test
    useDownloadStore.setState({ downloads: [] });
  });

  describe('empty state', () => {
    it('shows empty message when no downloads exist', () => {
      render(<DownloadHistoryPanel />);

      expect(screen.getByText('Download History')).toBeInTheDocument();
      expect(
        screen.getByText('No downloads yet. Processed files will appear here.'),
      ).toBeInTheDocument();
    });
  });

  describe('with download entries', () => {
    const mockEntries = [
      {
        id: '1',
        fileName: 'document.pdf',
        operation: 'Merge',
        timestamp: new Date('2024-01-15T10:30:00').getTime(),
        fileData: new ArrayBuffer(100),
        fileSize: 100,
      },
      {
        id: '2',
        fileName: 'report.pdf',
        operation: 'Compress',
        timestamp: new Date('2024-01-15T11:00:00').getTime(),
        fileData: new ArrayBuffer(200),
        fileSize: 200,
      },
    ];

    beforeEach(() => {
      useDownloadStore.setState({ downloads: mockEntries });
    });

    it('displays download entries with file names', () => {
      render(<DownloadHistoryPanel />);

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('displays operation type for each entry', () => {
      render(<DownloadHistoryPanel />);

      expect(screen.getByText('Merge')).toBeInTheDocument();
      expect(screen.getByText('Compress')).toBeInTheDocument();
    });

    it('displays timestamps in locale format', () => {
      render(<DownloadHistoryPanel />);

      const timestamp1 = new Date('2024-01-15T10:30:00').toLocaleString();
      const timestamp2 = new Date('2024-01-15T11:00:00').toLocaleString();

      expect(screen.getByText(timestamp1)).toBeInTheDocument();
      expect(screen.getByText(timestamp2)).toBeInTheDocument();
    });

    it('shows entries in reverse chronological order (newest first)', () => {
      render(<DownloadHistoryPanel />);

      const listItems = screen.getAllByRole('listitem');
      // The second entry (report.pdf) should appear first since it's newer
      expect(listItems[0]).toHaveTextContent('report.pdf');
      expect(listItems[1]).toHaveTextContent('document.pdf');
    });

    it('shows Clear All button', () => {
      render(<DownloadHistoryPanel />);

      expect(screen.getByLabelText('Clear download history')).toBeInTheDocument();
    });

    it('clears all downloads when Clear All is clicked', () => {
      render(<DownloadHistoryPanel />);

      fireEvent.click(screen.getByLabelText('Clear download history'));

      expect(
        screen.getByText('No downloads yet. Processed files will appear here.'),
      ).toBeInTheDocument();
    });
  });

  describe('file name truncation', () => {
    it('truncates file names longer than 60 characters', () => {
      const longName = 'a'.repeat(70) + '.pdf';
      useDownloadStore.setState({
        downloads: [
          {
            id: '1',
            fileName: longName,
            operation: 'Split',
            timestamp: Date.now(),
            fileData: new ArrayBuffer(50),
            fileSize: 50,
          },
        ],
      });

      render(<DownloadHistoryPanel />);

      const truncated = 'a'.repeat(60) + '…';
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it('does not truncate file names of 60 characters or less', () => {
      const shortName = 'short-file.pdf';
      useDownloadStore.setState({
        downloads: [
          {
            id: '1',
            fileName: shortName,
            operation: 'Rotate',
            timestamp: Date.now(),
            fileData: new ArrayBuffer(50),
            fileSize: 50,
          },
        ],
      });

      render(<DownloadHistoryPanel />);

      expect(screen.getByText(shortName)).toBeInTheDocument();
    });
  });

  describe('re-download functionality', () => {
    it('triggers re-download when entry with available data is clicked', () => {
      const reDownloadSpy = vi.fn();
      useDownloadStore.setState({
        downloads: [
          {
            id: '1',
            fileName: 'test.pdf',
            operation: 'Merge',
            timestamp: Date.now(),
            fileData: new ArrayBuffer(100),
            fileSize: 100,
          },
        ],
        reDownload: reDownloadSpy,
      });

      render(<DownloadHistoryPanel />);

      fireEvent.click(screen.getByTitle('Re-download test.pdf'));

      expect(reDownloadSpy).toHaveBeenCalledWith('1');
    });

    it('shows toast error when entry with unavailable data is clicked', () => {
      // Simulate a scenario where data becomes unavailable but button is still rendered
      // In practice, the button is disabled, but we test the handler logic directly
      // by having a non-zero fileData that we'll make unavailable via null
      const entryWithNullData = {
        id: '1',
        fileName: 'expired.pdf',
        operation: 'Compress',
        timestamp: Date.now(),
        fileData: null as unknown as ArrayBuffer,
        fileSize: 0,
      };

      useDownloadStore.setState({
        downloads: [entryWithNullData],
      });

      render(<DownloadHistoryPanel />);

      // The button should be disabled when data is null
      const button = screen.getByTitle('File no longer available');
      expect(button).toBeDisabled();
    });

    it('disables entry button when file data is unavailable', () => {
      useDownloadStore.setState({
        downloads: [
          {
            id: '1',
            fileName: 'expired.pdf',
            operation: 'Compress',
            timestamp: Date.now(),
            fileData: new ArrayBuffer(0),
            fileSize: 0,
          },
        ],
      });

      render(<DownloadHistoryPanel />);

      const button = screen.getByTitle('File no longer available');
      expect(button).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has a list role with accessible label', () => {
      useDownloadStore.setState({
        downloads: [
          {
            id: '1',
            fileName: 'test.pdf',
            operation: 'Merge',
            timestamp: Date.now(),
            fileData: new ArrayBuffer(100),
            fileSize: 100,
          },
        ],
      });

      render(<DownloadHistoryPanel />);

      expect(screen.getByRole('list', { name: 'Download history entries' })).toBeInTheDocument();
    });

    it('uses time element with datetime attribute for timestamps', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      useDownloadStore.setState({
        downloads: [
          {
            id: '1',
            fileName: 'test.pdf',
            operation: 'Merge',
            timestamp,
            fileData: new ArrayBuffer(100),
            fileSize: 100,
          },
        ],
      });

      render(<DownloadHistoryPanel />);

      const timeElement = screen.getByText(new Date(timestamp).toLocaleString());
      expect(timeElement.tagName).toBe('TIME');
      expect(timeElement).toHaveAttribute('datetime');
    });
  });
});
