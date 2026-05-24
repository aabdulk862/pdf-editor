import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { LetterheadApplyModal, parsePageRange } from './LetterheadApplyModal';

// Mock the Modal component since jsdom doesn't support dialog.showModal()
vi.mock('../../../components/ui/Modal', () => ({
  Modal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <div>{children}</div>
        {footer && <div>{footer}</div>}
      </div>
    );
  },
}));

describe('parsePageRange', () => {
  it('parses single page numbers', () => {
    expect(parsePageRange('1', 10)).toEqual([1]);
    expect(parsePageRange('5', 10)).toEqual([5]);
  });

  it('parses comma-separated pages', () => {
    expect(parsePageRange('1,3,5', 10)).toEqual([1, 3, 5]);
  });

  it('parses ranges', () => {
    expect(parsePageRange('5-8', 10)).toEqual([5, 6, 7, 8]);
  });

  it('parses mixed pages and ranges', () => {
    expect(parsePageRange('1,3,5-8', 10)).toEqual([1, 3, 5, 6, 7, 8]);
  });

  it('deduplicates overlapping pages', () => {
    expect(parsePageRange('1,1,2-3,3', 10)).toEqual([1, 2, 3]);
  });

  it('returns null for empty input', () => {
    expect(parsePageRange('', 10)).toBeNull();
    expect(parsePageRange('  ', 10)).toBeNull();
  });

  it('returns null for out-of-range pages', () => {
    expect(parsePageRange('0', 10)).toBeNull();
    expect(parsePageRange('11', 10)).toBeNull();
    expect(parsePageRange('1-11', 10)).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parsePageRange('abc', 10)).toBeNull();
    expect(parsePageRange('1-2-3', 10)).toBeNull();
    expect(parsePageRange('1,,3', 10)).toBeNull();
  });

  it('returns null for reversed ranges', () => {
    expect(parsePageRange('8-5', 10)).toBeNull();
  });

  it('handles whitespace in input', () => {
    expect(parsePageRange(' 1 , 3 , 5 - 8 ', 10)).toEqual([1, 3, 5, 6, 7, 8]);
  });
});

describe('LetterheadApplyModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    totalPages: 10,
  };

  it('renders the modal with title', () => {
    render(<LetterheadApplyModal {...defaultProps} />);
    expect(screen.getByText('Apply Letterhead')).toBeInTheDocument();
  });

  it('renders three radio options', () => {
    render(<LetterheadApplyModal {...defaultProps} />);
    expect(screen.getByLabelText('First page only')).toBeInTheDocument();
    expect(screen.getByLabelText('All pages')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom range')).toBeInTheDocument();
  });

  it('has "First page only" selected by default', () => {
    render(<LetterheadApplyModal {...defaultProps} />);
    expect(screen.getByLabelText('First page only')).toBeChecked();
  });

  it('calls onApply with first page target when Apply is clicked', () => {
    const onApply = vi.fn();
    render(<LetterheadApplyModal {...defaultProps} onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ type: 'first' });
  });

  it('calls onApply with all pages target', () => {
    const onApply = vi.fn();
    render(<LetterheadApplyModal {...defaultProps} onApply={onApply} />);

    fireEvent.click(screen.getByLabelText('All pages'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ type: 'all' });
  });

  it('shows custom range input when custom is selected', () => {
    render(<LetterheadApplyModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Custom range'));

    expect(screen.getByPlaceholderText('e.g., 1,3,5-8')).toBeInTheDocument();
  });

  it('disables Apply when custom range is empty', () => {
    render(<LetterheadApplyModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Custom range'));

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('shows validation error for invalid custom range', () => {
    render(<LetterheadApplyModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Custom range'));
    fireEvent.change(screen.getByPlaceholderText('e.g., 1,3,5-8'), {
      target: { value: 'abc' },
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onApply with custom pages target for valid range', () => {
    const onApply = vi.fn();
    render(<LetterheadApplyModal {...defaultProps} onApply={onApply} />);

    fireEvent.click(screen.getByLabelText('Custom range'));
    fireEvent.change(screen.getByPlaceholderText('e.g., 1,3,5-8'), {
      target: { value: '1,3,5-8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ type: 'custom', pages: [1, 3, 5, 6, 7, 8] });
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<LetterheadApplyModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<LetterheadApplyModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Apply Letterhead')).not.toBeInTheDocument();
  });
});
