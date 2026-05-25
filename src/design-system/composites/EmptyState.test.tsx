import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { EmptyState, NoRecentFilesIllustration } from './EmptyState';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders with only a title', () => {
      render(<EmptyState title="No recent files" />);
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state-title')).toHaveTextContent('No recent files');
    });

    it('renders title with correct heading level (h3)', () => {
      render(<EmptyState title="No items" />);
      const title = screen.getByTestId('empty-state-title');
      expect(title.tagName).toBe('H3');
    });

    it('renders description when provided', () => {
      render(<EmptyState title="No files" description="Upload a PDF to get started" />);
      expect(screen.getByTestId('empty-state-description')).toHaveTextContent(
        'Upload a PDF to get started',
      );
    });

    it('does not render description when not provided', () => {
      render(<EmptyState title="No files" />);
      expect(screen.queryByTestId('empty-state-description')).not.toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      render(<EmptyState icon={<span data-testid="custom-icon">📄</span>} title="No files" />);
      expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('does not render icon container when icon is not provided', () => {
      render(<EmptyState title="No files" />);
      expect(screen.queryByTestId('empty-state-icon')).not.toBeInTheDocument();
    });

    it('renders action button when provided', () => {
      const onClick = vi.fn();
      render(<EmptyState title="No files" action={{ label: 'Upload PDF', onClick }} />);
      expect(screen.getByTestId('empty-state-action')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload PDF' })).toBeInTheDocument();
    });

    it('does not render action when not provided', () => {
      render(<EmptyState title="No files" />);
      expect(screen.queryByTestId('empty-state-action')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls action onClick when CTA button is clicked', () => {
      const onClick = vi.fn();
      render(<EmptyState title="No files" action={{ label: 'Upload PDF', onClick }} />);
      fireEvent.click(screen.getByRole('button', { name: 'Upload PDF' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('is centered with flex column layout', () => {
      render(<EmptyState title="No files" />);
      const container = screen.getByTestId('empty-state');
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('has generous padding', () => {
      render(<EmptyState title="No files" />);
      const container = screen.getByTestId('empty-state');
      expect(container).toHaveClass('px-6', 'py-12');
    });

    it('uses design token classes for title text color', () => {
      render(<EmptyState title="No files" />);
      const title = screen.getByTestId('empty-state-title');
      expect(title).toHaveClass('text-secondary-800', 'dark:text-secondary-100');
    });

    it('uses design token classes for description text color', () => {
      render(<EmptyState title="No files" description="Some description" />);
      const desc = screen.getByTestId('empty-state-description');
      expect(desc).toHaveClass('text-secondary-500', 'dark:text-secondary-400');
    });
  });

  describe('full composition (no recent files usage)', () => {
    it('renders the complete "no recent files" empty state', () => {
      const onUpload = vi.fn();
      render(
        <EmptyState
          icon={<NoRecentFilesIllustration />}
          title="No recent files"
          description="Upload a PDF to get started"
          action={{ label: 'Upload PDF', onClick: onUpload }}
        />,
      );

      expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state-title')).toHaveTextContent('No recent files');
      expect(screen.getByTestId('empty-state-description')).toHaveTextContent(
        'Upload a PDF to get started',
      );
      expect(screen.getByRole('button', { name: 'Upload PDF' })).toBeInTheDocument();
    });
  });
});

describe('NoRecentFilesIllustration', () => {
  it('renders an SVG element', () => {
    const { container } = render(<NoRecentFilesIllustration />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('is decorative (aria-hidden)', () => {
    const { container } = render(<NoRecentFilesIllustration />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses primary color palette classes', () => {
    const { container } = render(<NoRecentFilesIllustration />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-primary-500');

    // Check that the document body rect uses primary token classes
    const rect = container.querySelector('rect');
    expect(rect).toHaveClass('fill-primary-100', 'stroke-primary-500');
  });

  it('has correct dimensions (80x80)', () => {
    const { container } = render(<NoRecentFilesIllustration />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
    expect(svg).toHaveAttribute('height', '80');
  });
});
