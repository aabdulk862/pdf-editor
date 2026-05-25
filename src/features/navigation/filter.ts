import type { NavCategory, NavTool } from './categories';
import { NAV_CATEGORIES } from './categories';
import type { MatchQuality } from '../../utils/fuzzy-match';
import { fuzzyMatch, fuzzyMatchBest } from '../../utils/fuzzy-match';

export interface FilterResult {
  categories: NavCategory[];
  hasResults: boolean;
}

interface ScoredTool {
  tool: NavTool;
  quality: MatchQuality;
}

/**
 * Filters navigation categories and tools based on a search query using fuzzy matching.
 * Matching is case-insensitive against tool names, descriptions, and category labels.
 *
 * Results are ranked by match quality:
 * 1. Exact match (query equals target)
 * 2. Starts-with (target starts with query)
 * 3. Contains (target includes query as substring)
 * 4. Fuzzy (all query characters appear in order within target)
 *
 * Algorithm:
 * 1. If query is empty/whitespace, return all categories with hasResults=true
 * 2. For each category:
 *    a. If category label fuzzy-matches the query → include entire category with all tools
 *    b. Otherwise, fuzzy-match tools against their label, description, and category label
 *    c. If any tools match, include the category with only matching tools (sorted by quality)
 * 3. Return filtered categories and hasResults flag (true if any categories remain)
 */
export function filterNavigation(query: string): FilterResult {
  const trimmed = query.trim();

  if (trimmed === '') {
    return { categories: NAV_CATEGORIES, hasResults: true };
  }

  const filtered: NavCategory[] = [];

  for (const category of NAV_CATEGORIES) {
    // If category label fuzzy-matches, include entire category with all tools
    const categoryMatch = fuzzyMatch(trimmed, category.label);
    if (categoryMatch.matches) {
      filtered.push(category);
      continue;
    }

    // Otherwise, fuzzy-match tools against their label, description, and category label
    const scoredTools: ScoredTool[] = [];

    for (const tool of category.tools) {
      const result = fuzzyMatchBest(trimmed, [tool.label, tool.description, category.label]);
      if (result.matches) {
        scoredTools.push({ tool, quality: result.quality });
      }
    }

    if (scoredTools.length > 0) {
      // Sort by match quality (highest first)
      scoredTools.sort((a, b) => b.quality - a.quality);
      filtered.push({ ...category, tools: scoredTools.map((s) => s.tool) });
    }
  }

  return {
    categories: filtered,
    hasResults: filtered.length > 0,
  };
}
