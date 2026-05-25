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

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

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
    it('does not render the section when entries is empty', () => {
      const { container } = renderComponent();

      // Section should not be rendered at all
      expect(container.querySelector('section')).toBeNull();
      expect(screen.queryByText('Recent Files')).not.toBeInTheDocument();
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

    it('renders the section with heading', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: 'Recent Files' })).toBeInTheDocument();
    });

    it('displays file names', () => {
      renderComponent();

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    });

    it('displays relative timestamps', () => {
      renderComponent();

      expect(screen.getByText('2 min ago')).toBeInTheDocument();
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    it('displays operation name badges', () => {
      renderComponent();

      expect(screen.getByText('Compress')).toBeInTheDocument();
      expect(screen.getByText('Merge')).toBeInTheDocument();
    });

    it('shows Clear All button when entries exist', () => {
      renderComponent();

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('navigates to operation route on card click', () => {
      renderComponent();

      fireEvent.click(screen.getByLabelText('Open report.pdf in Compress'));

      expect(mockNavigate).toHaveBeenCalledWith('/compress');
    });

    it('clears all entries when Clear All is clicked', () => {
      renderComponent();

      fireEvent.click(screen.getByText('Clear All'));

      // Section should disappear since entries are now empty
      expect(screen.queryByText('Recent Files')).not.toBeInTheDocument();
    });

    it('renders a horizontal scroll container', () => {
      renderComponent();

      const scrollContainer = screen.getByRole('list', { name: 'Recent files' });
      expect(scrollContainer).toHaveClass('overflow-x-auto');
    });
  });

  describe('display limit', () => {
    it('shows at most 8 recent files', () => {
      const manyEntries = Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        fileName: `file-${i}.pdf`,
        fileSize: 1000,
        lastOpenedAt: Date.now() - i * 60000,
        operationRoute: '/merge',
        operationName: 'Merge',
      }));

      useRecentFilesStore.setState({ entries: manyEntries });
      renderComponent();

      const cards = screen.getAllByRole('listitem');
      expect(cards).toHaveLength(8);
    });

    it('shows the most recent files first', () => {
      const entries = [
        {
          id: '1',
          fileName: 'oldest.pdf',
          fileSize: 1000,
          lastOpenedAt: Date.now() - 3600000,
          operationRoute: '/merge',
          operationName: 'Merge',
        },
        {
          id: '2',
          fileName: 'newest.pdf',
          fileSize: 1000,
          lastOpenedAt: Date.now() - 60000,
          operationRoute: '/split',
          operationName: 'Split',
        },
      ];

      useRecentFilesStore.setState({ entries });
      renderComponent();

      const cards = screen.getAllByRole('listitem');
      // First card should be the newest
      expect(cards[0]).toHaveTextContent('newest.pdf');
    });
  });

  describe('file name truncation', () => {
    it('truncates file names longer than 24 characters', () => {
      useRecentFilesStore.setState({
        entries: [
          {
            id: '1',
            fileName: 'very-long-document-name-that-exceeds.pdf',
            fileSize: 1000,
            lastOpenedAt: Date.now(),
            operationRoute: '/split',
            operationName: 'Split',
          },
        ],
      });

      renderComponent();

      // 23 chars + "…" = 24 chars max
      const truncated = 'very-long-document-name…';
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it('does not truncate file names of 24 characters or fewer', () => {
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
    beforeEach(() => {
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
    });

    it('has a section with accessible heading', () => {
      renderComponent();

      expect(screen.getByRole('heading', { name: 'Recent Files' })).toBeInTheDocument();
    });

    it('has accessible labels on file cards', () => {
      renderComponent();

      expect(screen.getByLabelText('Open test.pdf in Merge')).toBeInTheDocument();
    });

    it('has accessible label on Clear All button', () => {
      renderComponent();

      expect(screen.getByLabelText('Clear all recent files')).toBeInTheDocument();
    });

    it('has a labeled scroll container', () => {
      renderComponent();

      expect(screen.getByRole('list', { name: 'Recent files' })).toBeInTheDocument();
    });
  });
});
