/**
 * @vitest-environment jsdom
 */
/**
 * Feature: ux-power-user-features
 * Property 13: Recent files deduplication
 *
 * For any file that matches an existing entry by file name and file size,
 * adding it to the store should not increase the entry count, and the
 * matching entry's lastOpenedAt should be updated to the new timestamp.
 *
 * Validates: Requirements 7.7
 */
import { describe, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { useRecentFilesStore } from '../../store/recent-files';

describe('Property 13: Recent files deduplication', () => {
  fcTest.prop(
    [
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.integer({ min: 1, max: 100_000_000 }),
      fc.constantFrom('/compress', '/merge', '/split', '/rotate', '/watermark'),
      fc.constantFrom('Compress', 'Merge', 'Split', 'Rotate', 'Watermark'),
    ],
    { numRuns: 100 },
  )(
    'adding a file with same name and size should not increase entry count and should update lastOpenedAt',
    (fileName, fileSize, operationRoute, operationName) => {
      // Reset store state and localStorage before each iteration
      window.localStorage.clear();
      useRecentFilesStore.setState({ entries: [], maxEntries: 20 });

      // Create a mock File object with the generated name and size
      const file = new File(['x'.repeat(Math.min(fileSize, 100))], fileName);
      Object.defineProperty(file, 'size', { value: fileSize });

      // Add the file to the store for the first time
      useRecentFilesStore.getState().addEntry(file, operationRoute, operationName);

      const entriesAfterFirst = useRecentFilesStore.getState().entries;
      const countAfterFirst = entriesAfterFirst.length;

      // Find the entry that was just added
      const firstEntry = entriesAfterFirst.find(
        (e) => e.fileName === fileName && e.fileSize === fileSize,
      );
      expect(firstEntry).toBeDefined();
      const firstTimestamp = firstEntry!.lastOpenedAt;

      // Advance time slightly to ensure a different timestamp
      const originalNow = Date.now;
      const laterTimestamp = firstTimestamp + 1000;
      Date.now = () => laterTimestamp;

      try {
        // Add the same file again (same name + size)
        const file2 = new File(['y'.repeat(Math.min(fileSize, 100))], fileName);
        Object.defineProperty(file2, 'size', { value: fileSize });

        useRecentFilesStore.getState().addEntry(file2, operationRoute, operationName);

        const entriesAfterSecond = useRecentFilesStore.getState().entries;
        const countAfterSecond = entriesAfterSecond.length;

        // Verify entry count did not increase
        expect(countAfterSecond).toBe(countAfterFirst);

        // Verify the entry's lastOpenedAt was updated to the new timestamp
        const updatedEntry = entriesAfterSecond.find(
          (e) => e.fileName === fileName && e.fileSize === fileSize,
        );
        expect(updatedEntry).toBeDefined();
        expect(updatedEntry!.lastOpenedAt).toBe(laterTimestamp);
      } finally {
        // Restore Date.now
        Date.now = originalNow;
      }
    },
  );
});
