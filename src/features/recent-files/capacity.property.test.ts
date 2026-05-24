/**
 * @vitest-environment jsdom
 *
 * Feature: ux-power-user-features
 * Property 11: Recent files capacity invariant
 *
 * For any sequence of N file-open events (N > 20), the recent files store
 * should contain exactly 20 entries, and the evicted entries should always
 * be those with the oldest lastOpenedAt timestamps.
 *
 * Validates: Requirements 7.2, 7.3
 */
import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { beforeEach } from 'vitest';
import { useRecentFilesStore } from '../../store/recent-files';

beforeEach(() => {
  // Reset store state before each test iteration
  window.localStorage.clear();
  useRecentFilesStore.setState({ entries: [], maxEntries: 20 });
});

interface FileOpenEvent {
  fileName: string;
  fileSize: number;
  operationRoute: string;
  operationName: string;
}

/**
 * Generator for file-open events with unique fileName+fileSize combinations
 * to avoid deduplication logic. Each event gets a unique index-based name and size.
 */
function fileOpenEventsArb(minCount: number): fc.Arbitrary<FileOpenEvent[]> {
  return fc
    .integer({ min: minCount, max: 60 })
    .chain((count) =>
      fc.tuple(
        fc.array(
          fc.record({
            operationRoute: fc.constantFrom('/compress', '/merge', '/split', '/rotate', '/redact'),
            operationName: fc.constantFrom('Compress', 'Merge', 'Split', 'Rotate', 'Redact'),
          }),
          { minLength: count, maxLength: count },
        ),
        fc.constant(count),
      ),
    )
    .map(([records, count]) =>
      records.map((rec, index) => ({
        fileName: `file-${index}-${count}.pdf`,
        fileSize: (index + 1) * 1000 + count,
        operationRoute: rec.operationRoute,
        operationName: rec.operationName,
      })),
    );
}

test.prop([fileOpenEventsArb(21)], { numRuns: 100 })(
  'Feature: ux-power-user-features, Property 11: Recent files capacity invariant — store never exceeds 20 entries and evicts oldest timestamps',
  (events) => {
    // Reset store state for this iteration
    window.localStorage.clear();
    useRecentFilesStore.setState({ entries: [], maxEntries: 20 });

    // Track all timestamps assigned to each event
    const timestampsByEvent: Map<string, number> = new Map();
    let clock = Date.now();

    // Mock Date.now to control timestamps
    const originalDateNow = Date.now;
    Date.now = () => clock;

    try {
      // Apply all file-open events sequentially
      for (const event of events) {
        clock += 1; // Ensure strictly increasing timestamps
        const file = new File(['x'], event.fileName, { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: event.fileSize });

        useRecentFilesStore.getState().addEntry(file, event.operationRoute, event.operationName);

        // Record the timestamp for this event
        const key = `${event.fileName}:${event.fileSize}`;
        timestampsByEvent.set(key, clock);
      }
    } finally {
      Date.now = originalDateNow;
    }

    const { entries } = useRecentFilesStore.getState();

    // Property: store never exceeds 20 entries
    if (entries.length > 20) {
      return false;
    }

    // Property: store contains exactly 20 entries when N > 20 unique events
    if (entries.length !== 20) {
      return false;
    }

    // Property: the entries retained are the 20 with the most recent lastOpenedAt
    // Get all timestamps that were assigned, sort descending, take top 20
    const allTimestamps = Array.from(timestampsByEvent.values()).sort((a, b) => b - a);
    const top20Timestamps = new Set(allTimestamps.slice(0, 20));

    // Every entry in the store should have a timestamp in the top 20
    for (const entry of entries) {
      if (!top20Timestamps.has(entry.lastOpenedAt)) {
        return false;
      }
    }

    return true;
  },
);
