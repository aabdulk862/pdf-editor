import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { GlobalDropZone } from './GlobalDropZone';
import { useDropZoneStore } from '../../store/drop-zone';
import { useToastStore } from '../../store/toast';
import { useCommandPaletteStore } from '../../store/command-palette';

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

function createMockDataTransfer(files: File[], types: string[] = ['Files']) {
  return {
    files,
    items: files.map((f) => ({ kind: 'file', type: f.type })),
    types,
    dropEffect: 'none',
  };
}

describe('GlobalDropZone', () => {
  beforeEach(() => {
    useDropZoneStore.setState({ isDragging: false, isValidType: false });
    useToastStore.setState({ toasts: [] });
    useCommandPaletteStore.getState().close();
  });

  describe('overlay rendering', () => {
    it('does not show overlay when not dragging', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      expect(screen.queryByText('Drop files here')).not.toBeInTheDocument();
      expect(screen.queryByText('File type not supported')).not.toBeInTheDocument();
    });

    it('shows valid overlay when isDragging and isValidType are true', () => {
      useDropZoneStore.setState({ isDragging: true, isValidType: true });

      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      expect(screen.getByText('Drop files here')).toBeInTheDocument();
      expect(screen.getByText('PDF, PNG, and JPEG files accepted')).toBeInTheDocument();
    });

    it('shows invalid overlay when isDragging and isValidType is false', () => {
      useDropZoneStore.setState({ isDragging: true, isValidType: false });

      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      expect(screen.getByText('File type not supported')).toBeInTheDocument();
      expect(screen.getByText('Only PDF, PNG, and JPEG files are supported')).toBeInTheDocument();
    });
  });

  describe('drag events', () => {
    it('sets isDragging to true on dragenter', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      const container = screen.getByText('Content').parentElement!;
      fireEvent.dragEnter(container, {
        dataTransfer: createMockDataTransfer([
          new File([''], 'test.pdf', { type: 'application/pdf' }),
        ]),
      });

      expect(useDropZoneStore.getState().isDragging).toBe(true);
    });

    it('sets isDragging to false on dragleave when counter reaches 0', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      const container = screen.getByText('Content').parentElement!;

      // Enter
      fireEvent.dragEnter(container, {
        dataTransfer: createMockDataTransfer([
          new File([''], 'test.pdf', { type: 'application/pdf' }),
        ]),
      });
      expect(useDropZoneStore.getState().isDragging).toBe(true);

      // Leave
      fireEvent.dragLeave(container, {
        dataTransfer: createMockDataTransfer([]),
      });
      expect(useDropZoneStore.getState().isDragging).toBe(false);
    });

    it('detects valid file types from dataTransfer items', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      const container = screen.getByText('Content').parentElement!;
      fireEvent.dragEnter(container, {
        dataTransfer: createMockDataTransfer([
          new File([''], 'test.pdf', { type: 'application/pdf' }),
        ]),
      });

      expect(useDropZoneStore.getState().isValidType).toBe(true);
    });

    it('detects invalid file types from dataTransfer items', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
      );

      const container = screen.getByText('Content').parentElement!;
      fireEvent.dragEnter(container, {
        dataTransfer: {
          files: [],
          items: [{ kind: 'file', type: 'text/plain' }],
          types: ['Files'],
          dropEffect: 'none',
        },
      });

      expect(useDropZoneStore.getState().isValidType).toBe(false);
    });
  });

  describe('drop handling on operation page', () => {
    it('calls onFilesDropped with valid files on operation page', () => {
      const onFilesDropped = vi.fn();
      renderWithRouter(
        <GlobalDropZone onFilesDropped={onFilesDropped}>
          <div>Content</div>
        </GlobalDropZone>,
        { route: '/compress' },
      );

      const container = screen.getByText('Content').parentElement!;
      const pdfFile = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });

      fireEvent.drop(container, {
        dataTransfer: {
          files: [pdfFile],
          items: [{ kind: 'file', type: 'application/pdf' }],
          types: ['Files'],
          dropEffect: 'none',
        },
      });

      expect(onFilesDropped).toHaveBeenCalledWith([pdfFile]);
    });

    it('shows error toast for unsupported file types', () => {
      const onFilesDropped = vi.fn();
      renderWithRouter(
        <GlobalDropZone onFilesDropped={onFilesDropped}>
          <div>Content</div>
        </GlobalDropZone>,
        { route: '/compress' },
      );

      const container = screen.getByText('Content').parentElement!;
      const txtFile = new File(['text'], 'readme.txt', { type: 'text/plain' });

      fireEvent.drop(container, {
        dataTransfer: {
          files: [txtFile],
          items: [{ kind: 'file', type: 'text/plain' }],
          types: ['Files'],
          dropEffect: 'none',
        },
      });

      const toasts = useToastStore.getState().toasts;
      expect(toasts.length).toBe(1);
      expect(toasts[0].severity).toBe('error');
      expect(toasts[0].message).toContain('readme.txt');
    });

    it('resets isDragging to false after drop', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
        { route: '/compress' },
      );

      const container = screen.getByText('Content').parentElement!;

      // First enter to set dragging
      fireEvent.dragEnter(container, {
        dataTransfer: createMockDataTransfer([
          new File([''], 'test.pdf', { type: 'application/pdf' }),
        ]),
      });
      expect(useDropZoneStore.getState().isDragging).toBe(true);

      // Then drop
      fireEvent.drop(container, {
        dataTransfer: {
          files: [new File([''], 'test.pdf', { type: 'application/pdf' })],
          items: [{ kind: 'file', type: 'application/pdf' }],
          types: ['Files'],
          dropEffect: 'none',
        },
      });
      expect(useDropZoneStore.getState().isDragging).toBe(false);
    });
  });

  describe('drop handling on home page', () => {
    it('opens command palette on home page drop with valid files', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
        { route: '/' },
      );

      const container = screen.getByText('Content').parentElement!;
      const pdfFile = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      });

      fireEvent.drop(container, {
        dataTransfer: {
          files: [pdfFile],
          items: [{ kind: 'file', type: 'application/pdf' }],
          types: ['Files'],
          dropEffect: 'none',
        },
      });

      expect(useCommandPaletteStore.getState().isOpen).toBe(true);
      expect(useCommandPaletteStore.getState().query).toBe('pdf');
    });
  });

  describe('file count truncation', () => {
    it('shows warning toast when more than 20 files are dropped', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div>Content</div>
        </GlobalDropZone>,
        { route: '/compress' },
      );

      const container = screen.getByText('Content').parentElement!;
      const files = Array.from(
        { length: 25 },
        (_, i) => new File(['content'], `file${i}.pdf`, { type: 'application/pdf' }),
      );

      fireEvent.drop(container, {
        dataTransfer: {
          files,
          items: files.map((f) => ({ kind: 'file', type: f.type })),
          types: ['Files'],
          dropEffect: 'none',
        },
      });

      const toasts = useToastStore.getState().toasts;
      const warningToast = toasts.find((t) => t.severity === 'warning');
      expect(warningToast).toBeDefined();
      expect(warningToast!.message).toContain('20');
    });
  });

  describe('children rendering', () => {
    it('renders children content', () => {
      renderWithRouter(
        <GlobalDropZone>
          <div data-testid="child">Hello World</div>
        </GlobalDropZone>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });
});
