import type { NavCategory } from './categories';
import { NAV_CATEGORIES } from './categories';

export interface FilterResult {
  categories: NavCategory[];
  hasResults: boolean;
}

/**
 * Filters navigation categories and tools based on a search query.
 * Matching is case-insensitive against both tool labels and category labels.
 *
 * Algorithm:
 * 1. If query is empty/whitespace, return all categories with hasResults=true
 * 2. Normalize query to lowercase
 * 3. For each category:
 *    a. If category label contains the query → include entire category with all tools
 *    b. Otherwise, filter tools whose label contains the query
 *    c. If any tools match, include the category with only matching tools
 * 4. Return filtered categories and hasResults flag (true if any categories remain)
 */
export function filterNavigation(query: string): FilterResult {
  const trimmed = query.trim();

  if (trimmed === '') {
    return { categories: NAV_CATEGORIES, hasResults: true };
  }

  const normalizedQuery = trimmed.toLowerCase();

  const filtered: NavCategory[] = [];

  for (const category of NAV_CATEGORIES) {
    // If category label matches, include entire category with all tools
    if (category.label.toLowerCase().includes(normalizedQuery)) {
      filtered.push(category);
      continue;
    }

    // Otherwise, filter tools whose label matches
    const matchingTools = category.tools.filter((tool) =>
      tool.label.toLowerCase().includes(normalizedQuery),
    );

    if (matchingTools.length > 0) {
      filtered.push({ ...category, tools: matchingTools });
    }
  }

  return {
    categories: filtered,
    hasResults: filtered.length > 0,
  };
}
