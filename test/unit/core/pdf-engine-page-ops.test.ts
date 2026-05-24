import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { PdfEngine } from '@/core/pdf-engine/operations';

async function createTestPdf(pageCount: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([612, 792]);
  }
  const bytes = await doc.save();
  return bytes.buffer as ArrayBuffer;
}

describe('PdfEngine - Page Manipulation Operations', () => {
  const engine = new PdfEngine();

  describe('rotatePages', () => {
    it('should rotate a single page by 90 degrees', async () => {
      const data = await createTestPdf(3);
      const result = await engine.rotatePages(data, [1], 90);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPageCount()).toBe(3);
      expect(resultDoc.getPage(0).getRotation().angle).toBe(90);
      expect(resultDoc.getPage(1).getRotation().angle).toBe(0);
      expect(resultDoc.getPage(2).getRotation().angle).toBe(0);
    });

    it('should rotate multiple pages by 180 degrees', async () => {
      const data = await createTestPdf(3);
      const result = await engine.rotatePages(data, [1, 3], 180);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPage(0).getRotation().angle).toBe(180);
      expect(resultDoc.getPage(1).getRotation().angle).toBe(0);
      expect(resultDoc.getPage(2).getRotation().angle).toBe(180);
    });

    it('should accumulate rotation (current + angle) mod 360', async () => {
      const data = await createTestPdf(1);
      // Rotate by 90 first
      const result1 = await engine.rotatePages(data, [1], 90);
      expect(result1.success).toBe(true);
      // Rotate by 90 again (should be 180)
      const result2 = await engine.rotatePages(result1.data!, [1], 90);
      expect(result2.success).toBe(true);

      const resultDoc = await PDFDocument.load(result2.data!);
      expect(resultDoc.getPage(0).getRotation().angle).toBe(180);
    });

    it('should return error for out-of-range page', async () => {
      const data = await createTestPdf(3);
      const result = await engine.rotatePages(data, [5], 90);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of range');
    });
  });

  describe('deletePages', () => {
    it('should delete a single page', async () => {
      const data = await createTestPdf(3);
      const result = await engine.deletePages(data, [2]);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPageCount()).toBe(2);
    });

    it('should delete multiple pages', async () => {
      const data = await createTestPdf(5);
      const result = await engine.deletePages(data, [1, 3, 5]);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPageCount()).toBe(2);
    });

    it('should reject deleting all pages', async () => {
      const data = await createTestPdf(2);
      const result = await engine.deletePages(data, [1, 2]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one page must remain');
    });

    it('should return error for out-of-range page', async () => {
      const data = await createTestPdf(3);
      const result = await engine.deletePages(data, [4]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of range');
    });
  });

  describe('reorderPages', () => {
    it('should reorder pages according to new order', async () => {
      const data = await createTestPdf(3);
      const result = await engine.reorderPages(data, [3, 1, 2]);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPageCount()).toBe(3);
    });

    it('should reject if newOrder length does not match page count', async () => {
      const data = await createTestPdf(3);
      const result = await engine.reorderPages(data, [1, 2]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exactly 3 page indices');
    });

    it('should reject if newOrder contains out-of-range page', async () => {
      const data = await createTestPdf(3);
      const result = await engine.reorderPages(data, [1, 2, 5]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of range');
    });

    it('should preserve page count for identity permutation', async () => {
      const data = await createTestPdf(4);
      const result = await engine.reorderPages(data, [1, 2, 3, 4]);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPageCount()).toBe(4);
    });
  });

  describe('duplicatePages', () => {
    it('should duplicate a single page with 1 copy', async () => {
      const data = await createTestPdf(3);
      const result = await engine.duplicatePages(data, [2], 1);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      expect(resultDoc.getPageCount()).toBe(4);
    });

    it('should duplicate multiple pages with multiple copies', async () => {
      const data = await createTestPdf(3);
      const result = await engine.duplicatePages(data, [1, 3], 2);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      // 3 original + 2 pages * 2 copies = 7
      expect(resultDoc.getPageCount()).toBe(7);
    });

    it('should reject if result would exceed 500 pages', async () => {
      const data = await createTestPdf(100);
      // 100 + 100 * 5 = 600 > 500
      const pages = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = await engine.duplicatePages(data, pages, 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500-page limit');
    });

    it('should return error for out-of-range page', async () => {
      const data = await createTestPdf(3);
      const result = await engine.duplicatePages(data, [5], 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('out of range');
    });

    it('should handle duplicate page numbers in input', async () => {
      const data = await createTestPdf(3);
      // Passing page 2 twice should only duplicate it once
      const result = await engine.duplicatePages(data, [2, 2], 1);

      expect(result.success).toBe(true);
      const resultDoc = await PDFDocument.load(result.data!);
      // 3 + 1 unique page * 1 copy = 4
      expect(resultDoc.getPageCount()).toBe(4);
    });
  });
});
