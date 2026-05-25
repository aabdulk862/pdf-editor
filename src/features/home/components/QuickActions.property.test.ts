/**
 * Property-based test: Quick Actions Frequency Ordering
 *
 * **Validates: Requirements 5.5**
 *
 * Property: The 4 tools displayed in Quick Actions always have usage counts
 * greater than or equal to any tool not displayed, and they are ordered by
 * descending frequency.
 *
 * Tested via: Property-based test generating random usage count maps and
 * verifying the top-4 selection and ordering.
 */
import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { expect } from 'vitest';
import { getQuickActionTools } from './QuickActions';

/**
 * Known tool paths from the TOOL_REGISTRY in QuickActions.tsx.
 * These are the only paths that getQuickActionTools can resolve to tool objects.
 */
const KNOWN_TOOL_PATHS = [
  '/merge',
  '/compress',
  '/split',
  '/image-to-pdf',
  '/rotate',
  '/delete-pages',
  '/reorder',
  '/pdf-to-image',
  '/watermarks',
  '/password-protect',
  '/extract-text',
  '/page-numbers',
  '/crop',
];

/**
 * Arbitrary that generates a usage count map with random counts for a random
 * subset of known tool paths. Counts range from 1 to 1000 to ensure all
 * entries have positive usage (the function filters out zero-count entries).
 */
const usageCountsArb = fc
  .subarray(KNOWN_TOOL_PATHS, { minLength: 1, maxLength: KNOWN_TOOL_PATHS.length })
  .chain((paths) =>
    fc
      .array(fc.integer({ min: 1, max: 1000 }), {
        minLength: paths.length,
        maxLength: paths.length,
      })
      .map((counts) => {
        const record: Record<string, number> = {};
        paths.forEach((path, i) => {
          record[path] = counts[i];
        });
        return record;
      }),
  );

test.prop([usageCountsArb], { numRuns: 200 })(
  'Quick Actions result has at most 4 items',
  (usageCounts) => {
    const result = getQuickActionTools(usageCounts, 4);
    expect(result.length).toBeLessThanOrEqual(4);
  },
);

test.prop([usageCountsArb], { numRuns: 200 })(
  'Quick Actions items are ordered by descending usage count',
  (usageCounts) => {
    const result = getQuickActionTools(usageCounts, 4);

    // Only check ordering among tools that come from usage data (not defaults)
    // Tools from usage data will have their path in usageCounts with count > 0
    const toolsFromUsage = result.filter(
      (tool) => usageCounts[tool.path] !== undefined && usageCounts[tool.path] > 0,
    );

    for (let i = 0; i < toolsFromUsage.length - 1; i++) {
      const currentCount = usageCounts[toolsFromUsage[i].path];
      const nextCount = usageCounts[toolsFromUsage[i + 1].path];
      expect(currentCount).toBeGreaterThanOrEqual(nextCount);
    }
  },
);

test.prop([usageCountsArb], { numRuns: 200 })(
  'Every displayed tool has a usage count >= every non-displayed tool',
  (usageCounts) => {
    const result = getQuickActionTools(usageCounts, 4);
    const displayedPaths = new Set(result.map((t) => t.path));

    // Get the minimum usage count among displayed tools that come from usage data
    const displayedFromUsage = result.filter(
      (tool) => usageCounts[tool.path] !== undefined && usageCounts[tool.path] > 0,
    );

    if (displayedFromUsage.length === 0) return; // All defaults, nothing to check

    const minDisplayedCount = Math.min(...displayedFromUsage.map((tool) => usageCounts[tool.path]));

    // Every non-displayed tool with usage data should have count <= minDisplayedCount
    for (const [path, count] of Object.entries(usageCounts)) {
      if (!displayedPaths.has(path) && count > 0) {
        expect(count).toBeLessThanOrEqual(minDisplayedCount);
      }
    }
  },
);
