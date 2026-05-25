import { describe, it } from 'vitest';
import fc from 'fast-check';
import { filterNavigation } from '../filter';
import type { NavTool } from '../categories';
import { NAV_CATEGORIES } from '../categories';
import { fuzzyMatch } from '../../../utils/fuzzy-match';

/**
 * Property-based test: Navigation Filter Subset Invariant
 *
 * **Validates: Requirements 2.4**
 *
 * Property: For any filter query string, the filtered tool list is always a subset
 * of the complete tool list, and every item in the filtered list fuzzy-matches the
 * query against at least one of: tool name, tool description, or category label.
 */
describe('Navigation Filter Subset Invariant', () => {
  // Collect all tools from all categories for subset verification
  const allTools: NavTool[] = NAV_CATEGORIES.flatMap((cat) => cat.tools);
  const allToolPaths = new Set(allTools.map((t) => t.path));

  it('filtered results are always a subset of the complete tool list', () => {
    fc.assert(
      fc.property(fc.string(), (query) => {
        const result = filterNavigation(query);

        // Every tool in the filtered results must exist in the full tool list
        const filteredTools = result.categories.flatMap((cat) => cat.tools);
        return filteredTools.every((tool) => allToolPaths.has(tool.path));
      }),
    );
  });

  it('every filtered tool fuzzy-matches the query in its name, description, or category label', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim().length > 0),
        (query) => {
          const result = filterNavigation(query);
          const trimmedQuery = query.trim();

          // Every tool in the filtered results must fuzzy-match the query
          // against at least one of: tool label, tool description, or category label
          for (const category of result.categories) {
            for (const tool of category.tools) {
              const matchesLabel = fuzzyMatch(trimmedQuery, tool.label).matches;
              const matchesDescription = fuzzyMatch(trimmedQuery, tool.description).matches;
              const matchesCategoryLabel = fuzzyMatch(trimmedQuery, category.label).matches;

              if (!matchesLabel && !matchesDescription && !matchesCategoryLabel) {
                return false;
              }
            }
          }

          return true;
        },
      ),
    );
  });
});
