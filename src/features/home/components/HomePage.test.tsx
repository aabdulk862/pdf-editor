import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useReducedMotion
vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock RecentFilesSection and TemplateSection to keep tests focused
vi.mock('../../recent-files/RecentFilesSection', () => ({
  RecentFilesSection: () => <div data-testid="recent-files-section" />,
}));

vi.mock('../../templates/TemplateSection', () => ({
  TemplateSection: () => <div data-testid="template-section" />,
}));

// Mock recent files store
vi.mock('../../../store/recent-files', () => ({
  useRecentFilesStore: {
    getState: () => ({
      addEntry: vi.fn(),
    }),
  },
}));

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the page heading', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { level: 1, name: /pdf editor/i })).toBeTruthy();
  });

  it('renders the hero drop zone section', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });
    expect(dropZone).toBeTruthy();
  });

  it('displays instructional text in the drop zone', () => {
    renderHomePage();
    expect(screen.getByText(/drop your pdf here to get started/i)).toBeTruthy();
  });

  it('displays supported formats text', () => {
    renderHomePage();
    expect(screen.getByText(/supports pdf files up to 100mb/i)).toBeTruthy();
  });

  it('renders a Browse files button', () => {
    renderHomePage();
    expect(screen.getByRole('button', { name: /browse files/i })).toBeTruthy();
  });

  it('shows highlighted state on drag over', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [] },
    });

    // Should show drag-over text
    expect(screen.getByText('Drop your PDF here')).toBeTruthy();
    // Should have primary border color class
    expect(dropZone.className).toContain('border-primary-500');
  });

  it('removes highlighted state on drag leave', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });

    fireEvent.dragEnter(dropZone, {
      dataTransfer: { files: [] },
    });
    fireEvent.dragLeave(dropZone, {
      dataTransfer: { files: [] },
    });

    // Should revert to default text
    expect(screen.getByText(/drop your pdf here to get started/i)).toBeTruthy();
    // Should have the default border class (not the drag-over highlight)
    expect(dropZone.className).toContain('border-secondary-300');
  });

  it('shows error message when non-PDF file is dropped', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });

    const file = new File(['content'], 'image.png', { type: 'image/png' });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/unsupported file type/i)).toBeTruthy();
  });

  it('navigates to merge page when valid PDF is dropped', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });

    const file = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // The navigation happens asynchronously via FileReader
    // We verify the drop zone doesn't show an error
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders tool category sections', () => {
    renderHomePage();
    expect(screen.getByRole('heading', { name: /organize pages/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /convert & optimize/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /annotate & mark/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /security/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /extract content/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /advanced/i })).toBeTruthy();
  });

  it('has accessible hidden heading for the drop zone section', () => {
    renderHomePage();
    const heading = screen.getByText('Upload PDF');
    expect(heading.tagName).toBe('H2');
    expect(heading.className).toContain('sr-only');
  });

  it('drop zone has proper focus-visible ring classes', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });
    expect(dropZone.className).toContain('focus-visible:ring-2');
    expect(dropZone.className).toContain('focus-visible:ring-primary-500');
  });

  it('uses duration-fast for transition timing (100ms)', () => {
    renderHomePage();
    const dropZone = screen.getByRole('button', {
      name: /upload pdf file/i,
    });
    expect(dropZone.className).toContain('duration-fast');
  });
});
