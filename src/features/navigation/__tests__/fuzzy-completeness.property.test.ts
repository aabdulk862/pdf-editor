import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterNavigation } from '../filter';
import type { NavTool } from '../categories';
import { NAV_CATEGORIES } from '../categories';

/**
 * Property-based test: Command Palette Fuzzy Match Completeness
 *
 * **Validates: Requirements 2.6**
 *
 * Property: For any exact tool name used as a query, the fuzzy matcher always
 * returns that tool in its results. For an empty query, all tools are returned.
 */
describe('Command Palette Fuzzy Match Completeness', () => {
  // Collect all tools from all categories
  const allTools: NavTool[] = NAV_CATEGORIES.flatMap((cat) => cat.tools);

  it('querying by exact tool name always returns that tool in results', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: allTools.length - 1 }), (index) => {
        const tool = allTools[index];
        const result = filterNavigation(tool.label);

        // The tool must appear in the filtered results
        const filteredTools = result.categories.flatMap((cat) => cat.tools);
        const found = filteredTools.some((t) => t.path === tool.path);

        return found;
      }),
    );
  });

  it('empty query returns all tools', () => {
    const result = filterNavigation('');
    const filteredTools = result.categories.flatMap((cat) => cat.tools);

    expect(filteredTools.length).toBe(allTools.length);
    expect(result.hasResults).toBe(true);

    // Every tool should be present
    for (const tool of allTools) {
      const found = filteredTools.some((t) => t.path === tool.path);
      expect(found).toBe(true);
    }
  });
});
