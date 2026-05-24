import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PageSelector, parsePageRange, formatPageRange } from './PageSelector';

describe('parsePageRange', () => {
  it('parses individual page numbers', () => {
    expect(parsePageRange('1, 3, 5', 10)).toEqual([1, 3, 5]);
  });

  it('parses page ranges', () => {
    expect(parsePageRange('1-5', 10)).toEqual([1, 2, 3, 4, 5]);
  });

  it('parses mixed individual pages and ranges', () => {
    expect(parsePageRange('1-3, 7, 9-10', 10)).toEqual([1, 2, 3, 7, 9, 10]);
  });

  it('deduplicates overlapping ranges', () => {
    expect(parsePageRange('1-5, 3-7', 10)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('clamps to totalPages', () => {
    expect(parsePageRange('1-20', 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ignores pages below 1', () => {
    expect(parsePageRange('0, -1, 1, 2', 10)).toEqual([1, 2]);
  });

  it('returns empty array for empty input', () => {
    expect(parsePageRange('', 10)).toEqual([]);
    expect(parsePageRange('   ', 10)).toEqual([]);
  });

  it('returns empty array for invalid input', () => {
    expect(parsePageRange('abc', 10)).toEqual([]);
  });

  it('handles whitespace gracefully', () => {
    expect(parsePageRange(' 1 - 3 , 5 ', 10)).toEqual([1, 2, 3, 5]);
  });

  it('returns sorted results', () => {
    expect(parsePageRange('5, 2, 8, 1', 10)).toEqual([1, 2, 5, 8]);
  });
});

describe('formatPageRange', () => {
  it('formats consecutive pages as ranges', () => {
    expect(formatPageRange([1, 2, 3, 4, 5])).toBe('1-5');
  });

  it('formats non-consecutive pages individually', () => {
    expect(formatPageRange([1, 3, 5])).toBe('1, 3, 5');
  });

  it('formats mixed consecutive and individual pages', () => {
    expect(formatPageRange([1, 2, 3, 5, 8, 9])).toBe('1-3, 5, 8-9');
  });

  it('formats a single page', () => {
    expect(formatPageRange([4])).toBe('4');
  });

  it('returns empty string for empty array', () => {
    expect(formatPageRange([])).toBe('');
  });

  it('handles unsorted input', () => {
    expect(formatPageRange([5, 3, 1, 2, 4])).toBe('1-5');
  });
});

describe('PageSelector component', () => {
  const defaultProps = {
    totalPages: 10,
    scannedPages: [2, 3, 5],
    selectedPages: [2, 3, 5],
    onChange: vi.fn(),
  };

  it('renders the page range input with pre-filled value', () => {
    render(<PageSelector {...defaultProps} />);

    const input = screen.getByLabelText('Pages to process');
    expect(input).toHaveValue('2-3, 5');
  });

  it('shows selected page count', () => {
    render(<PageSelector {...defaultProps} />);

    expect(screen.getByText('3 of 10 pages selected')).toBeInTheDocument();
  });

  it('calls onChange when input changes with valid pages', () => {
    const onChange = vi.fn();
    render(<PageSelector {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText('Pages to process');
    fireEvent.change(input, { target: { value: '1-4' } });

    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4]);
  });

  it('shows error for invalid input', () => {
    render(<PageSelector {...defaultProps} />);

    const input = screen.getByLabelText('Pages to process');
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(screen.getByText('Enter valid page numbers between 1 and 10')).toBeInTheDocument();
  });

  it('shows "Select All Scanned" button when scanned pages exist', () => {
    render(<PageSelector {...defaultProps} />);

    expect(screen.getByText('Select All Scanned (3)')).toBeInTheDocument();
  });

  it('does not show "Select All Scanned" button when no scanned pages', () => {
    render(<PageSelector {...defaultProps} scannedPages={[]} />);

    expect(screen.queryByText(/Select All Scanned/)).not.toBeInTheDocument();
  });

  it('calls onChange with scanned pages when "Select All Scanned" is clicked', () => {
    const onChange = vi.fn();
    render(<PageSelector {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByText('Select All Scanned (3)'));

    expect(onChange).toHaveBeenCalledWith([2, 3, 5]);
  });

  it('shows "Select All" button', () => {
    render(<PageSelector {...defaultProps} />);

    expect(screen.getByText('Select All (10)')).toBeInTheDocument();
  });

  it('calls onChange with all pages when "Select All" is clicked', () => {
    const onChange = vi.fn();
    render(<PageSelector {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByText('Select All (10)'));

    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('handles singular page text correctly', () => {
    render(<PageSelector {...defaultProps} totalPages={1} selectedPages={[1]} />);

    expect(screen.getByText('1 of 1 page selected')).toBeInTheDocument();
  });

  it('updates input when selectedPages prop changes', () => {
    const { rerender } = render(<PageSelector {...defaultProps} />);

    rerender(<PageSelector {...defaultProps} selectedPages={[1, 2, 3]} />);

    const input = screen.getByLabelText('Pages to process');
    expect(input).toHaveValue('1-3');
  });
});
