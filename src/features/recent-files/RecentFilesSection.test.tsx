import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useRecentFilesStore } from '../../store/recent-files';
import { RecentFilesSection } from './RecentFilesSection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <RecentFilesSection />
    </MemoryRouter>,
  );
}

describe('RecentFilesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRecentFilesStore.setState({ entries: [] });
  });

  describe('empty state', () => {
    it('shows "No recent files" message when entries is empty', () => {
      renderComponent();

      expect(screen.getByText('Recent Files')).toBeInTheDocument();
      expect(screen.getByText('No recent files')).toBeInTheDocument();
    });

    it('does not show Clear All button when empty', () => {
      renderComponent();

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  describe('with entries', () => {
    const mockEntries = [
      {
        id: '1',
        fileName: 'report.pdf',
        fileSize: 1048576,
        lastOpenedAt: Date.now() - 120000, // 2 minutes ago
        operationRoute: '/compress',
        operationName: 'Compress',
      },
      {
        id: '2',
        fileName: 'invoice.pdf',
        fileSize: 512000,
        lastOpenedAt: Date.now() - 7200000, // 2 hours ago
        operationRoute: '/merge',
        operationName: 'Merge',
      },
    ];

    beforeEach(() => {
      useRecentFilesStore.setState({ entries: mockEntries });
    });

    it('displays file names', () => {
      renderComponent();

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });

    it('displays file size, relative time, and operation name', () => {
      renderComponent();

      expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
      expect(screen.getByText(/Compress/)).toBeInTheDocument();
      expect(screen.getByText(/500\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/Merge/)).toBeInTheDocument();
    });

    it('shows Clear All button when entries exist', () => {
      renderComponent();

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('navigates to operation route on entry click', () => {
      renderComponent();

      fireEvent.click(screen.getByLabelText('Open report.pdf in Compress'));

      expect(mockNavigate).toHaveBeenCalledWith('/compress');
    });

    it('clears all entries when Clear All is clicked', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Clear All'));

      expect(screen.getByText('No recent files')).toBeInTheDocument();
    });
  });

  describe('file name truncation', () => {
    it('truncates file names longer than 60 characters', () => {
      const longName = 'a'.repeat(65) + '.pdf';
      useRecentFilesStore.setState({
        entries: [
          {
            id: '1',
            fileName: longName,
            fileSize: 1000,
            lastOpenedAt: Date.now(),
            operationRoute: '/split',
            operationName: 'Split',
          },
        ],
      });

      renderComponent();

      const truncated = 'a'.repeat(59) + '…';
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it('does not truncate file names of 60 characters or fewer', () => {
      const shortName = 'short-file.pdf';
      useRecentFilesStore.setState({
        entries: [
          {
            id: '1',
            fileName: shortName,
            fileSize: 1000,
            lastOpenedAt: Date.now(),
            operationRoute: '/rotate',
            operationName: 'Rotate',
          },
        ],
      });

      renderComponent();

      expect(screen.getByText(shortName)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has a section with accessible heading', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: 'Recent Files' })).toBeInTheDocument();
    });

    it('has accessible labels on entry buttons', () => {
      useRecentFilesStore.setState({
        entries: [
          {
            id: '1',
            fileName: 'test.pdf',
            fileSize: 500,
            lastOpenedAt: Date.now(),
            operationRoute: '/merge',
            operationName: 'Merge',
          },
        ],
      });

      renderComponent();

      expect(screen.getByLabelText('Open test.pdf in Merge')).toBeInTheDocument();
    });

    it('has accessible label on Clear All button', () => {
      useRecentFilesStore.setState({
        entries: [
          {
            id: '1',
            fileName: 'test.pdf',
            fileSize: 500,
            lastOpenedAt: Date.now(),
            operationRoute: '/merge',
            operationName: 'Merge',
          },
        ],
      });

      renderComponent();

      expect(screen.getByLabelText('Clear all recent files')).toBeInTheDocument();
    });
  });
});
