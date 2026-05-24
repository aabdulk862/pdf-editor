import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeletePagesPage } from './DeletePagesPage';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  const mockPage = {
    getViewport: () => ({ width: 612, height: 792 }),
    render: () => ({ promise: Promise.resolve() }),
  };

  const mockDoc = {
    numPages: 3,
    getPage: () => Promise.resolve(mockPage),
  };

  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({ promise: Promise.resolve(mockDoc) }),
  };
});

// Mock the web worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, Array<(event: MessageEvent) => void>> = new Map();

  postMessage(data: { id: string; operation: string; payload: unknown }) {
    // Simulate successful deletion
    const response = {
      data: {
        id: data.id,
        success: true,
        result: {
          success: true,
          data: new ArrayBuffer(100),
        },
      },
    };
    setTimeout(() => {
      const listeners = this.listeners.get('message') ?? [];
      for (const listener of listeners) {
        listener(response as unknown as MessageEvent);
      }
    }, 10);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      existing.filter((l) => l !== listener),
    );
  }

  terminate() {}
}

// Mock Worker constructor
vi.stubGlobal(
  'Worker',
  vi.fn(() => new MockWorker()),
);

// Mock URL constructor for worker
vi.stubGlobal(
  'URL',
  class extends globalThis.URL {
    constructor(input: string | URL, base?: string | URL) {
      super('http://localhost/mock-worker.js');
      void input;
      void base;
    }
  },
);

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
});

// Mock toast store
const mockAddToast = vi.fn(() => 'toast-id');
vi.mock('@/store/toast', () => ({
  useToastStore: (selector: (state: unknown) => unknown) => {
    const state = {
      toasts: [],
      addToast: mockAddToast,
      removeToast: vi.fn(),
    };
    return selector(state);
  },
}));

describe('DeletePagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const canvas = originalCreateElement('canvas');
        vi.spyOn(canvas, 'getContext').mockReturnValue({
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
          setTransform: vi.fn(),
          resetTransform: vi.fn(),
          transform: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
        } as unknown as CanvasRenderingContext2D);
        return canvas;
      }
      return originalCreateElement(tag);
    });
  });

  it('renders the page title and upload zone initially', () => {
    render(<DeletePagesPage />);

    expect(screen.getByText('Delete Pages')).toBeInTheDocument();
    expect(screen.getByText('Select pages to remove from your PDF document.')).toBeInTheDocument();
    expect(screen.getByLabelText(/upload files/i)).toBeInTheDocument();
  });

  it('shows file upload zone when no PDF is loaded', () => {
    render(<DeletePagesPage />);

    expect(screen.getByText(/click to browse/i)).toBeInTheDocument();
  });

  it('displays page thumbnails after PDF upload', async () => {
    render(<DeletePagesPage />);

    const file = new File(['fake pdf content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('shows warning toast when trying to delete all pages', async () => {
    render(<DeletePagesPage />);

    const file = new File(['fake pdf content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Select all pages
    const selectAllBtn = screen.getByText('Select All');
    fireEvent.click(selectAllBtn);

    // Try to delete
    const deleteBtn = screen.getByText('Delete Selected');
    fireEvent.click(deleteBtn);

    // Should show warning toast
    expect(mockAddToast).toHaveBeenCalledWith(
      'Cannot delete all pages. At least one page must remain.',
      'warning',
      undefined,
    );
  });

  it('shows delete button as disabled when no pages are selected', async () => {
    render(<DeletePagesPage />);

    const file = new File(['fake pdf content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // The delete button should be disabled when no pages are selected
    await waitFor(() => {
      const deleteBtn = screen.getByRole('button', { name: /delete selected/i });
      expect(deleteBtn).toBeDisabled();
    });
  });
});
