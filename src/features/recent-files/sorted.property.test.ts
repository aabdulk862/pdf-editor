import { describe, beforeEach } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { useRecentFilesStore } from '../../store/recent-files';

/**
 * Feature: ux-power-user-features
 * Property 12: Recent files sorted by recency
 *
 * For any set of recent file entries in the store, the entries returned by
 * getEntries() should be in strictly non-increasing order of lastOpenedAt timestamp.
 *
 * Validates: Requirements 7.4
 */

// Arbitrary for generating a recent file entry with varying timestamps
const recentFileEntryArb = fc.record({
  id: fc.uuid(),
  fileName: fc.string({ minLength: 1, maxLength: 50 }),
  fileSize: fc.nat({ max: 100_000_000 }),
  lastOpenedAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  operationRoute: fc.constantFrom('/compress', '/merge', '/split', '/rotate', '/encrypt'),
  operationName: fc.constantFrom('Compress', 'Merge', 'Split', 'Rotate', 'Encrypt'),
});

describe('Feature: ux-power-user-features, Property 12: Recent files sorted by recency', () => {
  beforeEach(() => {
    // Reset the store state before each test iteration
    useRecentFilesStore.setState({ entries: [], maxEntries: 20 });
  });

  test.prop([fc.array(recentFileEntryArb, { minLength: 0, maxLength: 20 })], { numRuns: 100 })(
    'getEntries() returns entries in strictly non-increasing order of lastOpenedAt',
    (entries) => {
      // Set entries directly in the store
      useRecentFilesStore.setState({ entries });

      // Call getEntries() which should return sorted results
      const result = useRecentFilesStore.getState().getEntries();

      // Verify the result is sorted by lastOpenedAt descending (non-increasing)
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i].lastOpenedAt < result[i + 1].lastOpenedAt) {
          throw new Error(
            `Entry at index ${i} (lastOpenedAt=${result[i].lastOpenedAt}) is less than ` +
              `entry at index ${i + 1} (lastOpenedAt=${result[i + 1].lastOpenedAt}). ` +
              `Expected non-increasing order.`,
          );
        }
      }
    },
  );
});
