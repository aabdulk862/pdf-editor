import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const defaultOptions = [
  { value: '90', label: '90°' },
  { value: '180', label: '180°' },
  { value: '270', label: '270°' },
] as const;

describe('SegmentedControl', () => {
  it('renders all options', () => {
    render(<SegmentedControl options={[...defaultOptions]} value="90" onChange={() => {}} />);

    expect(screen.getByText('90°')).toBeInTheDocument();
    expect(screen.getByText('180°')).toBeInTheDocument();
    expect(screen.getByText('270°')).toBeInTheDocument();
  });

  it('marks the active segment with aria-checked', () => {
    render(<SegmentedControl options={[...defaultOptions]} value="180" onChange={() => {}} />);

    const segments = screen.getAllByRole('radio');
    expect(segments[0]).toHaveAttribute('aria-checked', 'false');
    expect(segments[1]).toHaveAttribute('aria-checked', 'true');
    expect(segments[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('has role="radiogroup" on the container', () => {
    render(<SegmentedControl options={[...defaultOptions]} value="90" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('calls onChange when a segment is clicked', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={[...defaultOptions]} value="90" onChange={onChange} />);

    fireEvent.click(screen.getByText('270°'));
    expect(onChange).toHaveBeenCalledWith('270');
  });

  it('supports keyboard navigation with ArrowRight', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={[...defaultOptions]} value="90" onChange={onChange} />);

    const firstSegment = screen.getAllByRole('radio')[0];
    fireEvent.keyDown(firstSegment, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('180');
  });

  it('supports keyboard navigation with ArrowLeft (wraps around)', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={[...defaultOptions]} value="90" onChange={onChange} />);

    const firstSegment = screen.getAllByRole('radio')[0];
    fireEvent.keyDown(firstSegment, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('270');
  });

  it('supports Home and End keys', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={[...defaultOptions]} value="180" onChange={onChange} />);

    const middleSegment = screen.getAllByRole('radio')[1];
    fireEvent.keyDown(middleSegment, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('90');

    onChange.mockClear();
    fireEvent.keyDown(middleSegment, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('270');
  });

  it('uses roving tabindex (only active segment is tabbable)', () => {
    render(<SegmentedControl options={[...defaultOptions]} value="180" onChange={() => {}} />);

    const segments = screen.getAllByRole('radio');
    expect(segments[0]).toHaveAttribute('tabindex', '-1');
    expect(segments[1]).toHaveAttribute('tabindex', '0');
    expect(segments[2]).toHaveAttribute('tabindex', '-1');
  });

  it('applies fullWidth class when prop is true', () => {
    render(
      <SegmentedControl options={[...defaultOptions]} value="90" onChange={() => {}} fullWidth />,
    );

    const container = screen.getByRole('radiogroup');
    expect(container.className).toContain('w-full');
  });

  it('renders icons when provided', () => {
    const options = [
      { value: 'a', label: 'Option A', icon: <svg data-testid="icon-a" /> },
      { value: 'b', label: 'Option B' },
    ];

    render(<SegmentedControl options={options} value="a" onChange={() => {}} />);

    expect(screen.getByTestId('icon-a')).toBeInTheDocument();
  });

  it('applies sm size classes', () => {
    render(
      <SegmentedControl options={[...defaultOptions]} value="90" onChange={() => {}} size="sm" />,
    );

    const segment = screen.getAllByRole('radio')[0];
    expect(segment.className).toContain('text-sm');
    expect(segment.className).toContain('px-3');
    expect(segment.className).toContain('py-1.5');
  });

  it('applies md size classes by default', () => {
    render(<SegmentedControl options={[...defaultOptions]} value="90" onChange={() => {}} />);

    const segment = screen.getAllByRole('radio')[0];
    expect(segment.className).toContain('text-base');
    expect(segment.className).toContain('px-4');
    expect(segment.className).toContain('py-2');
  });
});
