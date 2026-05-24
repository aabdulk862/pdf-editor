import { describe, it, expect } from 'vitest';
import {
  validateFileType,
  validateFileSize,
  validatePageRange,
  validatePassword,
  validateMetadataField,
  validateKeywords,
  validateBookmarkTitle,
  validateDimension,
  validateCropRegion,
} from '../../../src/utils/validation';

function createMockFile(name: string, size: number, type: string): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

describe('validateFileType', () => {
  it('accepts PDF files', () => {
    const file = createMockFile('doc.pdf', 100, 'application/pdf');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('accepts PNG files', () => {
    const file = createMockFile('img.png', 100, 'image/png');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('accepts JPEG files', () => {
    const file = createMockFile('img.jpg', 100, 'image/jpeg');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('rejects unsupported file types', () => {
    const file = createMockFile('doc.docx', 100, 'application/msword');
    const result = validateFileType(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported file type');
  });

  it('rejects files with empty type', () => {
    const file = createMockFile('file', 100, '');
    const result = validateFileType(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('unknown');
  });
});

describe('validateFileSize', () => {
  it('accepts files within default limit', () => {
    const file = createMockFile('doc.pdf', 1024, 'application/pdf');
    expect(validateFileSize(file)).toEqual({ valid: true });
  });

  it('accepts files at exactly the limit', () => {
    const maxBytes = 100;
    const file = createMockFile('doc.pdf', maxBytes, 'application/pdf');
    expect(validateFileSize(file, maxBytes)).toEqual({ valid: true });
  });

  it('rejects files exceeding the limit', () => {
    const maxBytes = 50;
    const file = createMockFile('doc.pdf', 100, 'application/pdf');
    const result = validateFileSize(file, maxBytes);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('uses 100MB as default max', () => {
    const file = createMockFile('doc.pdf', 100 * 1024 * 1024 + 1, 'application/pdf');
    const result = validateFileSize(file);
    expect(result.valid).toBe(false);
  });
});

describe('validatePageRange', () => {
  it('accepts valid page range', () => {
    expect(validatePageRange(1, 5, 10)).toEqual({ valid: true });
  });

  it('accepts single page range', () => {
    expect(validatePageRange(3, 3, 10)).toEqual({ valid: true });
  });

  it('rejects start < 1', () => {
    const result = validatePageRange(0, 5, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 1');
  });

  it('rejects start > end', () => {
    const result = validatePageRange(5, 3, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not be greater than');
  });

  it('rejects end > totalPages', () => {
    const result = validatePageRange(1, 11, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('total pages');
  });

  it('rejects non-integer values', () => {
    const result = validatePageRange(1.5, 3, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('integers');
  });
});

describe('validatePassword', () => {
  it('accepts valid password', () => {
    expect(validatePassword('secret123')).toEqual({ valid: true });
  });

  it('accepts single character password', () => {
    expect(validatePassword('a')).toEqual({ valid: true });
  });

  it('accepts 128 character password', () => {
    expect(validatePassword('a'.repeat(128))).toEqual({ valid: true });
  });

  it('rejects empty password', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 1');
  });

  it('rejects password exceeding 128 characters', () => {
    const result = validatePassword('a'.repeat(129));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('128');
  });
});

describe('validateMetadataField', () => {
  it('accepts valid title', () => {
    expect(validateMetadataField('title', 'My Document')).toEqual({ valid: true });
  });

  it('accepts empty string', () => {
    expect(validateMetadataField('author', '')).toEqual({ valid: true });
  });

  it('accepts 255 character value', () => {
    expect(validateMetadataField('subject', 'a'.repeat(255))).toEqual({ valid: true });
  });

  it('rejects value exceeding 255 characters', () => {
    const result = validateMetadataField('title', 'a'.repeat(256));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('255');
  });
});

describe('validateKeywords', () => {
  it('accepts valid keywords', () => {
    expect(validateKeywords(['pdf', 'editor', 'tool'])).toEqual({ valid: true });
  });

  it('accepts empty array', () => {
    expect(validateKeywords([])).toEqual({ valid: true });
  });

  it('accepts 20 keywords', () => {
    const keywords = Array.from({ length: 20 }, (_, i) => `keyword${i}`);
    expect(validateKeywords(keywords)).toEqual({ valid: true });
  });

  it('rejects more than 20 keywords', () => {
    const keywords = Array.from({ length: 21 }, (_, i) => `keyword${i}`);
    const result = validateKeywords(keywords);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('20');
  });

  it('rejects keyword exceeding 100 characters', () => {
    const result = validateKeywords(['valid', 'a'.repeat(101)]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100');
  });
});

describe('validateBookmarkTitle', () => {
  it('accepts valid title', () => {
    expect(validateBookmarkTitle('Chapter 1')).toEqual({ valid: true });
  });

  it('accepts single character', () => {
    expect(validateBookmarkTitle('A')).toEqual({ valid: true });
  });

  it('accepts 200 character title', () => {
    expect(validateBookmarkTitle('a'.repeat(200))).toEqual({ valid: true });
  });

  it('rejects empty title', () => {
    const result = validateBookmarkTitle('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects title exceeding 200 characters', () => {
    const result = validateBookmarkTitle('a'.repeat(201));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('200');
  });
});

describe('validateDimension', () => {
  it('accepts valid dimension', () => {
    expect(validateDimension(210)).toEqual({ valid: true });
  });

  it('accepts minimum dimension (25mm)', () => {
    expect(validateDimension(25)).toEqual({ valid: true });
  });

  it('accepts maximum dimension (3000mm)', () => {
    expect(validateDimension(3000)).toEqual({ valid: true });
  });

  it('rejects dimension below 25mm', () => {
    const result = validateDimension(24);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('25');
  });

  it('rejects dimension above 3000mm', () => {
    const result = validateDimension(3001);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3000');
  });
});

describe('validateCropRegion', () => {
  it('accepts valid crop region', () => {
    const result = validateCropRegion({ x: 10, y: 10, width: 100, height: 100 }, 200, 200);
    expect(result).toEqual({ valid: true });
  });

  it('accepts region at page origin', () => {
    const result = validateCropRegion({ x: 0, y: 0, width: 200, height: 200 }, 200, 200);
    expect(result).toEqual({ valid: true });
  });

  it('rejects zero width', () => {
    const result = validateCropRegion({ x: 10, y: 10, width: 0, height: 100 }, 200, 200);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('rejects zero height', () => {
    const result = validateCropRegion({ x: 10, y: 10, width: 100, height: 0 }, 200, 200);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('rejects negative width', () => {
    const result = validateCropRegion({ x: 10, y: 10, width: -5, height: 100 }, 200, 200);
    expect(result.valid).toBe(false);
  });

  it('rejects negative x position', () => {
    const result = validateCropRegion({ x: -1, y: 10, width: 100, height: 100 }, 200, 200);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('outside page bounds');
  });

  it('rejects region extending beyond page width', () => {
    const result = validateCropRegion({ x: 150, y: 10, width: 100, height: 100 }, 200, 200);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('page width');
  });

  it('rejects region extending beyond page height', () => {
    const result = validateCropRegion({ x: 10, y: 150, width: 100, height: 100 }, 200, 200);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('page height');
  });
});
