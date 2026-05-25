import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { batchExport, type ExportEngine } from './batch-export';
import type { CanvasDocument, CanvasPage, ExportOptions } from '../types';

function createPage(id: string): CanvasPage {
  return {
    id,
    width: 210,
    height: 297,
    backgroundColor: '#FFFFFF',
    elements: [],
  };
}

function createDocument(pageCount: number): CanvasDocument {
  return {
    id: 'doc-1',
    name: 'Test Document',
    pages: Array.from({ length: pageCount }, (_, i) => createPage(`page-${i}`)),
    activePageIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createMockEngine(failOnPages: number[] = []): ExportEngine {
  return {
    exportPage: vi.fn(async (page: CanvasPage) => {
      const pageIndex = parseInt(page.id.replace('page-', ''), 10);
      if (failOnPages.includes(pageIndex)) {
        throw new Error(`Export failed for page ${pageIndex}`);
      }
      return new Blob(['page content'], { type: 'application/octet-stream' });
    }),
  };
}

describe('batchExport', () => {
  it('exports all pages into a ZIP with correct naming pattern', async () => {
    const doc = createDocument(3);
    const engine = createMockEngine();
    const exportOptions: ExportOptions = {
      format: 'pdf',
      pages: 'all',
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    expect(result.filename).toBe('Test Document-batch.zip');
    expect(result.summary.totalPages).toBe(3);
    expect(result.summary.succeeded).toEqual([0, 1, 2]);
    expect(result.summary.failed).toEqual([]);

    // Verify ZIP contents
    const zip = await JSZip.loadAsync(result.zip);
    const files = Object.keys(zip.files);
    expect(files).toContain('Test Document-page-001.pdf');
    expect(files).toContain('Test Document-page-002.pdf');
    expect(files).toContain('Test Document-page-003.pdf');
  });

  it('exports only selected pages when pages is an array', async () => {
    const doc = createDocument(5);
    const engine = createMockEngine();
    const exportOptions: ExportOptions = {
      format: 'png',
      pages: [0, 2, 4],
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    expect(result.summary.totalPages).toBe(3);
    expect(result.summary.succeeded).toEqual([0, 2, 4]);

    const zip = await JSZip.loadAsync(result.zip);
    const files = Object.keys(zip.files);
    expect(files).toContain('Test Document-page-001.png');
    expect(files).toContain('Test Document-page-003.png');
    expect(files).toContain('Test Document-page-005.png');
    expect(files).toHaveLength(3);
  });

  it('continues on per-page failure and collects errors', async () => {
    const doc = createDocument(4);
    const engine = createMockEngine([1, 3]); // pages at index 1 and 3 will fail
    const exportOptions: ExportOptions = {
      format: 'svg',
      pages: 'all',
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    expect(result.summary.totalPages).toBe(4);
    expect(result.summary.succeeded).toEqual([0, 2]);
    expect(result.summary.failed).toEqual([
      { pageIndex: 1, error: 'Export failed for page 1' },
      { pageIndex: 3, error: 'Export failed for page 3' },
    ]);

    // ZIP should still contain the successful pages
    const zip = await JSZip.loadAsync(result.zip);
    const files = Object.keys(zip.files);
    expect(files).toContain('Test Document-page-001.svg');
    expect(files).toContain('Test Document-page-003.svg');
    expect(files).not.toContain('Test Document-page-002.svg');
    expect(files).not.toContain('Test Document-page-004.svg');
  });

  it('reports progress via callback for each page', async () => {
    const doc = createDocument(3);
    const engine = createMockEngine();
    const exportOptions: ExportOptions = {
      format: 'docx',
      pages: 'all',
      batch: true,
    };
    const progressCalls: [number, number][] = [];

    await batchExport({
      document: doc,
      exportOptions,
      engine,
      onProgress: (current, total) => {
        progressCalls.push([current, total]);
      },
    });

    expect(progressCalls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('uses correct file extension for each format', async () => {
    const formats: ExportOptions['format'][] = ['pdf', 'png', 'svg', 'docx'];

    for (const format of formats) {
      const doc = createDocument(1);
      const engine = createMockEngine();
      const exportOptions: ExportOptions = {
        format,
        pages: 'all',
        batch: true,
      };

      const result = await batchExport({
        document: doc,
        exportOptions,
        engine,
      });

      const zip = await JSZip.loadAsync(result.zip);
      const files = Object.keys(zip.files);
      expect(files[0]).toBe(`Test Document-page-001.${format}`);
    }
  });

  it('filters out invalid page indices', async () => {
    const doc = createDocument(3);
    const engine = createMockEngine();
    const exportOptions: ExportOptions = {
      format: 'pdf',
      pages: [-1, 0, 2, 5, 100], // -1, 5, 100 are invalid
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    expect(result.summary.totalPages).toBe(2); // only 0 and 2 are valid
    expect(result.summary.succeeded).toEqual([0, 2]);
  });

  it('sanitizes document name for ZIP filename', async () => {
    const doc = createDocument(1);
    doc.name = 'My <Doc>: "test"/file';
    const engine = createMockEngine();
    const exportOptions: ExportOptions = {
      format: 'pdf',
      pages: 'all',
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    expect(result.filename).toBe('My -Doc-- -test--file-batch.zip');
  });

  it('handles all pages failing gracefully', async () => {
    const doc = createDocument(2);
    const engine = createMockEngine([0, 1]); // all pages fail
    const exportOptions: ExportOptions = {
      format: 'pdf',
      pages: 'all',
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    expect(result.summary.succeeded).toEqual([]);
    expect(result.summary.failed).toHaveLength(2);
    // ZIP should still be generated (empty)
    expect(result.zip).toBeInstanceOf(Blob);
  });

  it('zero-pads page numbers to 3 digits', async () => {
    // Create a document with enough pages to test padding
    const doc = createDocument(12);
    const engine = createMockEngine();
    const exportOptions: ExportOptions = {
      format: 'png',
      pages: 'all',
      batch: true,
    };

    const result = await batchExport({
      document: doc,
      exportOptions,
      engine,
    });

    const zip = await JSZip.loadAsync(result.zip);
    const files = Object.keys(zip.files);
    expect(files).toContain('Test Document-page-001.png');
    expect(files).toContain('Test Document-page-009.png');
    expect(files).toContain('Test Document-page-010.png');
    expect(files).toContain('Test Document-page-012.png');
  });
});
