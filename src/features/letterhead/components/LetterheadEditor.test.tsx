import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LetterheadEditor } from './LetterheadEditor';
import type { LetterheadTemplate } from '../types';

function createMockTemplate(overrides?: Partial<LetterheadTemplate>): LetterheadTemplate {
  return {
    id: 'test-1',
    name: 'Test Template',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    logo: null,
    companyName: {
      content: 'Acme Corp',
      fontFamily: 'Helvetica',
      fontSize: 14,
      color: '#000000',
      alignment: 'left',
    },
    addressLines: [
      {
        content: '123 Main St',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#000000',
        alignment: 'left',
      },
    ],
    phone: {
      content: '555-0100',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#000000',
      alignment: 'left',
    },
    email: {
      content: 'info@acme.com',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#000000',
      alignment: 'left',
    },
    website: {
      content: 'www.acme.com',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#000000',
      alignment: 'left',
    },
    tagline: null,
    ...overrides,
  };
}

describe('LetterheadEditor', () => {
  it('renders all field sections', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    // Use getAllByText for labels that appear in both legend and input label
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getAllByText('Company Name').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Address Lines')).toBeInTheDocument();
    expect(screen.getAllByText('Phone').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Website').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tagline (Optional)')).toBeInTheDocument();
  });

  it('shows character count for company name', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    expect(screen.getByText('9/100')).toBeInTheDocument();
  });

  it('calls onChange when company name text changes', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');
    const companyInput = inputs.find((input) => (input as HTMLInputElement).value === 'Acme Corp');
    expect(companyInput).toBeDefined();

    fireEvent.change(companyInput!, { target: { value: 'New Corp' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: expect.objectContaining({ content: 'New Corp' }),
      }),
    );
  });

  it('shows error when character limit is exceeded', () => {
    const longName = 'A'.repeat(101);
    const template = createMockTemplate({
      companyName: {
        content: longName,
        fontFamily: 'Helvetica',
        fontSize: 14,
        color: '#000000',
        alignment: 'left',
      },
    });
    const onChange = vi.fn();
    render(<LetterheadEditor template={template} onChange={onChange} />);

    expect(screen.getByText('Exceeds 100 character limit')).toBeInTheDocument();
    expect(screen.getByText('101/100')).toBeInTheDocument();
  });

  it('shows drag-drop zone when no logo is set', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    expect(screen.getByLabelText(/Upload logo/i)).toBeInTheDocument();
    expect(screen.getByText('PNG, JPG, SVG — Max 5MB')).toBeInTheDocument();
  });

  it('shows Add Line button for address lines when under limit', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    expect(screen.getByText('Add Line')).toBeInTheDocument();
  });

  it('hides Add Line button when at max address lines', () => {
    const template = createMockTemplate({
      addressLines: [
        {
          content: 'Line 1',
          fontFamily: 'Helvetica',
          fontSize: 10,
          color: '#000000',
          alignment: 'left',
        },
        {
          content: 'Line 2',
          fontFamily: 'Helvetica',
          fontSize: 10,
          color: '#000000',
          alignment: 'left',
        },
        {
          content: 'Line 3',
          fontFamily: 'Helvetica',
          fontSize: 10,
          color: '#000000',
          alignment: 'left',
        },
      ],
    });
    const onChange = vi.fn();
    render(<LetterheadEditor template={template} onChange={onChange} />);

    expect(screen.queryByText('Add Line')).not.toBeInTheDocument();
  });

  it('shows Add Tagline button when tagline is null', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    expect(screen.getByText('Add Tagline')).toBeInTheDocument();
  });

  it('shows tagline input when tagline is set', () => {
    const template = createMockTemplate({
      tagline: {
        content: 'Innovation First',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#666666',
        alignment: 'center',
      },
    });
    const onChange = vi.fn();
    render(<LetterheadEditor template={template} onChange={onChange} />);

    expect(screen.queryByText('Add Tagline')).not.toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    const taglineInput = inputs.find(
      (input) => (input as HTMLInputElement).value === 'Innovation First',
    );
    expect(taglineInput).toBeDefined();
  });

  it('renders font family dropdowns for each text field', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    const fontSelects = screen.getAllByLabelText('Font family');
    // Company name + 1 address line + phone + email + website = 5
    expect(fontSelects.length).toBe(5);
  });

  it('renders alignment toggles', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    const leftButtons = screen.getAllByLabelText('Align left');
    expect(leftButtons.length).toBeGreaterThan(0);
  });

  it('rejects invalid logo file type via file input', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByText('Accepted formats: PNG, JPG, SVG')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects logo file exceeding 5MB', () => {
    const onChange = vi.fn();
    render(<LetterheadEditor template={createMockTemplate()} onChange={onChange} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeContent = new Uint8Array(6 * 1024 * 1024);
    const largeFile = new File([largeContent], 'big.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByText('Maximum file size is 5MB')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
