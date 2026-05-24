import { describe, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import {
  validateDroppedFile,
  validateDroppedFiles,
  ACCEPTED_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_DROP,
} from './validation';

/**
 * Feature: ux-power-user-features
 * Property 16: Drop zone file validation
 *
 * For any file, it should be accepted if and only if its MIME type is in
 * {application/pdf, image/png, image/jpeg} AND its size is ≤ 100 MB.
 * For any batch of files, at most 20 should be accepted (first 20 valid files).
 *
 * Validates: Requirements 10.4, 10.6
 */

// Arbitrary for generating accepted MIME types
const acceptedTypeArb = fc.constantFrom(...ACCEPTED_TYPES);

// Arbitrary for generating rejected MIME types (not in accepted list)
const rejectedTypeArb = fc
  .string({ minLength: 1 })
  .filter((t) => !ACCEPTED_TYPES.includes(t as (typeof ACCEPTED_TYPES)[number]));

// Arbitrary for valid file sizes (0 to MAX_FILE_SIZE inclusive)
const validSizeArb = fc.integer({ min: 0, max: MAX_FILE_SIZE });

// Arbitrary for invalid file sizes (exceeding MAX_FILE_SIZE)
const invalidSizeArb = fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 3 });

// Helper to create a File-like object with given type and size
function createMockFile(name: string, type: string, size: number): File {
  // Create a minimal File object with the specified properties
  const content = new ArrayBuffer(0);
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'size', { value: size, writable: false });
  return file;
}

// Arbitrary for a file with random type and size
const arbitraryFile = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/\0/g, 'x') + '.bin'),
    fc.oneof(acceptedTypeArb, rejectedTypeArb),
    fc.integer({ min: 0, max: MAX_FILE_SIZE * 3 }),
  )
  .map(([name, type, size]) => createMockFile(name, type, size));

describe('Feature: ux-power-user-features, Property 16: Drop zone file validation', () => {
  describe('Single file validation', () => {
    fcTest.prop([acceptedTypeArb, validSizeArb], { numRuns: 100 })(
      'accepts file when type is in accepted list AND size ≤ 100MB',
      (type, size) => {
        const file = createMockFile('test.pdf', type, size);
        const result = validateDroppedFile(file);
        expect(result.valid).toBe(true);
        expect(result.file).toBe(file);
        expect(result.reason).toBeUndefined();
      },
    );

    fcTest.prop([rejectedTypeArb, validSizeArb], { numRuns: 100 })(
      'rejects file when type is NOT in accepted list (regardless of size)',
      (type, size) => {
        const file = createMockFile('test.bin', type, size);
        const result = validateDroppedFile(file);
        expect(result.valid).toBe(false);
        expect(result.file).toBe(file);
        expect(result.reason).toBeDefined();
      },
    );

    fcTest.prop([acceptedTypeArb, invalidSizeArb], { numRuns: 100 })(
      'rejects file when size exceeds 100MB (even if type is accepted)',
      (type, size) => {
        const file = createMockFile('test.pdf', type, size);
        const result = validateDroppedFile(file);
        expect(result.valid).toBe(false);
        expect(result.file).toBe(file);
        expect(result.reason).toBeDefined();
      },
    );

    fcTest.prop([arbitraryFile], { numRuns: 100 })(
      'file is valid iff type is accepted AND size ≤ MAX_FILE_SIZE',
      (file) => {
        const result = validateDroppedFile(file);
        const isTypeAccepted = ACCEPTED_TYPES.includes(
          file.type as (typeof ACCEPTED_TYPES)[number],
        );
        const isSizeValid = file.size <= MAX_FILE_SIZE;
        const shouldBeValid = isTypeAccepted && isSizeValid;

        expect(result.valid).toBe(shouldBeValid);
        expect(result.file).toBe(file);
      },
    );
  });

  describe('Batch file validation', () => {
    fcTest.prop([fc.array(arbitraryFile, { minLength: 1, maxLength: 50 })], { numRuns: 100 })(
      'processes at most MAX_FILES_PER_DROP (20) files from any batch',
      (files) => {
        const results = validateDroppedFiles(files);
        expect(results.length).toBeLessThanOrEqual(MAX_FILES_PER_DROP);
        expect(results.length).toBe(Math.min(files.length, MAX_FILES_PER_DROP));
      },
    );

    fcTest.prop([fc.array(arbitraryFile, { minLength: 21, maxLength: 50 })], { numRuns: 100 })(
      'truncates batch to exactly 20 files when more than 20 are provided',
      (files) => {
        const results = validateDroppedFiles(files);
        expect(results.length).toBe(MAX_FILES_PER_DROP);
      },
    );

    fcTest.prop([fc.array(arbitraryFile, { minLength: 1, maxLength: 50 })], { numRuns: 100 })(
      'validates only the first 20 files from the batch (preserves order)',
      (files) => {
        const results = validateDroppedFiles(files);
        const expectedFiles = files.slice(0, MAX_FILES_PER_DROP);

        for (let i = 0; i < results.length; i++) {
          // Each result corresponds to the file at the same index
          expect(results[i].file).toBe(expectedFiles[i]);

          // Validation result matches individual validation
          const individualResult = validateDroppedFile(expectedFiles[i]);
          expect(results[i].valid).toBe(individualResult.valid);
        }
      },
    );
  });
});
