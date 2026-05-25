import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RecentFilesPanel } from './RecentFilesPanel';
import { useRecentFilesStore } from '../store/recent-files-store';
import type { RecentFileEntry } from '../types';

const mockEntries: RecentFileEntry[] = [
  {
    id: 'file-1',
    name: 'My Design',
    lastOpened: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    type: 'canvas-design',
    thumbnail: 'data:image/jpeg;base64,/9j/test1',
    documentRef: 'canvas-editor-document-file-1',
  },
  {
    id: 'file-2',
    name: 'Invoice Template',
    lastOpened: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    type: 'canvas-design',
    thumbnail: '',
    documentRef: 'canvas-editor-document-file-2',
  },
  {
    id: 'file-3',
    name: 'Resume Draft',
    lastOpened: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days ago
    type: 'canvas-design',
    thumbnail: 'data:image/jpeg;base64,/9j/test3',
    documentRef: 'canvas-editor-document-file-3',
  },
];

describe('RecentFilesPanel', () => {
  beforeEach(() => {
    // Override loadRecentFiles to be a no-op so it doesn't read from localStorage
    // and override the state we set in tests
    useRecentFilesStore.setState({
      recentFiles: [],
      isLoading: false,
      loadRecentFiles: () => {
        // no-op in tests — state is set directly
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when there are no recent files', () => {
    const { container } = render(<RecentFilesPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loading skeleton when isLoading is true', () => {
    useRecentFilesStore.setState({ isLoading: true });
    render(<RecentFilesPanel />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });

  it('renders the "Recent" heading when files exist', () => {
    useRecentFilesStore.setState({ recentFiles: mockEntries });
    render(<RecentFilesPanel />);
    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  it('renders file cards with names', () => {
    useRecentFilesStore.setState({ recentFiles: mockEntries });
    render(<RecentFilesPanel />);
    expect(screen.getByText('My Design')).toBeInTheDocument();
    expect(screen.getByText('Invoice Template')).toBeInTheDocument();
    expect(screen.getByText('Resume Draft')).toBeInTheDocument();
  });

  it('renders relative time for each file', () => {
    useRecentFilesStore.setState({ recentFiles: mockEntries });
    render(<RecentFilesPanel />);
    expect(screen.getByText('30 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('3 days ago')).toBeInTheDocument();
  });

  it('renders thumbnail images when available', () => {
    useRecentFilesStore.setState({ recentFiles: mockEntries });
    render(<RecentFilesPanel />);
    const images = screen.getAllByRole('img');
    // file-1 and file-3 have thumbnails, file-2 does not
    expect(images.length).toBe(2);
    expect(images[0]).toHaveAttribute('alt', 'Preview of My Design');
    expect(images[1]).toHaveAttribute('alt', 'Preview of Resume Draft');
  });

  it('renders a placeholder icon when thumbnail is empty', () => {
    useRecentFilesStore.setState({ recentFiles: [mockEntries[1]] });
    const { container } = render(<RecentFilesPanel />);
    const svgPlaceholder = container.querySelector('svg[width="32"]');
    expect(svgPlaceholder).toBeInTheDocument();
  });

  it('calls openRecentFile when a card is clicked', () => {
    const openRecentFileSpy = vi.fn();
    useRecentFilesStore.setState({
      recentFiles: mockEntries,
      openRecentFile: openRecentFileSpy,
    });

    render(<RecentFilesPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Open My Design' }));
    expect(openRecentFileSpy).toHaveBeenCalledWith('file-1');
  });

  it('calls removeRecentFile when delete button is clicked', () => {
    const removeRecentFileSpy = vi.fn();
    useRecentFilesStore.setState({
      recentFiles: mockEntries,
      removeRecentFile: removeRecentFileSpy,
    });

    render(<RecentFilesPanel />);
    const deleteButtons = screen.getAllByRole('button', { name: /Remove .* from recent files/ });
    fireEvent.click(deleteButtons[0]);
    expect(removeRecentFileSpy).toHaveBeenCalledWith('file-1');
  });

  it('stops event propagation when delete button is clicked', () => {
    const openRecentFileSpy = vi.fn();
    const removeRecentFileSpy = vi.fn();
    useRecentFilesStore.setState({
      recentFiles: mockEntries,
      openRecentFile: openRecentFileSpy,
      removeRecentFile: removeRecentFileSpy,
    });

    render(<RecentFilesPanel />);
    const deleteButtons = screen.getAllByRole('button', { name: /Remove .* from recent files/ });
    fireEvent.click(deleteButtons[0]);
    // openRecentFile should NOT be called when delete is clicked
    expect(openRecentFileSpy).not.toHaveBeenCalled();
  });

  it('displays at most 10 files even if more exist', () => {
    const manyEntries: RecentFileEntry[] = Array.from({ length: 15 }, (_, i) => ({
      id: `file-${i}`,
      name: `Document ${i}`,
      lastOpened: Date.now() - i * 1000 * 60 * 60,
      type: 'canvas-design' as const,
      thumbnail: '',
      documentRef: `canvas-editor-document-file-${i}`,
    }));

    useRecentFilesStore.setState({ recentFiles: manyEntries });
    render(<RecentFilesPanel />);

    const cards = screen.getAllByRole('button', { name: /Open Document/ });
    expect(cards.length).toBe(10);
  });

  it('has accessible labels on file cards', () => {
    useRecentFilesStore.setState({ recentFiles: mockEntries });
    render(<RecentFilesPanel />);
    expect(screen.getByRole('button', { name: 'Open My Design' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Invoice Template' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Resume Draft' })).toBeInTheDocument();
  });

  it('has accessible labels on delete buttons', () => {
    useRecentFilesStore.setState({ recentFiles: mockEntries });
    render(<RecentFilesPanel />);
    expect(
      screen.getByRole('button', { name: 'Remove My Design from recent files' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Invoice Template from recent files' }),
    ).toBeInTheDocument();
  });
});
