import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NavFilterInput } from './NavFilterInput';

describe('NavFilterInput', () => {
  it('renders with placeholder text "Filter tools..."', () => {
    render(<NavFilterInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Filter tools...')).toBeInTheDocument();
  });

  it('has an accessible label', () => {
    render(<NavFilterInput value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Filter tools')).toBeInTheDocument();
  });

  it('calls onChange on every keystroke', () => {
    const handleChange = vi.fn();
    render(<NavFilterInput value="" onChange={handleChange} />);

    const input = screen.getByLabelText('Filter tools');
    fireEvent.change(input, { target: { value: 'merge' } });

    expect(handleChange).toHaveBeenCalledWith('merge');
  });

  it('displays the controlled value', () => {
    render(<NavFilterInput value="split" onChange={() => {}} />);
    const input = screen.getByLabelText('Filter tools') as HTMLInputElement;
    expect(input.value).toBe('split');
  });

  it('does not show clear button when value is empty', () => {
    render(<NavFilterInput value="" onChange={() => {}} />);
    expect(screen.queryByLabelText('Clear filter')).not.toBeInTheDocument();
  });

  it('shows clear button when value is non-empty', () => {
    render(<NavFilterInput value="ocr" onChange={() => {}} />);
    expect(screen.getByLabelText('Clear filter')).toBeInTheDocument();
  });

  it('calls onChange with empty string when clear button is clicked', () => {
    const handleChange = vi.fn();
    render(<NavFilterInput value="redact" onChange={handleChange} />);

    fireEvent.click(screen.getByLabelText('Clear filter'));
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('has minimum 44x44px touch target on the input', () => {
    render(<NavFilterInput value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Filter tools');
    expect(input.className).toContain('min-h-[44px]');
  });

  it('has minimum 44x44px touch target on the clear button', () => {
    render(<NavFilterInput value="test" onChange={() => {}} />);
    const clearBtn = screen.getByLabelText('Clear filter');
    expect(clearBtn.className).toContain('min-h-[44px]');
    expect(clearBtn.className).toContain('min-w-[44px]');
  });

  it('has focus-visible ring styling on the input', () => {
    render(<NavFilterInput value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Filter tools');
    expect(input.className).toContain('focus-visible:ring-2');
    expect(input.className).toContain('focus-visible:ring-primary-500');
  });
});
