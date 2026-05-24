import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadZone } from '../../../src/components/ui/FileUploadZone';

function createMockFile(name: string, size: number, type: string): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

describe('FileUploadZone', () => {
  it('renders the upload zone with instructions', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    expect(screen.getByText('Click to browse')).toBeDefined();
    expect(screen.getByText(/drag and drop/)).toBeDefined();
    expect(screen.getByText(/PDF, PNG, JPG/)).toBeDefined();
  });

  it('has minimum 44x44px touch target', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const dropZone = screen.getByRole('button');
    expect(dropZone.className).toContain('min-w-[44px]');
    expect(dropZone.className).toContain('min-h-[180px]');
  });

  it('opens file dialog on click', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    const dropZone = screen.getByRole('button');
    fireEvent.click(dropZone);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('opens file dialog on Enter key', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    const dropZone = screen.getByRole('button');
    fireEvent.keyDown(dropZone, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalled();
  });

  it('accepts valid PDF files via input change', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('test.pdf', 1024, 'application/pdf');

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(onFilesAccepted).toHaveBeenCalledWith([file]);
  });

  it('rejects files with unsupported types', () => {
    const onFilesAccepted = vi.fn();
    const onFileRejected = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} onFileRejected={onFileRejected} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile(
      'test.docx',
      1024,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(onFileRejected).toHaveBeenCalledWith(
      file,
      expect.stringContaining('Unsupported file type'),
    );
    expect(onFilesAccepted).not.toHaveBeenCalled();
  });

  it('rejects files exceeding max size', () => {
    const onFilesAccepted = vi.fn();
    const onFileRejected = vi.fn();
    const maxFileSize = 10 * 1024 * 1024; // 10 MB

    render(
      <FileUploadZone
        onFilesAccepted={onFilesAccepted}
        onFileRejected={onFileRejected}
        maxFileSize={maxFileSize}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('large.pdf', 20 * 1024 * 1024, 'application/pdf');

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(onFileRejected).toHaveBeenCalledWith(file, expect.stringContaining('exceeds'));
    expect(onFilesAccepted).not.toHaveBeenCalled();
  });

  it('displays accepted file names and sizes', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile('document.pdf', 2048, 'application/pdf');

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(screen.getByText('document.pdf')).toBeDefined();
    expect(screen.getByText('2.0 KB')).toBeDefined();
  });

  it('shows visual feedback on drag over', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const dropZone = screen.getByRole('button');

    fireEvent.dragEnter(dropZone, { dataTransfer: { files: [] } });

    expect(dropZone.className).toContain('border-primary-500');
    expect(dropZone.className).toContain('bg-primary-50');
    expect(screen.getByText('Drop files here')).toBeDefined();
  });

  it('removes drag-over state on drag leave', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const dropZone = screen.getByRole('button');

    fireEvent.dragEnter(dropZone, { dataTransfer: { files: [] } });
    fireEvent.dragLeave(dropZone, { dataTransfer: { files: [] } });

    // After drag leave, the bg-primary-50 active drag class should be gone
    expect(dropZone.className).not.toContain('bg-primary-50');
    expect(dropZone.className).toContain('border-secondary-300');
  });

  it('accepts files on drop', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const dropZone = screen.getByRole('button');
    const file = createMockFile('dropped.pdf', 5000, 'application/pdf');

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFilesAccepted).toHaveBeenCalledWith([file]);
  });

  it('respects maxFiles limit', () => {
    const onFilesAccepted = vi.fn();
    const onFileRejected = vi.fn();

    render(
      <FileUploadZone
        onFilesAccepted={onFilesAccepted}
        onFileRejected={onFileRejected}
        maxFiles={2}
      />,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      createMockFile('file1.pdf', 1024, 'application/pdf'),
      createMockFile('file2.pdf', 1024, 'application/pdf'),
      createMockFile('file3.pdf', 1024, 'application/pdf'),
    ];

    Object.defineProperty(input, 'files', { value: files, configurable: true });
    fireEvent.change(input);

    expect(onFilesAccepted).toHaveBeenCalledWith([files[0], files[1]]);
    expect(onFileRejected).toHaveBeenCalledWith(files[2], expect.stringContaining('Maximum'));
  });

  it('supports single file mode', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} multiple={false} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(false);
  });

  it('has proper ARIA attributes for accessibility', () => {
    const onFilesAccepted = vi.fn();
    render(<FileUploadZone onFilesAccepted={onFilesAccepted} />);

    const dropZone = screen.getByRole('button');
    expect(dropZone.getAttribute('aria-label')).toContain('Upload files');
    expect(dropZone.getAttribute('tabindex')).toBe('0');
  });
});
